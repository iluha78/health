import { i18n } from "../i18n";
import { apiUrl } from "./api";
import type { BloodPressureRecordResponse, BloodPressureHistoryItem } from "../types/api";
import { normalizeBloodPressureHistory } from "../types/api";

type HttpError = Error & {
  status?: number;
};

const RECORD_ENDPOINTS = ["/blood-pressure", "/blood-pressure/records"] as const;

const parseJson = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
};

const shouldRetryRecordEndpoint = (status: number, isLastAttempt: boolean): boolean => {
  if (isLastAttempt) {
    return false;
  }
  return status === 404 || status === 405;
};

const extractErrorMessage = (data: unknown, fallback: string): string => {
  if (data && typeof data === "object" && data !== null) {
    const candidate = (data as { error?: unknown }).error;
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate;
    }
  }
  return fallback;
};

const extractRecordPayload = (data: unknown): unknown => {
  if (data && typeof data === "object" && data !== null && "record" in data) {
    return (data as { record?: unknown }).record ?? null;
  }
  return null;
};

export const fetchBloodPressureHistory = async (
  headers: Record<string, string> | undefined
): Promise<BloodPressureHistoryItem[]> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl("/blood-pressure/history"), {
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

  const defaultMessage = i18n.t("bp.saveError");

  for (let index = 0; index < RECORD_ENDPOINTS.length; index += 1) {
    const path = RECORD_ENDPOINTS[index];
    const response = await fetch(apiUrl(path), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    const data = await parseJson(response);
    if (response.ok) {
      return {
        record: normalizeBloodPressureHistory([extractRecordPayload(data)])[0] ?? null,
      };
    }

    if (shouldRetryRecordEndpoint(response.status, index === RECORD_ENDPOINTS.length - 1)) {
      continue;
    }

    const message = extractErrorMessage(data, defaultMessage);
    const error = new Error(message) as HttpError;
    error.status = response.status;
    throw error;
  }

  throw new Error(defaultMessage);
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
    record: normalizeBloodPressureHistory([extractRecordPayload(data)])[0] ?? null,
  };
};
