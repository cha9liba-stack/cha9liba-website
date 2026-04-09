import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form";
import Field from "../../ui/Field";
import { getNextContractNumber } from "../../../services/lookupService";
import { getOdometerForReg } from "../../../services/gpsService";
import RegistrationInput from "../RegistrationInput";
import { useContractStore } from "../../../store/useContractStore";

interface Props {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  isNew?: boolean;
  contractId?: string;
}

export default function VehicleTab({ register, errors, watch, setValue, isNew, contractId }: Props) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const contracts = useContractStore((s) => s.contracts);
  const lockReturnTime = useContractStore((s) => s.contractSettings.lockReturnTime);
  const fuelType = watch("fuelType");
  const currentReg = watch("registration");
  const contractNumber = watch("contractNumber");
  const [fetchingKm, setFetchingKm] = useState(false);

  async function fetchKmFromGPS() {
    const reg = currentReg?.replace(/\s+/g, "").toUpperCase();
    if (!reg) return;
    setFetchingKm(true);
    try {
      const km = await getOdometerForReg(reg);
      console.log("GPS fetch result:", reg, km);
      if (km !== null) {
        setValue("departureKm", String(km), { shouldDirty: true });
      }
    } catch (error) {
      console.error("GPS fetch error:", error);
      // Silent fail - GPS may not be available
    } finally {
      setFetchingKm(false);
    }
  }

  // Check duplicate contract number in real-time
  const [dupWarning, setDupWarning] = useState(false);
  useEffect(() => {
    if (!contractNumber) { setDupWarning(false); return; }
    const isDup = contracts.some(
      (c) => !c._deleted && c.contractNumber === contractNumber && c.id !== contractId
    );
    setDupWarning(isDup);
  }, [contractNumber, contracts, contractId]);

  // Auto-fill contract number for new contracts
  useEffect(() => {
    if (!isNew) return;
    const current = watch("contractNumber");
    if (!current) {
      getNextContractNumber().then((num) => {
        if (num) setValue("contractNumber", num);
      });
    }
  }, [isNew]);

  // Auto-fill city from departure place
  const departurePlace = watch("departurePlace");
  useEffect(() => {
    if (departurePlace) {
      setValue("city", departurePlace, { shouldDirty: true });
    }
  }, [departurePlace]);

  // Lock return time = departure time if setting enabled
  const departureTime = watch("departureTime");
  useEffect(() => {
    if (lockReturnTime && departureTime) {
      setValue("returnTime", departureTime, { shouldDirty: true });
    }
  }, [departureTime, lockReturnTime]);

  // Sync departure and return dates for new contracts
  const departureDate = watch("departureDate");
  const returnDate = watch("returnDate");

  useEffect(() => {
    if (!isNew) return;
    if (departureDate) {
      setValue("returnDate", departureDate, { shouldDirty: false });
    }
  }, [departureDate, isNew]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t("contract_number")} error={errors.contractNumber?.message as string}>
        <input {...register("contractNumber")} className={`input ${dupWarning ? "border-red-400 focus:ring-red-400" : ""}`} />
        {dupWarning && (
          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
            ⚠️ {isRTL ? "رقم العقد مستخدم مسبقاً" : "Ce numéro de contrat existe déjà"}
          </p>
        )}
      </Field>

      {/* Registration with TU format + auto-fill */}
      <div className="sm:col-span-2">
        <RegistrationInput setValue={setValue} defaultValue={currentReg || ""} currentContractId={contractId} />
        {/* Hidden input to keep react-hook-form in sync */}
        <input type="hidden" {...register("registration")} />
      </div>

      <Field label={t("brand")} error={errors.brand?.message as string}>
        <input {...register("brand")} className="input" />
      </Field>
      <Field label={t("model")} error={errors.model?.message as string}>
        <input {...register("model")} className="input" />
      </Field>
      <Field label={t("category")}>
        <input {...register("category")} className="input" />
      </Field>
      <Field label={t("fuel_type")}>
        <div className="flex gap-4 mt-1">
          {(["Essence", "Gasoil"] as const).map((f) => (
            <label key={f} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value={f}
                checked={fuelType === f}
                onChange={() => setValue("fuelType", f)}
                className="accent-amber-500"
              />
              <span className="text-sm text-slate-700">{t(f.toLowerCase())}</span>
            </label>
          ))}
        </div>
      </Field>
      <Field label={t("departure_date")} error={errors.departureDate?.message as string}>
        <input type="date" {...register("departureDate")} className="input" />
      </Field>
      <Field label={t("departure_time")}>
        <input type="time" {...register("departureTime")} className="input" />
      </Field>
      <Field label={t("departure_place")}>
        <input {...register("departurePlace")} className="input" />
      </Field>
      <Field label={t("departure_km")}>
        <div className="flex items-center gap-2">
          {fetchingKm ? (
            <div className="flex-1 h-9 bg-slate-200 rounded-lg animate-pulse" />
          ) : (
            <input
              {...register("departureKm")}
              type="number"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              placeholder="0"
            />
          )}
          <button
            type="button"
            onClick={fetchKmFromGPS}
            disabled={fetchingKm || !currentReg}
            className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors disabled:opacity-50"
            title={isRTL ? "جلب الكيلومتراج من GPS" : "Récupérer du GPS"}
          >
            {fetchingKm ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>
      </Field>
      <Field label={t("return_date")} error={errors.returnDate?.message as string}>
        <input type="date" {...register("returnDate")} className="input" />
      </Field>
      <Field label={t("return_time")}>
        <input type="time" {...register("returnTime")} className="input" readOnly={lockReturnTime} disabled={lockReturnTime} />
      </Field>
      <Field label={t("return_km")}>
        <input {...register("returnKm")} className="input" />
      </Field>
      <Field label={t("remise_retour")}>
        <input {...register("remiseRetour")} className="input" />
      </Field>
    </div>
  );
}
