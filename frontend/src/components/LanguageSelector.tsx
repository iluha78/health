import type { ChangeEvent, SelectHTMLAttributes } from "react";
import { LANGUAGES, changeLanguage, useTranslation } from "../i18n";

export type LanguageSelectorProps = {
  className?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">;

export const LanguageSelector = ({ className, ...props }: LanguageSelectorProps) => {
  const { t, i18n } = useTranslation();

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    changeLanguage(event.target.value);
  };

  const activeLanguage =
    LANGUAGES.find(option => i18n.language.startsWith(option.value))?.value ?? i18n.language;

  return (
    <label className={`language-selector ${className ?? ""}`.trim()}>
      <span className="language-label">{t("common.language")}</span>
      <select value={activeLanguage} onChange={handleChange} {...props}>
        {LANGUAGES.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};
