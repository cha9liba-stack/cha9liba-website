import { useState } from "react";
import { Navigation, ExternalLink, Monitor } from "lucide-react";

export default function GPS() {
  const [iframeError, setIframeError] = useState(false);
  const [opened, setOpened] = useState(false);

  async function openInTauri() {
    try {
      const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
      const existing = WebviewWindow.getByLabel("gps");
      if (existing) { await existing.show(); await existing.setFocus(); return; }
      new WebviewWindow("gps", {
        url: "https://www.winigps.tn",
        title: "WiniGPS",
        width: 1200,
        height: 800,
      });
      setOpened(true);
    } catch {
      // Not in Tauri — open in browser
      window.open("https://www.winigps.tn", "_blank");
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="flex items-center gap-3 px-5 py-3 bg-slate-800 border-b border-slate-700">
        <Navigation size={16} className="text-amber-400" />
        <span className="text-white font-semibold text-sm">WiniGPS</span>
        <div className="ms-auto flex items-center gap-2">
          <button onClick={openInTauri}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs rounded-lg transition-colors">
            <Monitor size={13} /> Ouvrir dans une fenêtre
          </button>
          <a href="https://www.winigps.tn" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors">
            <ExternalLink size={13} /> Navigateur
          </a>
        </div>
      </div>

      {!iframeError ? (
        <iframe
          src="https://www.winigps.tn"
          className="flex-1 w-full border-none"
          title="WiniGPS"
          allow="geolocation"
          onError={() => setIframeError(true)}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-slate-50">
          <Navigation size={48} className="text-slate-300" />
          <p className="text-slate-500 text-sm">Le site WiniGPS ne peut pas être intégré directement.</p>
          <button onClick={openInTauri}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors">
            <Monitor size={16} /> Ouvrir WiniGPS
          </button>
        </div>
      )}
    </div>
  );
}
