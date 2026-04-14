import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Printer } from "lucide-react";
import QRCode from "qrcode";
import type { Invoice } from "../../types/invoice";

interface Props { invoice: Invoice; onClose: () => void; }

const CO = {
  nameFr: "Ste Palma Rent a Car",
  nameAr: "شركة بالما لكراء السيارات",
  addrFr: "Avenue du Tunis kélibia 8090",
  addrAr: "شارع تونس قليبية 8090",
  email:  "ste.palmacar@gmail.com",
  tel:    "72 208711 / 22 843 531",
  telAr:  "72208711 / 22843531",
  mf:     "1021113/G/A/M/000",
  rib:    "11109000139400278805",
  ig:     "palma_car",
};

const B = "1px solid #ddd";
const BG = "1px solid #1a56db";

export default function InvoicePrint({ invoice, onClose }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const ref = useRef<HTMLDivElement>(null);

  const raw = invoice as any;
  const client = invoice.client || {
    name:    raw["معلومات_العميل"]?.["اسم_العميل"]         || "",
    mf:      raw["معلومات_العميل"]?.["رقم_بطاقة_التعريف"] || "",
    address: raw["معلومات_العميل"]?.["عنوان"]              || "",
    phone:   raw["معلومات_العميل"]?.["هاتف"]               || "",
  };
  const lines: any[] = invoice.lines?.length
    ? invoice.lines
    : (raw["العقود"] || []).map((c: any) => ({
        contractNumber: c["رقم العقد"] || "",
        date:           c["يوم الانطلاق"] || "",
        designation:    c["designation"] || "",
        days:           parseInt(c["عدد الأيام"] || "1") || 1,
        pricePerDay:    parseFloat(c["السعر في اليوم"] || "0") || 0,
        amount:         parseFloat(c["المبلغ"] || "0") || 0,
      }));

  const montantHT = invoice.montantHT ?? parseFloat(raw["المجموع_HT"] || "0");
  const tva       = invoice.tva       ?? parseFloat(raw["TVA"]         || "0");
  const tsl2dj    = invoice.tsl2dj    ?? 0;
  const timbre    = invoice.timbre    ?? parseFloat(raw["timbre"]      || "0");
  const totalTTC  = invoice.totalTTC  ?? parseFloat(raw["المجموع_TTC"] || "0");
  const invNum    = invoice.number    || raw["رقم الفاتورة"] || "";
  const invDate   = invoice.date      || raw["تاريخ الفاتورة"] || "";
  const invType   = (invoice.type     || raw["type"] || "facture") as string;
  const words     = invoice.amountInWords || "";

  const isDevis   = invType === "devis";
  const isFacture = invType === "facture";
  const typeLabel = { facture: "Facture", bon: "Bon de livraison", devis: "Devis" }[invType] || "Facture";
  const fmt = (n: number) => n.toFixed(3);

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  useEffect(() => {
    const baseUrl = window.location.origin;
    const qrText = `${baseUrl}/invoice?id=${invoice.id || invNum}`;
    QRCode.toDataURL(qrText, {
      width: 100,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl).catch(console.warn);
  }, [invNum, invDate, totalTTC, lines]);

  function handlePrint() {
    const content = ref.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}"><head>
      <meta charset="utf-8"/>
      <title>${typeLabel} ${invNum}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:13px;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        @page{margin:2mm;size:A4}
        body{padding:0}
        .inv-wrap{padding:4px!important}
        table{width:100%;border-collapse:collapse;table-layout:fixed}
        td,th{overflow:hidden}
        .blue-val{color:#1a56db!important;font-weight:bold}
        .blue-bg{background:#1a56db!important;color:#fff!important;font-weight:bold}
        .total-row td{background:#1a56db!important;color:#fff!important;font-weight:bold}
        .footer-bar{border-top:2px solid #2d7a2d;text-align:center;padding:6px 0;color:#2d7a2d;font-weight:bold;font-size:11px}
        .inv-content{padding:10px;max-width:100%}
        .header-name{font-size:32px!important}
        .header-addr{font-size:22px!important}
        .header-info{font-size:20px!important}
        @page{margin:3mm;size:A4 landscape}
      </style>
    </head><body><div class="inv-content">${content}</div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  const cell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <td style={{ border: B, padding: "10px 12px", fontSize: "13px", ...style }}>{content}</td>;

  const hcell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <th style={{ border: BG, padding: "8px", background: "#1a56db", color: "white", textAlign: "left", fontWeight: "bold", fontSize: "13px", ...style }}>{content}</th>;

  const nameFontSize = client.name.length > 25 ? Math.max(12, 18 - Math.floor((client.name.length - 25) / 4)) : 18;
  const addrFontSize = client.address.length > 35 ? Math.max(12, 16 - Math.floor((client.address.length - 35) / 5)) : 16;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{typeLabel}</h2>
            <p className="text-sm text-slate-500">N° {invNum} - {invDate}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg">
              <Printer size={16}/>{isRTL ? "طباعة" : "Imprimer"}
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
              <X size={20}/>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-100">
          <div ref={ref} style={{ background: "#fff", padding: "15px", width: "100%", fontFamily: "Arial,sans-serif", fontSize: "13px", minHeight: "100vh", position: "relative" }}>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
              <tbody><tr>
                <td style={{ verticalAlign: "top", width: "35%" }}>
                  <div className="header-name" style={{ color: "#2d7a2d", fontWeight: "bold", fontSize: "32px", marginBottom: "12px" }}>{CO.nameFr}</div>
                  <div className="header-addr" style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "10px" }}>{CO.addrFr}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "10px" }}>{CO.email}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "10px" }}>{CO.tel}</div>
                  <div className="header-info" style={{ fontSize: "20px", fontWeight: "bold" }}>MF: {CO.mf}</div>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle", width: "30%" }}>
                  <img src="/invoice_logo.png" alt="Palma" style={{ height: "180px", objectFit: "contain", display: "block", margin: "0 auto" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}/>
                  <div style={{ fontWeight: "bold", fontSize: "26px", marginTop: "10px" }}>N° {invNum}</div>
                  <div style={{ fontSize: "17px", marginTop: "4px" }}>Kélibia le: {invDate}</div>
                </td>
                <td style={{ textAlign: "right", verticalAlign: "top", width: "35%" }}>
                  <div className="header-name" style={{ color: "#2d7a2d", fontWeight: "bold", fontSize: "32px", marginBottom: "12px" }}>{CO.nameAr}</div>
                  <div className="header-addr" style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "10px" }}>{CO.addrAr}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "10px" }}>{CO.email}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "10px" }}>{CO.telAr}</div>
                  <div className="header-info" style={{ fontSize: "20px", fontWeight: "bold" }}>MF: {CO.mf}</div>
                </td>
              </tr></tbody>
            </table>

            <div style={{ background: "#f1f5f9", borderRadius: "6px", padding: "8px 12px", marginBottom: "15px", border: "1px solid #cbd5e1", fontSize: "12px", display: "flex", flexWrap: "nowrap", alignItems: "center", gap: "15px", width: "100%", boxSizing: "border-box", whiteSpace: "nowrap" }}>
              <span style={{ fontWeight: "bold", color: "#1e40af" }}>Client:</span>
              <span>{client.name}</span>
              {client.mf && <span>MF: {client.mf}</span>}
              {client.address && <span>Adresse: {client.address}</span>}
              {client.phone && <span>Tel: {client.phone}</span>}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", border: "1px solid #1a56db" }}>
              <thead>
                <tr>
                  {isDevis ? (
                    <>
                      {hcell("Date", { width: "12%" })}
                      {hcell("Désignation", { width: "48%" })}
                      {hcell("Jours", { width: "6%", textAlign: "center" })}
                      {hcell("Prix/Jour", { width: "14%", textAlign: "right" })}
                      {hcell("Montant", { width: "20%", textAlign: "right" })}
                    </>
                  ) : (
                    <>
                      {hcell("N° Contrat", { width: "12%" })}
                      {hcell("Date", { width: "12%" })}
                      {hcell("Désignation", { width: "42%" })}
                      {hcell("Jours", { width: "8%", textAlign: "center" })}
                      {hcell("Montant", { width: "16%", textAlign: "right" })}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    {isDevis ? (
                      <>
                        {cell(l.date)}
                        {cell(l.designation, { textAlign: "center" })}
                        {cell(l.days, { textAlign: "center" })}
                        {cell(fmt(l.pricePerDay||0), { textAlign: "right" })}
                        {cell(fmt(l.amount||0), { textAlign: "right", fontWeight: "bold" })}
                      </>
                    ) : (
                      <>
                        {cell(l.contractNumber)}
                        {cell(l.date)}
                        {cell(l.designation, { textAlign: "center" })}
                        {cell(l.days, { textAlign: "center" })}
                        {cell(fmt(l.amount||0), { textAlign: "right", fontWeight: "bold" })}
                      </>
)}
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Aucune ligne</td>
                  </tr>
                )}
                {/* Empty space without borders */}
                {lines.length < 15 && (
                  <tr>
                    <td colSpan={5} style={{ padding: `${(15 - lines.length) * 18}px 0`, border: "none", background: "white" }}></td>
                  </tr>
                )}
              </tbody>
            </table>
            
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
              <tbody><tr>
                <td style={{ width: "55%", verticalAlign: "top", paddingRight: "10px" }}>
                  {words && (
                    <div style={{ background: "#f0fdf4", padding: "8px", borderRadius: "4px", border: "1px solid #bbf7d0", marginBottom: "8px" }}>
                      <div style={{ fontSize: "11px", color: "#166534" }}>Arrêté la présente {typeLabel} à la somme de:</div>
                      <div style={{ fontStyle: "italic", fontWeight: "bold", fontSize: "13px", color: "#166534" }}>{words}</div>
                    </div>
                  )}
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="QR" style={{ width: "100px", height: "100px", borderRadius: "4px" }}/>
                  )}
                </td>
                <td style={{ width: "45%", verticalAlign: "top" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden" }}>
                    <tbody>
                      {!isDevis && (
                        <>
                          <tr>
                            <td style={{ border: B, padding: "8px 12px", fontSize: "14px" }}>MONTANT HT</td>
                            <td style={{ border: B, padding: "8px 12px", textAlign: "right", fontWeight: "bold", fontSize: "14px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(montantHT)}</td>
                          </tr>
                          <tr>
                            <td style={{ border: B, padding: "8px 12px", fontSize: "14px" }}>TVA (19%)</td>
                            <td style={{ border: B, padding: "8px 12px", textAlign: "right", fontWeight: "bold", fontSize: "14px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(tva)}</td>
                          </tr>
                        </>
                      )}
                      {tsl2dj > 0 && (
                        <tr>
                          <td style={{ border: B, padding: "8px 12px", fontSize: "14px" }}>TSL 2 D/J</td>
                          <td style={{ border: B, padding: "8px 12px", textAlign: "right", fontWeight: "bold", fontSize: "14px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(tsl2dj)}</td>
                        </tr>
                      )}
                      {isFacture && timbre > 0 && (
                        <tr>
                          <td style={{ border: B, padding: "8px 12px", fontSize: "14px" }}>Timbre</td>
                          <td style={{ border: B, padding: "8px 12px", textAlign: "right", fontWeight: "bold", fontSize: "14px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(timbre)}</td>
                        </tr>
                      )}
                      <tr style={{ background: "#1a56db" }}>
                        <td style={{ border: BG, padding: "10px", fontWeight: "bold", fontSize: "16px", color: "white" }}>TOTAL TTC</td>
                        <td style={{ border: BG, padding: "10px", textAlign: "right", fontWeight: "bold", fontSize: "16px", color: "white" }}>{fmt(totalTTC)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr></tbody>
            </table>

            <div style={{ position: "absolute", bottom: "10px", left: "15px", right: "15px", textAlign: "center", fontWeight: "bold", color: "#2d7a2d", borderTop: "2px solid #2d7a2d", paddingTop: "8px", fontSize: "11px", whiteSpace: "nowrap" }}>
              MF: {CO.mf} | RIB: {CO.rib} | {CO.email} | {CO.tel} | Instagram: {CO.ig}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
