import { useState } from "react";
import { X, Plus, Trash2, Save } from "lucide-react";
import { getSMSConfig, saveSMSConfig, type SMSConfig } from "../../lib/smsConfig";

interface Props { onClose: () => void }

export default function SMSSettingsModal({ onClose }: Props) {
  const [config, setConfig] = useState<SMSConfig>(getSMSConfig());
  const [newPhone, setNewPhone] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveSMSConfig(config);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  }

  function addPhone() {
    const p = newPhone.trim();
    if (!p || config.notifyPhones.includes(p)) return;
    setConfig(c => ({ ...c, notifyPhones: [...c.notifyPhones, p] }));
    setNewPhone("");
  }

  function removePhone(phone: string) {
    setConfig(c => ({ ...c, notifyPhones: c.notifyPhones.filter(p => p !== phone) }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Paramètres SMS Gateway</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Gateway URL */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">URL du Gateway SMS</label>
            <input
              value={config.gatewayUrl}
              onChange={e => setConfig(c => ({ ...c, gatewayUrl: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              placeholder="http://192.168.x.x:8080/send-sms"
            />
          </div>

          {/* Reminder template */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">
              Modèle de rappel automatique
              <span className="text-xs text-slate-400 ml-2">Variables: {"{nom}"} {"{marque}"} {"{immat}"} {"{date}"} {"{heure}"}</span>
            </label>
            <textarea
              value={config.reminderTemplate}
              onChange={e => setConfig(c => ({ ...c, reminderTemplate: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
            />
          </div>

          {/* Hours before */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Envoyer le rappel (heures avant retour)</label>
            <input
              type="number"
              min={1} max={24}
              value={config.reminderHoursBefore}
              onChange={e => setConfig(c => ({ ...c, reminderHoursBefore: Number(e.target.value) }))}
              className="w-32 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
            />
          </div>

          {/* Notify phones */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Numéros à notifier lors de chaque envoi</label>
            <div className="space-y-2 mb-2">
              {config.notifyPhones.map(p => (
                <div key={p} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg text-sm">
                  <span className="text-slate-700">{p}</span>
                  <button onClick={() => removePhone(p)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addPhone()}
                placeholder="ex: 21655989223"
                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
              />
              <button onClick={addPhone} className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-xl">
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
          <button onClick={handleSave}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
            <Save size={15} />
            {saved ? "Enregistré ✓" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
