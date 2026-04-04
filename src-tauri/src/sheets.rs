use chrono::Utc;
use jsonwebtoken::{encode, Algorithm, EncodingKey, Header};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};

const SPREADSHEET_ID: &str = "1XWSeWTa5HWtg9TZ0C3MGsH0UZxAxl5zs6hXm4ExSV-w";
const SHEET_NAME: &str = "Feuille 1"; // Update if tab name is different
const SCOPES: &str = "https://www.googleapis.com/auth/spreadsheets";

// Column order matching the Sheet headers
const HEADERS: &[&str] = &[
    "voiture", "SERIE", "SORTIE", "ENTREE", "Nom",
    "N TEL", "I", "N J", "Taxe 2d", "Montant T",
    "Avance", "Reste", "N°C",
];

#[derive(Debug, Serialize, Deserialize)]
struct JwtClaims {
    iss: String,
    scope: String,
    aud: String,
    exp: i64,
    iat: i64,
}

#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SheetRow {
    pub voiture: String,
    pub serie: String,
    pub sortie: String,
    pub entree: String,
    pub nom: String,
    pub tel: String,
    pub i: String,
    pub nj: String,
    pub taxe2d: String,
    pub montant_t: String,
    pub avance: String,
    pub reste: String,
    pub num_contrat: String,
}

async fn get_access_token(client_email: &str, private_key: &str) -> Result<String, String> {
    let now = Utc::now().timestamp();
    let claims = JwtClaims {
        iss: client_email.to_string(),
        scope: SCOPES.to_string(),
        aud: "https://oauth2.googleapis.com/token".to_string(),
        exp: now + 3600,
        iat: now,
    };

    let key = EncodingKey::from_rsa_pem(private_key.as_bytes())
        .map_err(|e| format!("Invalid private key: {}", e))?;

    let mut header = Header::new(Algorithm::RS256);
    header.typ = Some("JWT".to_string());

    let jwt = encode(&header, &claims, &key)
        .map_err(|e| format!("JWT encode error: {}", e))?;

    let client = Client::new();
    let resp = client
        .post("https://oauth2.googleapis.com/token")
        .form(&[
            ("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer"),
            ("assertion", &jwt),
        ])
        .send()
        .await
        .map_err(|e| format!("Token request failed: {}", e))?;

    let token: TokenResponse = resp
        .json()
        .await
        .map_err(|e| format!("Token parse error: {}", e))?;

    Ok(token.access_token)
}

/// Read all rows from the Sheet
pub async fn read_sheet(client_email: &str, private_key: &str) -> Result<Vec<SheetRow>, String> {
    let token = get_access_token(client_email, private_key).await?;
    let client = Client::new();

    let range = format!("{}!A2:M", SHEET_NAME);
    let url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}",
        SPREADSHEET_ID, range
    );

    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Sheets read error: {}", e))?;

    let body: Value = resp
        .json()
        .await
        .map_err(|e| format!("Sheets parse error: {}", e))?;

    let rows = body["values"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    let result = rows
        .iter()
        .map(|row| {
            let get = |i: usize| -> String {
                row.get(i)
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .to_string()
            };
            SheetRow {
                voiture:     get(0),
                serie:       get(1),
                sortie:      get(2),
                entree:      get(3),
                nom:         get(4),
                tel:         get(5),
                i:           get(6),
                nj:          get(7),
                taxe2d:      get(8),
                montant_t:   get(9),
                avance:      get(10),
                reste:       get(11),
                num_contrat: get(12),
            }
        })
        .collect();

    Ok(result)
}

/// Append a new row to the Sheet
pub async fn append_row(
    client_email: &str,
    private_key: &str,
    row: &SheetRow,
) -> Result<(), String> {
    let token = get_access_token(client_email, private_key).await?;
    let client = Client::new();

    let range = format!("{}!A:M", SHEET_NAME);
    let url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS",
        SPREADSHEET_ID, range
    );

    let values = json!({
        "values": [[
            row.voiture, row.serie, row.sortie, row.entree,
            row.nom, row.tel, row.i, row.nj, row.taxe2d,
            row.montant_t, row.avance, row.reste, row.num_contrat
        ]]
    });

    client
        .post(&url)
        .bearer_auth(&token)
        .json(&values)
        .send()
        .await
        .map_err(|e| format!("Append error: {}", e))?;

    Ok(())
}

/// Update an existing row by contract number (N°C column = col M)
pub async fn update_row_by_contract(
    client_email: &str,
    private_key: &str,
    row: &SheetRow,
) -> Result<(), String> {
    let token = get_access_token(client_email, private_key).await?;
    let client = Client::new();

    // First find the row index
    let range = format!("{}!M:M", SHEET_NAME);
    let url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}",
        SPREADSHEET_ID, range
    );

    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    let body: Value = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let col_values = body["values"].as_array().cloned().unwrap_or_default();

    // Find row index (1-based, +1 for header)
    let row_index = col_values.iter().enumerate().find_map(|(i, v)| {
        let cell = v.get(0).and_then(|c| c.as_str()).unwrap_or("");
        if cell == row.num_contrat { Some(i + 1) } else { None }
    });

    let row_num = match row_index {
        Some(i) => i + 1, // +1 for header row
        None => {
            // Row not found, append instead
            return append_row(client_email, private_key, row).await;
        }
    };

    let update_range = format!("{}!A{}:M{}", SHEET_NAME, row_num, row_num);
    let update_url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}?valueInputOption=USER_ENTERED",
        SPREADSHEET_ID, update_range
    );

    let values = json!({
        "values": [[
            row.voiture, row.serie, row.sortie, row.entree,
            row.nom, row.tel, row.i, row.nj, row.taxe2d,
            row.montant_t, row.avance, row.reste, row.num_contrat
        ]]
    });

    client
        .put(&update_url)
        .bearer_auth(&token)
        .json(&values)
        .send()
        .await
        .map_err(|e| format!("Update error: {}", e))?;

    Ok(())
}

/// Delete a row by contract number
pub async fn delete_row_by_contract(
    client_email: &str,
    private_key: &str,
    contract_number: &str,
) -> Result<(), String> {
    let token = get_access_token(client_email, private_key).await?;
    let client = Client::new();

    // Find row index
    let range = format!("{}!M:M", SHEET_NAME);
    let url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}",
        SPREADSHEET_ID, range
    );

    let resp = client
        .get(&url)
        .bearer_auth(&token)
        .send()
        .await
        .map_err(|e| format!("Read error: {}", e))?;

    let body: Value = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let col_values = body["values"].as_array().cloned().unwrap_or_default();

    let row_index = col_values.iter().enumerate().find_map(|(i, v)| {
        let cell = v.get(0).and_then(|c| c.as_str()).unwrap_or("");
        if cell == contract_number { Some(i) } else { None }
    });

    let sheet_row_index = match row_index {
        Some(i) => i as i64, // 0-based for batchUpdate
        None => return Ok(()), // not found, nothing to delete
    };

    // Get sheet ID (tab ID) — default first sheet is 0, but we need to check
    // For simplicity we use sheetId=0; update if your tab is not the first
    let delete_url = format!(
        "https://sheets.googleapis.com/v4/spreadsheets/{}/values/{}!A{}:M{}:clear",
        SPREADSHEET_ID, SHEET_NAME,
        sheet_row_index + 1,
        sheet_row_index + 1
    );

    client
        .post(&delete_url)
        .bearer_auth(&token)
        .json(&json!({}))
        .send()
        .await
        .map_err(|e| format!("Delete error: {}", e))?;

    Ok(())
}
