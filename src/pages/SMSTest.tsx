import { useState } from "react";
import { sendSMS } from "../services/smsService";
import { MessageSquare, Send, CheckCircle, XCircle } from "lucide-react";

export default function SMSTest() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("Test depuis Palma Rent - SMS Gateway fonctionne ✓");
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSend() {
    if (!phone || !message) return;
    setStatus("sending");
    setError("");
    const result = await sendSMS(phone, message);
    if (result.success) {
      setStatus("ok");
    } else {
      setStatus("error");
      setError(result.error ?? "Unknown error");
    }
  }

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg border border-slate-100">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="text-green-500" size={22} />
        <h2 className="text-lg font-bold text-slate-800">Test SMS Gateway</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Numéro de téléphone</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="ex: 21612345678"
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Message</label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-300 resize-none"
          />
        </div>

        <button
          onClick={handleSend}
          disabled={status === "sending" || !phone || !message}
          className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          <Send size={16} />
          {status === "sending" ? "Envoi en cours..." : "Envoyer SMS"}
        </button>

        {status === "ok" && (
          <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl text-sm">
            <CheckCircle size={16} /> SMS envoyé avec succès !
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl text-sm">
            <XCircle size={16} /> Erreur: {error}
            <p className="mt-1 text-xs text-red-400">Vérifiez que l&apos;app SMS Gateway est active sur votre téléphone et connectée au même WiFi.</p>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4 text-center">
        Gateway: 192.168.100.35:8080
      </p>
    </div>
  );
}
