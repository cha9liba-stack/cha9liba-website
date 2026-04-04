import { useTranslation } from "react-i18next";
import type { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from "react-hook-form";
import Driver1Tab from "./Driver1Tab";

interface Props {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  watch: UseFormWatch<any>;
  setValue: UseFormSetValue<any>;
}

export default function Driver2Tab({ register, errors, watch, setValue }: Props) {
  const { t } = useTranslation();
  const hasDriver2 = watch("hasDriver2");

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={hasDriver2}
          onChange={(e) => setValue("hasDriver2", e.target.checked)}
          className="w-4 h-4 accent-amber-500"
        />
        <span className="text-sm font-medium text-slate-700">{t("add_second_driver")}</span>
      </label>

      {hasDriver2 && (
        <Driver1Tab register={register} errors={errors} prefix="driver2" setValue={setValue} watch={watch} />
      )}
    </div>
  );
}
