import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form";
import Field from "../../ui/Field";
import { getNextContractNumber } from "../../../services/lookupService";
import RegistrationInput from "../RegistrationInput";

interface Props {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
  isNew?: boolean;
}

export default function VehicleTab({ register, errors, watch, setValue, isNew }: Props) {
  const { t } = useTranslation();
  const fuelType = watch("fuelType");
  const currentReg = watch("registration");

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t("contract_number")} error={errors.contractNumber?.message as string}>
        <input {...register("contractNumber")} className="input" />
      </Field>

      {/* Registration with TU format + auto-fill */}
      <div className="sm:col-span-2">
        <RegistrationInput setValue={setValue} defaultValue={currentReg || ""} />
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
        <input {...register("departureKm")} className="input" />
      </Field>
      <Field label={t("return_date")} error={errors.returnDate?.message as string}>
        <input type="date" {...register("returnDate")} className="input" />
      </Field>
      <Field label={t("return_time")}>
        <input type="time" {...register("returnTime")} className="input" />
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
