import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, Search, AlertTriangle } from "lucide-react";
import type { UseFormSetValue } from "react-hook-form";
import { useContractStore } from "../../store/useContractStore";

// Default fleet for auto-fill
const FLEET: Record<string, { brand: string; model: string; category: string }> = {
  "7468TU245": { brand: "Kia",        model: "Stonic D",      category: "SUV" },
  "9192TU234": { brand: "Renault",    model: "Clio Bleu",     category: "Citadine" },
  "5605TU236": { brand: "Hyundai",    model: "I20 Noir",      category: "Citadine" },
  "5606TU236": { brand: "Hyundai",    model: "I20 Blanc",     category: "Citadine" },
  "8305TU238": { brand: "Kia",        model: "Rio",           category: "Citadine" },
  "4485TU240": { brand: "Volkswagen", model: "Virtus Blanc",  category: "Berline" },
  "4486TU240": { brand: "Volkswagen", model: "Virtus Blanc",  category: "Berline" },
  "2526TU242": { brand: "MG",         model: "ZS B",          category: "SUV" },
  "2532TU242": { brand: "MG",         model: "ZS G",          category: "SUV" },
  "1389TU244": { brand: "Seat",       model: "Ibiza",         category: "Citadine" },
  "1162TU245": { brand: "Renault",    model: "Clio Blanc",    category: "Citadine" },
  "2504TU246": { brand: "Hyundai",    model: "I20 G",         category: "Citadine" },
  "2508TU246": { brand: "Hyundai",    model: "I20 B",         category: "Citadine" },
  "4912TU246": { brand: "Kia",        model: "Stonic B",      category: "SUV" },
  "203TU248":  { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
  "201TU248":  { brand: "Seat",       model: "Ibiza B",       category: "Citadine" },
  "1958TU248": { brand: "Mahindra",   model: "XUV R",         category: "SUV" },
  "1959TU248": { brand: "Mahindra",   model: "KUV300 B",      category: "SUV" },
  "1945TU251": { brand: "Suzuki",     model: "Swift R",       category: "Citadine" },
  "5941TU251": { brand: "Renault",    model: "Clio Noir",     category: "Citadine" },
  "5943TU251": { brand: "Renault",    model: "Clio Gris C",   category: "Citadine" },
  "7138TU251": { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
  "7057TU252": { brand: "Kia",        model: "Picanto",       category: "Citadine" },
  "9601TU252": { brand: "Skoda",      model: "Kushaq B",      category: "SUV" },
  "9603TU252": { brand: "Skoda",      model: "Kushaq Bleu",   category: "SUV" },
  "3541TU253": { brand: "Volkswagen", model: "Virtus Gris",   category: "Berline" },
  "7378TU254": { brand: "Volkswagen", model: "T-Cross",       category: "SUV" },
  "7379TU254": { brand: "Volkswagen", model: "T-Cross",       category: "SUV" },
  "7360TU255": { brand: "Citroen",    model: "Berlingo",      category: "Utilitaire" },
  "6155TU259": { brand: "Seat",       model: "Ibiza N",       category: "Citadine" },
};

function normReg(s: string) {
  return s.replace(/\s+/g, "").toUpperCase();
}

interface Props {
  setValue: UseFormSetValue<any>;
  defaultValue?: string;
  currentContractId?: string; // exclude current contract from check (edit mode)
}

export default function RegistrationInput({ setValue, defaultValue = "", currentContractId }: Props) {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const contracts = useContractStore((s) => s.contracts);

  // Split into left (before TU) and right (after TU)
  const parseReg = (val: string) => {
    const norm = normReg(val);
    const idx = norm.indexOf("TU");
    if (idx >= 0) return { left: norm.slice(0, idx), right: norm.slice(idx + 2) };
    return { left: norm, right: "" };
  };

  const parsed = parseReg(defaultValue);
  const [left, setLeft]   = useState(parsed.left);
  const [right, setRight] = useState(parsed.right);
  const [matched, setMatched] = useState<{ brand: string; model: string; category: string } | null>(null);
  const [conflict, setConflict] = useState<{ contractNumber: string; driverName: string; returnDate: string } | null>(null);
  const rightRef = useRef<HTMLInputElement>(null);

  function buildReg(l: string, r: string) {
    return `${l}TU${r}`;
  }

  // Update when defaultValue changes (e.g. when importing from old contract)
  useEffect(() => {
    const p = parseReg(defaultValue);
    setLeft(p.left);
    setRight(p.right);
    if (p.left && p.right) {
      const full = normReg(buildReg(p.left, p.right));
      const car = FLEET[full];
      setMatched(car || null);
    }
  }, [defaultValue]);

  function checkAvailability(reg: string) {
    if (!reg || reg.length < 5) { setConflict(null); return; }
    const now = new Date();
    const nowDT = now.toISOString().split("T")[0] + " " +
      String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
    const normReg_ = normReg(reg);

    // Check if car belongs to a sous-traitant
    try {
      fetch("https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/sous_traitants.json")
        .then(r => r.json())
        .then(data => {
          if (!data) return;
          for (const [id, st] of Object.entries(data) as any) {
            const found = (st.cars || []).find((c: any) =>
              normReg(c.registration || "") === normReg_
            );
            if (found) {
              setValue("ownerId", id);
              return;
            }
          }
          setValue("ownerId", "");
        }).catch(() => {});
    } catch {}

    const active = contracts.find((c) => {
      if (c._deleted) return false;
      if (currentContractId && c.id === currentContractId) return false;
      if (normReg(c.registration || "") !== normReg_) return false;
      if (!c.departureDate || !c.returnDate) return false;
      if (c.departureDate > nowDT.slice(0, 10)) return false;
      const retDT = c.returnDate + " " + (c.returnTime || "23:59");
      if (retDT < nowDT) return false;
      return true;
    });
    setConflict(active ? { contractNumber: active.contractNumber, driverName: active.driverName, returnDate: active.returnDate } : null);
  }

  function tryAutoFill(l: string, r: string) {
    const full = normReg(buildReg(l, r));
    const car = FLEET[full];
    if (car) {
      setMatched(car);
      setValue("registration", buildReg(l, r));
      setValue("brand",    car.brand,    { shouldDirty: true });
      setValue("model",    car.model,    { shouldDirty: true });
      setValue("category", car.category, { shouldDirty: true });
    } else {
      setMatched(null);
      setValue("registration", buildReg(l, r));
    }
    checkAvailability(buildReg(l, r));
  }

  function handleLeft(val: string) {
    // Only digits
    const digits = val.replace(/\D/g, "").slice(0, 4);
    setLeft(digits);
    tryAutoFill(digits, right);
    // Auto-jump to right when 4 digits entered
    if (digits.length === 4) rightRef.current?.focus();
  }

  function handleRight(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 3);
    setRight(digits);
    tryAutoFill(left, digits);
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
        {isRTL ? "رقم التسجيل" : "Immatriculation"}
      </label>

      {/* Input row: [XXXX] TU [XXX] */}
      <div className="flex items-center gap-1">
        <input
          type="text"
          inputMode="numeric"
          value={left}
          onChange={e => handleLeft(e.target.value)}
          placeholder="XXXX"
          maxLength={4}
          className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <span className="px-2 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 select-none">
          TU
        </span>
        <input
          ref={rightRef}
          type="text"
          inputMode="numeric"
          value={right}
          onChange={e => handleRight(e.target.value)}
          placeholder="XXX"
          maxLength={3}
          className="w-16 px-3 py-2 border border-slate-200 rounded-lg text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {matched && (
          <CheckCircle size={16} className="text-green-500 ms-1 shrink-0" />
        )}
      </div>

      {/* Auto-fill result */}
      {matched && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5">
          <Search size={11} />
          <span className="font-medium">{matched.brand} {matched.model}</span>
          <span className="text-green-500">— {matched.category}</span>
          <span className="text-green-400 ms-1">
            {isRTL ? "✓ تم ملء البيانات تلقائياً" : "✓ Données remplies automatiquement"}
          </span>
        </div>
      )}

      {/* Availability warning */}
      {conflict && (
        <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-1">
          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-red-500" />
          <div>
            <p className="font-bold">
              {isRTL ? "⚠️ السيارة محجوزة حالياً" : "⚠️ Véhicule déjà en location"}
            </p>
            <p>
              {isRTL
                ? `عقد رقم ${conflict.contractNumber} — ${conflict.driverName} — حتى ${conflict.returnDate}`
                : `Contrat N° ${conflict.contractNumber} — ${conflict.driverName} — jusqu'au ${conflict.returnDate}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
