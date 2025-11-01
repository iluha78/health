import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { createRecordId } from "../../lib/ids";
import { readArchive, writeArchive } from "../../lib/storage";
import type { NutritionFormState, NutritionPhotoRecord, NutritionRecord } from "../../types/forms";
import type { NutritionPhotoAnalysis, NutritionPhotoError } from "../../lib/nutrition";

const DEFAULT_FORM: NutritionFormState = {
  weight: "",
  height: "",
  calories: "",
  activity: "",
  question: "",
  comment: ""
};

const normalizeRecord = (input: Partial<NutritionRecord>): NutritionRecord => ({
  id: input.id ?? createRecordId(),
  createdAt: input.createdAt ?? new Date().toISOString(),
  weight: input.weight ?? "",
  height: input.height ?? "",
  calories: input.calories ?? "",
  activity: input.activity ?? "",
  question: input.question ?? "",
  comment: input.comment ?? "",
  advice: input.advice ?? ""
});

const normalizePhotoRecord = (input: Partial<NutritionPhotoRecord>): NutritionPhotoRecord => ({
  id: input.id ?? createRecordId(),
  createdAt: input.createdAt ?? new Date().toISOString(),
  fileName: input.fileName ?? "",
  calories: typeof input.calories === "number" ? input.calories : null,
  confidence: typeof input.confidence === "string" ? input.confidence : null,
  notes: input.notes ?? "",
  ingredients: Array.isArray(input.ingredients)
    ? input.ingredients.filter((item): item is string => typeof item === "string")
    : []
});

type NutritionDefaults = {
  weight: number | null;
  height: number | null;
  calories: number | null;
  activity: string | null;
};

export const useNutritionFeature = (
  userId: number | null,
  requestAdvice: (prompt: string) => Promise<string>,
  defaults: NutritionDefaults,
  analyzePhoto: (file: File) => Promise<NutritionPhotoAnalysis>
) => {
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
  const [photoDebug, setPhotoDebug] = useState<string[]>([]);
  const [photoHistory, setPhotoHistory] = useState<NutritionPhotoRecord[]>([]);

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
    const data = readArchive("nutrition", userId) as Partial<NutritionRecord>[] | null;
    if (data && data.length > 0) {
      setHistory(data.map(normalizeRecord));
    } else {
      setHistory([]);
    }
  }, [userId]);

  useEffect(() => {
    writeArchive("nutrition", userId, history);
  }, [history, userId]);

  useEffect(() => {
    const data = readArchive("nutrition_photo", userId) as Partial<NutritionPhotoRecord>[] | null;
    if (data && data.length > 0) {
      setPhotoHistory(data.map(normalizePhotoRecord));
    } else {
      setPhotoHistory([]);
    }
  }, [userId]);

  useEffect(() => {
    writeArchive("nutrition_photo", userId, photoHistory);
  }, [photoHistory, userId]);

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
    setPhotoDebug([]);
    setPhotoHistory([]);
  }, []);

  const selectPhoto = useCallback((file: File | null) => {
    setPhotoFile(file);
    setPhotoDebug([]);
  }, []);

  const clearPhoto = useCallback(() => {
    setPhotoFile(null);
    setPhotoResult(null);
    setPhotoError(null);
    setPhotoLoading(false);
    setPhotoDebug([]);
  }, []);

  const analyzeSelectedPhoto = useCallback(async () => {
    if (!photoFile) {
      setPhotoError(t("nutrition.photo.missing"));
      return;
    }
    setPhotoLoading(true);
    setPhotoError(null);
    setPhotoDebug([]);
    try {
      const result = await analyzePhoto(photoFile);
      setPhotoResult(result);
      setPhotoDebug(result.debug ?? []);
      const record: NutritionPhotoRecord = {
        id: createRecordId(),
        createdAt: new Date().toISOString(),
        fileName: photoFile.name,
        calories: result.calories,
        confidence: result.confidence,
        notes: result.notes,
        ingredients: result.ingredients
      };
      setPhotoHistory(prev => [record, ...prev]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t("nutrition.photo.error");
      const debug = err && typeof err === "object" && err !== null && "debug" in err
        ? (err as NutritionPhotoError).debug ?? []
        : [];
      setPhotoError(errorMessage);
      setPhotoResult(null);
      setPhotoDebug(debug);
    } finally {
      setPhotoLoading(false);
    }
  }, [analyzePhoto, photoFile, t]);

  const removePhotoHistoryEntry = useCallback((id: string) => {
    setPhotoHistory(prev => prev.filter(entry => entry.id !== id));
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const facts: string[] = [];
        if (form.weight) facts.push(t("nutritionPrompt.facts.weight", { value: form.weight }));
        if (form.height) facts.push(t("nutritionPrompt.facts.height", { value: form.height }));
        if (form.calories) facts.push(t("nutritionPrompt.facts.calories", { value: form.calories }));
        if (form.activity) facts.push(t("nutritionPrompt.facts.activity", { value: form.activity }));
        if (form.comment) facts.push(t("nutritionPrompt.facts.comment", { value: form.comment }));
        const prompt = [
          t("nutritionPrompt.role"),
          facts.length > 0
            ? t("nutritionPrompt.summary", { facts: facts.join(", ") })
            : t("nutritionPrompt.summaryMissing"),
          form.question
            ? t("nutritionPrompt.extra", { question: form.question })
            : t("nutritionPrompt.universal"),
          t("nutritionPrompt.reminder")
        ].join("\n");
        const reply = await requestAdvice(prompt);
        setAdvice(reply);
        const record: NutritionRecord = {
          id: createRecordId(),
          createdAt: new Date().toISOString(),
          weight: form.weight,
          height: form.height,
          calories: form.calories,
          activity: form.activity,
          question: form.question.trim(),
          comment: form.comment.trim(),
          advice: reply
        };
        setHistory(prev => [record, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("nutritionPrompt.submitError"));
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [form, requestAdvice, t]
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
    photoDebug,
    photoHistory,
    selectPhoto,
    clearPhoto,
    analyzePhoto: analyzeSelectedPhoto,
    removePhotoHistoryEntry
  };
};
