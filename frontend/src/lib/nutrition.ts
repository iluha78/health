import { i18n } from "../i18n";
import { apiUrl } from "./api";

export type NutritionPhotoAnalysis = {
  calories: number | null;
  confidence: string | null;
  notes: string;
  ingredients: string[];
  debug: string[];
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

const buildFormData = (file: File): FormData => {
  const formData = new FormData();
  formData.append("photo", file);
  return formData;
};

type PhotoEndpoint = "/advice/nutrition/photo" | "/advice/nutrition/photo/analyze";

const postPhoto = async (
  endpoint: PhotoEndpoint,
  headers: Record<string, string>,
  file: File
): Promise<{ response: Response; data: unknown }> => {
  const response = await fetch(apiUrl(endpoint), {
    method: "POST",
    headers,
    body: buildFormData(file)
  });

  const data = await parseJsonSafely(response);

  return { response, data };
};

export const requestNutritionPhotoCalories = async (
  headers: Record<string, string> | undefined,
  file: File
): Promise<NutritionPhotoAnalysis> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const primary = await postPhoto("/advice/nutrition/photo/analyze", headers, file);

  const { response: primaryResponse } = primary;

  const { response, data } =
    primaryResponse.status === 404
      ? await postPhoto("/advice/nutrition/photo", headers, file)
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
  const ingredients = Array.isArray(payload.ingredients)
    ? payload.ingredients.filter((item: unknown): item is string => typeof item === "string")
    : [];
  const debug = Array.isArray(payload.debug)
    ? payload.debug.filter((item: unknown): item is string => typeof item === "string")
    : [];

  return { calories, confidence, notes, ingredients, debug };
};
