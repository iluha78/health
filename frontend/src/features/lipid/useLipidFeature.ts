import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { fetchLipidHistory, createLipidRecord } from "../../lib/lipids";
import type { LipidFormState, LipidRecord } from "../../types/forms";
import type { LipidHistoryItem } from "../../types/api";

const DEFAULT_FORM: LipidFormState = {
  date: "",
  cholesterol: "",
  hdl: "",
  ldl: "",
  triglycerides: "",
  glucose: "",
  question: "",
  comment: "",
};

const metricToString = (value: number | null): string =>
  value == null ? "" : String(value);

const convertHistoryItem = (item: LipidHistoryItem): LipidRecord => ({
  id: item.id,
  createdAt: item.created_at ?? new Date().toISOString(),
  date: item.dt ?? "",
  cholesterol: metricToString(item.chol),
  hdl: metricToString(item.hdl),
  ldl: metricToString(item.ldl),
  triglycerides: metricToString(item.trig),
  glucose: metricToString(item.glucose),
  question: item.question ?? "",
  comment: item.note ?? "",
  advice: item.advice ?? "",
});

const toNumberOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildPayload = (form: LipidFormState, advice?: string) => {
  const payload: Record<string, unknown> = {
    dt: form.date,
    chol: toNumberOrNull(form.cholesterol),
    hdl: toNumberOrNull(form.hdl),
    ldl: toNumberOrNull(form.ldl),
    trig: toNumberOrNull(form.triglycerides),
    glucose: toNumberOrNull(form.glucose),
    question: form.question.trim() || null,
    comment: form.comment.trim() || null,
  };

  if (advice && advice.trim() !== "") {
    payload.advice = advice.trim();
  }

  return payload;
};

export const useLipidFeature = (
  headers: Record<string, string> | undefined,
  enabled: boolean,
  disabledReason: string | null,
  requestAdvice: (prompt: string) => Promise<string>
) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<LipidFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LipidRecord[]>([]);

  useEffect(() => {
    if (!headers) {
      setHistory([]);
      return;
    }

    const load = async () => {
      try {
        const records = await fetchLipidHistory(headers);
        setHistory(records.map(convertHistoryItem));
      } catch (err) {
        console.warn("Failed to load lipid history", err);
        setHistory([]);
      }
    };

    void load();
  }, [headers]);

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
    if (!headers) {
      setError(t("common.loginRequired"));
      return;
    }

    setError(null);
    const payload = buildPayload(form);
    createLipidRecord(headers, payload)
      .then(record => {
        if (record) {
          setHistory(prev => [convertHistoryItem(record), ...prev]);
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : t("lipidPrompt.saveFailed"));
      });
  }, [form, headers, t]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!enabled) {
        setError(disabledReason ?? t("lipid.disabled"));
        return;
      }
      if (!headers) {
        setError(t("common.loginRequired"));
        return;
      }

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
          form.question ? t("lipidPrompt.extra", { question: form.question }) : "",
        ]
          .filter(Boolean)
          .join("\n");

        const reply = await requestAdvice(prompt);
        setAdvice(reply);

        const payload = buildPayload(form, reply);
        const record = await createLipidRecord(headers, payload);
        if (record) {
          setHistory(prev => [convertHistoryItem(record), ...prev]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("lipidPrompt.submitError"));
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [disabledReason, enabled, form, headers, requestAdvice, t]
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
    reset,
  };
};
