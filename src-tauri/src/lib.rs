mod sheets;

use sheets::{SheetRow, append_row, read_sheet, update_row_by_contract, delete_row_by_contract};

#[tauri::command]
async fn send_sms(phone: String, message: String, gateway_url: Option<String>) -> Result<String, String> {
    let url = gateway_url.unwrap_or_else(|| "http://192.168.100.35:8080/send-sms".to_string());
    println!("[SMS] Sending to {} via {}", phone, url);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let body = serde_json::json!({ "phone": phone, "message": message });
    let res = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| { println!("[SMS] Error: {}", e); e.to_string() })?;
    let text = res.text().await.map_err(|e| e.to_string())?;
    println!("[SMS] Response: {}", text);
    Ok(text)
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
