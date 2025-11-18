#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use log::{info, debug, error};
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
    info!("🔄 [RUST] Updating global shortcuts with new keybinds");
    debug!("[RUST] Received keybinds JSON: {}", keybinds_json);

    // Parse keybinds
    let keybinds: KeybindsConfig = serde_json::from_str(&keybinds_json)
        .map_err(|e| format!("Failed to parse keybinds: {}", e))?;

    // Unregister all existing shortcuts
    {
        let mut registered = state.registered_shortcuts.lock().unwrap();
        for shortcut_str in registered.iter() {
            info!("[RUST] Unregistering old shortcut: {}", shortcut_str);
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
            let shortcut_str = keybind_to_shortcut_string(toggle_keybind);
            let app_clone = app.clone();

            info!("[RUST] Registering timer slot {} toggle: {}", i, shortcut_str);
            match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    debug!("[RUST] Shortcut PRESSED: {}", shortcut);
                    let _ = app_clone.emit("timer-action", ("toggle", timer_index));
                }
            }) {
                Ok(_) => {
                    registered.push(shortcut_str);
                }
                Err(e) => error!("[RUST] Failed to register shortcut: {}", e),
            }
        }

        // Register reset shortcut for this slot
        if let Some(reset_keybind) = &slot.reset {
            let shortcut_str = keybind_to_shortcut_string(reset_keybind);
            let app_clone = app.clone();

            info!("[RUST] Registering timer slot {} reset: {}", i, shortcut_str);
            match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, shortcut, event| {
                if event.state() == ShortcutState::Pressed {
                    debug!("[RUST] Shortcut PRESSED: {}", shortcut);
                    let _ = app_clone.emit("timer-action", ("reset", timer_index));
                }
            }) {
                Ok(_) => {
                    registered.push(shortcut_str);
                }
                Err(e) => error!("[RUST] Failed to register shortcut: {}", e),
            }
        }
    }

    // Register selected timer shortcuts
    if let Some(toggle_keybind) = &keybinds.selected_timer.toggle {
        let shortcut_str = keybind_to_shortcut_string(toggle_keybind);
        let app_clone = app.clone();

        info!("[RUST] Registering selected timer toggle: {}", shortcut_str);
        match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                debug!("[RUST] Shortcut PRESSED: {}", shortcut);
                let _ = app_clone.emit("timer-action", ("toggle-selected", 0));
            }
        }) {
            Ok(_) => {
                registered.push(shortcut_str);
            }
            Err(e) => error!("[RUST] Failed to register shortcut: {}", e),
        }
    }

    if let Some(reset_keybind) = &keybinds.selected_timer.reset {
        let shortcut_str = keybind_to_shortcut_string(reset_keybind);
        let app_clone = app.clone();

        info!("[RUST] Registering selected timer reset: {}", shortcut_str);
        match app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, shortcut, event| {
            if event.state() == ShortcutState::Pressed {
                debug!("[RUST] Shortcut PRESSED: {}", shortcut);
                let _ = app_clone.emit("timer-action", ("reset-selected", 0));
            }
        }) {
            Ok(_) => {
                registered.push(shortcut_str);
            }
            Err(e) => error!("[RUST] Failed to register shortcut: {}", e),
        }
    }

    info!("✅ [RUST] Global shortcuts updated successfully! Registered {} shortcuts", registered.len());
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            info!("🚀 Application starting up");
            let _window = app.get_webview_window("main").unwrap();
            info!("✅ Main window obtained");
            info!("⏳ Waiting for React to send keybind configuration...");

            Ok(())
        })
        .manage(AppState {
            registered_shortcuts: Mutex::new(Vec::new()),
        })
        .plugin(tauri_plugin_log::Builder::new()
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Webview,
            ))
            .target(tauri_plugin_log::Target::new(
                tauri_plugin_log::TargetKind::Folder {
                    path: std::path::PathBuf::from("./logs"),
                    file_name: Some("chrono_ghost".to_string())
                },
            ))
            .level(log::LevelFilter::Debug)
            .build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            close_app,
            minimize_window,
            update_global_shortcuts
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

