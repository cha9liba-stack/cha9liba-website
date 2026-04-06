import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { X, Printer, ZoomIn, ZoomOut, Settings2, Move, Lock, RotateCcw } from "lucide-react";
import type { Contract } from "../../types";

// â”€â”€â”€ Default field positions (from field_positions.json) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const DEFAULT_POSITIONS: Record<string, [number, number]> = {
  "Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø¯":            [1123, 710],
  "Marque":               [1076, 963],
  "ModÃ¨l":                [1060, 1050],
  "ØµÙ†Ù Ø§Ù„Ø³ÙŠØ§Ø±Ø©":          [1096, 1136],
  "Immatricule":          [1106, 1213],
  "ÙŠÙˆÙ… Ø§Ù„Ø±Ø¬ÙˆØ¹":           [1703, 953],
  "Ø³Ø§Ø¹Ø© Ø§Ù„Ø±Ø¬ÙˆØ¹":          [1720, 1046],
  "Ù…ÙƒØ§Ù† Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":        [1720, 1140],
  "ÙŠÙˆÙ… Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":         [1693, 1226],
  "Ø³Ø§Ø¹Ø© Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":        [1733, 1320],
  "ÙƒÙ„Ù… Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":         [180,  1266],
  "ÙƒÙ„Ù… Ø§Ù„Ø±Ø¬ÙˆØ¹":           [533,  1260],
  "Ø§Ù„Ø§Ø³Ù… Ùˆ Ø§Ù„Ù„Ù‚Ø¨":        [586,  1440],
  "ØªØ§Ø±ÙŠØ® Ø§Ù„ÙˆÙ„Ø§Ø¯Ø©":        [253,  1536],
  "Ù…ÙƒØ§Ù† Ø§Ù„ÙˆÙ„Ø§Ø¯Ø©":         [746,  1533],
  "Ø§Ù„Ø¹Ù†ÙˆØ§Ù†":              [336,  1626],
  "Ø§Ù„Ù‡Ø§ØªÙ":               [963,  1710],
  "Ø±Ù‚Ù… Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ØªØ¹Ø±ÙŠÙ":    [563,  1793],
  "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©":        [360,  1890],
  "Ù…ÙƒØ§Ù† Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©":         [886,  1883],
  "Ø±Ø®ØµØ© Ø§Ù„Ø³ÙŠØ§Ù‚Ø© Ø¹Ø¯Ø¯":     [563,  1980],
  "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø±Ø®ØµØ©":         [360,  2066],
  "Ù…ÙƒØ§Ù† Ø§Ù„Ø±Ø®ØµØ©":          [886,  2076],
  "TOTAL PARTIEL":        [1563, 1550],
  "Divers":               [1606, 1866],
  "TOTAL HT":             [1603, 2176],
  "Ø§Ù„Ø§Ø³Ù… Ùˆ Ø§Ø§Ù„Ù‚Ø¨ 2":      [506,  2240],
  "ØªØ§Ø±ÙŠØ® ÙˆÙ„Ø§Ø¯Ø© 2":        [233,  2326],
  "Ù…ÙƒØ§Ù† Ø§Ù„ÙˆÙ„Ø§Ø¯Ø© 2":       [706,  2326],
  "Ø§Ù„Ø¹Ù†ÙˆØ§Ù† 2":            [313,  2416],
  "Ø§Ù„Ù‡Ø§ØªÙ 2":             [923,  2506],
  "Ø±Ù‚Ù… Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ØªØ¹Ø±ÙŠÙ 2":  [566,  2590],
  "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© 2":      [323,  2680],
  "Ù…ÙƒØ§Ù† Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© 2":       [866,  2686],
  "Ø±Ø®ØµØ© Ø§Ù„Ø³ÙŠØ§Ù‚Ø© Ø¹Ø¯Ø¯ 2":   [530,  2770],
  "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø±Ø®ØµØ© 2":       [316,  2856],
  "Ù…ÙƒØ§Ù† Ø§Ù„Ø±Ø®ØµØ© 2":        [833,  2863],
  "TVA":                  [1620, 2290],
  "TOTAL FACTURE":        [1620, 2500],
  "Plus ou moins divers": [1680, 2693],
  "Ø¶Ù…Ø§Ù† Ø§Ù„Ø§ÙŠØ¯Ø§Ø¹":         [2190, 2640],
  "prep":                 [2226, 2696],
  "Ø§Ù„Ø¬Ù…Ù„Ø©":               [2096, 2746],
  "Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹":              [1773, 2870],
  "Remise au retour":     [843,  3060],
  "Ù…Ø¯ÙŠÙ†Ø© Ø§Ù„Ø®Ø±ÙˆØ¬":         [1706, 2990],
  "Ø§Ù„ØªØ§Ø±ÙŠØ®":              [2020, 2993],
  "Essence":              [646,  2980],
  "Gasoil":               [976,  2983],
  "Taxe2dt":              [1620, 2060], // Taxe Services Location 2dt/j (2026+)
  "Timbre":               [1900, 2150], // Timbre fiscal 1.000 dt â€” positioned after the text
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
  } catch { /* silent â€” localStorage is the fallback */ }
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
    "Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø¯":            c.contractNumber,
    "Marque":               c.brand,
    "ModÃ¨l":                c.model,
    "ØµÙ†Ù Ø§Ù„Ø³ÙŠØ§Ø±Ø©":          c.category,
    "Immatricule":          c.registration,
    "ÙŠÙˆÙ… Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":         c.departureDate,
    "Ø³Ø§Ø¹Ø© Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":        c.departureTime,
    "Ù…ÙƒØ§Ù† Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":        c.departurePlace,
    "ÙŠÙˆÙ… Ø§Ù„Ø±Ø¬ÙˆØ¹":           c.returnDate,
    "Ø³Ø§Ø¹Ø© Ø§Ù„Ø±Ø¬ÙˆØ¹":          c.returnTime,
    "ÙƒÙ„Ù… Ø§Ù„Ø§Ù†Ø·Ù„Ø§Ù‚":         c.departureKm,
    "ÙƒÙ„Ù… Ø§Ù„Ø±Ø¬ÙˆØ¹":           c.returnKm,
    "Essence":              c.fuelType === "Essence" ? "X" : "",
    "Gasoil":               c.fuelType === "Gasoil"  ? "X" : "",
    "Remise au retour":     c.remiseRetour,
    "Ø§Ù„Ø§Ø³Ù… Ùˆ Ø§Ù„Ù„Ù‚Ø¨":        c.driverName,
    "ØªØ§Ø±ÙŠØ® Ø§Ù„ÙˆÙ„Ø§Ø¯Ø©":        c.driverDob,
    "Ù…ÙƒØ§Ù† Ø§Ù„ÙˆÙ„Ø§Ø¯Ø©":         c.driverBirthPlace,
    "Ø§Ù„Ø¹Ù†ÙˆØ§Ù†":              c.driverAddress,
    "Ø§Ù„Ù‡Ø§ØªÙ":               c.driverPhone,
    "Ø±Ù‚Ù… Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ØªØ¹Ø±ÙŠÙ":    c.driverCin,
    "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©":        c.driverCinDate,
    "Ù…ÙƒØ§Ù† Ø§Ù„Ø¨Ø·Ø§Ù‚Ø©":         c.driverCinPlace,
    "Ø±Ø®ØµØ© Ø§Ù„Ø³ÙŠØ§Ù‚Ø© Ø¹Ø¯Ø¯":     c.driverLicense,
    "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø±Ø®ØµØ©":         c.driverLicenseDate,
    "Ù…ÙƒØ§Ù† Ø§Ù„Ø±Ø®ØµØ©":          c.driverLicensePlace,
    "Ø§Ù„Ø§Ø³Ù… Ùˆ Ø§Ø§Ù„Ù‚Ø¨ 2":      c.hasDriver2 ? c.driver2Name        : "",
    "ØªØ§Ø±ÙŠØ® ÙˆÙ„Ø§Ø¯Ø© 2":        c.hasDriver2 ? c.driver2Dob         : "",
    "Ù…ÙƒØ§Ù† Ø§Ù„ÙˆÙ„Ø§Ø¯Ø© 2":       c.hasDriver2 ? c.driver2BirthPlace  : "",
    "Ø§Ù„Ø¹Ù†ÙˆØ§Ù† 2":            c.hasDriver2 ? c.driver2Address      : "",
    "Ø§Ù„Ù‡Ø§ØªÙ 2":             c.hasDriver2 ? c.driver2Phone        : "",
    "Ø±Ù‚Ù… Ø¨Ø·Ø§Ù‚Ø© Ø§Ù„ØªØ¹Ø±ÙŠÙ 2":  c.hasDriver2 ? c.driver2Cin         : "",
    "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© 2":      c.hasDriver2 ? c.driver2CinDate      : "",
    "Ù…ÙƒØ§Ù† Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© 2":       c.hasDriver2 ? c.driver2CinPlace     : "",
    "Ø±Ø®ØµØ© Ø§Ù„Ø³ÙŠØ§Ù‚Ø© Ø¹Ø¯Ø¯ 2":   c.hasDriver2 ? c.driver2License      : "",
    "ØªØ§Ø±ÙŠØ® Ø§Ù„Ø±Ø®ØµØ© 2":       c.hasDriver2 ? c.driver2LicenseDate  : "",
    "Ù…ÙƒØ§Ù† Ø§Ù„Ø±Ø®ØµØ© 2":        c.hasDriver2 ? c.driver2LicensePlace : "",
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
    "Ø¶Ù…Ø§Ù† Ø§Ù„Ø§ÙŠØ¯Ø§Ø¹":         c.depot,
    "prep":                 c.prep,
    "Ø§Ù„Ø¬Ù…Ù„Ø©":               c.total,
    "Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹":              c.somme,
    "Ù…Ø¯ÙŠÙ†Ø© Ø§Ù„Ø®Ø±ÙˆØ¬":         c.city,
    "Ø§Ù„ØªØ§Ø±ÙŠØ®":              c.date,
    // Taxe 2dt/j â€” only for 2026+ contracts
    "Taxe2dt": (() => {
      const year = parseInt((c.departureDate || c.date || "2025").slice(0, 4), 10);
      if (year < 2026) return "";
      const dep = new Date(c.departureDate || "");
      const ret = new Date(c.returnDate || "");
      if (isNaN(dep.getTime()) || isNaN(ret.getTime())) return "";
      const nj = Math.max(1, Math.ceil((ret.getTime() - dep.getTime()) / 86400000));
      return (nj * 2).toFixed(3);
    })(),
    // Timbre fiscal â€” only for 2026+ (old contracts have it embedded in Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹)
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

// Offsets to adjust image positions
const TEMPLATE_OFFSET_Y = -150;  // Move template UP (negative = up) to hide white space
const BG_OFFSET_Y = 80;          // Move background DOWN (positive = down) to avoid text cutoff

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

  // Reload settings and positions from localStorage on mount
  // Only sync from Firebase if no local settings exist
  useEffect(() => {
    const localSettings = loadSettings();
    const localPositions = loadPositions();
    setSettings(localSettings);
    setPositions(localPositions);

    // Only load from Firebase if localStorage is empty (first time on new device)
    const hasLocalSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const hasLocalPositions = localStorage.getItem(POSITIONS_STORAGE_KEY);

    if (!hasLocalSettings) {
      loadFromFirebase("app_settings/print_settings").then(data => {
        if (data) {
          const merged = { ...DEFAULT_SETTINGS, ...data };
          localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(merged));
          setSettings(merged);
        }
      });
    }
    if (!hasLocalPositions) {
      loadFromFirebase("app_settings/field_positions").then(data => {
        if (data) {
          localStorage.setItem(POSITIONS_STORAGE_KEY, JSON.stringify(data));
          setPositions({ ...DEFAULT_POSITIONS, ...data });
        }
      });
    }
  }, []);

  // â”€â”€â”€ Draw â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const draw = useCallback((highlightField?: string | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load template only (exemple.jpg already contains the background)
    loadImage(getTemplate(contract)).then((tmpl) => {
      canvas.width  = ORIG_W;
      canvas.height = ORIG_H;
      // White background first
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ORIG_W, ORIG_H);
      ctx.drawImage(tmpl, 0, TEMPLATE_OFFSET_Y, ORIG_W, ORIG_H);

      // Helper: draw text with correct direction (numbers/latin = ltr, arabic = rtl)
      function drawText(val: string, x: number, y: number) {
        const hasArabic = /[\u0600-\u06FF]/.test(val);
        const isNumericOrLatin = /^[\d\s\+\-\.\/\\:]+$/.test(val);
        if (isNumericOrLatin || !hasArabic) {
          // Numbers and latin text: use ltr to prevent reversal
          ctx.save();
          ctx.direction = "ltr";
          ctx.textAlign = "left";
          // Adjust x position (was right-aligned, now left-aligned)
          const metrics = ctx.measureText(val);
          ctx.fillText(val, x - metrics.width, y);
          ctx.restore();
          ctx.direction = "rtl";
          ctx.textAlign = "right";
        } else {
          ctx.fillText(val, x, y);
        }
      }

      ctx.textAlign = "right";
      ctx.direction = "rtl";

      for (const [field, [x, y]] of Object.entries(positions)) {
        const val = data[field];
        if (!val) continue;

        const isContractNum = field === "Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø¯";
        const fontSize = isContractNum ? settings.contractNumFontSize : settings.fontSize;
        const color    = isContractNum ? settings.contractNumColor    : settings.textColor;

        ctx.font = `${settings.fontWeight} ${fontSize}px 'Tahoma','Arial',sans-serif`;

        // Highlight in drag mode
        if (dragMode) {
          const isHovered = field === highlightField || field === dragging;
          if (isHovered) {
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
          drawText(val, x, y);
        }
      }

      // Draw "لا شيء" diagonally if no second driver
      if (!contract.hasDriver2) {
        ctx.save();
        // Draw from top-left to bottom-right of driver2 area
        const x1 = 150, y1 = 2220;
        const x2 = 1150, y2 = 2880;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.font = `bold 220px 'Tahoma','Arial',sans-serif`;
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.textAlign = "center";
        ctx.direction = "rtl";
        ctx.fillText("\u0644\u0627 \u0634\u064a\u0621", 0, 0);
        ctx.restore();
        ctx.textAlign = "right";
        ctx.direction = "rtl";
      }
    }).catch(() => {});
  }, [positions, data, settings, dragMode, dragging, contract]);
  useEffect(() => { draw(hoveredField); }, [draw, hoveredField]);

  // â”€â”€â”€ Canvas â†’ original coords â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Mouse events â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€â”€ Print data only (no background, no contract number â€” for pre-printed forms) â”€â”€
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
      // Skip contract number â€” already printed on the pre-printed form
      if (field === "Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø¯") continue;

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

    // Draw "لا شيء" if no second driver
    if (!contract.hasDriver2) {
      ctx.save();
      const x1=150, y1=2220, x2=1150, y2=2880;
      const cx=(x1+x2)/2, cy=(y1+y2)/2;
      const angle=Math.atan2(y2-y1, x2-x1);
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.font=`bold 220px 'Tahoma','Arial',sans-serif`;
      ctx.fillStyle="rgba(0,0,0,0.7)";
      ctx.textAlign="center";
      ctx.direction="rtl";
      ctx.fillText("\u0644\u0627 \u0634\u064a\u0621", 0, 0);
      ctx.restore();
    }

    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Ø¹Ù‚Ø¯ â€” Ø¨ÙŠØ§Ù†Ø§Øª ÙÙ‚Ø·</title>
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

  // â”€â”€â”€ Print with background â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, ORIG_W, ORIG_H);
      if (tmpl) ctx.drawImage(tmpl, 0, TEMPLATE_OFFSET_Y, ORIG_W, ORIG_H);
      else { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, ORIG_W, ORIG_H); }

      ctx.textAlign = "right";
      ctx.direction = "rtl";
      for (const [field, [x, y]] of Object.entries(positions)) {
        const val = data[field];
        if (!val) continue;
        const isContractNum = field === "Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø¯";
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

      // Draw "لا شيء" if no second driver
      if (!contract.hasDriver2) {
        ctx.save();
        const x1=150, y1=2220, x2=1150, y2=2880;
        const cx=(x1+x2)/2, cy=(y1+y2)/2;
        const angle=Math.atan2(y2-y1, x2-x1);
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.font=`bold 220px 'Tahoma','Arial',sans-serif`;
        ctx.fillStyle="rgba(0,0,0,0.7)";
        ctx.textAlign="center";
        ctx.direction="rtl";
        ctx.fillText("\u0644\u0627 \u0634\u064a\u0621", 0, 0);
        ctx.restore();
      }

      // Page 2: background below page 1
      if (bg) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, ORIG_H, ORIG_W, ORIG_H);
        ctx.drawImage(bg, 0, ORIG_H + BG_OFFSET_Y, ORIG_W, ORIG_H);
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
        <title>Ø¹Ù‚Ø¯ ${contract.contractNumber}</title>
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

        {/* â”€â”€ Toolbar â”€â”€ */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 gap-3 flex-wrap">
          <span className="font-semibold text-slate-700 text-sm">
            {t("preview")} â€” #{contract.contractNumber}
            <span className="ms-2 text-xs text-slate-400">
              {hasTaxe2dt(contract) ? "ðŸ“‹ 2026+ (taxe 2dt)" : "ðŸ“‹ 2025"}
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
              title={isRTL ? "ØªØ­Ø±ÙŠÙƒ Ø§Ù„Ø­Ù‚ÙˆÙ„" : "DÃ©placer les champs"}
            >
              {dragMode ? <Move size={14}/> : <Lock size={14}/>}
              {dragMode
                ? (isRTL ? "ÙˆØ¶Ø¹ Ø§Ù„ØªØ­Ø±ÙŠÙƒ" : "Mode dÃ©placement")
                : (isRTL ? "ØªØ­Ø±ÙŠÙƒ Ø§Ù„Ø­Ù‚ÙˆÙ„" : "DÃ©placer")}
            </button>

            {/* Reset positions */}
            {dragMode && (
              <button onClick={resetPositions}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg border border-red-200 transition-colors">
                <RotateCcw size={12}/>
                {isRTL ? "Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†" : "RÃ©initialiser"}
              </button>
            )}

            <div className="w-px h-5 bg-slate-200"/>

            {/* Settings */}
            <button onClick={() => setShowSettings(s => !s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                showSettings ? "bg-slate-200 text-slate-700" : "text-slate-500 hover:bg-slate-100"
              }`}>
              <Settings2 size={15}/>
              {isRTL ? "Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª" : "ParamÃ¨tres"}
            </button>

            {/* Print with background */}
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition-colors">
              <Printer size={15}/>{isRTL ? "Ø·Ø¨Ø§Ø¹Ø© Ù…Ø¹ Ø§Ù„Ø®Ù„ÙÙŠØ©" : "Imprimer avec fond"}
            </button>

            {/* Print data only â€” for pre-printed forms */}
            <button onClick={handlePrintDataOnly}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-sm rounded-lg transition-colors"
              title={isRTL ? "Ø·Ø¨Ø§Ø¹Ø© Ø¹Ù„Ù‰ Ø¹Ù‚Ø¯ Ø¬Ø§Ù‡Ø² (Ø¨Ø¯ÙˆÙ† Ø®Ù„ÙÙŠØ©)" : "Imprimer sur formulaire prÃ©-imprimÃ©"}>
              <Printer size={15}/>{isRTL ? "Ø¨ÙŠØ§Ù†Ø§Øª ÙÙ‚Ø·" : "DonnÃ©es seules"}
            </button>

            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
              <X size={18}/>
            </button>
          </div>
        </div>

        {/* â”€â”€ Drag mode hint â”€â”€ */}
        {dragMode && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-2">
            <Move size={13}/>
            {isRTL
              ? "Ø§Ø¶ØºØ· Ø¹Ù„Ù‰ Ø£ÙŠ Ù†Øµ ÙˆØ§Ø³Ø­Ø¨Ù‡ Ù„ØªØºÙŠÙŠØ± Ù…ÙˆØ¶Ø¹Ù‡ â€” ÙŠÙØ­ÙØ¸ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹"
              : "Cliquez sur un texte et faites-le glisser pour changer sa position â€” sauvegarde automatique"}
          </div>
        )}

        {/* â”€â”€ Print Settings â”€â”€ */}
        {showSettings && (
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4"
            dir={isRTL ? "rtl" : "ltr"}>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "Ù„ÙˆÙ† Ø§Ù„Ù†Øµ" : "Couleur du texte"}
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
                {isRTL ? "Ù„ÙˆÙ† Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø¯" : "Couleur NÂ° contrat"}
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
                {isRTL ? "Ø­Ø¬Ù… Ø§Ù„Ø®Ø·" : "Taille police"}
                <span className="text-amber-600 ms-1">{settings.fontSize}px</span>
              </label>
              <input type="range" min={16} max={48} step={1} value={settings.fontSize}
                onChange={e => updateSetting("fontSize", Number(e.target.value))}
                className="accent-amber-500"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "Ø­Ø¬Ù… Ø®Ø· Ø±Ù‚Ù… Ø§Ù„Ø¹Ù‚Ø¯" : "Taille NÂ° contrat"}
                <span className="text-amber-600 ms-1">{settings.contractNumFontSize}px</span>
              </label>
              <input type="range" min={16} max={60} step={1} value={settings.contractNumFontSize}
                onChange={e => updateSetting("contractNumFontSize", Number(e.target.value))}
                className="accent-amber-500"/>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-600">
                {isRTL ? "Ø³Ù…Ø§ÙƒØ© Ø§Ù„Ø®Ø·" : "Style police"}
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
                {isRTL ? "Ø¥Ø¹Ø§Ø¯Ø© ØªØ¹ÙŠÙŠÙ†" : "RÃ©initialiser"}
              </button>
            </div>
          </div>
        )}

        {/* â”€â”€ Canvas â”€â”€ */}
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

