import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Search, CheckCircle } from "lucide-react";
import Field from "../../ui/Field";
import { findDriverByCin, findDriver2ByCin } from "../../../services/lookupService";

interface Props {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  prefix: string; // "" for driver1, "driver2" for driver2
  setValue?: UseFormSetValue<any>;
  watch?: UseFormWatch<any>;
}

export default function Driver1Tab({ register, errors, prefix, setValue, watch }: Props) {
  const { t } = useTranslation();
  const p = prefix ? `${prefix}` : "driver";
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cinValue = watch ? watch(`${p}Cin`) : "";

  // Auto-fill when CIN changes (debounced 600ms)
  useEffect(() => {
    if (!setValue || !cinValue || cinValue.length < 5) {
      setFound(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = prefix === "driver2"
          ? await findDriver2ByCin(cinValue)
          : await findDriverByCin(cinValue);

        if (data) {
          Object.entries(data).forEach(([key, val]) => {
            // Skip invalid phone numbers from contracts
            if (key === 'driverPhone' && typeof val === 'string' && (val === '00' || val === '000' || val === '0000' || val.length <= 3)) {
              return;
            }
            if (val) {
              setValue(key, val, { shouldDirty: true });
            }
          });
          setFound(true);
          setTimeout(() => setFound(false), 3000);
        }
      } finally {
        setSearching(false);
      }
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cinValue, setValue, prefix]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* CIN with auto-fill indicator */}
      <Field label={t("cin")} error={errors[`${p}Cin`]?.message as string} className="sm:col-span-2">
        <div className="relative">
          <input {...register(`${p}Cin`)} className="input pr-8" />
          <div className="absolute top-1/2 -translate-y-1/2 right-2.5">
            {searching && (
              <Search size={14} className="text-amber-400 animate-pulse" />
            )}
            {found && !searching && (
              <CheckCircle size={14} className="text-green-500" />
            )}
          </div>
        </div>
        {found && (
          <p className="text-xs text-green-600 mt-0.5">
            {t("language") === "ar"
              ? "✓ تم استرداد البيانات من عقد سابق"
              : "✓ Données récupérées d'un contrat précédent"}
          </p>
        )}
      </Field>

      <Field label={t("driver_name")} error={errors[`${p}Name`]?.message as string} className="sm:col-span-2">
        <input {...register(`${p}Name`)} className="input" />
      </Field>
      <Field label={t("cin_date")}>
        <input type="date" {...register(`${p}CinDate`)} className="input" />
      </Field>
      <Field label={t("cin_place")}>
        <input {...register(`${p}CinPlace`)} className="input" />
      </Field>
      <Field label={t("dob")}>
        <input type="date" {...register(`${p}Dob`)} className="input" />
      </Field>
      <Field label={t("birth_place")}>
        <input {...register(`${p}BirthPlace`)} className="input" />
      </Field>
      <Field label={t("address")}>
        <input {...register(`${p}Address`)} className="input" />
      </Field>
      <Field label={t("phone")}>
        <input {...register(`${p}Phone`)} className="input" />
      </Field>
      <Field label={t("license")}>
        <input {...register(`${p}License`)} className="input" />
      </Field>
      <Field label={t("license_date")}>
        <input type="date" {...register(`${p}LicenseDate`)} className="input" />
      </Field>
      <Field label={t("license_place")}>
        <input {...register(`${p}LicensePlace`)} className="input" />
      </Field>
    </div>
  );
}
