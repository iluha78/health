import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
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
  const { t } = useTranslation();
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
      setError(t("bpPrompt.saveError"));
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
        if (form.systolic) metrics.push(t("bpPrompt.metrics.systolic", { value: form.systolic }));
        if (form.diastolic) metrics.push(t("bpPrompt.metrics.diastolic", { value: form.diastolic }));
        if (form.pulse) metrics.push(t("bpPrompt.metrics.pulse", { value: form.pulse }));
        if (form.comment) metrics.push(t("bpPrompt.metrics.comment", { value: form.comment }));
        const metricSummary =
          metrics.length > 0 ? metrics.join(", ") : t("bpPrompt.metrics.missing");
        const prompt = [
          t("bpPrompt.role"),
          t("bpPrompt.summary", { summary: metricSummary }),
          t("bpPrompt.advice"),
          t("bpPrompt.lifestyle"),
          form.question ? t("bpPrompt.extra", { question: form.question }) : ""
        ]
          .filter(Boolean)
          .join("\n");
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
        setError(err instanceof Error ? err.message : t("bpPrompt.submitError"));
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
    saveRecord,
    submit,
    reset
  };
};
