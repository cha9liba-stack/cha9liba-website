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

const THEAD = "#d6e8d6";
const BG    = "1px solid #4a7c4a";
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
  const emptyRows = Math.max(0, 6 - lines.length);

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
        body{font-family:Arial,sans-serif;font-size:13px;color:#000;background:#fff}
        @media print{
          @page{margin:8mm;size:A4}
          body{width:210mm;height:297mm}
          .invoice-wrap{min-height:277mm;display:flex;flex-direction:column}
          .lines-table{flex-grow:1}
        }
        table{width:100%;border-collapse:collapse}
        .invoice-wrap{display:flex;flex-direction:column;min-height:1050px}
        .lines-table{flex-grow:1}
      </style>
    </head><body><div class="invoice-wrap">${content}</div></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  const cell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <td style={{ borderTop:"none", borderBottom:"none", borderLeft:"1px solid #bbb", borderRight:"1px solid #bbb", padding: "5px 7px", ...style }}>{content}</td>;

  const hcell = (content: React.ReactNode, style?: React.CSSProperties) =>
    <th style={{ border: BG, padding: "5px 7px", background: THEAD, textAlign: "left", fontWeight: "bold", ...style }}>{content}</th>;

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
          <div ref={ref} style={{ background:"#fff", padding:"16px 20px", maxWidth:"760px", margin:"0 auto", fontFamily:"Arial,sans-serif", fontSize:"13px", minHeight:"1050px", display:"flex", flexDirection:"column" }}>

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
            <table style={{ width:"100%", borderCollapse:"collapse", borderTop:"1px solid #bbb", borderBottom:"1px solid #bbb", marginBottom:"10px" }}>
              <tbody><tr>
                {cell(<><span style={{ fontSize:"11px", color:"#555", display:"block" }}>Nom de client:</span><strong style={{ fontSize:"15px" }}>{client.name}</strong></>, { width:"28%", border:"none", borderRight:"1px solid #ddd", padding:"6px 8px" })}
                {cell(<><span style={{ fontSize:"11px", color:"#555", display:"block" }}>MF:</span><span style={{ fontSize:"14px" }}>{client.mf}</span></>, { width:"18%", border:"none", borderRight:"1px solid #ddd", padding:"6px 8px" })}
                {cell(<><span style={{ fontSize:"11px", color:"#555", display:"block" }}>Adresse:</span><span style={{ fontSize:"14px" }}>{client.address}</span></>, { width:"34%", border:"none", borderRight:"1px solid #ddd", padding:"6px 8px" })}
                {cell(<><span style={{ fontSize:"11px", color:"#555", display:"block" }}>Tel:</span><span style={{ fontSize:"14px" }}>{client.phone}</span></>, { width:"20%", border:"none", padding:"6px 8px" })}
              </tr></tbody>
            </table>

            {/* ── Lines — flex-grow to fill page ── */}
            <table style={{ width:"100%", borderCollapse:"collapse", border:"1px solid #4a7c4a", flexGrow:1 }}>
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
                        {cell(l.date)}
                        {cell(l.designation, { textAlign:"center" })}
                        {cell(l.days, { textAlign:"center" })}
                        {cell(fmt(l.pricePerDay||0), { textAlign:"right" })}
                        {cell(fmt(l.amount||0), { textAlign:"right" })}
                      </>
                    ) : (
                      <>
                        {cell(l.contractNumber)}
                        {cell(l.date)}
                        {cell(l.designation, { textAlign:"center" })}
                        {cell(l.days, { textAlign:"center" })}
                        {cell(fmt(l.amount||0), { textAlign:"right" })}
                      </>
                    )}
                  </tr>
                ))}
                {/* Empty rows — vertical borders only, no horizontal lines */}
                {Array.from({ length: emptyRows }).map((_, i) => (
                  <tr key={`e${i}`}>
                    {[0,1,2,3,4].map(j => (
                      <td key={j} style={{
                        borderTop: "none",
                        borderBottom: "none",
                        borderLeft: j === 0 ? "none" : "1px solid #bbb",
                        borderRight: "none",
                        padding: "4px 6px"
                      }}></td>
                    ))}
                  </tr>
                ))}
                {/* Bottom border row */}
                <tr>
                  {[0,1,2,3,4].map(j => (
                    <td key={j} style={{ borderTop:"1px solid #4a7c4a", borderBottom:"none", borderLeft: j===0?"none":"1px solid #bbb", borderRight:"none", padding:"0" }}></td>
                  ))}
                </tr>
              </tbody>
            </table>

            {/* ── Footer ── */}
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <tbody><tr>
                {/* Left: words + QR */}
                <td style={{ border:"none", width:"55%", verticalAlign:"bottom", paddingRight:"10px" }}>
                  {words && (
                    <div style={{ marginBottom:"10px" }}>
                      <div style={{ fontSize:"11px", color:"#555" }}>Arrêté La Présente {typeLabel} À La Somme de (on T.T.C):</div>
                      <div style={{ fontStyle:"italic", fontWeight:"bold", fontSize:"13px", marginTop:"3px" }}>{words}</div>
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
                          <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>MONTANT HT</td><td style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(montantHT)}</td></tr>
                          <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>TVA %</td><td style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(tva)}</td></tr>
                        </>
                      )}
                      {tsl2dj > 0 && (
                        <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>TSL 2 D/J</td><td style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(tsl2dj)}</td></tr>
                      )}
                      {isFacture && timbre > 0 && (
                        <tr><td style={{ border:B, padding:"5px 8px", fontSize:"13px" }}>Timbre</td><td style={{ border:B, padding:"5px 8px", textAlign:"right", background:"#e8f0fe", color:"#1a56db", fontWeight:"bold" }}>{fmt(timbre)}</td></tr>
                      )}
                      <tr>
                        <td style={{ border:BG, padding:"6px 8px", fontWeight:"bold", fontSize:"14px", background:"#1a56db", color:"white" }}>TOTAL TTC</td>
                        <td style={{ border:BG, padding:"6px 8px", textAlign:"right", fontWeight:"bold", fontSize:"16px", background:"#1a56db", color:"white" }}>{fmt(totalTTC)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr></tbody>
            </table>

            {/* ── Company footer — single line centered ── */}
            <div style={{ marginTop:"12px", textAlign:"center", fontSize:"13px", fontWeight:"bold", color:"#2d7a2d", borderTop:"2px solid #2d7a2d", paddingTop:"8px" }}>
              MF: {CO.mf} &nbsp;|&nbsp; RIB: {CO.rib} &nbsp;|&nbsp; {CO.email} &nbsp;|&nbsp; Tél: {CO.tel} &nbsp;|&nbsp; Instagram: {CO.ig}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
