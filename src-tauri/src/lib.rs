mod sheets;

use sheets::{SheetRow, append_row, read_sheet, update_row_by_contract, delete_row_by_contract};
use std::io::Write;

#[tauri::command]
async fn send_sms(phone: String, message: String, gateway_url: Option<String>) -> Result<String, String> {
    let url = gateway_url.unwrap_or_else(|| "http://192.168.100.35:8080/send-sms".to_string());
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let body = serde_json::json!({ "phone": phone, "message": message });
    let res = client.post(&url).json(&body).send().await
        .map_err(|e| e.to_string())?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    Ok(text)
}

#[tauri::command]
async fn save_and_open_pdf(base64_data: String, filename: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose};
    
    // Decode base64
    let pdf_bytes = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| e.to_string())?;
    
    // Save to temp directory
    let temp_dir = std::env::temp_dir();
    let path = temp_dir.join(&filename);
    
    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(&pdf_bytes).map_err(|e| e.to_string())?;
    
    // Open with system default PDF viewer
    #[cfg(target_os = "windows")]
    std::process::Command::new("cmd")
        .args(["/C", "start", "", path.to_str().unwrap()])
        .spawn()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "macos")]
    std::process::Command::new("open")
        .arg(path.to_str().unwrap())
        .spawn()
        .map_err(|e| e.to_string())?;
    
    #[cfg(target_os = "linux")]
    std::process::Command::new("xdg-open")
        .arg(path.to_str().unwrap())
        .spawn()
        .map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
async fn sheets_read(client_email: String, private_key: String) -> Result<Vec<SheetRow>, String> {
    read_sheet(&client_email, &private_key).await
}

#[tauri::command]
async fn sheets_append(
    client_email: String,
    private_key: String,
    row: SheetRow,
) -> Result<(), String> {
    append_row(&client_email, &private_key, &row).await
}

#[tauri::command]
async fn sheets_update(
    client_email: String,
    private_key: String,
    row: SheetRow,
) -> Result<(), String> {
    update_row_by_contract(&client_email, &private_key, &row).await
}

#[tauri::command]
async fn sheets_delete(
    client_email: String,
    private_key: String,
    contract_number: String,
) -> Result<(), String> {
    delete_row_by_contract(&client_email, &private_key, &contract_number).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            sheets_read,
            sheets_append,
            sheets_update,
            sheets_delete,
            send_sms,
            save_and_open_pdf,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
