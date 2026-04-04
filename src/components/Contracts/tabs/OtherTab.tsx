import { useTranslation } from "react-i18next";
import type { UseFormRegister } from "react-hook-form";
import Field from "../../ui/Field";

interface Props {
  register: UseFormRegister<any>;
}

export default function OtherTab({ register }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label={t("city")}>
        <input {...register("city")} className="input" />
      </Field>
      <Field label={t("date")}>
        <input type="date" {...register("date")} className="input" />
      </Field>
    </div>
  );
}
