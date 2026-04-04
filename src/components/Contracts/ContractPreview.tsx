import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Printer, ZoomIn, ZoomOut, Settings2, Move, Lock, RotateCcw } from "lucide-react";
import type { Contract } from "../../types";

// ─── Default field positions (from field_positions.json) ─────────────────────
const DEFAULT_POSITIONS: Record<string, [number, number]> = {
  "رقم العقد":            [1123, 710],
  "Marque":               [1076, 963],
  "Modèl":                [1060, 1050],
  "صنف السيارة":          [1096, 1136],
  "Immatricule":          [1106, 1213],
  "يوم الرجوع":           [1703, 953],
  "ساعة الرجوع":          [1720, 1046],
  "مكان الانطلاق":        [1720, 1140],
  "يوم الانطلاق":         [1693, 1226],
  "ساعة الانطلاق":        [1733, 1320],
  "كلم الانطلاق":         [180,  1266],
  "كلم الرجوع":           [533,  1260],
  "الاسم و اللقب":        [586,  1440],
  "تاريخ الولادة":        [253,  1536],
  "مكان الولادة":         [746,  1533],
  "العنوان":              [336,  1626],
  "الهاتف":               [963,  1710],
  "رقم بطاقة التعريف":    [563,  1793],
  "تاريخ البطاقة":        [360,  1890],
  "مكان البطاقة":         [886,  1883],
  "رخصة السياقة عدد":     [563,  1980],
  "تاريخ الرخصة":         [360,  2066],
  "مكان الرخصة":          [886,  2076],
  "TOTAL PARTIEL":        [1563, 1550],
  "Divers":               [1606, 1866],
  "TOTAL HT":             [1603, 2176],
  "الاسم و االقب 2":      [506,  2240],
  "تاريخ ولادة 2":        [233,  2326],
  "مكان الولادة 2":       [706,  2326],
  "العنوان 2":            [313,  2416],
  "الهاتف 2":             [923,  2506],
  "رقم بطاقة التعريف 2":  [566,  2590],
  "تاريخ البطاقة 2":      [323,  2680],
  "مكان البطاقة 2":       [866,  2686],
  "رخصة السياقة عدد 2":   [530,  2770],
  "تاريخ الرخصة 2":       [316,  2856],
  "مكان الرخصة 2":        [833,  2863],
  "TVA":                  [1620, 2290],
  "TOTAL FACTURE":        [1620, 2500],
  "Plus ou moins divers": [1680, 2693],
  "ضمان الايداع":         [2190, 2640],
  "prep":                 [2226, 2696],
  "الجملة":               [2096, 2746],
  "المجموع":              [1773, 2870],
  "Remise au retour":     [843,  3060],
  "مدينة الخروج":         [1706, 2990],
  "التاريخ":              [2020, 2993],
  "Essence":              [646,  2980],
  "Gasoil":               [976,  2983],
  "Taxe2dt":              [1620, 2060], // Taxe Services Location 2dt/j (2026+)
  "Timbre":               [1900, 2150], // Timbre fiscal 1.000 dt — positioned after the text
};

const POSITIONS_STORAGE_KEY = "palma_field_positions";
const SETTINGS_STORAGE_KEY  = "palma_print_settings";
const DB_URL = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";

// Save to both localStorage (fast) and Firebase (persistent)
async function persistToFirebase(path: string, data: any) {
  try {
    await fetch(`${DB_URL}/${path}.json`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch { /* silent — localStorage is the fallback */ }
}

async function loadFromFirebase(path: string): Promise<any> {
  try {
    const res = await fetch(`${DB_URL}/${path}.json`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}
  return null;
}

function loadPositions(): Record<string, [number, number]> {
  try {
    const saved = localStorage.getItem(POSITIONS_STORAGE_KEY);
    if (saved) return { ...DEFAULT_POSITIONS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_POSITIONS };
}

function savePositions(positions: Record<string, [number, number]>) {
  const overrides: Record<string, [number, number]> = {};
  for (const [k, v] of Object.entries(positions)) {
    const def = DEFAULT_POSITIONS[k];
    if (!def || def[0] !== v[0] || def[1] !== v[1]) {
      overrides[k] = v;
    }
  }
  localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(overrides));
  persistToFirebase("app_settings/field_positions", overrides);
}

function loadSettings(): PrintSettings {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s: PrintSettings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(s));
  persistToFirebase("app_settings/print_settings", s);
}

function contractToLegacy(c: Contract): Record<string, string> {
  return {
    "رقم العقد":            c.contractNumber,
    "Marque":               c.brand,
    "Modèl":                c.model,
    "صنف السيارة":          c.category,
    "Immatricule":          c.registration,
    "يوم الانطلاق":         c.departureDate,
    "ساعة الانطلاق":        c.departureTime,
    "مكان الانطلاق":        c.departurePlace,
    "يوم الرجوع":           c.returnDate,
    "ساعة الرجوع":          c.returnTime,
    "كلم الانطلاق":         c.departureKm,
    "كلم الرجوع":           c.returnKm,
    "Essence":              c.fuelType === "Essence" ? "X" : "",
    "Gasoil":               c.fuelType === "Gasoil"  ? "X" : "",
    "Remise au retour":     c.remiseRetour,
    "الاسم و اللقب":        c.driverName,
    "تاريخ الولادة":        c.driverDob,
    "مكان الولادة":         c.driverBirthPlace,
    "العنوان":              c.driverAddress,
    "الهاتف":               c.driverPhone,
    "رقم بطاقة التعريف":    c.driverCin,
    "تاريخ البطاقة":        c.driverCinDate,
    "مكان البطاقة":         c.driverCinPlace,
    "رخصة السياقة عدد":     c.driverLicense,
    "تاريخ الرخصة":         c.driverLicenseDate,
    "مكان الرخصة":          c.driverLicensePlace,
    "الاسم و االقب 2":      c.hasDriver2 ? c.driver2Name        : "",
    "تاريخ ولادة 2":        c.hasDriver2 ? c.driver2Dob         : "",
    "مكان الولادة 2":       c.hasDriver2 ? c.driver2BirthPlace  : "",
    "العنوان 2":            c.hasDriver2 ? c.driver2Address      : "",
    "الهاتف 2":             c.hasDriver2 ? c.driver2Phone        : "",
    "رقم بطاقة التعريف 2":  c.hasDriver2 ? c.driver2Cin         : "",
    "تاريخ البطاقة 2":      c.hasDriver2 ? c.driver2CinDate      : "",
    "مكان البطاقة 2":       c.hasDriver2 ? c.driver2CinPlace     : "",
    "رخصة السياقة عدد 2":   c.hasDriver2 ? c.driver2License      : "",
    "تاريخ الرخصة 2":       c.hasDriver2 ? c.driver2LicenseDate  : "",
    "مكان الرخصة 2":        c.hasDriver2 ? c.driver2LicensePlace : "",
    // TOTAL PARTIEL = totalFacture (for 2026+ contracts where user enters totalFacture directly)
    // For old contracts, use stored totalPartiel
    "TOTAL PARTIEL": (() => {
      const year = parseInt((c.departureDate || c.date || "2025").slice(0, 4), 10);
      if (year >= 2026) {
        // New contracts: TOTAL PARTIEL = TOTAL FACTURE (rental price without taxes)
        return c.totalFacture || c.totalPartiel || "";
      }
      return c.totalPartiel || "";
    })(),
    "Divers":               c.divers,
    "TOTAL HT":             c.totalHT,
    "TVA":                  c.tva,
    "TOTAL FACTURE":        c.totalFacture,
    "Plus ou moins divers": (() => {
      // For 2026+ contracts, plusMoinsDivers = timbre (already counted separately)
      // Don't display it to avoid duplication
      const year = parseInt((c.departureDate || c.date || "2025").slice(0, 4), 10);
      if (year >= 2026) return "";
      return c.plusMoinsDivers;
    })(),
    "ضمان الايداع":         c.depot,
    "prep":                 c.prep,
    "الجملة":               c.total,
    "المجموع":              c.somme,
    "مدينة الخروج":         c.city,
    "التاريخ":              c.date,
    // Taxe 2dt/j — only for 2026+ contracts
    "Taxe2dt": (() => {
      const year = parseInt((c.departureDate || c.date || "2025").slice(0, 4), 10);
      if (year < 2026) return "";
      const dep = new Date(c.departureDate || "");
      const ret = new Date(c.returnDate || "");
      if (isNaN(dep.getTime()) || isNaN(ret.getTime())) return "";
      const nj = Math.max(1, Math.ceil((ret.getTime() - dep.getTime()) / 86400000));
      return (nj * 2).toFixed(3);
    })(),
    // Timbre fiscal — only for 2026+ (old contracts have it embedded in المجموع)
    "Timbre": (() => {
      const year = parseInt((c.departureDate || c.date || "2025").slice(0, 4), 10);
      return year >= 2026 ? "1.000" : "";
    })(),
  };
}

interface PrintSettings {
  textColor: string;
  contractNumColor: string;
  fontSize: number;
  contractNumFontSize: number;
  fontWeight: "bold" | "normal";
}

const DEFAULT_SETTINGS: PrintSettings = {
  textColor: "#000000",
  contractNumColor: "#000000",
  fontSize: 28,
  contractNumFontSize: 32,
  fontWeight: "bold",
};

const ORIG_W = 2480;
const ORIG_H = 3508;
const HIT_RADIUS = 60;

/** Choose template based on contract year: 2026+ uses new template with 2dt tax */
function getTemplate(contract: Contract): string {
  const year = parseInt((contract.departureDate || contract.date || "2026").slice(0, 4), 10);
  return year >= 2026 ? "/exemple.jpg" : "/exemple2025.jpg";
}

/** Whether to apply 2dt/day tax (only for 2026+) */
function hasTaxe2dt(contract: Contract): boolean {
  const year = parseInt((contract.departureDate || contract.date || "2026").slice(0, 4), 10);
  return year >= 2026;
}

/** Load an image and return it as a promise */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
} // px on original canvas to detect click on text

interface Props {
  contract: Contract;
  onClose: () => void;
}

export default function ContractPreview({ contract, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(0.35);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<PrintSettings>(loadSettings);
  const [positions, setPositions] = useState<Record<string, [number, number]>>(loadPositions);
  const [dragMode, setDragMode] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<[number, number]>([0, 0]);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  const data = useMemo(() => contractToLegacy(contract), [contract]);

  // Reload settings and positions from localStorage on mount (ensures persistence)
  useEffect(() => {
    setSettings(loadSettings());
    setPositions(loadPositions());
    // Also sync from Firebase in background
    loadFromFirebase("app_settings/print_settings").then(data => {
      if (data) {
        const merged = { ...DEFAULT_SETTINGS, ...data };
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
        setSettings(merged);
      }
    });
    loadFromFirebase("app_settings/field_positions").then(data => {
      if (data) {
        const merged = { ...DEFAULT_POSITIONS, ...data };
        localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(data));
        setPositions(merged);
      }
    });
  }, []);

  // ─── Draw ─────────────────────────────────────────────────────────────────
  const draw = useCallback((highlightField?: string | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load template only (exemple.jpg already contains the background)
    loadImage(getTemplate(contract)).then((tmpl) => {
      canvas.width  = ORIG_W;
      canvas.height = ORIG_H;
      ctx.drawImage(tmpl, 0, 0, ORIG_W, ORIG_H);
      ctx.textAlign = "right";
      ctx.direction = "rtl";

      for (const [field, [x, y]] of Object.entries(positions)) {
        const val = data[field];
        if (!val) continue;

        const isContractNum = field === "رقم العقد";
        const fontSize = isContractNum ? settings.contractNumFontSize : settings.fontSize;
        const color    = isContractNum ? settings.contractNumColor    : settings.textColor;

        ctx.font = `${settings.fontWeight} ${fontSize}px 'Tahoma','Arial',sans-serif`;

        // Highlight in drag mode
        if (dragMode) {
          const isHovered = field === highlightField || field === dragging;
          if (isHovered) {
            // Draw highlight box
            const metrics = ctx.measureText(val === "X" ? "X" : val);
            const w = metrics.width + 20;
            const h = fontSize + 10;
            ctx.save();
            ctx.fillStyle = "rgba(245,158,11,0.25)";
            ctx.strokeStyle = "#f59e0b";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(x - w, y - h + 5, w + 10, h, 6);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }

        ctx.fillStyle = color;
        if (val === "X") {
          ctx.textAlign = "center";
          ctx.fillText("X", x, y);
          ctx.textAlign = "right";
        } else {
          ctx.fillText(val, x, y);
        }
      }
    }).catch(() => {});
  }, [positions, data, settings, dragMode, dragging, contract]);
  useEffect(() => { draw(hoveredField); }, [draw, hoveredField]);

  // ─── Canvas → original coords ─────────────────────────────────────────────
  function canvasCoords(e: React.MouseEvent<HTMLCanvasElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = ORIG_W / rect.width;
    const scaleY = ORIG_H / rect.height;
    return [
      (e.clientX - rect.left) * scaleX,
      (e.clientY - rect.top)  * scaleY,
    ];
  }

  function findFieldAt(cx: number, cy: number): string | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    let closest: string | null = null;
    let minDist = HIT_RADIUS;

    for (const [field, [x, y]] of Object.entries(positions)) {
      if (!data[field]) continue;
      const dist = Math.sqrt((cx - x) ** 2 + (cy - y) ** 2);
      if (dist < minDist) { minDist = dist; closest = field; }
    }
    return closest;
  }

  // ─── Mouse events ─────────────────────────────────────────────────────────
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragMode) return;
    const [cx, cy] = canvasCoords(e);
    const field = findFieldAt(cx, cy);
    if (!field) return;
    const [fx, fy] = positions[field];
    setDragging(field);
    setDragOffset([cx - fx, cy - fy]);
    e.preventDefault();
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!dragMode) return;
    const [cx, cy] = canvasCoords(e);

    if (dragging) {
      const newX = Math.round(cx - dragOffset[0]);
      const newY = Math.round(cy - dragOffset[1]);
      setPositions(prev => ({ ...prev, [dragging]: [newX, newY] }));
    } else {
      const field = findFieldAt(cx, cy);
      setHoveredField(field);
    }
  }

  function onMouseUp() {
    if (dragging) {
      savePositions(positions);
      setDragging(null);
    }
  }

  function onMouseLeave() {
    setHoveredField(null);
    if (dragging) {
      savePositions(positions);
      setDragging(null);
    }
  }

  // ─── Print data only (no background, no contract number — for pre-printed forms) ──
  function handlePrintDataOnly() {
    const canvas = document.createElement("canvas");
    canvas.width  = ORIG_W;
    canvas.height = ORIG_H;
    const ctx = canvas.getContext("2d")!;

    // Transparent background (will print as white)
    ctx.clearRect(0, 0, ORIG_W, ORIG_H);

    ctx.textAlign = "right";
    ctx.direction = "rtl";
    ctx.fillStyle = settings.textColor;

    for (const [field, [x, y]] of Object.entries(positions)) {
      // Skip contract number — already printed on the pre-printed form
      if (field === "رقم العقد") continue;

      const val = data[field];
      if (!val) continue;

      ctx.font = `${settings.fontWeight} ${settings.fontSize}px 'Tahoma','Arial',sans-serif`;
      ctx.fillStyle = settings.textColor;

      if (val === "X") {
        ctx.textAlign = "center";
        ctx.fillText("X", x, y);
        ctx.textAlign = "right";
      } else {
        ctx.fillText(val, x, y);
      }
    }

    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>عقد — بيانات فقط</title>
      <style>
        * { margin: 0; padding: 0; }
        html, body { margin: 0; background: white; }
        img { width: 100%; display: block; }
        @media print {
          @page { margin: 0; size: A4 portrait; }
          html, body { width: 210mm; height: 297mm; }
        }
      </style></head>
      <body><img src="${dataUrl}" onload="window.print();window.close()"/></body></html>`);
    win.document.close();
  }

  // ─── Print with background ────────────────────────────────────────────────
  function handlePrint() {
    const template = getTemplate(contract);

    Promise.all([
      loadImage(template).catch(() => null),
      loadImage("/contrat_bg.png").catch(() => null),
    ]).then(([tmpl, bg]) => {
      // Merge both pages into one tall canvas
      const totalH = bg ? ORIG_H * 2 : ORIG_H;
      const merged = document.createElement("canvas");
      merged.width  = ORIG_W;
      merged.height = totalH;
      const ctx = merged.getContext("2d")!;

      // Page 1: template with data
      if (tmpl) ctx.drawImage(tmpl, 0, 0, ORIG_W, ORIG_H);
      else { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ORIG_W, ORIG_H); }

      ctx.textAlign = "right";
      ctx.direction = "rtl";
      for (const [field, [x, y]] of Object.entries(positions)) {
        const val = data[field];
        if (!val) continue;
        const isContractNum = field === "رقم العقد";
        ctx.font = `${settings.fontWeight} ${isContractNum ? settings.contractNumFontSize : settings.fontSize}px 'Tahoma','Arial',sans-serif`;
        ctx.fillStyle = isContractNum ? settings.contractNumColor : settings.textColor;
        if (val === "X") {
          ctx.textAlign = "center";
          ctx.fillText("X", x, y);
          ctx.textAlign = "right";
        } else {
          ctx.fillText(val, x, y);
        }
      }

      // Page 2: background below page 1
      if (bg) {
        ctx.drawImage(bg, 0, ORIG_H, ORIG_W, ORIG_H);
      }

      const win = window.open("", "_blank");
      if (!win) return;

      // Split back into 2 separate pages for clean printing
      const p1Canvas = document.createElement("canvas");
      p1Canvas.width = ORIG_W; p1Canvas.height = ORIG_H;
      p1Canvas.getContext("2d")!.drawImage(merged, 0, 0, ORIG_W, ORIG_H, 0, 0, ORIG_W, ORIG_H);
      const p1Url = p1Canvas.toDataURL("image/jpeg", 0.95);

      let p2Url = "";
      if (bg) {
        const p2Canvas = document.createElement("canvas");
        p2Canvas.width = ORIG_W; p2Canvas.height = ORIG_H;
        p2Canvas.getContext("2d")!.drawImage(merged, 0, ORIG_H, ORIG_W, ORIG_H, 0, 0, ORIG_W, ORIG_H);
        p2Url = p2Canvas.toDataURL("image/jpeg", 0.95);
      }

      win.document.write(`<!DOCTYPE html><html><head>
        <title>عقد ${contract.contractNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; background: #fff; }
          .page {
            width: 210mm;
            height: 297mm;
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .page img { width: 100%; height: 100%; object-fit: fill; display: block; }
          @media print {
            @page { margin: 0; size: A4 portrait; }
            .page { page-break-after: always; page-break-inside: avoid; }
            .page:last-child { page-break-after: avoid; }
          }
        </style>
      </head><body>
        <div class="page"><img src="${p1Url}"/></div>
        ${p2Url ? `<div class="page"><img src="${p2Url}"/></div>` : ""}
      </body></html>`);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 1000);
    }).catch(() => {});
  }

  function resetPositions() {
    localStorage.removeItem(POSITIONS_STORAGE_KEY);
    setPositions({ ...DEFAULT_POSITIONS });
  }

  function updateSetting<K extends keyof PrintSettings>(key: K, val: PrintSettings[K]) {
    setSettings(s => {
      const updated = { ...s, [key]: val };
      saveSettings(updated);
      return updated;
    });
  }

  const displayW = Math.round(ORIG_W * zoom);
  const displayH = Math.round(ORIG_H * zoom);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-h-[95vh] min-w-[600px] w-auto">

        {/* ── Toolbar ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 gap-3 flex-wrap">
          <span className="font-semibold text-slate-700 text-sm">
            {t("preview")} — #{contract.contractNumber}
            <span className="ms-2 text-xs text-slate-400">
              {hasTaxe2dt(contract) ? "📋 2026+ (taxe 2dt)" : "📋 2025"}
            </span>
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Zoom */}
            <button onClick={() => setZoom(z => Math.max(0.15, z - 0.05))}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><ZoomOut size={15}/></button>
            <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoom(z => Math.min(1, z + 0.05))}
              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg"><ZoomIn size={15}/></button>

            <div className="w-px h-5 bg-slate-200"/>

            {/* Drag mode toggle */}
            <button
              onClick={() => setDragMode(d => !d)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors border ${
                dragMode
                  ? "bg-amber-500 text-white border-amber-500"
                  : "text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
              title={isRTL ? "تحريك الحقول" : "Déplacer les champs"}
            >
              {dragMode ? <Move size={14}/> : <Lock size={14}/>}
              {dragMode
                ? (isRTL ? "وضع التحريك" : "Mode déplacement")
                : (isRTL ? "تحريك الحقول" : "Déplacer")}
            </button>

            {/* Reset positions */}
            {dragMode && (
              <button onClick={resetPositions}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
                <RotateCcw size={12}/>
                {isRTL ? "إعادة تعيين" : "Réinitialiser"}
              </button>
            )}

            <div className="w-px h-5 bg-slate-200"/>

            {/* Settings */}
            <button onClick={() => setShowSettings(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showSettings ? "bg-slate-200 text-slate-700" : "text-slate-500 hover:bg-slate-100"
              }`}>
              <Settings2 size={15}/>
              {isRTL ? "إعدادات" : "Paramètres"}
            </button>

            {/* Print with background */}
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors">
              <Printer size={15}/>{isRTL ? "طباعة مع الخلفية" : "Imprimer avec fond"}
            </button>

            {/* Print data only — for pre-printed forms */}
            <button onClick={handlePrintDataOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-sm rounded-lg transition-colors"
              title={isRTL ? "طباعة على عقد جاهز (بدون خلفية)" : "Imprimer sur formulaire pré-imprimé"}>
              <Printer size={15}/>{isRTL ? "بيانات فقط" : "Données seules"}
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* ── Drag mode hint ── */}
        {dragMode && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-2">
            <Move size={13}/>
            {isRTL
              ? "اضغط على أي نص واسحبه لتغيير موضعه — يُحفظ تلقائياً"
              : "Cliquez sur un texte et faites-le glisser pour changer sa position — sauvegarde automatique"}
          </div>
        )}

        {/* ── Print Settings ── */}
        {showSettings && (
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4"
            dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "لون النص" : "Couleur du texte"}
              </label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.textColor}
                  onChange={e => updateSetting("textColor", e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-slate-200"/>
                <span className="text-xs text-slate-500 font-mono">{settings.textColor}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "لون رقم العقد" : "Couleur N° contrat"}
              </label>
              <div className="flex items-center gap-2">
                <input type="color" value={settings.contractNumColor}
                  onChange={e => updateSetting("contractNumColor", e.target.value)}
                  className="w-9 h-9 rounded cursor-pointer border border-slate-200"/>
                <span className="text-xs text-slate-500 font-mono">{settings.contractNumColor}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "حجم الخط" : "Taille police"}
                <span className="text-amber-600 ms-1">{settings.fontSize}px</span>
              </label>
              <input type="range" min={16} max={48} step={1} value={settings.fontSize}
                onChange={e => updateSetting("fontSize", Number(e.target.value))}
                className="accent-amber-500"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "حجم خط رقم العقد" : "Taille N° contrat"}
                <span className="text-amber-600 ms-1">{settings.contractNumFontSize}px</span>
              </label>
              <input type="range" min={16} max={60} step={1} value={settings.contractNumFontSize}
                onChange={e => updateSetting("contractNumFontSize", Number(e.target.value))}
                className="accent-amber-500"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "سماكة الخط" : "Style police"}
              </label>
              <div className="flex gap-2">
                {(["bold", "normal"] as const).map(w => (
                  <button key={w} onClick={() => updateSetting("fontWeight", w)}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${settings.fontWeight === w ? "bg-amber-500 text-white border-amber-500" : "border-slate-200 text-slate-600 hover:bg-slate-100"}`}
                    style={{ fontWeight: w }}>
                    {w === "bold" ? "Gras" : "Normal"}
                  </button>
                ))}
              </div>
            </div>
            {/* Reset */}
            <div className="sm:col-span-4 flex justify-end">
              <button
                onClick={() => {
                  setSettings(DEFAULT_SETTINGS);
                  saveSettings(DEFAULT_SETTINGS);
                }}
                className="text-xs text-slate-500 hover:text-slate-700 underline">
                {isRTL ? "إعادة تعيين" : "Réinitialiser"}
              </button>
            </div>
          </div>
        )}

        {/* ── Canvas ── */}
        <div className="overflow-auto flex-1 p-3 bg-slate-100">
          <canvas
            ref={canvasRef}
            style={{
              width: displayW,
              height: displayH,
              display: "block",
              cursor: dragMode
                ? (dragging ? "grabbing" : hoveredField ? "grab" : "default")
                : "default",
            }}
            className="shadow-lg rounded"
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseLeave}
          />
        </div>
      </div>
    </div>
  );
}
