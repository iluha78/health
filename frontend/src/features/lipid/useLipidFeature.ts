import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { createRecordId } from "../../lib/ids";
import { apiUrl } from "../../lib/api";
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

type ApiLipid = {
  id?: number | string | null;
  dt?: string | null;
  chol?: number | string | null;
  hdl?: number | string | null;
  ldl?: number | string | null;
  trig?: number | string | null;
  glucose?: number | string | null;
  note?: string | null;
  question?: string | null;
  advice?: string | null;
  created_at?: string | null;
};

const toMetricString = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value;
  }
  return String(value);
};

const toText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  return value == null ? "" : String(value);
};

const convertApiRecord = (input: unknown): LipidRecord => {
  if (!input || typeof input !== "object") {
    return normalizeRecord({});
  }
  const value = input as ApiLipid;
  const idValue = value.id;
  const id =
    (typeof idValue === "number" && Number.isFinite(idValue)) ||
    (typeof idValue === "string" && idValue.trim() !== "")
      ? String(idValue)
      : createRecordId();
  const createdAt = typeof value.created_at === "string" && value.created_at
    ? value.created_at
    : new Date().toISOString();

  return {
    id,
    createdAt,
    date: toText(value.dt).trim(),
    cholesterol: toMetricString(value.chol),
    hdl: toMetricString(value.hdl),
    ldl: toMetricString(value.ldl),
    triglycerides: toMetricString(value.trig),
    glucose: toMetricString(value.glucose),
    question: toText(value.question).trim(),
    comment: toText(value.note).trim(),
    advice: toText(value.advice)
  } satisfies LipidRecord;
};

const toFloatOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const normalized = trimmed.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildPayload = (state: LipidFormState, advice: string) => ({
  dt: state.date.trim() || null,
  chol: toFloatOrNull(state.cholesterol),
  hdl: toFloatOrNull(state.hdl),
  ldl: toFloatOrNull(state.ldl),
  trig: toFloatOrNull(state.triglycerides),
  glucose: toFloatOrNull(state.glucose),
  note: state.comment.trim() || null,
  question: state.question.trim() || null,
  advice: advice.trim() || null
});

export const useLipidFeature = (
  userId: number | null,
  authHeaders: Record<string, string> | undefined,
  requestAdvice: (prompt: string) => Promise<string>
) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<LipidFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LipidRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (!authHeaders || userId === null) {
      setHistory([]);
      return () => {
        cancelled = true;
      };
    }

    const loadHistory = async () => {
      try {
        const response = await fetch(apiUrl("/lipids"), {
          headers: authHeaders
        });
        if (!response.ok) {
          throw new Error(t("common.requestError", { status: response.status }));
        }
        const payload = await response.json();
        if (!Array.isArray(payload)) {
          throw new Error(t("common.parseError"));
        }
        if (cancelled) return;
        setHistory(payload.map(convertApiRecord));
      } catch (err) {
        console.error("Failed to load lipid history", err);
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t("common.networkError", { message: "unknown" }));
        setHistory([]);
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authHeaders, t, userId]);

  const updateField = useCallback(<TKey extends keyof LipidFormState>(key: TKey, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setForm(DEFAULT_FORM);
    setAdvice("");
    setLoading(false);
    setSaving(false);
    setError(null);
    setHistory([]);
  }, []);

  const persistRecord = useCallback(
    async (state: LipidFormState, adviceText: string) => {
      if (!authHeaders) {
        throw new Error(t("common.loginRequired"));
      }
      const response = await fetch(apiUrl("/lipids"), {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": authHeaders["Content-Type"] ?? "application/json"
        },
        body: JSON.stringify(buildPayload(state, adviceText))
      });
      if (!response.ok) {
        let message = t("common.requestError", { status: response.status });
        try {
          const errBody = await response.json();
          if (errBody && typeof errBody.error === "string") {
            message = errBody.error;
          }
        } catch {
          // ignore parse errors
        }
        throw new Error(message);
      }
      const body = await response.json();
      return convertApiRecord(body);
    },
    [authHeaders, t]
  );

  const saveRecord = useCallback(async () => {
    const hasMetrics =
      form.date ||
      form.cholesterol ||
      form.hdl ||
      form.ldl ||
      form.triglycerides ||
      form.glucose;
    if (!hasMetrics) {
      setError(t("lipidPrompt.saveError"));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const record = await persistRecord(form, "");
      setHistory(prev => [record, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.networkError", { message: "unknown" }));
    } finally {
      setSaving(false);
    }
  }, [form, persistRecord, t]);

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
        try {
          const record = await persistRecord(form, reply);
          setHistory(prev => [record, ...prev]);
        } catch (err) {
          console.error("Failed to persist lipid record", err);
          setError(err instanceof Error ? err.message : t("common.networkError", { message: "unknown" }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("lipidPrompt.submitError"));
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [form, persistRecord, requestAdvice, t]
  );

  const pending = useMemo(() => loading || saving, [loading, saving]);

  return {
    form,
    advice,
    loading,
    pending,
    error,
    history,
    updateField,
    saveRecord,
    submit,
    reset
  };
};
