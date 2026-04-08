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
async fn get_gps_odometer(registration: String, username: String, password: String) -> Result<Option<u64>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .cookie_store(true)
        .build()
        .map_err(|e| e.to_string())?;

    client.post("https://www.winigps.tn/func/fn_connect.php")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(format!("cmd=login&login={}&password={}",
            urlencoding::encode(&username),
            urlencoding::encode(&password)))
        .send().await.map_err(|e| e.to_string())?;

    let res = client.post("https://www.winigps.tn/func/fn_settings.objects.php")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body("cmd=load_object_data")
        .send().await.map_err(|e| e.to_string())?;

    let data: serde_json::Value = res.json().await.map_err(|e| e.to_string())?;
    let norm_target = registration.replace(" ", "").to_uppercase();

    if let Some(obj) = data.as_object() {
        for (_, arr) in obj {
            if let Some(arr) = arr.as_array() {
                if let Some(name) = arr.get(4).and_then(|v| v.as_str()) {
                    if let Some(reg) = extract_reg(name) {
                        if reg == norm_target {
                            if let Some(odo) = arr.get(16).and_then(|v| v.as_u64()) {
                                return Ok(Some(odo));
                            }
                        }
                    }
                }
            }
        }
    }
    Ok(None)
}

fn extract_reg(name: &str) -> Option<String> {
    let name_lower = name.to_lowercase();
    let chars: Vec<char> = name_lower.chars().collect();
    let mut digits1 = String::new();
    let mut digits2 = String::new();
    let mut found_tu = false;
    let mut i = 0;
    while i < chars.len() {
        if !found_tu {
            if chars[i].is_ascii_digit() {
                digits1.push(chars[i]);
            } else if i + 1 < chars.len() && chars[i] == 't' && chars[i+1] == 'u' {
                if !digits1.is_empty() { found_tu = true; i += 1; }
            } else if chars[i] == ' ' && !digits1.is_empty() {
                // skip
            } else if !digits1.is_empty() {
                digits1.clear();
            }
        } else {
            if chars[i].is_ascii_digit() {
                digits2.push(chars[i]);
            } else if !digits2.is_empty() {
                break;
            }
        }
        i += 1;
    }
    if !digits1.is_empty() && !digits2.is_empty() {
        Some(format!("{}TU{}", digits1, digits2))
    } else {
        None
    }
}

#[tauri::command]
async fn open_gps_window(app: tauri::AppHandle) -> Result<(), String> {
    use tauri::{Manager, WebviewWindowBuilder, WebviewUrl};

    if let Some(win) = app.get_webview_window("gps") {
        win.show().map_err(|e: tauri::Error| e.to_string())?;
        win.set_focus().map_err(|e: tauri::Error| e.to_string())?;
        return Ok(());
    }

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let creds_url = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/app_settings/gps_credentials.json";
    let creds: serde_json::Value = client.get(creds_url).send().await
        .map_err(|e| e.to_string())?
        .json().await
        .unwrap_or(serde_json::json!({}));

    let username = creds["username"].as_str().unwrap_or("").to_string();
    let password = creds["password"].as_str().unwrap_or("").to_string();

    let autologin_js = format!(r#"
        (function tryLogin() {{
            var u = document.querySelector('input[type="text"], input[name*="user"], input[name*="login"], input[id*="user"]');
            var p = document.querySelector('input[type="password"]');
            var btn = document.querySelector('button[type="submit"], input[type="submit"], .btn-login, button.connexion');
            if (u && p) {{
                u.value = '{}';
                p.value = '{}';
                u.dispatchEvent(new Event('input', {{bubbles:true}}));
                p.dispatchEvent(new Event('input', {{bubbles:true}}));
                if (btn) {{ setTimeout(function(){{ btn.click(); }}, 300); }}
            }} else {{
                setTimeout(tryLogin, 500);
            }}
        }})();
    "#, username, password);

    let win = WebviewWindowBuilder::new(&app, "gps", WebviewUrl::External("https://www.winigps.tn".parse().unwrap()))
        .title("WiniGPS — Palma Rent")
        .inner_size(1280.0, 800.0)
        .resizable(true)
        .initialization_script(&autologin_js)
        .build()
        .map_err(|e| e.to_string())?;

    let _ = win;
    Ok(())
}

#[tauri::command]
async fn save_and_open_pdf(base64_data: String, filename: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose};

    let pdf_bytes = general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|e| e.to_string())?;

    let temp_dir = std::env::temp_dir();
    let path = temp_dir.join(&filename);

    let mut file = std::fs::File::create(&path).map_err(|e| e.to_string())?;
    file.write_all(&pdf_bytes).map_err(|e| e.to_string())?;

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
async fn sheets_append(client_email: String, private_key: String, row: SheetRow) -> Result<(), String> {
    append_row(&client_email, &private_key, &row).await
}

#[tauri::command]
async fn sheets_update(client_email: String, private_key: String, row: SheetRow) -> Result<(), String> {
    update_row_by_contract(&client_email, &private_key, &row).await
}

#[tauri::command]
async fn sheets_delete(client_email: String, private_key: String, contract_number: String) -> Result<(), String> {
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
            open_gps_window,
            get_gps_odometer,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
