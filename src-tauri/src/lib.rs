mod sheets;

use sheets::{SheetRow, append_row, read_sheet, update_row_by_contract, delete_row_by_contract};
use std::io::Write;
use std::sync::Mutex;
use tauri::State;
use serde::{Deserialize, Serialize};
use serde_json::json;
use chrono::{NaiveDate, NaiveDateTime};

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
async fn get_gps_odometer(registration: String) -> Result<Option<u64>, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| e.to_string())?;

    // Get saved session from Firebase
    let session_res = client.get("https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/app_settings/gps_session.json")
        .send().await.map_err(|e| format!("خطأ في جلب الجلسة من Firebase: {}", e))?;
    let session_data: serde_json::Value = session_res.json().await.unwrap_or(serde_json::json!({}));
    let phpsessid = session_data["phpsessid"].as_str().unwrap_or("").to_string();

    if phpsessid.is_empty() {
        return Err("لا توجد جلسة GPS — الرجاء: 1) اضغط على زر 'Ouvrir WiniGPS'، 2) سجل الدخول في WiniGPS، 3) انسخ PHPSESSID من المتصفح (F12 → Application → Cookies)، 4) الصق واحفظ في التطبيق".to_string());
    }

    let res = client.post("https://www.winigps.tn/func/fn_settings.objects.php")
        .header("Content-Type", "application/x-www-form-urlencoded")
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .header("Referer", "https://www.winigps.tn/tracking.php")
        .header("Cookie", format!("PHPSESSID={}", phpsessid))
        .body("cmd=load_object_data")
        .send().await.map_err(|e| format!("خطأ في جلب بيانات GPS: {}", e))?;

    let status = res.status();
    let text = res.text().await.map_err(|e| format!("خطأ في قراءة الاستجابة: {}", e))?;

    if !status.is_success() {
        return Err(format!("GPS API أرجع الحالة {}: {}", status, text));
    }

    if text.is_empty() {
        return Err("استجابة فارغة — الجلسة قد تكون منتهية. الرجاء تحديث PHPSESSID.".to_string());
    }

    let data: serde_json::Value = serde_json::from_str(&text)
        .map_err(|e| format!("خطأ في تحليل JSON: {}. الاستجابة: {}", e, &text[..text.len().min(200)]))?;

    let norm_target = registration.replace(" ", "").to_uppercase();

    // Also try reversed order for matching
    let reversed_target = if let Some(tu_pos) = norm_target.find("TU") {
        let (left, right) = norm_target.split_at(tu_pos);
        let right = right.strip_prefix("TU").unwrap_or(right);
        format!("{}TU{}", right, left)
    } else {
        norm_target.clone()
    };

    if let Some(obj) = data.as_object() {
        for (_, arr) in obj {
            if let Some(arr) = arr.as_array() {
                if let Some(name) = arr.get(4).and_then(|v| v.as_str()) {
                    if let Some(reg) = extract_reg(name) {
                        // Try both original and reversed order
                        if reg == norm_target || reg == reversed_target {
                            // Try to find odometer in different indices
                            if let Some(odo) = arr.get(16).and_then(|v| v.as_u64()) {
                                return Ok(Some(odo));
                            } else if let Some(odo) = arr.get(17).and_then(|v| v.as_u64()) {
                                return Ok(Some(odo));
                            } else if let Some(odo) = arr.get(18).and_then(|v| v.as_u64()) {
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
                // skip spaces
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
        // WiniGPS may store as "240tu4485" or "4485tu240" or "229tu566"
        // Try to match against known Tunisian formats
        // Format 1: 4 digits + TU + 3 digits (e.g., 4485TU240)
        // Format 2: 3 digits + TU + 3 digits (e.g., 229TU566)
        // Determine order: the longer part usually comes first
        let (left, right) = if digits1.len() >= digits2.len() {
            (digits1.as_str(), digits2.as_str())
        } else {
            (digits2.as_str(), digits1.as_str())
        };
        Some(format!("{}TU{}", left, right))
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
            var u = document.querySelector('input[type="text"]');
            var p = document.querySelector('input[type="password"]');
            var btn = document.querySelector('button[type="submit"], input[type="submit"]');
            if (u && p) {{
                u.value = '{}';
                p.value = '{}';
                u.dispatchEvent(new Event('input', {{bubbles:true}}));
                p.dispatchEvent(new Event('input', {{bubbles:true}}));
                if (btn) {{ setTimeout(function(){{ btn.click(); }}, 500); }}
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
