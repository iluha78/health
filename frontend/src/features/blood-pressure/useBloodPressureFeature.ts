import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import type { BloodPressureFormState, BloodPressureRecord } from "../../types/forms";
import { fetchBloodPressureHistory, requestBloodPressureAdvice, saveBloodPressureRecord } from "../../lib/bloodPressure";
import type { BloodPressureHistoryItem } from "../../types/api";

const DEFAULT_FORM: BloodPressureFormState = {
  systolic: "",
  diastolic: "",
  pulse: "",
  question: "",
  comment: ""
};

export const useBloodPressureFeature = (
  headers: Record<string, string> | undefined,
  enabled: boolean,
  disabledReason: string | null,
  refreshUsage?: () => Promise<void> | void
) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<BloodPressureFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BloodPressureRecord[]>([]);

  useEffect(() => {
    if (!headers || !enabled) {
      setHistory([]);
      return;
    }
    const load = async () => {
      try {
        const result = await fetchBloodPressureHistory(headers);
        setHistory(result.map(convertHistoryItem));
      } catch (err) {
        console.warn("Failed to load blood pressure history", err);
        setHistory([]);
      }
    };
    void load();
  }, [enabled, headers]);

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
      setError(t("bp.saveError"));
      return;
    }
    if (!headers) {
      setError(t("common.loginRequired"));
      return;
    }
    setError(null);
    const payload = buildPayload(form);
    saveBloodPressureRecord(headers, payload)
      .then(result => {
        const record = result.record ? convertHistoryItem(result.record) : null;
        if (record) {
          setHistory(prev => [record, ...prev]);
        }
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : t("bp.saveError"));
      });
  }, [form, headers, t]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!enabled) {
        setError(disabledReason ?? t("bp.disabled"));
        return;
      }
      if (!headers) {
        setError(t("common.loginRequired"));
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const payload = buildPayload(form);
        const { advice: reply, record } = await requestBloodPressureAdvice(headers, payload);
        setAdvice(reply);
        if (record) {
          setHistory(prev => [convertHistoryItem(record), ...prev]);
        }
        if (refreshUsage) {
          await refreshUsage();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("bp.submitError"));
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [disabledReason, enabled, form, headers, refreshUsage, t]
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

const buildPayload = (form: BloodPressureFormState) => ({
  systolic: form.systolic || null,
  diastolic: form.diastolic || null,
  pulse: form.pulse || null,
  question: form.question.trim() || null,
  comment: form.comment.trim() || null
});

const convertHistoryItem = (item: BloodPressureHistoryItem): BloodPressureRecord => ({
  id: item.id,
  createdAt: item.created_at,
  systolic: item.systolic != null ? String(item.systolic) : "",
  diastolic: item.diastolic != null ? String(item.diastolic) : "",
  pulse: item.pulse != null ? String(item.pulse) : "",
  question: item.question ?? "",
  comment: item.comment ?? "",
  advice: item.advice ?? ""
});
