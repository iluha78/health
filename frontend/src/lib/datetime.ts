import { i18n } from "../i18n";

export const formatDateTime = (value: string) => {
  try {
    const locale = i18n.language || "ru";
    return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch (err) {
    console.warn(i18n.t("common.dateFormatWarning"), err);
    return value;
  }
};
