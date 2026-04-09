import { useEffect, useState } from "react";
import { Navigation, Save } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

export default function GPS() {
  const [testResult, setTestResult] = useState<string>("");
  const [phpsessid, setPhpsessid] = useState<string>("");
  const [savedSession, setSavedSession] = useState<string>("");
  const [showInput, setShowInput] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");

  useEffect(() => {
    // Load saved session
    fetch(`${DB}/app_settings/gps_session.json`)
      .then(r => r.json())
      .then(d => { if (d?.phpsessid) setSavedSession(d.phpsessid.slice(0, 8) + "..."); })
      .catch(() => {});

    // Check GPS connection
    checkGPSConnection();
  }, []);

  async function checkGPSConnection() {
    setConnectionStatus("checking");
    try {
      const sessionRes = await fetch(`${DB}/app_settings/gps_session.json`);
      const sessionData = await sessionRes.json();
      if (sessionData?.phpsessid) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  }

  async function saveSession() {
    if (!phpsessid.trim()) return;
    await fetch(`${DB}/app_settings/gps_session.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phpsessid: phpsessid.trim(), updated: Date.now() }),
    });
    setSavedSession(phpsessid.trim().slice(0, 8) + "...");
    setTestResult("✓ Session sauvegardée");
    setPhpsessid("");
    setShowInput(false);
  }

  async function deleteSession() {
    await fetch(`${DB}/app_settings/gps_session.json`, {
      method: "DELETE",
    });
    setSavedSession("");
    setTestResult("✓ Session supprimée");
    setShowInput(true);
  }

  async function openGPS() {
    try {
      await invoke("open_gps_window");
    } catch {
      window.open("https://www.winigps.tn", "_blank");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-slate-50 p-4">
      <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
        <Navigation size={32} className="text-amber-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">WiniGPS</h2>

      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${
          connectionStatus === "connected" ? "bg-green-500" :
          connectionStatus === "checking" ? "bg-yellow-500 animate-pulse" :
          "bg-red-500"
        }`} />
        <span className="text-xs text-slate-500">
          {connectionStatus === "connected" ? "متصل" :
           connectionStatus === "checking" ? "جاري التحقق..." :
           "غير متصل"}
        </span>
      </div>

      <button onClick={openGPS}
        className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors">
        <Navigation size={16} /> Ouvrir WiniGPS
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-4 max-w-md w-full space-y-3">
        <p className="text-sm font-semibold text-slate-700">Configuration session GPS</p>

        {savedSession && !showInput ? (
          <div className="space-y-3">
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-1.5">
              ✓ Session active: {savedSession}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowInput(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm transition-colors">
                Modifier
              </button>
              <button onClick={deleteSession}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold">Comment obtenir le PHPSESSID:</p>
              <p>1. Ouvrez WiniGPS et connectez-vous</p>
              <p>2. F12 → Application → Cookies → winigps.tn</p>
              <p>3. Copiez la valeur de PHPSESSID</p>
              <p>4. Collez-la ci-dessous et sauvegardez</p>
            </div>

            <input
              value={phpsessid}
              onChange={e => setPhpsessid(e.target.value)}
              placeholder="Collez PHPSESSID ici..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <button onClick={saveSession} disabled={!phpsessid.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm transition-colors">
              <Save size={14} /> Sauvegarder la session
            </button>
          </div>
        )}
      </div>

      {testResult && (
        <p className="text-sm font-mono bg-white border border-slate-200 rounded-lg px-4 py-2 text-slate-700">{testResult}</p>
      )}
    </div>
  );
}
