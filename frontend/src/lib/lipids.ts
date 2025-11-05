import { i18n } from "../i18n";
import { apiUrl } from "./api";
import type { LipidHistoryItem } from "../types/api";
import { normalizeLipidHistory } from "../types/api";

export const fetchLipidHistory = async (
  headers: Record<string, string> | undefined
): Promise<LipidHistoryItem[]> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl("/lipids"), {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    const message =
      typeof data?.error === "string"
        ? data.error
        : i18n.t("common.requestError", { status: response.status });
    throw new Error(message);
  }

  return normalizeLipidHistory(data);
};

export const createLipidRecord = async (
  headers: Record<string, string> | undefined,
  payload: Record<string, unknown>
): Promise<LipidHistoryItem | null> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl("/lipids"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : i18n.t("lipidPrompt.saveFailed");
    throw new Error(message);
  }

  return normalizeLipidHistory([data.record])[0] ?? null;
};
