import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { X, Eye, History, AlertTriangle } from "lucide-react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  insertContract,
  updateContract,
  isDuplicateContractNumber,
  checkCarAvailability,
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
  departureKm: z.string().optional().default("0"),
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
  depot: z.string().min(1),
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
  const selectedBranch = useAuthStore((s) => s.selectedBranch);
  const { upsertContract } = useContractStore();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [bannedWarning, setBannedWarning] = useState<{ name: string; reason: string } | null>(null);
  const [previewData, setPreviewData] = useState<Contract | null>(null);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [clientDebt, setClientDebt] = useState<{ total: number; paid: number; reste: number } | null>(null);
  const clientDebtRef = useRef<{ total: number; paid: number; reste: number } | null>(null);
  const [debtConfirmPending, setDebtConfirmPending] = useState(false);

  const { register, handleSubmit, watch, setValue, getValues, formState: { errors } } =
    useForm<FormData>({
      resolver: zodResolver(schema) as any,
      defaultValues: contract
        ? { ...contract }
        : (() => {
            const now = new Date();
            const today = now.toISOString().split("T")[0];
            const time = String(now.getHours()).padStart(2,"0") + ":" + String(now.getMinutes()).padStart(2,"0");
            return {
              date: today,
              departureDate: today,
              departureTime: time,
            };
          })(),
    });

  // Sync contract date with departureDate for new contracts
  const watchedDepartureDate = watch("departureDate");
  useEffect(() => {
    if (!contract && watchedDepartureDate) {
      setValue("date", watchedDepartureDate, { shouldDirty: false });
    }
  }, [watchedDepartureDate]);

  // Check if client is banned when CIN or name changes
  const watchedCin = watch("driverCin");
  const watchedName = watch("driverName");
  useEffect(() => {
    if (!watchedCin && !watchedName) return;
    // Debounce: wait 600ms after user stops typing
    const timer = setTimeout(() => {
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

      // Calculate client debt from previous contracts
      if (watchedCin) {
        const contracts = useContractStore.getState().contracts;
        const debtsKey = "palma_contract_debts";
        const debts: Record<string, { paid: number; reste: number }> = JSON.parse(localStorage.getItem(debtsKey) || "{}");

        let totalDebt = 0;
        let totalPaid = 0;
        let totalReste = 0;

        const clientContracts = contracts.filter(c =>
          c.driverCin?.trim().toUpperCase() === watchedCin.trim().toUpperCase() &&
          !c._deleted &&
          c.id !== contract?.id
        );

        for (const c of clientContracts) {
          if (!c.id) continue;
          const debt = debts[c.id] || {
            paid: parseFloat(c.depot || "0"),
            reste: Math.max(0, parseFloat(c.somme || c.totalFacture || "0") - parseFloat(c.depot || "0"))
          };
          totalPaid += debt.paid;
          totalReste += debt.reste;
        }
        totalDebt = totalPaid + totalReste;

        if (totalReste > 0) {
          const debt = { total: totalDebt, paid: totalPaid, reste: totalReste };
          setClientDebt(debt);
          clientDebtRef.current = debt;
          // Show debt warning modal immediately when CIN is entered
          if (!contract) setDebtConfirmPending(true);
        } else {
          setClientDebt(null);
          clientDebtRef.current = null;
        }
      } else {
        setClientDebt(null);
        clientDebtRef.current = null;
      }
    } catch {}
    }, 600);
    return () => clearTimeout(timer);
  }, [watchedCin, watchedName, contract?.id]);

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

  // Called after user confirms debt warning (or no debt)
  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setError("");
    await doSave(data);
  };

  function handleSaveClick() {
    handleSubmit(onSubmit as any, (errs) => jumpToFirstError(errs))();
  }

  async function doSave(data: FormData) {
    setError("");
    try {

      setSaving(true);
      const isDup = await isDuplicateContractNumber(data.contractNumber, contract?.id);
      if (isDup) { setError(t("duplicate_number")); setSaving(false); return; }

      // Check car availability (no overlapping contracts)
      if (data.registration && data.departureDate && data.returnDate) {
        const avail = await checkCarAvailability(
          data.registration,
          data.departureDate,
          data.returnDate,
          contract?.id
        );
        if (!avail.available && avail.conflictContract) {
          const c = avail.conflictContract;
          setError(
            `⚠️ ${data.registration} est déjà louée du ${c.departureDate} au ${c.returnDate} (Contrat #${c.contractNumber} - ${c.driverName})`
          );
          setSaving(false);
          return;
        }
      }

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
        // Keep original branchId - don't change it on edit
        const originalBranchId = (contract as any).branchId;
        await updateContract(contract.id, { ...data, branchId: originalBranchId, _updatedBy: user?.username || "unknown", _updatedAt: Date.now() } as Partial<Contract>);
        upsertContract({ ...data, id: contract.id, branchId: originalBranchId, _updatedBy: user?.username || "unknown", _updatedAt: Date.now() } as Contract);
        syncDebt(contract.id);
        await logAction(user, "update_contract", contract.id);
      } else {
        const id = await insertContract({ ...data, _createdBy: user?.username || user?.email || "unknown", _createdAt: Date.now(), branchId: selectedBranch?.id || "main" } as Omit<Contract, "id">);
        upsertContract({ ...data, id } as Contract);
        syncDebt(id);
        await logAction(user, "create_contract", id);
        // Clear any manual override for this car starting from contract departure date
        try {
          const reg = String((data as any).registration || "").replace(/\s+/g, "").toUpperCase();
          const depDate = String((data as any).departureDate || new Date().toISOString().split("T")[0]);
          if (reg) {
            const history = JSON.parse(localStorage.getItem("palma_state_overrides") || "{}");
            const prev = new Date(depDate);
            prev.setDate(prev.getDate() - 1);
            const prevStr = prev.toISOString().split("T")[0];

            const raw = history[reg];
            if (Array.isArray(raw)) {
              // New format: array of {state, from, to}
              history[reg] = raw.map((e: any) => {
                if (e.to === null || e.to === undefined || e.to >= depDate) {
                  return { ...e, to: prevStr };
                }
                return e;
              });
            } else if (raw && typeof raw === "object") {
              // Old format: single object {state, from} - close it
              history[reg] = [{ ...raw, to: prevStr }];
            } else {
              // No override - nothing to do
              delete history[reg];
            }

            localStorage.setItem("palma_state_overrides", JSON.stringify(history));
            const DB = "https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app";
            await fetch(`${DB}/app_settings/overrides.json`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(history),
            }).catch(() => {});
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

  async function openPreviewWithCheck() {
    const data = getValues();
    if (!contract) {
      const isDup = await isDuplicateContractNumber(data.contractNumber, undefined);
      if (isDup) { setError(t("duplicate_number")); return; }

      // Check car availability before preview too
      if (data.registration && data.departureDate && data.returnDate) {
        const avail = await checkCarAvailability(data.registration, data.departureDate, data.returnDate, undefined);
        if (!avail.available && avail.conflictContract) {
          const c = avail.conflictContract;
          setError(`⚠️ ${data.registration} est déjà louée du ${c.departureDate} au ${c.returnDate} (Contrat #${c.contractNumber})`);
          return;
        }
      }
    }
    setError("");
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
    <VehicleTab register={register} errors={errors} watch={watch} setValue={setValue} isNew={!contract} contractId={contract?.id} />,
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
          <form onSubmit={(e) => { e.preventDefault(); handleSaveClick(); }} className="flex-1 overflow-y-auto">
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
                {clientDebt && (
                  <div className="flex items-center gap-2 bg-red-100 border border-red-300 rounded-lg px-3 py-2 mt-2">
                    <span className="text-red-600 text-lg">💰</span>
                    <div>
                      <p className="text-sm font-bold text-red-700">Dette client</p>
                      <p className="text-xs text-red-600">Total: {clientDebt.total.toFixed(2)} TND | Payé: {clientDebt.paid.toFixed(2)} TND | Reste: {clientDebt.reste.toFixed(2)} TND</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 ms-auto">
                <button
                  type="button"
                  onClick={openPreviewWithCheck}
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
                  type="button"
                  onClick={handleSaveClick}
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

      {/* Debt Confirmation Modal */}
      {debtConfirmPending && clientDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-red-100 bg-red-50 rounded-t-2xl">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">
                  {isRTL ? "تحذير: العميل لديه ديون" : "Client avec dettes impayées"}
                </p>
                <p className="text-xs text-red-500">
                  {isRTL ? "يرجى مراجعة الوضع المالي قبل المتابعة" : "Vérifiez la situation financière avant de continuer"}
                </p>
              </div>
              <button onClick={() => setDebtConfirmPending(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="divide-y divide-slate-100">
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                  💰
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{watch("driverName")}</p>
                  <p className="text-xs font-mono text-slate-500">{watch("driverCin")}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isRTL ? "ديون من عقود سابقة" : "Dettes sur contrats précédents"}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  <p className="text-xs text-slate-400">{isRTL ? "المتبقي" : "Reste dû"}</p>
                  <p className="text-lg font-bold text-red-600">{clientDebt.reste.toFixed(3)}</p>
                  <p className="text-xs text-slate-400">TND</p>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-slate-100 text-center">
                <div className="px-5 py-3">
                  <p className="text-xs text-slate-400 mb-1">{isRTL ? "الإجمالي" : "Total facturé"}</p>
                  <p className="font-semibold text-slate-700">{clientDebt.total.toFixed(3)} TND</p>
                </div>
                <div className="px-5 py-3">
                  <p className="text-xs text-slate-400 mb-1">{isRTL ? "المدفوع" : "Déjà payé"}</p>
                  <p className="font-semibold text-green-600">{clientDebt.paid.toFixed(3)} TND</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button
                onClick={() => setDebtConfirmPending(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                {isRTL ? "إلغاء" : "Annuler"}
              </button>
              <button
                onClick={() => {
                  setDebtConfirmPending(false);
                  handleSubmit(onSubmit as any, (errs) => jumpToFirstError(errs))();
                }}
                className="px-4 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
              >
                {isRTL ? "متابعة رغم الديون" : "Continuer malgré les dettes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
