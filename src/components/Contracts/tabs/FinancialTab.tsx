import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { UseFormRegister, UseFormWatch, UseFormSetValue } from "react-hook-form";
import Field from "../../ui/Field";
import { useVisibility } from "../../../hooks/useVisibility";

interface Props {
  register: UseFormRegister<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

const TVA_RATE  = 0.19;
const TIMBRE    = 1.000;
const TAXE_RATE = 2; // 2 TND/jour (2026+)
const ST_DAILY_RATE = 2000; // 2000 TND/jour for sous-traitants

function toNum(v: string | undefined) {
  const n = parseFloat((v ?? "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
function fmt(n: number) { return n.toFixed(3); }

function daysBetween(dep: string, ret: string) {
  if (!dep || !ret) return 0;
  const d1 = new Date(dep), d2 = new Date(ret);
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  return Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / 86400000));
}

export default function FinancialTab({ register, watch, setValue }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const vis = useVisibility();

  // User inputs
  const totalFactureInput = watch("totalFacture");
  const avance            = watch("depot");
  const depot             = watch("depotGarantie");
  const departureDate     = watch("departureDate");
  const returnDate        = watch("returnDate");
  const ownerId           = watch("ownerId");

  // Track if user manually modified totalFacture (useRef persists across re-renders)
  const userModifiedFacture = useRef(false);

  const is2026Plus = useMemo(() => {
    const y = parseInt((departureDate || "").slice(0, 4), 10);
    return y >= 2026;
  }, [departureDate]);

  const nj      = useMemo(() => daysBetween(departureDate, returnDate), [departureDate, returnDate]);
  const taxe2dt = is2026Plus ? nj * TAXE_RATE : 0;

  useEffect(() => {
    const facture  = toNum(totalFactureInput);
    if (facture === 0) return;

    const totalHT = facture / (1 + TVA_RATE);
    const tva     = facture - totalHT;

    // Somme = TOTAL FACTURE + taxe2dt + timbre ONLY
    // divers/plusMoins/prep are already included in totalFacture
    const somme = facture + taxe2dt + TIMBRE;

    setValue("totalPartiel", fmt(facture),  { shouldDirty: false });
    setValue("totalHT",      fmt(totalHT),  { shouldDirty: false });
    setValue("tva",          fmt(tva),      { shouldDirty: false });
    setValue("somme",        fmt(somme),    { shouldDirty: false });
    setValue("total",        fmt(facture),  { shouldDirty: false });
  }, [totalFactureInput, taxe2dt]);

  // Auto-calculate totalFacture for sous-traitants (2000 TND/day)
  useEffect(() => {
    if (ownerId && nj > 0 && !userModifiedFacture.current) {
      const autoFacture = nj * ST_DAILY_RATE;
      setValue("totalFacture", fmt(autoFacture), { shouldDirty: false });
    }
  }, [ownerId, nj]);



  const facture  = toNum(totalFactureInput);
  const avanceN  = toNum(avance);
  const sommeTotal = facture + taxe2dt + TIMBRE;
  const reste    = sommeTotal - avanceN;

  // Sync reste to form
  useEffect(() => {
    setValue("resteAPayer", fmt(Math.max(0, sommeTotal - avanceN)), { shouldDirty: false });
  }, [sommeTotal, avanceN]);

  return (
    <div className="space-y-5">
      {/* ── Main inputs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* TOTAL FACTURE — main input */}
        <Field label={isRTL ? "المبلغ الإجمالي (TOTAL FACTURE)" : "TOTAL FACTURE"} className="sm:col-span-2">
          <input
            {...register("totalFacture")}
            className="input text-end font-mono text-lg font-bold"
            placeholder="0.000"
            onChange={(e) => {
              userModifiedFacture.current = true;
              register("totalFacture").onChange(e);
            }}
          />
        </Field>

        <Field label={t("divers")}>
          <input {...register("divers")} className="input text-end font-mono" placeholder="0.000" />
        </Field>
        <Field label={t("prep")}>
          <input {...register("prep")} className="input text-end font-mono" placeholder="0.000" />
        </Field>

        {/* Avance payée */}
        <Field label={isRTL ? "المبلغ المدفوع (Avance)" : "Avance payée"}>
          <input {...register("depot")} className="input text-end font-mono" placeholder="0.000" />
        </Field>

        {/* Dépôt de garantie */}
        <Field label={isRTL ? "ضمان الإيداع" : "Dépôt de garantie"} className="sm:col-span-2">
          <div className="flex items-center gap-3">
            <input
              {...register("depotGarantie")}
              className="input text-end font-mono flex-1"
              placeholder="0.000"
            />
            <span className="text-xs text-slate-500 whitespace-nowrap">
              {isRTL ? "(لا يُحتسب في المجموع)" : "(non inclus dans le total)"}
            </span>
          </div>
        </Field>
      </div>

      <div className="border-t border-slate-100" />

      {/* ── Auto-calculated summary ── */}
      {vis.showPrices ? (
      <div className="bg-slate-50 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          {isRTL ? "الملخص التلقائي" : "Récapitulatif automatique"}
          {is2026Plus && nj > 0 && (
            <span className="ms-2 text-amber-600 normal-case font-normal">
              — {nj}j × 2dt = {fmt(taxe2dt)} TND
            </span>
          )}
        </p>

        <Row label={isRTL ? "سعر الكراء" : "TOTAL FACTURE"} value={fmt(facture)} />

        {is2026Plus && (
          <Row
            label={isRTL ? `أتاوي الدولة (${nj}j × 2dt)` : `Taxe Services Location (${nj}j × 2dt)`}
            value={fmt(taxe2dt)}
            color="text-amber-700"
          />
        )}

        <Row label="Timbre fiscal" value={fmt(TIMBRE)} />

        <div className="border-t border-slate-200 pt-2 mt-1 flex items-center justify-between">
          <span className="text-sm font-bold text-slate-700">{t("sum")}</span>
          <span className="font-mono font-bold text-green-700 text-sm">{watch("somme") || "0.000"} TND</span>
        </div>

        {/* Avance & Reste */}
        {avanceN > 0 && (
          <>
            <Row label={isRTL ? "مدفوع" : "Avance payée"} value={`- ${fmt(avanceN)}`} color="text-blue-600" />
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <span className="text-sm font-bold text-slate-700">{isRTL ? "الباقي" : "Reste à payer"}</span>
              <span className={`font-mono font-bold text-sm ${reste > 0 ? "text-red-600" : "text-green-600"}`}>
                {reste > 0 ? fmt(reste) : "✓ 0.000"} TND
              </span>
            </div>
          </>
        )}

        {/* Dépôt de garantie info */}
        {vis.showDepotGarantie && toNum(depot) > 0 && (
          <div className="flex items-center justify-between bg-amber-50 rounded-lg px-3 py-2 mt-2">
            <span className="text-xs text-amber-700">{isRTL ? "ضمان الإيداع" : "Dépôt de garantie"}</span>
            <span className="font-mono font-semibold text-amber-700 text-xs">{fmt(toNum(depot))} TND</span>
          </div>
        )}
      </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-4 text-center text-xs text-slate-400">
          {isRTL ? "البيانات المالية مخفية" : "Données financières masquées"}
        </div>
      )}

      {/* Hidden fields */}
      <input type="hidden" {...register("totalPartiel")} />
      <input type="hidden" {...register("totalHT")} />
      <input type="hidden" {...register("tva")} />
      <input type="hidden" {...register("total")} />
      <input type="hidden" {...register("somme")} />
      <input type="hidden" {...register("resteAPayer")} />
    </div>
  );
}

function Row({ label, value, color = "text-slate-800" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`font-mono font-semibold text-sm ${color}`}>{value} TND</span>
    </div>
  );
}
