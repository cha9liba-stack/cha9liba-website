import { useEffect, useState } from "react";
import { Navigation, Settings, Save, Trash2, CheckCircle, ExternalLink, Monitor, Smartphone, Loader } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

export default function GPSTest() {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [savedCredentials, setSavedCredentials] = useState<{ username: string; password: string } | null>(null);
  const [showInput, setShowInput] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  async function loadSavedCredentials() {
    try {
      const res = await fetch(`${DB}/app_settings/gps_credentials.json`);
      const data = await res.json();
      if (data?.username && data?.password) {
        setSavedCredentials({ username: data.username, password: data.password });
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  }

  async function saveCredentials() {
    if (!credentials.username.trim() || !credentials.password.trim()) return;
    setLoading(true);
    try {
      await fetch(`${DB}/app_settings/gps_credentials.json`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: credentials.username.trim(), 
          password: credentials.password.trim(),
          updated: Date.now() 
        }),
      });
      setSavedCredentials({ 
        username: credentials.username.trim(), 
        password: credentials.password.trim() 
      });
      setTestResult("✓ Identifiants sauvegardés");
      setCredentials({ username: "", password: "" });
      setShowInput(false);
      setConnectionStatus("connected");
    } catch {
      setTestResult("✗ Erreur de sauvegarde");
    }
    setLoading(false);
  }

  async function deleteCredentials() {
    if (!confirm("Supprimer les identifiants GPS?")) return;
    setLoading(true);
    try {
      await fetch(`${DB}/app_settings/gps_credentials.json`, { method: "DELETE" });
      setSavedCredentials(null);
      setTestResult("✓ Identifiants supprimés");
      setConnectionStatus("disconnected");
      setShowInput(true);
    } catch {
      setTestResult("✗ Erreur de suppression");
    }
    setLoading(false);
  }

  async function openWiniGPS() {
    setOpening(true);
    try {
      await invoke("open_gps_window");
    } catch (e) {
      console.error("Failed to open GPS window:", e);
      setTestResult("Erreur: Essayez l'application bureau");
    }
    setOpening(false);
  }

  function openInBrowser() {
    window.open("https://www.winigps.tn", "_blank");
  }

  return (
    <div className="p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Navigation size={20} className="text-amber-500" />
          GPS - WiniGPS
        </h1>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"
          }`} />
          <span className="text-xs text-slate-500">
            {connectionStatus === "connected" ? "Connecté" : "Non connecté"}
          </span>
        </div>
      </div>

      {/* Open GPS Options */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-slate-700">Ouvrir WiniGPS</h2>
        
        {savedCredentials ? (
          <div className="space-y-3">
            {/* App Option - Uses Tauri */}
            <button 
              onClick={openWiniGPS}
              disabled={opening}
              className="w-full flex items-center justify-center gap-3 py-4 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {opening ? (
                <>
                  <Loader size={20} className="animate-spin" />
                 Ouverture...
                </>
              ) : (
                <>
                  <Monitor size={20} />
                 Ouvrir dans l'application (Recommandé)
                </>
              )}
            </button>
            <p className="text-xs text-center text-slate-500">
              Ouvre une fenêtre intégrée avec connexion automatique
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 rounded-lg">
            <Settings size={18} className="text-amber-600" />
            <span className="text-sm text-amber-700">Configurez d'abord les identifiants</span>
          </div>
        )}

        {/* Browser Option */}
        <div className="relative py-px">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-400">ou</span>
          </div>
        </div>

        <button 
          onClick={openInBrowser}
          className="w-full flex items-center justify-center gap-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
        >
          <ExternalLink size={18} />
          Ouvrir dans le navigateur
        </button>
      </div>

      {/* Credentials Configuration */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Settings size={16} className="text-amber-500" />
          Configuration des identifiants
        </h2>

        {savedCredentials && !showInput ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle size={20} className="text-green-600" />
              <div>
                <p className="font-medium text-green-800">Identifiants configurés</p>
                <p className="text-xs text-green-600 font-mono">{savedCredentials.username}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowInput(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm font-medium"
              >
                <Settings size={14} />
                Modifier
              </button>
              <button 
                onClick={deleteCredentials}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
              >
                <Trash2 size={14} />
                Supprimer
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-3 text-xs text-slate-600">
              <p className="font-semibold mb-2">Entrez vos identifiants WiniGPS:</p>
              <p>Ces identifiants seront utilisés pour la connexion automatique</p>
            </div>

            <input
              type="text"
              value={credentials.username}
              onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
              placeholder="Nom d'utilisateur"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <input
              type="password"
              value={credentials.password}
              onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
              placeholder="Mot de passe"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />

            <button 
              onClick={saveCredentials}
              disabled={!credentials.username.trim() || !credentials.password.trim() || loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Save size={14} />
              Sauvegarder
            </button>
          </div>
        )}

        {testResult && (
          <p className={`mt-3 text-sm font-medium text-center ${testResult.includes("✓") ? "text-green-600" : "text-red-600"}`}>
            {testResult}
          </p>
        )}
      </div>

      {/* Info */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h3 className="font-semibold text-slate-700 text-sm mb-2">Informations</h3>
        <ul className="text-xs text-slate-600 space-y-1">
          <li>• التطبيق يفتح نافذة مدمجة مع تسجيل الدخول التلقائي</li>
          <li>• يجب حفظ اسم المستخدم وكلمة المرور</li>
          <li>• يتطلب تشغيل التطبيق على Tauri (desktop)</li>
        </ul>
      </div>
    </div>
  );
}
