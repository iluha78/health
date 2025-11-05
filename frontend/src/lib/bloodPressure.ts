import { i18n } from "../i18n";
import { apiUrl } from "./api";
import type { BloodPressureRecordResponse, BloodPressureHistoryItem } from "../types/api";
import { normalizeBloodPressureHistory } from "../types/api";

export const fetchBloodPressureHistory = async (
  headers: Record<string, string> | undefined
): Promise<BloodPressureHistoryItem[]> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl("/blood-pressure"), {
    method: "GET",
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : i18n.t("common.requestError", { status: response.status });
    throw new Error(message);
  }

  return normalizeBloodPressureHistory(data);
};

export const saveBloodPressureRecord = async (
  headers: Record<string, string> | undefined,
  payload: Record<string, unknown>
): Promise<BloodPressureRecordResponse> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl("/blood-pressure/records"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : i18n.t("bp.saveError");
    throw new Error(message);
  }
  return {
    record: normalizeBloodPressureHistory([data.record])[0] ?? null,
  };
};

export const requestBloodPressureAdvice = async (
  headers: Record<string, string> | undefined,
  payload: Record<string, unknown>
): Promise<{ advice: string; record: BloodPressureHistoryItem | null }> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl("/blood-pressure/advice"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok || typeof data?.advice !== "string") {
    const message = typeof data?.error === "string" ? data.error : i18n.t("bp.submitError");
    throw new Error(message);
  }

  return {
    advice: data.advice.trim(),
    record: normalizeBloodPressureHistory([data.record])[0] ?? null,
  };
};
