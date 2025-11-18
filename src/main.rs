#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

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
        .invoke_handler(tauri::generate_handler![
            close_app,
            minimize_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
