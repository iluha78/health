import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { createRecordId } from "../../lib/ids";
import { readArchive, readArchiveByKey, storageKey, writeArchive } from "../../lib/storage";
import type { LipidFormState, LipidRecord } from "../../types/forms";

const DEFAULT_FORM: LipidFormState = {
  date: "",
  cholesterol: "",
  hdl: "",
  ldl: "",
  triglycerides: "",
  glucose: "",
  question: "",
  comment: ""
};

const normalizeRecord = (input: Partial<LipidRecord>): LipidRecord => ({
  id: input.id ?? createRecordId(),
  createdAt: input.createdAt ?? new Date().toISOString(),
  date: input.date ?? "",
  cholesterol: input.cholesterol ?? "",
  hdl: input.hdl ?? "",
  ldl: input.ldl ?? "",
  triglycerides: input.triglycerides ?? "",
  glucose: input.glucose ?? "",
  question: input.question ?? "",
  comment: input.comment ?? "",
  advice: input.advice ?? ""
});

const convertLegacyRecord = (input: {
  id?: string;
  createdAt?: string;
  cholesterol?: string;
  sugar?: string;
  question?: string;
  comment?: string;
  advice?: string;
}): LipidRecord => ({
  id: input.id ?? createRecordId(),
  createdAt: input.createdAt ?? new Date().toISOString(),
  date: "",
  cholesterol: input.cholesterol ?? "",
  hdl: "",
  ldl: "",
  triglycerides: "",
  glucose: input.sugar ?? "",
  question: input.question ?? "",
  comment: input.comment ?? "",
  advice: input.advice ?? ""
});

export const useLipidFeature = (
  userId: number | null,
  requestAdvice: (prompt: string) => Promise<string>
) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<LipidFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LipidRecord[]>([]);

  useEffect(() => {
    const data = readArchive("lipid", userId) as Partial<LipidRecord>[] | null;
    if (data && data.length > 0) {
      setHistory(data.map(normalizeRecord));
      return;
    }
    const legacyKey = storageKey("metabolic", userId);
    const legacy = readArchiveByKey(legacyKey) as
      | {
          id?: string;
          createdAt?: string;
          cholesterol?: string;
          sugar?: string;
          question?: string;
          comment?: string;
          advice?: string;
        }[]
      | null;
    if (legacy && legacy.length > 0) {
      setHistory(legacy.map(convertLegacyRecord));
    } else {
      setHistory([]);
    }
  }, [userId]);

  useEffect(() => {
    writeArchive("lipid", userId, history);
  }, [history, userId]);

  const updateField = useCallback(<TKey extends keyof LipidFormState>(key: TKey, value: string) => {
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
    const hasMetrics =
      form.date || form.cholesterol || form.hdl || form.ldl || form.triglycerides || form.glucose;
    if (!hasMetrics) {
      setError(t("lipidPrompt.saveError"));
      return;
    }
    setError(null);
    const record: LipidRecord = {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      date: form.date,
      cholesterol: form.cholesterol,
      hdl: form.hdl,
      ldl: form.ldl,
      triglycerides: form.triglycerides,
      glucose: form.glucose,
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
        if (form.date) metrics.push(t("lipidPrompt.metrics.date", { value: form.date }));
        if (form.cholesterol) metrics.push(t("lipidPrompt.metrics.cholesterol", { value: form.cholesterol }));
        if (form.hdl) metrics.push(t("lipidPrompt.metrics.hdl", { value: form.hdl }));
        if (form.ldl) metrics.push(t("lipidPrompt.metrics.ldl", { value: form.ldl }));
        if (form.triglycerides) metrics.push(t("lipidPrompt.metrics.triglycerides", { value: form.triglycerides }));
        if (form.glucose) metrics.push(t("lipidPrompt.metrics.glucose", { value: form.glucose }));
        if (form.comment) metrics.push(t("lipidPrompt.metrics.comment", { value: form.comment }));
        const prompt = [
          t("lipidPrompt.role"),
          metrics.length > 0
            ? t("lipidPrompt.summary", { metrics: metrics.join(", ") })
            : t("lipidPrompt.summaryMissing"),
          t("lipidPrompt.advice"),
          t("lipidPrompt.plan"),
          form.question ? t("lipidPrompt.extra", { question: form.question }) : ""
        ]
          .filter(Boolean)
          .join("\n");
        const reply = await requestAdvice(prompt);
        setAdvice(reply);
        const record: LipidRecord = {
          id: createRecordId(),
          createdAt: new Date().toISOString(),
          date: form.date,
          cholesterol: form.cholesterol,
          hdl: form.hdl,
          ldl: form.ldl,
          triglycerides: form.triglycerides,
          glucose: form.glucose,
          question: form.question.trim(),
          comment: form.comment.trim(),
          advice: reply
        };
        setHistory(prev => [record, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("lipidPrompt.submitError"));
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
