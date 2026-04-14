import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Printer } from "lucide-react";
import QRCode from "qrcode";
import type { Invoice } from "../../types/invoice";

interface Props { invoice: Invoice; onClose: () => void; }

const CO = {
  nameFr: "Ste Palma Rent a Car",
  nameAr: "شركة بالما لكراء",
  addrFr: "Avenue du Tunis kélibia 8090",
  addrAr: "شـارع تـونس قليبيـة 8090",
  email:  "ste.palmacar@gmail.com",
  tel:    "72 208711 / 22 843 531",
  telAr:  "72208711 / 22843531",
  mf:     "1021113/G/A/M/000",
  rib:    "11109000139400278805",
  ig:     "palma_car",
};

const B = "1px solid #ddd";
const BG = "1px solid #1e40af";

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
        body{padding:0}
        .inv-wrap{padding:4px!important}
        table{width:100%;border-collapse:collapse;table-layout:fixed}
        td,th{overflow:hidden;font-size:18px}
        .blue-val{color:#1e40af!important;font-weight:bold}
        .blue-bg{background:#1e40af!important;color:#fff!important;font-weight:bold}
        .total-row td{background:#1e40af!important;color:#fff!important;font-weight:bold}
        .footer-bar{border-top:2px solid #1e40af;text-align:center;padding:6px 0;color:#1e40af;font-weight:bold;font-size:14px;white-space:nowrap}
        .inv-content{padding:10px;max-width:100%}
        .invoice-print-surface{min-height:0!important;height:auto!important}
        .header-name{font-size:48px!important}
        .header-addr{font-size:20px!important;white-space:nowrap}
        .header-info{font-size:22px!important}
        .header-name,.header-addr,.header-info{margin-bottom:5px!important}
        .header-addr-ar{font-size:26px!important;white-space:nowrap}
        @page{margin:5mm;size:A4}
        html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      </style>
    </head><body><div class="inv-content">${content}</div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  const cell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <td style={{ border: B, padding: "14px 16px", fontSize: "18px", textAlign: "center", ...style }}>{content}</td>;

  const hcell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <th style={{ border: BG, padding: "12px", background: "#1e40af", color: "white", textAlign: "left", fontWeight: "bold", fontSize: "18px", ...style }}>{content}</th>;

  const nameFontSize = client.name.length > 25 ? Math.max(12, 18 - Math.floor((client.name.length - 25) / 4)) : 18;
  const addrFontSize = client.address.length > 35 ? Math.max(12, 16 - Math.floor((client.address.length - 35) / 5)) : 16;

  const tableFillerPx =
    lines.length < 12 ? Math.min((12 - lines.length) * 22, 260) : 0;

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
          <div
            ref={ref}
            className="invoice-print-surface"
            style={{
              background: "#fff",
              padding: "15px",
              width: "100%",
              fontFamily: "Arial,sans-serif",
              fontSize: "13px",
              minHeight: "100vh",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <div style={{ flex: "1 1 auto", minHeight: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
              <tbody><tr>
                <td style={{ verticalAlign: "middle", width: "35%" }}>
                  <div className="header-name" style={{ color: "#15803d", fontWeight: "bold", fontSize: "48px", marginBottom: "16px" }}>{CO.nameFr}</div>
                  <div className="header-addr" style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px", whiteSpace: "nowrap" }}>{CO.addrFr}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "12px" }}>{CO.email}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "12px" }}>{CO.tel}</div>
                  <div className="header-info" style={{ fontSize: "20px", fontWeight: "bold" }}>MF: {CO.mf}</div>
                </td>
                <td style={{ textAlign: "center", verticalAlign: "middle", width: "30%" }}>
                  <img src="/invoice_logo.png" alt="Palma" style={{ height: "220px", objectFit: "contain", display: "block", margin: "0 auto" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}/>
                  <div style={{ fontWeight: "bold", fontSize: "32px", marginTop: "12px" }}>N° {invNum}</div>
                  <div style={{ fontSize: "20px", marginTop: "6px" }}>Kélibia le: {invDate}</div>
                  <div style={{ fontSize: "18px", marginTop: "10px" }}>
                    <span style={{ fontWeight: "bold", color: "#1e40af" }}>Client:</span> {client.name}
                  </div>
                </td>
                <td style={{ textAlign: "right", verticalAlign: "middle", width: "35%" }}>
                  <div
                    className="header-name"
                    style={{
                      color: "#15803d",
                      fontWeight: "bold",
                      fontSize: "48px",
                      marginBottom: "16px",
                      lineHeight: 1.15,
                      display: "inline-flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div>{CO.nameAr}</div>
                    <div>السيارات</div>
                  </div>
                  <div className="header-addr header-addr-ar" style={{ fontSize: "26px", fontWeight: "bold", marginBottom: "12px", whiteSpace: "nowrap" }}>{CO.addrAr}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "12px" }}>{CO.email}</div>
                  <div className="header-info" style={{ fontSize: "20px", marginBottom: "12px" }}>{CO.telAr}</div>
                  <div className="header-info" style={{ fontSize: "20px", fontWeight: "bold" }}>MF: {CO.mf}</div>
                </td>
              </tr></tbody>
            </table>

            <div style={{ background: "#eff6ff", borderRadius: "6px", padding: "16px 20px", marginBottom: "15px", border: "1px solid #bfdbfe", fontSize: "18px", display: "flex", flexWrap: "nowrap", alignItems: "center", gap: "20px", width: "100%", boxSizing: "border-box", whiteSpace: "nowrap" }}>
              {client.address && <span>Adresse: {client.address}</span>}
              {client.mf && <span>MF: {client.mf}</span>}
              {client.phone && <span>Tel: {client.phone}</span>}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "15px", border: "1px solid #cbd5e1" }}>
              <thead>
                <tr>
                  {isDevis ? (
                    <>
                      {hcell("Date", { width: "18%" })}
                      {hcell("Désignation", { width: "46%" })}
                      {hcell("Jours", { width: "6%", textAlign: "center" })}
                      {hcell("Prix/Jour", { width: "14%", textAlign: "right" })}
                      {hcell("Montant", { width: "16%", textAlign: "right" })}
                    </>
                  ) : (
                    <>
                      {hcell("N° Contrat", { width: "12%" })}
                      {hcell("Date", { width: "18%" })}
                      {hcell("Désignation", { width: "40%" })}
                      {hcell("Jours", { width: "6%", textAlign: "center" })}
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
                        {cell(l.designation)}
                        {cell(l.days)}
                        {cell(fmt(l.pricePerDay||0))}
                        {cell(fmt(l.amount||0), { fontWeight: "bold" })}
                      </>
                    ) : (
                      <>
                        {cell(l.contractNumber)}
                        {cell(l.date)}
                        {cell(l.designation)}
                        {cell(l.days)}
                        {cell(fmt(l.amount||0), { fontWeight: "bold" })}
                      </>
)}
                  </tr>
                ))}
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Aucune ligne</td>
                  </tr>
                )}
                {/* Empty row padding (kept small for single-page print) */}
                {tableFillerPx > 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: `${tableFillerPx}px 0`, border: "none", background: "white" }}></td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>

            <div style={{ flexShrink: 0 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 0 }}>
              <tbody><tr>
                <td style={{ width: "55%", verticalAlign: "top", paddingRight: "10px" }}>
                  {words && (
                    <div style={{ background: "#eff6ff", padding: "12px", borderRadius: "4px", border: "1px solid #bfdbfe", marginBottom: "10px" }}>
                      <div style={{ fontSize: "14px", color: "#1e40af" }}>Arrêté la présente {typeLabel} à la somme de:</div>
                      <div style={{ fontStyle: "italic", fontWeight: "bold", fontSize: "18px", color: "#1e40af" }}>{words}</div>
                    </div>
                  )}
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="QR" style={{ width: "140px", height: "140px", borderRadius: "4px" }}/>
                  )}
                </td>
                <td style={{ width: "45%", verticalAlign: "top" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", background: "#f1f5f9", borderRadius: "6px", overflow: "hidden", border: "1px solid #cbd5e1" }}>
                    <tbody>
                      {!isDevis && (
                        <>
                          <tr>
                            <td style={{ border: B, padding: "12px 16px", fontSize: "18px" }}>MONTANT HT</td>
                            <td style={{ border: B, padding: "12px 16px", textAlign: "right", fontWeight: "bold", fontSize: "18px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(montantHT)}</td>
                          </tr>
                          <tr>
                            <td style={{ border: B, padding: "12px 16px", fontSize: "18px" }}>TVA (19%)</td>
                            <td style={{ border: B, padding: "12px 16px", textAlign: "right", fontWeight: "bold", fontSize: "18px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(tva)}</td>
                          </tr>
                        </>
                      )}
                      {tsl2dj > 0 && (
                        <tr>
                          <td style={{ border: B, padding: "12px 16px", fontSize: "18px" }}>TSL 2 D/J</td>
                          <td style={{ border: B, padding: "12px 16px", textAlign: "right", fontWeight: "bold", fontSize: "18px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(tsl2dj)}</td>
                        </tr>
                      )}
                      {isFacture && timbre > 0 && (
                        <tr>
                          <td style={{ border: B, padding: "12px 16px", fontSize: "18px" }}>Timbre</td>
                          <td style={{ border: B, padding: "12px 16px", textAlign: "right", fontWeight: "bold", fontSize: "18px", background: "#e0e7ff", color: "#1e40af" }}>{fmt(timbre)}</td>
                        </tr>
                      )}
                      <tr style={{ background: "#1e40af" }}>
                        <td style={{ border: BG, padding: "14px", fontWeight: "bold", fontSize: "20px", color: "white" }}>TOTAL TTC</td>
                        <td style={{ border: BG, padding: "14px", textAlign: "right", fontWeight: "bold", fontSize: "20px", color: "white" }}>{fmt(totalTTC)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr></tbody>
            </table>

            <div style={{ marginTop: "10px", textAlign: "center", fontWeight: "bold", color: "#1e40af", borderTop: "2px solid #1e40af", paddingTop: "8px", fontSize: "14px", whiteSpace: "nowrap" }}>
              MF: {CO.mf} | RIB: {CO.rib} | {CO.email} | {CO.tel} | Instagram: {CO.ig}
            </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
