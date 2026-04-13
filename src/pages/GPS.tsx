import { useEffect, useState } from "react";
import { Navigation, Save, Trash2, CheckCircle, ExternalLink, Monitor, Loader, Info } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

export default function GPS() {
  const [testResult, setTestResult] = useState<string>("");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [savedCredentials, setSavedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [showInput, setShowInput] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [opening, setOpening] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    // Check if running in Tauri
    setIsTauri(typeof window !== "undefined" && "__TAURI_INTERNALS__" in window);
    
    // Load saved credentials
    fetch(`${DB}/app_settings/gps_credentials.json`)
      .then(r => r.json())
      .then(d => { 
        if (d?.username && d?.password) {
          setSavedCredentials({ username: d.username, password: d.password });
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("disconnected");
        }
      })
      .catch(() => setConnectionStatus("disconnected"));
  }, []);

  async function saveCredentials() {
    if (!credentials.username.trim() || !credentials.password.trim()) return;
    await fetch(`${DB}/app_settings/gps_credentials.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        username: credentials.username.trim(), 
        password: credentials.password.trim(),
        updated: Date.now() 
      }),
    });
    setSavedCredentials({ username: credentials.username.trim(), password: credentials.password.trim() });
    setTestResult("✓ Identifiants sauvegardés");
    setCredentials({ username: "", password: "" });
    setShowInput(false);
    setConnectionStatus("connected");
  }

  async function deleteCredentials() {
    if (!confirm("Supprimer les identifiants GPS?")) return;
    await fetch(`${DB}/app_settings/gps_credentials.json`, { method: "DELETE" });
    setSavedCredentials(null);
    setTestResult("✓ Identifiants supprimés");
    setShowInput(true);
    setConnectionStatus("disconnected");
  }

  async function openGPS() {
    setOpening(true);
    try {
      // Try Tauri command first
      await invoke("open_gps_window");
    } catch {
      // Fallback to browser
      window.open("https://www.winigps.tn", "_blank");
    }
    setOpening(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 p-4">
      {/* Logo and Title */}
      <div className="text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
          <Navigation size={36} className="text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">WiniGPS</h2>
        
        {/* Status */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === "connected" ? "bg-green-500" :
            connectionStatus === "checking" ? "bg-yellow-500 animate-pulse" :
            "bg-red-500"
          }`} />
          <span className="text-sm text-slate-500">
            {connectionStatus === "connected" ? "متصل" :
             connectionStatus === "checking" ? "جاري التحقق..." :
             "غير متصل"}
          </span>
        </div>
      </div>

      {/* Open Button */}
      <button 
        onClick={openGPS}
        disabled={opening}
        className="flex items-center gap-3 px-8 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-2xl font-semibold text-lg transition-all hover:scale-105"
      >
        {opening ? (
          <>
            <Loader size={20} className="animate-spin" />
            <span>Ouverture...</span>
          </>
        ) : (
          <>
            {isTauri ? <Monitor size={20} /> : <ExternalLink size={20} />}
            <span>{isTauri ? "Ouvrir dans l'application" : "Ouvrir WiniGPS"}</span>
          </>
        )}
      </button>

      {/* Credentials Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-slate-700">Configuration</p>
          {isTauri && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              Application bureau
            </span>
          )}
        </div>

        {savedCredentials && !showInput ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-green-700">Identifiants configurés</span>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowInput(true)}
                className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm"
              >
                Modifier
              </button>
              <button 
                onClick={deleteCredentials}
                className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm"
              >
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Nom d'utilisateur"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Mot de passe"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button 
              onClick={saveCredentials}
              disabled={!credentials.username.trim() || !credentials.password.trim()}
              className="w-full py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm"
            >
              Sauvegarder
            </button>
          </div>
        )}

        {testResult && (
          <p className="text-sm text-center text-green-600 font-medium">{testResult}</p>
        )}
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 text-xs text-slate-500 max-w-md text-center">
        <Info size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p>
          {isTauri 
            ? "L'application ouvre une fenêtre intégrée avec connexion automatique"
            : "Sauvegardez vos identifiants pour une connexion rapide"}
        </p>
      </div>
    </div>
  );
}
