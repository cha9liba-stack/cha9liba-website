mod sheets;

use sheets::{SheetRow, append_row, read_sheet, update_row_by_contract, delete_row_by_contract};

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
        .invoke_handler(tauri::generate_handler![
            sheets_read,
            sheets_append,
            sheets_update,
            sheets_delete,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
