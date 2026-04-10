import { useState, useRef } from "react";
import { X, Printer, Truck } from "lucide-react";

interface Props {
  onClose: () => void;
  defaultClientName?: string;
  defaultPhone?: string;
  defaultAddress?: string;
}

export default function DeliveryReceipt({ onClose, defaultClientName = "", defaultPhone = "", defaultAddress = "" }: Props) {
  const [form, setForm] = useState({
    clientName: defaultClientName,
    phone: defaultPhone,
    address: defaultAddress,
    service: "Livraison véhicule",
    amount: "",
    driverName: "",
    notes: "",
    date: new Date().toLocaleDateString("fr-FR"),
  });
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=600,height=700");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Bon de livraison</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; padding: 30px; color: #1e293b; }
        .header { text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 16px; margin-bottom: 20px; }
        .logo { font-size: 20px; font-weight: bold; color: #f59e0b; }
        .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
        .title { font-size: 18px; font-weight: bold; text-align: center; margin: 16px 0; text-transform: uppercase; letter-spacing: 2px; color: #1e293b; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13px; }
        .label { color: #64748b; }
        .value { font-weight: 600; color: #1e293b; }
        .amount-box { margin: 20px 0; background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; text-align: center; }
        .amount-label { font-size: 12px; color: #92400e; margin-bottom: 4px; }
        .amount-value { font-size: 28px; font-weight: bold; color: #92400e; }
        .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
        .sig-box { text-align: center; width: 45%; }
        .sig-line { border-top: 1px solid #94a3b8; margin-top: 50px; padding-top: 6px; font-size: 11px; color: #64748b; }
        .notes { margin-top: 16px; padding: 10px; background: #f8fafc; border-radius: 6px; font-size: 12px; color: #475569; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
      </style>
      </head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Truck size={18} className="text-amber-500" />
            <h2 className="font-bold text-slate-800">Bon de livraison</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Nom du client *</label>
              <input value={form.clientName} onChange={e => set("clientName", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Téléphone</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Adresse de livraison *</label>
            <input value={form.address} onChange={e => set("address", e.target.value)}
              placeholder="ex: Rue de la République, Tunis"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Service</label>
            <input value={form.service} onChange={e => set("service", e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Montant (TND) *</label>
              <input type="number" value={form.amount} onChange={e => set("amount", e.target.value)}
                placeholder="0.000"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Livreur</label>
              <input value={form.driverName} onChange={e => set("driverName", e.target.value)}
                placeholder="Nom du livreur"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium">
            <Printer size={15} /> Imprimer
          </button>
        </div>
      </div>

      {/* Hidden print content */}
      <div className="hidden">
        <div ref={printRef}>
          <div className="header">
            <div className="logo">Ste Palma Rent a Car</div>
            <div className="subtitle">Avenue du Tunis Kelibia 8090 · Tél: 72 208711 / 22 843 531</div>
          </div>
          <div className="title">Bon de Livraison</div>
          <div className="row"><span className="label">Date</span><span className="value">{form.date}</span></div>
          <div className="row"><span className="label">Client</span><span className="value">{form.clientName}</span></div>
          {form.phone && <div className="row"><span className="label">Téléphone</span><span className="value">{form.phone}</span></div>}
          <div className="row"><span className="label">Adresse de livraison</span><span className="value">{form.address}</span></div>
          <div className="row"><span className="label">Service</span><span className="value">{form.service}</span></div>
          {form.driverName && <div className="row"><span className="label">Livreur</span><span className="value">{form.driverName}</span></div>}
          {form.amount && (
            <div className="amount-box">
              <div className="amount-label">MONTANT À PERCEVOIR</div>
              <div className="amount-value">{parseFloat(form.amount || "0").toFixed(3)} TND</div>
            </div>
          )}
          {form.notes && <div className="notes">Notes: {form.notes}</div>}
          <div className="signatures">
            <div className="sig-box"><div className="sig-line">Signature livreur</div></div>
            <div className="sig-box"><div className="sig-line">Signature client</div></div>
          </div>
          <div className="footer">Ste Palma Rent a Car · MF: 1021113/G/A/M/000 · ste.palmacar@gmail.com</div>
        </div>
      </div>
    </div>
  );
}
