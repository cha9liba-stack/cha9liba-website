import { useEffect } from "react";
import { Navigation } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

export default function GPS() {
  useEffect(() => { openGPS(); }, []);

  async function openGPS() {
    try {
      await invoke("open_gps_window");
    } catch {
      window.open("https://www.winigps.tn", "_blank");
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6 bg-slate-50">
      <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center">
        <Navigation size={40} className="text-amber-500" />
      </div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-1">WiniGPS</h2>
        <p className="text-sm text-slate-500">Ouverture en cours...</p>
      </div>
      <button onClick={openGPS}
        className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-sm transition-colors shadow-md">
        <Navigation size={18} /> Ouvrir WiniGPS
      </button>
    </div>
  );
}
