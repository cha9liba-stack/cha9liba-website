import { invoke } from "@tauri-apps/api/core";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

export async function getOdometerForReg(registration: string): Promise<number | null> {
  try {
    // Get credentials from Firebase
    const res = await fetch(`${DB}/app_settings/gps_credentials.json`);
    const creds = await res.json();
    if (!creds?.username || !creds?.password) return null;

    // Use Tauri invoke to bypass CORS
    const km = await invoke<number | null>("get_gps_odometer", {
      registration: registration.replace(/\s+/g, "").toUpperCase(),
      username: creds.username,
      password: creds.password,
    });
    return km;
  } catch {
    return null;
  }
}
