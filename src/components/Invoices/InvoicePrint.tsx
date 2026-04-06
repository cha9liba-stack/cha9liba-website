import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Printer } from "lucide-react";
import QRCode from "qrcode";
import type { Invoice } from "../../types/invoice";

interface Props { invoice: Invoice; onClose: () => void; }

const CO = {
  nameFr: "Ste Palma Rent a Car",
  nameAr: "شركة بالما لكراء السيارات",
  addrFr: "Aavenue du Tunis kelibia 8090",
  addrAr: "شارع تونس قليبية 8090",
  email:  "ste.palmacar@gmail.com",
  tel:    "72 208711/22 843 531",
  telAr:  "72208711/22843531",
  mf:     "1021113/G/A/M/000",
  rib:    "11109000139400278805",
  ig:     "palma_car",
};

const THEAD = "#e8f0fe";
const BG    = "1px solid #1a56db";
const B     = "1px solid #bbb";

export default function InvoicePrint({ invoice, onClose }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const ref = useRef<HTMLDivElement>(null);

  // ── Normalize ──────────────────────────────────────────────────────────────
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
  const emptyRows = Math.max(0, 8 - lines.length);

  // ── Generate QR code ───────────────────────────────────────────────────────
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  useEffect(() => {
    // QR content: link to public invoice page
    const baseUrl = window.location.origin;
    const qrText = `${baseUrl}/invoice?id=${invoice.id || invNum}`;

    QRCode.toDataURL(qrText, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    }).then(setQrDataUrl).catch(console.warn);
  }, [invNum, invDate, totalTTC, lines]);

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() {
    const content = ref.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>${typeLabel} ${invNum}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:Arial,sans-serif;font-size:13px;color:#000;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        @media print{
          @page{margin:8mm;size:A4}
          body{width:210mm}
          .inv-wrap{page-break-inside:avoid}
        }
        table{width:100%;border-collapse:collapse;table-layout:fixed}
        td,th{overflow:hidden;white-space:nowrap}
        .inv-wrap{display:flex;flex-direction:column}
        .lines-wrap{flex:1;display:flex;flex-direction:column}
        .lines-wrap table{height:100%}
        .blue-val{color:#1a56db!important;font-weight:bold}
        .blue-bg{background:#e8f0fe!important;color:#1a56db!important;font-weight:bold}
        .total-row td{background:#1a56db!important;color:#fff!important;font-weight:bold}
        .footer-bar{color:#2d7a2d;font-weight:bold;border-top:2px solid #2d7a2d;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:11px}
      </style>
    </head><body><div class="inv-wrap">${content}</div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  const cell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <td style={{ borderTop:"none", borderBottom:"none", borderLeft:"1px solid #bbb", borderRight:"1px solid #bbb", padding: "5px 7px", ...style }}>{content}</td>;

  const hcell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <th style={{ border: "1px solid #1a56db", padding: "6px 7px", background: "#1a56db", color: "white", textAlign: "left", fontWeight: "bold", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", ...style }}>{content}</th>;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className="font-semibold text-slate-700 text-sm">{typeLabel} — {invNum}</span>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg">
              <Printer size={14}/>{isRTL ? "طباعة" : "Imprimer"}
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100">
          <div ref={ref} className="inv-wrap" style={{ background:"#fff", padding:"16px 20px", maxWidth:"760px", margin:"0 auto", fontFamily:"Arial,sans-serif", fontSize:"13px", display:"flex", flexDirection:"column" }}>

            {/* ── Header ── */}
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"12px" }}>
              <tbody><tr>
                <td style={{ border:"none", width:"33%", verticalAlign:"top" }}>
                  <div style={{ color:"#2d7a2d", fontWeight:"bold", fontSize:"22px" }}>{CO.nameFr}</div>
                  <div style={{ fontWeight:"bold", fontSize:"16px" }}>{CO.addrFr}</div>
                  <div style={{ fontSize:"13px" }}>Mail:{CO.email}</div>
                  <div style={{ fontSize:"13px" }}>Tel:{CO.tel}</div>
                  <div style={{ fontSize:"13px" }}>MF:{CO.mf}</div>
                </td>
                <td style={{ border:"none", width:"34%", textAlign:"center", verticalAlign:"middle" }}>
                  <img src="/invoice_logo.png" alt="Palma" style={{ height:"150px", objectFit:"contain", display:"block", margin:"0 auto" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}/>
                  <div style={{ fontWeight:"bold", fontSize:"18px", marginTop:"6px" }}>N° {invNum}</div>
                  <div style={{ fontSize:"14px" }}>Kélibia le: {invDate}</div>
                </td>
                <td style={{ border:"none", width:"33%", textAlign:"right", verticalAlign:"top" }}>
                  <div style={{ color:"#2d7a2d", fontWeight:"bold", fontSize:"22px" }}>{CO.nameAr}</div>
                  <div style={{ fontWeight:"bold", fontSize:"16px" }}>{CO.addrAr}</div>
                  <div style={{ fontSize:"13px" }}>{CO.email}</div>
                  <div style={{ fontSize:"13px" }}>الهاتف : {CO.telAr}</div>
                  <div style={{ fontSize:"13px" }}>{CO.mf}</div>
                </td>
              </tr></tbody>
            </table>

            {/* ── Client ── */}
            {(() => {
              // Auto-size font based on content length
              const nameFontSize = client.name.length > 25 ? Math.max(9, 13 - Math.floor((client.name.length - 25) / 4)) : 13;
              const addrFontSize = client.address.length > 35 ? Math.max(9, 12 - Math.floor((client.address.length - 35) / 5)) : 12;
              return (
                <table style={{ width:"100%", borderCollapse:"collapse", borderTop:"1px solid #bbb", borderBottom:"1px solid #bbb", marginBottom:"10px", tableLayout:"fixed" }}>
                  <colgroup>
                    <col style={{ width:"33%" }}/>
                    <col style={{ width:"17%" }}/>
                    <col style={{ width:"35%" }}/>
                    <col style={{ width:"15%" }}/>
                  </colgroup>
                  <tbody><tr style={{ verticalAlign:"top" }}>
                    <td style={{ border:"none", borderRight:"1px solid #ddd", padding:"4px 6px", overflow:"hidden" }}>
                      <div style={{ fontSize:"12px", color:"#555" }}>Nom de client:</div>
                      <div style={{ fontWeight:"bold", whiteSpace:"nowrap", overflow:"hidden", fontSize:`${nameFontSize}px` }}>{client.name}</div>
                    </td>
                    <td style={{ border:"none", borderRight:"1px solid #ddd", padding:"4px 6px", overflow:"hidden" }}>
                      <div style={{ fontSize:"12px", color:"#555" }}>MF:</div>
                      <div style={{ whiteSpace:"nowrap", overflow:"hidden", fontSize:"11px" }}>{client.mf}</div>
                    </td>
                    <td style={{ border:"none", borderRight:"1px solid #ddd", padding:"4px 6px", overflow:"hidden" }}>
                      <div style={{ fontSize:"12px", color:"#555" }}>Adresse:</div>
                      <div style={{ whiteSpace:"nowrap", overflow:"hidden", fontSize:`${addrFontSize}px` }}>{client.address}</div>
                    </td>
                    <td style={{ border:"none", padding:"4px 6px", overflow:"hidden" }}>
                      <div style={{ fontSize:"12px", color:"#555" }}>Tel:</div>
                      <div style={{ whiteSpace:"nowrap", overflow:"hidden", fontSize:"12px" }}>{client.phone}</div>
                    </td>
                  </tr></tbody>
                </table>
              );
            })()}

            {/* ── Lines — fill remaining space ── */}
            <div className="lines-wrap" style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <table style={{ width:"100%", height:"100%", borderCollapse:"collapse", tableLayout:"fixed", border:"1px solid #1a56db" }}>
              <thead><tr>
                {isDevis ? (
                  <>
                    {hcell("Date", { width:"14%", fontSize:"13px" })}
                    {hcell("Désignation", { width:"42%", textAlign:"center", fontSize:"13px" })}
                    {hcell("N", { width:"8%", textAlign:"center", fontSize:"13px" })}
                    {hcell("Prix", { width:"16%", textAlign:"right", fontSize:"13px" })}
                    {hcell("Montant", { width:"20%", textAlign:"right", fontSize:"13px" })}
                  </>
                ) : (
                  <>
                    {hcell("N° de Contrat", { width:"14%", fontSize:"13px" })}
                    {hcell("Date de sortie", { width:"16%", fontSize:"13px" })}
                    {hcell("Désignation", { width:"40%", textAlign:"center", fontSize:"13px" })}
                    {hcell("N de Jour", { width:"10%", textAlign:"center", fontSize:"13px" })}
                    {hcell("Montant", { width:"20%", textAlign:"right", fontSize:"13px" })}
                  </>
                )}
              </tr></thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    {isDevis ? (
                      <>
                        {cell(l.date, { padding:"3px 6px" })}
                        {cell(l.designation, { textAlign:"center", padding:"3px 6px" })}
                        {cell(l.days, { textAlign:"center", padding:"3px 6px" })}
                        {cell(fmt(l.pricePerDay||0), { textAlign:"right", padding:"3px 6px" })}
                        {cell(fmt(l.amount||0), { textAlign:"right", padding:"3px 6px" })}
                      </>
                    ) : (
                      <>
                        {cell(l.contractNumber, { padding:"3px 6px" })}
                        {cell(l.date, { padding:"3px 6px" })}
                        {cell(l.designation, { textAlign:"center", padding:"3px 6px" })}
                        {cell(l.days, { textAlign:"center", padding:"3px 6px" })}
                        {cell(fmt(l.amount||0), { textAlign:"right", padding:"3px 6px" })}
                      </>
                    )}
                  </tr>
                ))}
                {/* One expandable empty row to fill remaining space */}
                <tr style={{ height:"100%" }}>
                  {[0,1,2,3,4].map(j => (
                    <td key={j} style={{
                      borderTop: "none",
                      borderBottom: "none",
                      borderLeft: j === 0 ? "none" : "1px solid #bbb",
                      borderRight: "none",
                    }}></td>
                  ))}
                </tr>
                {/* Bottom border row */}
                <tr>
                  {[0,1,2,3,4].map(j => (
                    <td key={j} style={{ borderTop:"1px solid #4a7c4a", borderBottom:"none", borderLeft: j===0?"none":"1px solid #bbb", borderRight:"none", padding:"0" }}></td>
                  ))}
                </tr>
              </tbody>
            </table>
            </div>

            {/* ── Footer ── */}
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <tbody><tr>
                {/* Left: words + QR */}
                <td style={{ border:"none", width:"55%", verticalAlign:"bottom", paddingRight:"10px" }}>
                  {words && (
                    <div style={{ marginBottom:"10px" }}>
                      <div style={{ fontSize:"13px", color:"#555" }}>Arrêté La Présente {typeLabel} À La Somme de (on T.T.C):</div>
                      <div style={{ fontStyle:"italic", fontWeight:"bold", fontSize:"14px", marginTop:"3px" }}>{words}</div>
                    </div>
                  )}
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="QR" style={{ width:"80px", height:"80px" }}/>
                  )}
                </td>
                {/* Right: totals */}
                <td style={{ border:"none", width:"45%", verticalAlign:"top" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <tbody>
                      {!isDevis && (
                        <>
                          <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>MONTANT HT</td><td className="blue-bg" style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(montantHT)}</td></tr>
                          <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>TVA %</td><td className="blue-bg" style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(tva)}</td></tr>
                        </>
                      )}
                      {tsl2dj > 0 && (
                        <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>TSL 2 D/J</td><td className="blue-bg" style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(tsl2dj)}</td></tr>
                      )}
                      {isFacture && timbre > 0 && (
                        <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>Timbre</td><td className="blue-bg" style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(timbre)}</td></tr>
                      )}
                      <tr className="total-row">
                        <td style={{ border:BG, padding:"6px 8px", fontWeight:"bold", fontSize:"14px", background:"#1a56db", color:"white" }}>TOTAL TTC</td>
                        <td style={{ border:BG, padding:"6px 8px", textAlign:"right", fontWeight:"bold", fontSize:"16px", background:"#1a56db", color:"white" }}>{fmt(totalTTC)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr></tbody>
            </table>

            {/* ── Company footer — single line centered ── */}
            <div className="footer-bar" style={{ marginTop:"10px", textAlign:"center", fontWeight:"bold", color:"#2d7a2d", borderTop:"2px solid #2d7a2d", paddingTop:"6px", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontSize:"11px" }}>
              MF: {CO.mf} &nbsp;|&nbsp; RIB: {CO.rib} &nbsp;|&nbsp; {CO.email} &nbsp;|&nbsp; Tél: {CO.tel} &nbsp;|&nbsp; Instagram: {CO.ig}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
