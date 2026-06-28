use tauri_plugin_dialog::DialogExt;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
async fn save_molecule(app_handle: tauri::AppHandle, json: String) -> Result<String, String> {
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
async fn load_molecule(app_handle: tauri::AppHandle) -> Result<String, String> {
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
async fn export_molecule(
    app_handle: tauri::AppHandle,
    molecule_x: f32,
    molecule_y: f32,
    molecule_width: f32,
    molecule_height: f32,
) -> Result<String, String> {
    let mut capture = xcap::Window::all()
        .map_err(|e| format!("err_retrieve_windows_{e:?}"))?
        .iter()
        .find(|w| w.is_focused())
        .map_or(Ok(None), |w| {
            w.capture_image()
                .map_err(|e| format!("err_take_screenshot_{e:?}"))
                .map(Option::Some)
        })?
        .ok_or(format!("err_finding_window"))?;

    let molecule = image::imageops::crop(
        &mut capture,
        molecule_x as u32,
        molecule_y as u32,
        molecule_width as u32,
        molecule_height as u32,
    );

    let file_path = app_handle
        .dialog()
        .file()
        .add_filter("PNG Image", &["png"])
        .blocking_save_file();

    if let Some(path) = file_path {
        use image::ImageEncoder;

        let file = match std::fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(path.as_path().unwrap())
        {
            Ok(f) => f,
            Err(e) => return Err(format!("err_open_file_{:?}", e.kind())),
        };

        let encoder = image::codecs::png::PngEncoder::new(file);

        encoder
            .write_image(
                &molecule.to_image(),
                molecule_width as u32,
                molecule_height as u32,
                image::ExtendedColorType::Rgba8,
            )
            .map_err(|e| format!("err_encode_image_{e:?}"))
            .map(|_| path.to_string())
    } else {
        Err("err_save_aborted".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            save_molecule,
            load_molecule,
            export_molecule
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
