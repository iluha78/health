import { i18n } from "../i18n";

export const storageKey = (scope: string, userId: number | null) => `cholestofit_${scope}_archive_${userId ?? "guest"}`;

export const readArchiveByKey = (key: string): unknown[] | null => {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(key);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : null;
  } catch (err) {
    console.warn(i18n.t("storage.readFailed", { key }), err);
    return null;
  }
};

export const writeArchiveByKey = (key: string, value: unknown[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

export const readArchive = (scope: string, userId: number | null) => readArchiveByKey(storageKey(scope, userId));

export const writeArchive = (scope: string, userId: number | null, value: unknown[]) =>
  writeArchiveByKey(storageKey(scope, userId), value);
