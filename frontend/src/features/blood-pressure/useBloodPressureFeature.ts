import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { createRecordId } from "../../lib/ids";
import { readArchive, writeArchive } from "../../lib/storage";
import type { BloodPressureFormState, BloodPressureRecord } from "../../types/forms";

const DEFAULT_FORM: BloodPressureFormState = {
  systolic: "",
  diastolic: "",
  pulse: "",
  question: "",
  comment: ""
};

const normalizeRecord = (input: Partial<BloodPressureRecord>): BloodPressureRecord => ({
  id: input.id ?? createRecordId(),
  createdAt: input.createdAt ?? new Date().toISOString(),
  systolic: input.systolic ?? "",
  diastolic: input.diastolic ?? "",
  pulse: input.pulse ?? "",
  question: input.question ?? "",
  comment: input.comment ?? "",
  advice: input.advice ?? ""
});

export const useBloodPressureFeature = (
  userId: number | null,
  requestAdvice: (prompt: string) => Promise<string>
) => {
  const [form, setForm] = useState<BloodPressureFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BloodPressureRecord[]>([]);

  useEffect(() => {
    const data = readArchive("bp", userId) as Partial<BloodPressureRecord>[] | null;
    if (data && data.length > 0) {
      setHistory(data.map(normalizeRecord));
    } else {
      setHistory([]);
    }
  }, [userId]);

  useEffect(() => {
    writeArchive("bp", userId, history);
  }, [history, userId]);

  const updateField = useCallback(<TKey extends keyof BloodPressureFormState>(key: TKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setAdvice("");
    setLoading(false);
    setError(null);
    setHistory([]);
  }, []);

  const saveRecord = useCallback(() => {
    const hasMetrics = form.systolic || form.diastolic || form.pulse;
    if (!hasMetrics) {
      setError("Укажите хотя бы одно значение, чтобы сохранить его в архиве");
      return;
    }
    setError(null);
    const record: BloodPressureRecord = {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      systolic: form.systolic,
      diastolic: form.diastolic,
      pulse: form.pulse,
      question: form.question.trim(),
      comment: form.comment.trim(),
      advice: ""
    };
    setHistory(prev => [record, ...prev]);
  }, [form]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setLoading(true);
      setError(null);
      try {
        const metrics: string[] = [];
        if (form.systolic) metrics.push(`систолическое давление ${form.systolic} мм рт. ст.`);
        if (form.diastolic) metrics.push(`диастолическое давление ${form.diastolic} мм рт. ст.`);
        if (form.pulse) metrics.push(`пульс ${form.pulse} уд/мин`);
        if (form.comment) metrics.push(`комментарий: ${form.comment}`);
        const metricSummary = metrics.length > 0 ? metrics.join(", ") : "показатели не указаны";
        const prompt = [
          "Ты — кардиолог, который объясняет понятным языком.",
          `Пациент сообщает: ${metricSummary}.`,
          "Дай советы, как стабилизировать давление и пульс безопасными методами.",
          "Добавь практические советы по образу жизни и упомяни тревожные симптомы, при которых нужно немедленно обратиться к врачу.",
          form.question ? `Дополнительный контекст от пациента: ${form.question}.` : ""
        ]
          .filter(Boolean)
          .join(" ");
        const reply = await requestAdvice(prompt);
        setAdvice(reply);
        const record: BloodPressureRecord = {
          id: createRecordId(),
          createdAt: new Date().toISOString(),
          systolic: form.systolic,
          diastolic: form.diastolic,
          pulse: form.pulse,
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
    saveRecord,
    submit,
    reset
  };
};
