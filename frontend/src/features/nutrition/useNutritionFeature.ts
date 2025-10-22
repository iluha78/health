import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createRecordId } from "../../lib/ids";
import { readArchive, writeArchive } from "../../lib/storage";
import type { NutritionFormState, NutritionRecord } from "../../types/forms";

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

type NutritionDefaults = {
  weight: number | null;
  height: number | null;
  calories: number | null;
  activity: string | null;
};

export const useNutritionFeature = (
  userId: number | null,
  requestAdvice: (prompt: string) => Promise<string>,
  defaults: NutritionDefaults
) => {
  const [form, setForm] = useState<NutritionFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<NutritionRecord[]>([]);

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
  }, []);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const facts: string[] = [];
        if (form.weight) facts.push(`масса тела ${form.weight} кг`);
        if (form.height) facts.push(`рост ${form.height} см`);
        if (form.calories) facts.push(`суточная калорийность ${form.calories} ккал`);
        if (form.activity) facts.push(`уровень активности: ${form.activity}`);
        if (form.comment) facts.push(`комментарий: ${form.comment}`);
        const prompt = [
          "Ты — нутрициолог. На основе данных клиента составь рекомендации по питанию и режиму на ближайшие 1-2 недели.",
          facts.length > 0 ? `Исходные данные: ${facts.join(", ")}.` : "Клиент не указал исходные данные.",
          form.question
            ? `Дополнительный запрос клиента: ${form.question}.`
            : "Сделай рекомендации универсальными и безопасными.",
          "Напомни о необходимости консультации врача при хронических заболеваниях."
        ].join(" ");
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
        setError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [form, requestAdvice]
  );

  return {
    form,
    advice,
    loading,
    error,
    history,
    updateField,
    submit,
    reset
  };
};
