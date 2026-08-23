use tauri_plugin_updater::UpdaterExt;

mod saving_loading;
use saving_loading::*;

mod shcmol_libraries;

async fn update(app: tauri::AppHandle) -> tauri_plugin_updater::Result<()> {
    use tauri::Emitter;
    
    if let Some(update) = app.updater()?.check().await? {
        let mut downloaded = 0;

        app.emit("update-download-started", format!("{{\"from\": \"{}\", \"to\": \"{}\"}}", update.current_version, update.version)).unwrap();

        update.download_and_install(
            |chunk_length, content_length| {
                downloaded += chunk_length;
                println!("Downloaded {downloaded} from {content_length:?}");
                app.emit("update-download-progress", format!("{{\"curr\": {}, \"total\": {}}}", downloaded, content_length.unwrap_or(0))).unwrap();
            },
            || {
                println!("Download Finished");
                app.emit("update-download-finished", "").unwrap();
            })
            .await?;

        println!("Update Installed! Restarting...");
        tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
        app.restart();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            save_molecule,
            load_molecule,
            export_molecule_png,
            export_molecule_clipboard,
            shcmol_libraries::load_library
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            tauri::async_runtime::spawn(async move {
                tokio::time::sleep(std::time::Duration::from_secs_f32(3.0)).await;

                update(handle).await.unwrap();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
