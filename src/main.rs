#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use log::{info, debug, error};

#[tauri::command]
fn close_app() {
    std::process::exit(0);
}

#[tauri::command]
fn minimize_window(window: tauri::Window) {
    window.minimize().unwrap();
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            info!("🚀 Application starting up");
            let window = app.get_webview_window("main").unwrap();
            info!("✅ Main window obtained");

            // Register global shortcuts
            register_shortcuts(app.handle(), window)?;

            Ok(())
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
            minimize_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn register_shortcuts(
    app: &tauri::AppHandle,
    _window: tauri::WebviewWindow,
) -> Result<(), Box<dyn std::error::Error>> {
    info!("🚀 [RUST] Registering global shortcuts...");

    // Ctrl+1, Ctrl+2, Ctrl+3 - Toggle timers
    for i in 1..=3 {
        let shortcut_str = format!("Ctrl+{}", i);
        let app_handle = app.clone();
        let timer_index = i - 1;
        info!("[RUST] Registering shortcut: {}", shortcut_str);

        app.global_shortcut().on_shortcut(shortcut_str.as_str(), move |_app, shortcut, event| {
            debug!("🔵 [RUST] Keypress detected: {} (State: {:?})", shortcut, event.state());
            if event.state() == ShortcutState::Pressed {
                info!("🔵 [RUST] Shortcut PRESSED: {}", shortcut);
                debug!("[RUST] Preparing to emit event: timer-action with payload ('toggle', {})", timer_index);
                match app_handle.emit("timer-action", ("toggle", timer_index)) {
                    Ok(_) => info!("✅ [RUST] Event emitted successfully: timer-action ('toggle', {})", timer_index),
                    Err(e) => error!("❌ [RUST] Failed to emit event: {}", e),
                }
            }
        })?;

        // Ctrl+Shift+1, Ctrl+Shift+2, Ctrl+Shift+3 - Reset timers
        let reset_str = format!("Ctrl+Shift+{}", i);
        let app_handle2 = app.clone();
        info!("[RUST] Registering shortcut: {}", reset_str);

        app.global_shortcut().on_shortcut(reset_str.as_str(), move |_app, shortcut, event| {
            debug!("🔵 [RUST] Keypress detected: {} (State: {:?})", shortcut, event.state());
            if event.state() == ShortcutState::Pressed {
                info!("🔵 [RUST] Shortcut PRESSED: {}", shortcut);
                debug!("[RUST] Preparing to emit event: timer-action with payload ('reset', {})", timer_index);
                match app_handle2.emit("timer-action", ("reset", timer_index)) {
                    Ok(_) => info!("✅ [RUST] Event emitted successfully: timer-action ('reset', {})", timer_index),
                    Err(e) => error!("❌ [RUST] Failed to emit event: {}", e),
                }
            }
        })?;
    }

    // Ctrl+Space - Toggle selected timer
    let app_space = app.clone();
    info!("[RUST] Registering shortcut: Ctrl+Space");
    app.global_shortcut().on_shortcut("Ctrl+Space", move |_app, shortcut, event| {
        debug!("🔵 [RUST] Keypress detected: {} (State: {:?})", shortcut, event.state());
        if event.state() == ShortcutState::Pressed {
            info!("🔵 [RUST] Shortcut PRESSED: {}", shortcut);
            debug!("[RUST] Preparing to emit event: timer-action with payload ('toggle-selected', 0)");
            match app_space.emit("timer-action", ("toggle-selected", 0)) {
                Ok(_) => info!("✅ [RUST] Event emitted successfully: timer-action ('toggle-selected', 0)"),
                Err(e) => error!("❌ [RUST] Failed to emit event: {}", e),
            }
        }
    })?;

    // Ctrl+R - Reset selected timer
    let app_r = app.clone();
    info!("[RUST] Registering shortcut: Ctrl+R");
    app.global_shortcut().on_shortcut("Ctrl+R", move |_app, shortcut, event| {
        debug!("🔵 [RUST] Keypress detected: {} (State: {:?})", shortcut, event.state());
        if event.state() == ShortcutState::Pressed {
            info!("🔵 [RUST] Shortcut PRESSED: {}", shortcut);
            debug!("[RUST] Preparing to emit event: timer-action with payload ('reset-selected', 0)");
            match app_r.emit("timer-action", ("reset-selected", 0)) {
                Ok(_) => info!("✅ [RUST] Event emitted successfully: timer-action ('reset-selected', 0)"),
                Err(e) => error!("❌ [RUST] Failed to emit event: {}", e),
            }
        }
    })?;

    info!("✅ [RUST] All global shortcuts registered successfully!");
    Ok(())
}
