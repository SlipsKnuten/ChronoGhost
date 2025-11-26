#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use serde::Deserialize;
use std::sync::Mutex;

#[derive(Debug, Deserialize, Clone)]
struct Keybind {
    key: String,
    modifiers: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct TimerSlotKeybinds {
    toggle: Option<Keybind>,
    reset: Option<Keybind>,
}

#[derive(Debug, Deserialize)]
struct SelectedTimerKeybinds {
    toggle: Option<Keybind>,
    reset: Option<Keybind>,
}

#[derive(Debug, Deserialize)]
struct KeybindsConfig {
    #[serde(rename = "timerSlots")]
    timer_slots: Vec<TimerSlotKeybinds>,
    #[serde(rename = "selectedTimer")]
    selected_timer: SelectedTimerKeybinds,
}

struct AppState {
    registered_shortcuts: Mutex<Vec<String>>,
}

#[tauri::command]
fn close_app() {
    std::process::exit(0);
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    window.minimize().unwrap();
}

#[tauri::command]
fn set_ignore_cursor_events(window: tauri::Window, ignore: bool) -> Result<(), String> {
    window.set_ignore_cursor_events(ignore)
        .map_err(|e| format!("Failed to set ignore cursor events: {}", e))
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn resize_window_native(window: tauri::Window, width: i32, height: i32) -> Result<(), String> {
    use windows::Win32::Foundation::{HWND, RECT};
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, GetWindowRect, GetClientRect,
        SWP_NOMOVE, SWP_NOZORDER, SWP_NOACTIVATE, SWP_FRAMECHANGED,
        HWND_TOP
    };
    use windows::Win32::Graphics::Dwm::{DwmGetWindowAttribute, DWMWA_EXTENDED_FRAME_BOUNDS};

    // Get native window handle
    let hwnd = window.hwnd().map_err(|e| e.to_string())?;
    let hwnd = HWND(hwnd.0 as *mut core::ffi::c_void);

    unsafe {
        // Get current window rect BEFORE resize
        let mut before_rect = RECT::default();
        GetWindowRect(hwnd, &mut before_rect)
            .map_err(|e| format!("GetWindowRect failed: {}", e))?;

        println!("[DEBUG] BEFORE resize - Window rect: {}x{}",
            before_rect.right - before_rect.left,
            before_rect.bottom - before_rect.top);

        // Get the actual visible window bounds (excluding invisible borders)
        let mut dwm_rect = RECT::default();
        let dwm_result = DwmGetWindowAttribute(
            hwnd,
            DWMWA_EXTENDED_FRAME_BOUNDS,
            &mut dwm_rect as *mut _ as *mut _,
            std::mem::size_of::<RECT>() as u32,
        );

        if dwm_result.is_ok() {
            println!("[DEBUG] DWM visible bounds: {}x{}",
                dwm_rect.right - dwm_rect.left,
                dwm_rect.bottom - dwm_rect.top);
        }

        // Get client rect to calculate non-client area
        let mut client_rect = RECT::default();
        GetClientRect(hwnd, &mut client_rect)
            .map_err(|e| format!("GetClientRect failed: {}", e))?;

        // Calculate border compensation
        let border_width = (before_rect.right - before_rect.left) - client_rect.right;
        let border_height = (before_rect.bottom - before_rect.top) - client_rect.bottom;

        println!("[DEBUG] Border compensation: {}x{}", border_width, border_height);
        println!("[DEBUG] Requested size: {}x{}", width, height);

        // Add border compensation to requested size
        let final_width = width + border_width;
        let final_height = height + border_height;

        println!("[DEBUG] Final size (with borders): {}x{}", final_width, final_height);

        // Use SetWindowPos with all necessary flags for transparent frameless windows
        let result = SetWindowPos(
            hwnd,
            HWND_TOP,
            0, 0,
            final_width,
            final_height,
            SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED,
        );

        if let Err(e) = result {
            return Err(format!("SetWindowPos failed: {}", e));
        }

        // Get window rect AFTER resize to verify
        let mut after_rect = RECT::default();
        GetWindowRect(hwnd, &mut after_rect).ok();

        println!("[DEBUG] AFTER resize - Window rect: {}x{}",
            after_rect.right - after_rect.left,
            after_rect.bottom - after_rect.top);
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
#[tauri::command]
fn resize_window_native(_window: tauri::Window, _width: i32, _height: i32) -> Result<(), String> {
    Err("resize_window_native is only supported on Windows".to_string())
}

fn keybind_to_shortcut_string(keybind: &Keybind) -> String {
    let mut parts = Vec::new();

    for modifier in &keybind.modifiers {
        let mod_str = match modifier.to_lowercase().as_str() {
            "ctrl" | "control" => "Ctrl",
            "shift" => "Shift",
            "alt" => "Alt",
            "meta" | "super" | "cmd" | "command" => "Meta",
            _ => continue,
        };
        parts.push(mod_str.to_string());
    }

    // Capitalize first letter of key
    let key = if keybind.key.len() == 1 {
        keybind.key.to_uppercase()
    } else {
        // For function keys etc, capitalize first letter only
        let mut chars = keybind.key.chars();
        match chars.next() {
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
            None => keybind.key.clone(),
        }
    };
    parts.push(key);

    parts.join("+")
}

#[tauri::command]
fn update_global_shortcuts(
    app: tauri::AppHandle,
    state: tauri::State<AppState>,
    keybinds_json: String,
) -> Result<(), String> {
    // Parse keybinds
    let keybinds: KeybindsConfig = serde_json::from_str(&keybinds_json)
        .map_err(|e| format!("Failed to parse keybinds: {}", e))?;

    // Unregister all existing shortcuts
    {
        let mut registered = state.registered_shortcuts.lock().unwrap();
        for shortcut_str in registered.iter() {
            let _ = app.global_shortcut().unregister(shortcut_str.as_str());
        }
        registered.clear();
    }

    let mut registered = state.registered_shortcuts.lock().unwrap();

    // Register timer slot shortcuts
    for (i, slot) in keybinds.timer_slots.iter().enumerate() {
        let timer_index = i;

        // Register toggle shortcut for this slot
        if let Some(toggle_keybind) = &slot.toggle {
            // Skip registration if no modifiers (prevents system-wide key capture)
            if toggle_keybind.modifiers.is_empty() {
                continue;
            }

            let shortcut_str = keybind_to_shortcut_string(toggle_keybind);
            let app_clone = app.clone();

            match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = app_clone.emit("timer-action", ("toggle", timer_index));
                }
            }) {
                Ok(_) => {
                    registered.push(shortcut_str);
                }
                Err(_) => {}
            }
        }

        // Register reset shortcut for this slot
        if let Some(reset_keybind) = &slot.reset {
            // Skip registration if no modifiers (prevents system-wide key capture)
            if reset_keybind.modifiers.is_empty() {
                continue;
            }

            let shortcut_str = keybind_to_shortcut_string(reset_keybind);
            let app_clone = app.clone();

            match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = app_clone.emit("timer-action", ("reset", timer_index));
                }
            }) {
                Ok(_) => {
                    registered.push(shortcut_str);
                }
                Err(_) => {}
            }
        }
    }

    // Register selected timer shortcuts
    if let Some(toggle_keybind) = &keybinds.selected_timer.toggle {
        // Skip registration if no modifiers (prevents system-wide key capture)
        if !toggle_keybind.modifiers.is_empty() {
            let shortcut_str = keybind_to_shortcut_string(toggle_keybind);
            let app_clone = app.clone();

            match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = app_clone.emit("timer-action", ("toggle-selected", 0));
                }
            }) {
                Ok(_) => {
                    registered.push(shortcut_str);
                }
                Err(_) => {}
            }
        }
    }

    if let Some(reset_keybind) = &keybinds.selected_timer.reset {
        // Skip registration if no modifiers (prevents system-wide key capture)
        if !reset_keybind.modifiers.is_empty() {
            let shortcut_str = keybind_to_shortcut_string(reset_keybind);
            let app_clone = app.clone();

            match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = app_clone.emit("timer-action", ("reset-selected", 0));
                }
            }) {
                Ok(_) => {
                    registered.push(shortcut_str);
                }
                Err(_) => {}
            }
        }
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let _window = app.get_webview_window("main").unwrap();

            // Register CommandOrControl+Shift+L global hotkey for lock toggle
            let app_handle = app.handle().clone();
            let _ = app.global_shortcut().on_shortcut("CommandOrControl+Shift+L", move |_app, _shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    let _ = app_handle.emit("toggle-lock", ());
                }
            });

            Ok(())
        })
        .manage(AppState {
            registered_shortcuts: Mutex::new(Vec::new()),
        })
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            close_app,
            minimize_window,
            update_global_shortcuts,
            set_ignore_cursor_events,
            resize_window_native
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

