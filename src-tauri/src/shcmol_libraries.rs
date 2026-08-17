use tauri::Manager;
use tauri::path::BaseDirectory;

#[derive(serde::Serialize, serde::Deserialize)]
pub struct LibraryEntry {
    pub name: String,
    pub category: Option<String>,
    pub auto_select: Option<Vec<i32>>,
    pub molecule_contents: serde_json::Value
}

#[derive(serde::Serialize, serde::Deserialize)]
struct LibraryInfo {
    name: String,
    category: Option<String>,
    auto_select: Option<Vec<i32>>
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Library {
    pub id: String,
    pub entries: Vec<LibraryEntry>
}

impl Library {
    pub async fn load(id: String, app_handle: tauri::AppHandle) -> tauri::Result<Self> {
        // The beauty of functional iterator patterns :)
        // TODO: Add user library folder
        let entries = std::fs::read_dir(app_handle.path().resolve(format!("builtin_library/{id}"), BaseDirectory::Resource)?)?
            .map(|d| {
                let json_value: serde_json::Value = serde_json::from_reader(std::fs::OpenOptions::new().read(true).open(d?.path())?)?;
                let info: LibraryInfo = serde_json::from_value(json_value.clone())?;
                Ok::<LibraryEntry, tauri::Error>(LibraryEntry {
                    name: info.name,
                    category: info.category,
                    auto_select: info.auto_select,
                    molecule_contents: json_value
                })
            }).collect::<Result<Vec<_>, _>>()?;

        Ok(Library { id, entries })
    }
}

#[tauri::command]
pub async fn load_library(app_handle: tauri::AppHandle, id: String) -> Result<Library, String> {
    match Library::load(id, app_handle).await {
        Ok(h) => Ok(h),
        Err(tauri::Error::Io(e)) if e.kind() == std::io::ErrorKind::NotFound => Err("library_not_found".to_string()),
        Err(e) => Err(e.to_string())
    }
}