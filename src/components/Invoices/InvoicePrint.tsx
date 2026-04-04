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
  const emptyRows = Math.max(0, 10 - lines.length);

  // ── Generate QR code ───────────────────────────────────────────────────────
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  useEffect(() => {
    // QR content: invoice summary readable on any phone
    const qrText = [
      `${typeLabel}: ${invNum}`,
      `Date: ${invDate}`,
      `Client: ${client.name}`,
      client.mf ? `MF: ${client.mf}` : "",
      `Total TTC: ${fmt(totalTTC)} TND`,
      lines.map(l => `#${l.contractNumber || l.date} - ${l.designation} - ${fmt(l.amount||0)} TND`).join(" | "),
      `${CO.nameFr} | Tel:${CO.tel}`,
    ].filter(Boolean).join("\n");

    QRCode.toDataURL(qrText, {
      width: 120,
      margin: 1,
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
        body{font-family:Arial,sans-serif;font-size:10px;color:#000;background:#fff}
        @media print{@page{margin:8mm;size:A4}}
        table{width:100%;border-collapse:collapse}
      </style>
    </head><body>${content}</body></html>`);
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
          <div ref={ref} style={{ background:"#fff", padding:"14px 18px", maxWidth:"760px", margin:"0 auto", fontFamily:"Arial,sans-serif", fontSize:"10px" }}>

            {/* ── Header ── */}
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"10px" }}>
              <tbody><tr>
                <td style={{ border:"none", width:"33%", verticalAlign:"top" }}>
                  <div style={{ color:"#2d7a2d", fontWeight:"bold", fontSize:"18px" }}>{CO.nameFr}</div>
                  <div style={{ fontWeight:"bold", fontSize:"14px" }}>{CO.addrFr}</div>
                  <div style={{ fontSize:"13px" }}>Mail:{CO.email}</div>
                  <div style={{ fontSize:"13px" }}>Tel:{CO.tel}</div>
                  <div style={{ fontSize:"13px" }}>MF:{CO.mf}</div>
                </td>
                <td style={{ border:"none", width:"34%", textAlign:"center", verticalAlign:"middle" }}>
                  <img src="/invoice_logo.png" alt="Palma" style={{ height:"120px", objectFit:"contain", display:"block", margin:"0 auto" }}
                    onError={(e) => { (e.target as HTMLImageElement).src = "/logo.png"; }}/>
                </td>
                <td style={{ border:"none", width:"33%", textAlign:"right", verticalAlign:"top" }}>
                  <div style={{ color:"#2d7a2d", fontWeight:"bold", fontSize:"18px" }}>{CO.nameAr}</div>
                  <div style={{ fontWeight:"bold", fontSize:"14px" }}>{CO.addrAr}</div>
                  <div style={{ fontSize:"13px" }}>{CO.email}</div>
                  <div style={{ fontSize:"13px" }}>الهاتف : {CO.telAr}</div>
                  <div style={{ fontSize:"13px" }}>{CO.mf}</div>
                </td>
              </tr></tbody>
            </table>

            {/* ── Doc number & date ── */}
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"8px" }}>
              <tbody><tr>
                <td style={{ border:"none", width:"35%" }}></td>
                <td style={{ border:"none", textAlign:"center" }}>
                  <div><strong>N° de {isDevis ? "devis" : invType === "bon" ? "bon de livraison" : "facture"}:</strong>&nbsp;{invNum}</div>
                  <div><strong>Kélibia le:</strong>&nbsp;{invDate}</div>
                </td>
                <td style={{ border:"none", width:"35%" }}></td>
              </tr></tbody>
            </table>

            {/* ── Client — no borders ── */}
            <table style={{ width:"100%", borderCollapse:"collapse", borderTop:"1px solid #bbb", borderBottom:"1px solid #bbb", marginBottom:"8px" }}>
              <tbody><tr>
                {cell(<><span style={{ fontSize:"9px", color:"#555", display:"block" }}>Nom de client:</span><strong>{client.name}</strong></>, { width:"28%", border:"none", borderRight:"1px solid #ddd", padding:"5px 7px" })}
                {cell(<><span style={{ fontSize:"9px", color:"#555", display:"block" }}>MF:</span>{client.mf}</>, { width:"18%", border:"none", borderRight:"1px solid #ddd", padding:"5px 7px" })}
                {cell(<><span style={{ fontSize:"9px", color:"#555", display:"block" }}>Adresse:</span>{client.address}</>, { width:"34%", border:"none", borderRight:"1px solid #ddd", padding:"5px 7px" })}
                {cell(<><span style={{ fontSize:"9px", color:"#555", display:"block" }}>Tel:</span>{client.phone}</>, { width:"20%", border:"none", padding:"5px 7px" })}
              </tr></tbody>
            </table>

            {/* ── Lines ── */}
            <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"8px", border:"1px solid #4a7c4a" }}>
              <thead><tr>
                {isDevis ? (
                  <>
                    {hcell("Date", { width:"14%" })}
                    {hcell("Désignation", { width:"42%", textAlign:"center" })}
                    {hcell("N", { width:"8%", textAlign:"center" })}
                    {hcell("Prix", { width:"16%", textAlign:"right" })}
                    {hcell("Montant", { width:"20%", textAlign:"right" })}
                  </>
                ) : (
                  <>
                    {hcell("N° de Contrat", { width:"14%" })}
                    {hcell("Date de sortie", { width:"16%" })}
                    {hcell("Désignation", { width:"40%", textAlign:"center" })}
                    {hcell("N de Jour", { width:"10%", textAlign:"center" })}
                    {hcell("Montant", { width:"20%", textAlign:"right" })}
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
                        borderBottom: i === emptyRows - 1 ? "none" : "none",
                        borderLeft: j === 0 ? "none" : "1px solid #bbb",
                        borderRight: j === 4 ? "none" : "none",
                        padding: "14px 6px"
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
                      <div style={{ fontSize:"9px", color:"#555" }}>Arrêté La Présente {typeLabel} À La Somme de (on T.T.C):</div>
                      <div style={{ fontStyle:"italic", fontWeight:"bold", marginTop:"3px" }}>{words}</div>
                    </div>
                  )}
                  {qrDataUrl && (
                    <img src={qrDataUrl} alt="QR" style={{ width:"80px", height:"80px" }}/>
                  )}
                  <div style={{ marginTop:"6px", fontSize:"8px", color:"#555" }}>
                    MF:{CO.mf} &nbsp; RIP: {CO.rib} &nbsp; Mail:{CO.email} &nbsp; Instagram:{CO.ig}
                  </div>
                </td>
                {/* Right: totals */}
                <td style={{ border:"none", width:"45%", verticalAlign:"top" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <tbody>
                      {!isDevis && (
                        <>
                          <tr><td style={{ border:B, padding:"3px 8px" }}>MONTANT HT</td><td style={{ border:B, padding:"3px 8px", textAlign:"right", background:THEAD }}>{fmt(montantHT)}</td></tr>
                          <tr><td style={{ border:B, padding:"3px 8px" }}>TVA %</td><td style={{ border:B, padding:"3px 8px", textAlign:"right", background:THEAD }}>{fmt(tva)}</td></tr>
                        </>
                      )}
                      {tsl2dj > 0 && (
                        <tr><td style={{ border:B, padding:"3px 8px" }}>TSL 2 D/J</td><td style={{ border:B, padding:"3px 8px", textAlign:"right", background:THEAD }}>{fmt(tsl2dj)}</td></tr>
                      )}
                      {isFacture && timbre > 0 && (
                        <tr><td style={{ border:B, padding:"3px 8px" }}>Timbre</td><td style={{ border:B, padding:"3px 8px", textAlign:"right", background:THEAD }}>{fmt(timbre)}</td></tr>
                      )}
                      <tr>
                        <td style={{ border:BG, padding:"4px 8px", fontWeight:"bold", background:THEAD }}>TOTAL TTC</td>
                        <td style={{ border:BG, padding:"4px 8px", textAlign:"right", fontWeight:"bold", background:THEAD }}>{fmt(totalTTC)}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr></tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  );
}
