import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Eye, History } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  insertContract,
  updateContract,
  isDuplicateContractNumber,
} from "../../services/contractService";
import { logAction } from "../../services/auditService";
import { useAuthStore } from "../../store/useAuthStore";
import { useContractStore } from "../../store/useContractStore";
import type { Contract } from "../../types";
import VehicleTab from "./tabs/VehicleTab";
import Driver1Tab from "./tabs/Driver1Tab";
import Driver2Tab from "./tabs/Driver2Tab";
import FinancialTab from "./tabs/FinancialTab";
import OtherTab from "./tabs/OtherTab";
import ContractPreview from "./ContractPreview";
import ContractLookupDialog from "./ContractLookupDialog";

const schema = z.object({
  contractNumber: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  category: z.string().optional().default(""),
  registration: z.string().min(1),
  departureDate: z.string().min(1),
  departureTime: z.string().min(1),
  departurePlace: z.string().min(1),
  returnDate: z.string().min(1),
  returnTime: z.string().min(1),
  departureKm: z.string().min(1),
  returnKm: z.string().optional().default(""),
  fuelType: z.enum(["Essence", "Gasoil", ""]).default(""),
  remiseRetour: z.string().optional().default(""),
  driverName: z.string().min(1),
  driverDob: z.string().min(1),
  driverBirthPlace: z.string().optional().default(""),
  driverAddress: z.string().min(1),
  driverPhone: z.string().min(1),
  driverCin: z.string().min(1),
  driverCinDate: z.string().min(1),
  driverCinPlace: z.string().min(1),
  driverLicense: z.string().min(1),
  driverLicenseDate: z.string().min(1),
  driverLicensePlace: z.string().optional().default(""),
  hasDriver2: z.boolean().default(false),
  driver2Name: z.string().optional().default(""),
  driver2Dob: z.string().optional().default(""),
  driver2BirthPlace: z.string().optional().default(""),
  driver2Address: z.string().optional().default(""),
  driver2Phone: z.string().optional().default(""),
  driver2Cin: z.string().optional().default(""),
  driver2CinDate: z.string().optional().default(""),
  driver2CinPlace: z.string().optional().default(""),
  driver2License: z.string().optional().default(""),
  driver2LicenseDate: z.string().optional().default(""),
  driver2LicensePlace: z.string().optional().default(""),
  totalPartiel: z.string().optional().default("0.000"),
  divers: z.string().optional().default("0.000"),
  totalHT: z.string().optional().default("0.000"),
  tva: z.string().optional().default("0.000"),
  totalFacture: z.string().optional().default("0.000"),
  plusMoinsDivers: z.string().optional().default("0.000"),
  depot: z.string().optional().default("0.000"),
  depotGarantie: z.string().optional().default("0.000"),
  prep: z.string().optional().default("0.000"),
  total: z.string().optional().default("0.000"),
  somme: z.string().optional().default("0.000"),
  resteAPayer: z.string().optional().default("0.000"),
  city: z.string().optional().default(""),
  date: z.string().optional().default(""),
}).refine(
  data => !data.departureDate || !data.returnDate || data.returnDate > data.departureDate,
  { message: "La date de retour doit être supérieure à la date de départ (minimum 1 jour)", path: ["returnDate"] }
);

type FormData = z.infer<typeof schema>;

const TABS = ["vehicle_tab", "driver1_tab", "driver2_tab", "financial_tab", "other_tab"];

interface Props {
  contract: Contract | null;
  onClose: () => void;
}

export default function ContractModal({ contract, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const user = useAuthStore((s) => s.user);
  const { upsertContract } = useContractStore();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bannedWarning, setBannedWarning] = useState<{ name: string; reason: string } | null>(null);
  const [previewData, setPreviewData] = useState<Contract | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema) as any,
      defaultValues: contract
        ? { ...contract }
        : { date: new Date().toISOString().split("T")[0] },
    });

  // Check if client is banned when CIN or name changes
  const watchedCin = watch("driverCin");
  const watchedName = watch("driverName");
  useEffect(() => {
    if (!watchedCin && !watchedName) return;
    try {
      const clients = JSON.parse(localStorage.getItem("palma_clients") || "[]");
      const found = clients.find((c: any) =>
        (watchedCin && c.cin?.trim().toUpperCase() === watchedCin?.trim().toUpperCase()) ||
        (watchedName && c.name?.trim().toLowerCase() === watchedName?.trim().toLowerCase())
      );
      if (found?.banned) {
        setBannedWarning({ name: found.name, reason: found.banReason || "" });
      } else {
        setBannedWarning(null);
      }
      // Also check alerts
      if (found?.alerts?.length > 0) {
        setBannedWarning(prev => prev || { name: found.name, reason: `⚠️ ${found.alerts.length} alerte(s): ${found.alerts.map((a: any) => a.message).join(" | ")}` });
      }
    } catch {}
  }, [watchedCin, watchedName]);

  // Jump to first tab with errors
  const TAB_FIELDS: Record<number, string[]> = {
    0: ["contractNumber","brand","model","registration","departureDate","departureTime","departurePlace","returnDate","returnTime","departureKm","fuelType"],
    1: ["driverName","driverDob","driverAddress","driverPhone","driverCin","driverCinDate","driverCinPlace","driverLicense","driverLicenseDate"],
    2: ["driver2Name","driver2Cin"],
    3: ["totalFacture"],
    4: ["city","date"],
  };

  function jumpToFirstError(errs: typeof errors) {
    for (let i = 0; i <= 4; i++) {
      if (TAB_FIELDS[i]?.some(f => errs[f as keyof typeof errs])) {
        setActiveTab(i);
        return;
      }
    }
  }

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError("");
    setSaving(true);
    try {
      const isDup = await isDuplicateContractNumber(data.contractNumber, contract?.id);
      if (isDup) { setError(t("duplicate_number")); setSaving(false); return; }

      const paid  = parseFloat(data.depot  || "0");
      const somme = parseFloat(data.somme  || "0");
      const reste = Math.max(0, somme - paid);

      function syncDebt(contractId: string) {
        try {
          const debts = JSON.parse(localStorage.getItem("palma_contract_debts") || "{}");
          debts[contractId] = { paid, reste };
          localStorage.setItem("palma_contract_debts", JSON.stringify(debts));
        } catch {}
      }

      if (contract?.id) {
        await updateContract(contract.id, data as Partial<Contract>);
        upsertContract({ ...data, id: contract.id } as Contract);
        syncDebt(contract.id);
        await logAction(user, "update_contract", contract.id);
      } else {
        const id = await insertContract(data as Omit<Contract, "id">);
        upsertContract({ ...data, id } as Contract);
        syncDebt(id);
        await logAction(user, "create_contract", id);
        // Clear any manual override for this car starting from contract departure date
        try {
          const reg = String((data as any).registration || "").replace(/\s+/g, "").toUpperCase();
          const depDate = String((data as any).departureDate || new Date().toISOString().split("T")[0]);
          if (reg) {
            const history = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
            const entries: any[] = history[reg] || [];
            // Close any override that was active on or after the departure date
            history[reg] = entries.map((e: any) => {
              if (e.to === null || e.to >= depDate) {
                // Close it the day before departure
                const prev = new Date(depDate);
                prev.setDate(prev.getDate() - 1);
                return { ...e, to: prev.toISOString().split("T")[0] };
              }
              return e;
            });
            localStorage.setItem("palma_state_overrides", JSON.stringify(history));
          }
        } catch {}
      }
      onClose();
    } catch {
      setError(t("error_occurred"));
    } finally {
      setSaving(false);
    }
  };

  function openPreview() {
    const data = getValues();
    setPreviewData({ ...data, id: contract?.id } as Contract);
  }

  function handleLookupSelect(old: Contract) {
    // Copy all fields except id and contractNumber (keep new number)
    const currentNumber = getValues("contractNumber");
    const fields = { ...old };
    delete (fields as any).id;
    // Reset form with old data but keep the auto-generated contract number
    Object.entries(fields).forEach(([key, val]) => {
      if (key !== "contractNumber" && key !== "_createdAt" && key !== "_updatedAt") {
        setValue(key as any, val ?? "", { shouldDirty: true });
      }
    });
    // Restore contract number (new one)
    if (currentNumber) setValue("contractNumber", currentNumber);
    setLookupOpen(false);
  }

  const tabComponents = [
    <VehicleTab register={register} errors={errors} watch={watch} setValue={setValue} isNew={!contract} />,
    <Driver1Tab register={register} errors={errors} prefix="" setValue={setValue} watch={watch} />,
    <Driver2Tab register={register} errors={errors} watch={watch} setValue={setValue} />,
    <FinancialTab register={register} watch={watch} setValue={setValue} />,
    <OtherTab register={register} />,
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-slate-800">
                {contract ? t("edit") : t("new_contract")}
              </h2>
              {/* Show lookup button only for new contracts */}
              {!contract && (
                <button
                  type="button"
                  onClick={() => setLookupOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors"
                >
                  <History size={13} />
                  {isRTL ? "استرداد من عقد سابق" : "Récupérer un contrat"}
                </button>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {TABS.map((tab, i) => {
              const hasError = TAB_FIELDS[i]?.some(f => errors[f as keyof typeof errors]);
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(i)}
                  className={`px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 relative ${
                    activeTab === i
                      ? "border-amber-500 text-amber-600"
                      : hasError
                      ? "border-red-400 text-red-500"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {t(tab)}
                  {hasError && <span className="absolute top-2 end-2 w-1.5 h-1.5 bg-red-500 rounded-full"/>}
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit as any, (errs) => jumpToFirstError(errs))} className="flex-1 overflow-y-auto">
            <div className="p-6">{tabComponents[activeTab]}</div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
              <div className="flex-1">
                {error && <p className="text-sm text-red-500">{error}</p>}
                {bannedWarning && (
                  <div className="flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2">
                    <span className="text-red-600 text-lg">⛔</span>
                    <div>
                      <p className="text-sm font-bold text-red-700">Client bloqué: {bannedWarning.name}</p>
                      {bannedWarning.reason && <p className="text-xs text-red-600">Raison: {bannedWarning.reason}</p>}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 ms-auto">
                <button
                  type="button"
                  onClick={openPreview}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  <Eye size={15} />
                  {t("preview")}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {saving ? t("loading") : t("save")}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Contract Preview */}
      {previewData && (
        <ContractPreview contract={previewData} onClose={() => setPreviewData(null)} />
      )}

      {/* Contract Lookup */}
      {lookupOpen && (
        <ContractLookupDialog
          onSelect={handleLookupSelect}
          onClose={() => setLookupOpen(false)}
        />
      )}
    </>
  );
}
