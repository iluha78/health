import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { i18n, useTranslation } from "../../i18n";
import type { NutritionFormState, NutritionPhotoRecord, NutritionRecord } from "../../types/forms";
import type {
  NutritionPhotoAnalysis,
  NutritionAdviceHistoryItem,
  NutritionPhotoHistoryItem,
  NutritionAdvicePayload
} from "../../lib/nutrition";
import {
  fetchNutritionAdviceHistory,
  submitNutritionAdvice,
  fetchNutritionPhotoHistory,
  deleteNutritionPhotoRecord
} from "../../lib/nutrition";

const DEFAULT_FORM: NutritionFormState = {
  weight: "",
  height: "",
  calories: "",
  activity: "",
  question: "",
  comment: ""
};

const mapAdviceHistory = (entries: NutritionAdviceHistoryItem[]): NutritionRecord[] =>
  entries.map(entry => ({
    id: String(entry.id),
    createdAt: entry.createdAt,
    weight: entry.weight,
    height: entry.height,
    calories: entry.calories,
    activity: entry.activity,
    question: entry.question,
    comment: entry.comment,
    advice: entry.advice
  }));

const mapPhotoHistory = (entries: NutritionPhotoHistoryItem[]): NutritionPhotoRecord[] =>
  entries.map(entry => ({
    id: String(entry.id),
    createdAt: entry.createdAt,
    fileName: entry.fileName ?? "",
    calories: entry.calories,
    confidence: entry.confidence,
    notes: entry.notes,
    description: entry.description,
    ingredients: entry.ingredients
  }));

type NutritionDefaults = {
  weight: number | null;
  height: number | null;
  calories: number | null;
  activity: string | null;
};

type NutritionFeatureOptions = {
  userId: number | null;
  defaults: NutritionDefaults;
  analyzePhoto: (
    file: File,
    description: string
  ) => Promise<{ analysis: NutritionPhotoAnalysis; history: NutritionPhotoHistoryItem[] }>;
  jsonHeaders: Record<string, string> | undefined;
  authHeaders: Record<string, string> | undefined;
};

export const useNutritionFeature = ({
  userId,
  defaults,
  analyzePhoto,
  jsonHeaders,
  authHeaders
}: NutritionFeatureOptions) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<NutritionFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<NutritionRecord[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoResult, setPhotoResult] = useState<NutritionPhotoAnalysis | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoHistory, setPhotoHistory] = useState<NutritionPhotoRecord[]>([]);
  const [photoDescription, setPhotoDescription] = useState("");
  const updatePhotoDescription = useCallback((value: string) => {
    setPhotoDescription(value);
  }, []);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      setPhotoResult(null);
      setPhotoLoading(false);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    setPhotoResult(null);
    setPhotoError(null);
    setPhotoLoading(false);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photoFile]);

  useEffect(() => {
    setForm(prev => {
      const nextWeight = prev.weight || (defaults.weight != null ? String(defaults.weight) : "");
      const nextHeight = prev.height || (defaults.height != null ? String(defaults.height) : "");
      const nextCalories = prev.calories || (defaults.calories != null ? String(defaults.calories) : "");
      const nextActivity = prev.activity || (defaults.activity ?? "");
      if (
        nextWeight === prev.weight &&
        nextHeight === prev.height &&
        nextCalories === prev.calories &&
        nextActivity === prev.activity
      ) {
        return prev;
      }
      return {
        ...prev,
        weight: nextWeight,
        height: nextHeight,
        calories: nextCalories,
        activity: nextActivity
      };
    });
  }, [defaults.weight, defaults.height, defaults.calories, defaults.activity]);

  const loadAdviceHistory = useCallback(async () => {
    if (!authHeaders) {
      setHistory([]);
      return;
    }
    try {
      const records = await fetchNutritionAdviceHistory(authHeaders);
      setHistory(mapAdviceHistory(records));
    } catch (err) {
      console.error(err);
    }
  }, [authHeaders]);

  const loadPhotoHistory = useCallback(async () => {
    if (!authHeaders) {
      setPhotoHistory([]);
      return;
    }
    try {
      const records = await fetchNutritionPhotoHistory(authHeaders);
      setPhotoHistory(mapPhotoHistory(records));
    } catch (err) {
      console.error(err);
    }
  }, [authHeaders]);

  useEffect(() => {
    void loadAdviceHistory();
    void loadPhotoHistory();
  }, [loadAdviceHistory, loadPhotoHistory, userId]);

  const updateField = useCallback(<TKey extends keyof NutritionFormState>(key: TKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setAdvice("");
    setLoading(false);
    setError(null);
    setHistory([]);
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoResult(null);
    setPhotoError(null);
    setPhotoLoading(false);
    setPhotoHistory([]);
    setPhotoDescription("");
  }, []);

  const selectPhoto = useCallback((file: File | null) => {
    setPhotoFile(file);
  }, []);

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoResult(null);
    setPhotoError(null);
    setPhotoLoading(false);
    setPhotoDescription("");
  }, []);

  const analyzeSelectedPhoto = useCallback(async () => {
    if (!photoFile) {
      setPhotoError(t("nutrition.photo.missing"));
      return;
    }
    setPhotoLoading(true);
    setPhotoError(null);
    try {
      const description = photoDescription.trim();
      const { analysis, history: historyItems } = await analyzePhoto(photoFile, description);
      setPhotoResult(analysis);
      setPhotoHistory(mapPhotoHistory(historyItems));
      setPhotoDescription(analysis.description || description);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("nutrition.photo.error");
      setPhotoError(errorMessage);
      setPhotoResult(null);
    } finally {
      setPhotoLoading(false);
    }
  }, [analyzePhoto, photoDescription, photoFile, t]);

  const removePhotoHistoryEntry = useCallback(
    async (id: string) => {
      if (!authHeaders) {
        setPhotoHistory(prev => prev.filter(entry => entry.id !== id));
        return;
      }

      const numericId = Number(id);
      if (!Number.isFinite(numericId)) {
        return;
      }

      try {
        await deleteNutritionPhotoRecord(authHeaders, numericId);
        setPhotoHistory(prev => prev.filter(entry => entry.id !== id));
      } catch (err) {
        setPhotoError(err instanceof Error ? err.message : t("common.requestError", { status: 500 }));
      }
    },
    [authHeaders, t]
  );

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const payload: NutritionAdvicePayload = {
          weight: form.weight.trim(),
          height: form.height.trim(),
          calories: form.calories.trim(),
          activity: form.activity.trim(),
          question: form.question.trim(),
          comment: form.comment.trim(),
          language: i18n.language || "ru"
        };
        const { advice: reply, history: historyItems } = await submitNutritionAdvice(jsonHeaders, payload);
        setAdvice(reply);
        setHistory(mapAdviceHistory(historyItems));
      } catch (err) {
        setError(err instanceof Error ? err.message : t("nutritionPrompt.submitError"));
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [form.activity, form.calories, form.comment, form.height, form.question, form.weight, jsonHeaders, t]
  );

  return {
    form,
    advice,
    loading,
    error,
    history,
    updateField,
    submit,
    reset,
    photoFile,
    photoPreview,
    photoResult,
    photoError,
    photoLoading,
    photoHistory,
    photoDescription,
    selectPhoto,
    clearPhoto,
    updatePhotoDescription,
    analyzePhoto: analyzeSelectedPhoto,
    removePhotoHistoryEntry
  };
};
