import { i18n } from "../i18n";
import { apiUrl } from "./api";

export type NutritionPhotoAnalysis = {
  calories: number | null;
  confidence: string | null;
  notes: string;
  ingredients: string[];
};

export const requestNutritionPhotoCalories = async (
  headers: Record<string, string> | undefined,
  file: File
): Promise<NutritionPhotoAnalysis> => {
  if (!headers) {
    throw new Error(i18n.t("common.loginRequired"));
  }

  const formData = new FormData();
  formData.append("photo", file);

  const response = await fetch(apiUrl("/advice/nutrition/photo/analyze"), {
    method: "POST",
    headers,
    body: formData
  });

  const data = await response.json();
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : i18n.t("common.adviceRequestFailed");
    throw new Error(message);
  }

  const calories = typeof data.calories === "number" ? data.calories : null;
  const confidence = typeof data.confidence === "string" ? data.confidence : null;
  const notes = typeof data.notes === "string" ? data.notes : "";
  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients.filter((item: unknown): item is string => typeof item === "string")
    : [];

  return { calories, confidence, notes, ingredients };
};
