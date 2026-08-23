use tauri_plugin_dialog::DialogExt;
use tauri_plugin_clipboard_manager::ClipboardExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
pub async fn save_molecule(app_handle: tauri::AppHandle, json: String) -> Result<String, String> {
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("ShadyChemicals Molecule", &["shcmol"])
        .blocking_save_file();

    if let Some(path) = file_path {
        match std::fs::write(path.as_path().unwrap(), json) {
            Ok(()) => Ok(path.to_string()),
            Err(err) => Err(format!("err_write_errored_{:?}", err.kind())),
        }
    } else {
        Err("err_save_aborted".to_string())
    }
}

#[tauri::command]
pub async fn load_molecule(app_handle: tauri::AppHandle) -> Result<String, String> {
    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("ShadyChemicals Molecule", &["shcmol"])
        .blocking_pick_file();

    if let Some(path) = file_path {
        match std::fs::read_to_string(path.as_path().unwrap()) {
            Ok(json) => Ok(json),
            Err(e) => Err(format!("err_read_errored_{:?}", e.kind())),
        }
    } else {
        Err("err_load_aborted".to_string())
    }
}

#[tauri::command]
pub async fn export_molecule_png(
    app_handle: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> tauri::Result<tauri::ipc::Response> {
    if let tauri::ipc::InvokeBody::Raw(data) = request.body() {
        // let img_width = request.headers().get("width").unwrap().to_str().unwrap().parse::<f32>().unwrap();
        // let img_height = request.headers().get("height").unwrap().to_str().unwrap().parse::<f32>().unwrap();

        let file_path = app_handle
            .dialog()
            .file()
            .add_filter("PNG Image", &["png"])
            .blocking_save_file();

        if let Some(path) = file_path {
            // use image::ImageEncoder;
            use std::io::Write;

            let mut file = match std::fs::OpenOptions::new()
                .write(true)
                .create(true)
                .open(path.as_path().unwrap())
            {
                Ok(f) => f,
                Err(e) => Err(anyhow::anyhow!("err_open_file_{:?}", e.kind()))?,
            };

            Ok(file.write(data).map(|_| tauri::ipc::Response::new(format!("\"{}\"", path.to_string())))?)
        } else {
            Err(anyhow::anyhow!("err_save_aborted"))?
        }
    } else {
        Err(anyhow::anyhow!("err_invalid_cmd_arg"))?
    }
}

#[tauri::command]
pub async fn export_molecule_clipboard(
    app_handle: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> tauri::Result<tauri::ipc::Response> {
    if let tauri::ipc::InvokeBody::Raw(data) = request.body() {
        let img_width = request.headers().get("width").unwrap().to_str().unwrap().parse::<f32>().unwrap();
        let img_height = request.headers().get("height").unwrap().to_str().unwrap().parse::<f32>().unwrap();

        app_handle.clipboard().write_image(&tauri::image::Image::new(data, img_width as u32, img_height as u32))
            .map_err(|e| match e {
                tauri_plugin_clipboard_manager::Error::Tauri(e) => e,
                tauri_plugin_clipboard_manager::Error::Clipboard(s) => tauri::Error::Anyhow(anyhow::anyhow!(s))
            })?;

        Ok(tauri::ipc::Response::new(String::from("\"success\"")))
    } else {
        Err(anyhow::anyhow!("err_invalid_cmd_arg"))?
    }
}