import { useState } from "react";
import { X, Send } from "lucide-react";
import { sendSMS } from "../../services/smsService";
import { getSMSConfig } from "../../lib/smsConfig";
import type { Contract } from "../../types";

interface Props {
  contract: Contract;
  onClose: () => void;
}

export default function SMSComposeModal({ contract, onClose }: Props) {
  const config = getSMSConfig();
  const [message, setMessage] = useState(
    `Bonjour ${contract.driverName}, `
  );
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<"ok" | "error" | null>(null);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    const res = await sendSMS(contract.driverPhone, message, config);
    setSending(false);
    setResult(res.success ? "ok" : "error");
    if (res.success) setTimeout(onClose, 1200);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">Envoyer SMS</h2>
            <p className="text-xs text-slate-400 mt-0.5">{contract.driverName} — {contract.driverPhone}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6">
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={5}
            autoFocus
            className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
            placeholder="Écrivez votre message..."
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-slate-400">{message.length} caractères</span>
            {result === "ok" && <span className="text-xs text-green-600 font-medium">✓ Envoyé avec succès</span>}
            {result === "error" && <span className="text-xs text-red-500">✗ Échec de l&apos;envoi</span>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl">Annuler</button>
          <button onClick={handleSend} disabled={sending || !message.trim()}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
            <Send size={14} />
            {sending ? "Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
