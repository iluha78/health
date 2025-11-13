import { i18n } from "../i18n";
import { apiUrl } from "./api";

export type NutritionPhotoAnalysis = {
  calories: number | null;
  confidence: string | null;
  notes: string;
  description: string;
  ingredients: string[];
  debug: string[];
};

export type NutritionAdviceHistoryItem = {
  id: number;
  createdAt: string;
  weight: string;
  height: string;
  calories: string;
  activity: string;
  question: string;
  comment: string;
  advice: string;
};

export type NutritionPhotoHistoryItem = {
  id: number;
  createdAt: string;
  fileName: string | null;
  calories: number | null;
  confidence: string | null;
  notes: string;
  description: string;
  ingredients: string[];
};

export type NutritionPhotoError = Error & { debug?: string[] };

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
};

const buildFormData = (file: File, description: string): FormData => {
  const formData = new FormData();
  formData.append("photo", file);
  if (description) {
    formData.append("description", description);
  }
  return formData;
};

type PhotoEndpoint = "/advice/nutrition/photo" | "/advice/nutrition/photo/analyze";

const postPhoto = async (
  endpoint: PhotoEndpoint,
  headers: Record<string, string>,
  file: File,
  description: string
): Promise<{ response: Response; data: unknown }> => {
  const response = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers,
    body: buildFormData(file, description)
  });

  const data = await parseJsonSafely(response);

  return { response, data };
};

export const requestNutritionPhotoCalories = async (
  headers: Record<string, string> | undefined,
  file: File,
  description: string
): Promise<{ analysis: NutritionPhotoAnalysis; history: NutritionPhotoHistoryItem[] }> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const primary = await postPhoto("/advice/nutrition/photo/analyze", headers, file, description);

  const { response: primaryResponse } = primary;

  const { response, data } =
    primaryResponse.status === 404
      ? await postPhoto("/advice/nutrition/photo", headers, file, description)
      : primary;

  if (!response.ok) {
    const payload = (data ?? {}) as Record<string, unknown>;
    const message =
      payload && typeof payload.error === "string"
        ? payload.error
        : i18n.t("common.adviceRequestFailed");
    const debug = Array.isArray(payload.debug)
      ? payload.debug.filter((item): item is string => typeof item === "string")
      : [];
    const error = new Error(message) as NutritionPhotoError;
    if (debug.length > 0) {
      error.debug = debug;
    }
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;

  const calories = typeof payload.calories === "number" ? payload.calories : null;
  const confidence = typeof payload.confidence === "string" ? payload.confidence : null;
  const notes = typeof payload.notes === "string" ? payload.notes : "";
  const responseDescription =
    typeof payload.description === "string" ? payload.description : "";
  const ingredients = Array.isArray(payload.ingredients)
    ? payload.ingredients.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const debug = Array.isArray(payload.debug)
    ? payload.debug.filter((item: unknown): item is string => typeof item === "string")
    : [];

  const history = parsePhotoHistory(payload.history);

  return {
    analysis: {
      calories,
      confidence,
      notes,
      description: responseDescription,
      ingredients,
      debug
    },
    history
  };
};

export const fetchNutritionAdviceHistory = async (
  headers: Record<string, string> | undefined
): Promise<NutritionAdviceHistoryItem[]> => {
  if (!headers) {
    return [];
  }

  const response = await fetch(apiUrl("/advice/nutrition/history"), {
    method: "GET",
    headers
  });

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(
      (payload && typeof payload.error === "string")
        ? payload.error
        : i18n.t("common.requestError", { status: response.status })
    );
  }

  return parseAdviceHistory(payload);
};

export type NutritionAdvicePayload = {
  weight: string;
  height: string;
  calories: string;
  activity: string;
  question: string;
  comment: string;
};

export const submitNutritionAdvice = async (
  headers: Record<string, string> | undefined,
  payload: NutritionAdvicePayload
): Promise<{ advice: string; history: NutritionAdviceHistoryItem[] }> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl("/advice/nutrition"), {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(
      data && typeof data.error === "string"
        ? data.error
        : i18n.t("common.adviceRequestFailed")
    );
  }

  const advice = typeof data.advice === "string" ? data.advice : "";
  const history = parseAdviceHistory(data.history);

  return { advice, history };
};

export const fetchNutritionPhotoHistory = async (
  headers: Record<string, string> | undefined
): Promise<NutritionPhotoHistoryItem[]> => {
  if (!headers) {
    return [];
  }

  const response = await fetch(apiUrl("/advice/nutrition/photo/history"), {
    method: "GET",
    headers
  });

  const raw = await response.text();
  const payload = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(
      (payload && typeof payload.error === "string")
        ? payload.error
        : i18n.t("common.requestError", { status: response.status })
    );
  }

  return parsePhotoHistory(payload);
};

export const deleteNutritionPhotoRecord = async (
  headers: Record<string, string> | undefined,
  id: number
): Promise<void> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const response = await fetch(apiUrl(`/advice/nutrition/photo/${encodeURIComponent(id)}`), {
    method: "DELETE",
    headers
  });

  if (!response.ok) {
    const payload = await parseJsonSafely(response);
    const message =
      payload && typeof (payload as Record<string, unknown>).error === "string"
        ? (payload as Record<string, string>).error
        : i18n.t("common.requestError", { status: response.status });
    throw new Error(message);
  }
};

const parseAdviceHistory = (input: unknown): NutritionAdviceHistoryItem[] => {
  if (!Array.isArray(input)) {
    return [];
  }
  return input
    .map(item => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "number" ? record.id : Number(record.id);
      const createdAt = typeof record.created_at === "string" ? record.created_at : "";
      const weight = typeof record.weight === "string" ? record.weight : "";
      const height = typeof record.height === "string" ? record.height : "";
      const calories = typeof record.calories === "string" ? record.calories : "";
      const activity = typeof record.activity === "string" ? record.activity : "";
      const question = typeof record.question === "string" ? record.question : "";
      const comment = typeof record.comment === "string" ? record.comment : "";
      const advice = typeof record.advice === "string" ? record.advice : "";

      if (!Number.isFinite(id) || id <= 0 || !createdAt) {
        return null;
      }

      return {
        id,
        createdAt,
        weight,
        height,
        calories,
        activity,
        question,
        comment,
        advice
      };
    })
    .filter((item): item is NutritionAdviceHistoryItem => item !== null);
};

const parsePhotoHistory = (input: unknown): NutritionPhotoHistoryItem[] => {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map(item => {
      if (!item || typeof item !== "object") {
        return null;
      }
      const record = item as Record<string, unknown>;
      const id = typeof record.id === "number" ? record.id : Number(record.id);
      const createdAt = typeof record.created_at === "string" ? record.created_at : "";
      const fileName = typeof record.file_name === "string" ? record.file_name : null;
      const calories = typeof record.calories === "number" ? record.calories : null;
      const confidence = typeof record.confidence === "string" ? record.confidence : null;
      const notes = typeof record.notes === "string" ? record.notes : "";
      const description = typeof record.description === "string" ? record.description : "";
      const ingredientsRaw = Array.isArray(record.ingredients) ? record.ingredients : [];
      const ingredients = ingredientsRaw.filter((item): item is string => typeof item === "string");

      if (!Number.isFinite(id) || id <= 0 || !createdAt) {
        return null;
      }

      return {
        id,
        createdAt,
        fileName,
        calories,
        confidence,
        notes,
        description,
        ingredients
      };
    })
    .filter((item): item is NutritionPhotoHistoryItem => item !== null);
};
