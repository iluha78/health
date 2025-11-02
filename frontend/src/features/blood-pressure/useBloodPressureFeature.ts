import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { createRecordId } from "../../lib/ids";
import { apiUrl } from "../../lib/api";
import { readArchive, writeArchive } from "../../lib/storage";
import type { BloodPressureFormState, BloodPressureRecord } from "../../types/forms";

const DEFAULT_FORM: BloodPressureFormState = {
  systolic: "",
  diastolic: "",
  pulse: "",
  question: "",
  comment: ""
};

const STORAGE_SCOPE = "bp";

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

const createLocalRecord = (state: BloodPressureFormState, advice: string): BloodPressureRecord =>
  normalizeRecord({
    id: createRecordId(),
    createdAt: new Date().toISOString(),
    systolic: state.systolic,
    diastolic: state.diastolic,
    pulse: state.pulse,
    question: state.question.trim(),
    comment: state.comment.trim(),
    advice
  });

type ApiBloodPressure = {
  id?: number | string | null;
  systolic?: number | string | null;
  diastolic?: number | string | null;
  pulse?: number | string | null;
  question?: string | null;
  comment?: string | null;
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

const convertApiRecord = (input: unknown): BloodPressureRecord => {
  if (!input || typeof input !== "object") {
    return normalizeRecord({});
  }
  const value = input as ApiBloodPressure;
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
    systolic: toMetricString(value.systolic),
    diastolic: toMetricString(value.diastolic),
    pulse: toMetricString(value.pulse),
    question: toText(value.question).trim(),
    comment: toText(value.comment).trim(),
    advice: toText(value.advice)
  } satisfies BloodPressureRecord;
};

const toIntOrNull = (value: string): number | null => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildPayload = (state: BloodPressureFormState, advice: string) => ({
  systolic: toIntOrNull(state.systolic),
  diastolic: toIntOrNull(state.diastolic),
  pulse: toIntOrNull(state.pulse),
  question: state.question.trim() || null,
  comment: state.comment.trim() || null,
  advice: advice.trim() || null
});

export const useBloodPressureFeature = (
  userId: number | null,
  authHeaders: Record<string, string> | undefined,
  requestAdvice: (prompt: string) => Promise<string>
) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<BloodPressureFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BloodPressureRecord[]>([]);

  useEffect(() => {
    const data = readArchive(STORAGE_SCOPE, userId) as Partial<BloodPressureRecord>[] | null;
    if (data && data.length > 0) {
      setHistory(data.map(normalizeRecord));
    } else {
      setHistory([]);
    }
  }, [userId]);

  useEffect(() => {
    writeArchive(STORAGE_SCOPE, userId, history);
  }, [history, userId]);

  useEffect(() => {
    let cancelled = false;
    if (!authHeaders || userId === null) {
      return () => {
        cancelled = true;
      };
    }

    const loadHistory = async () => {
      try {
        const response = await fetch(apiUrl("/blood-pressures"), {
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
        const records = payload.map(convertApiRecord);
        setHistory(prev => {
          if (records.length > 0) {
            return records;
          }
          return prev;
        });
      } catch (err) {
        console.error("Failed to load blood pressure history", err);
        if (cancelled) return;
      }
    };

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [authHeaders, t, userId]);

  const updateField = useCallback(<TKey extends keyof BloodPressureFormState>(key: TKey, value: string) => {
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
    async (state: BloodPressureFormState, adviceText: string) => {
      if (!authHeaders) {
        throw new Error(t("common.loginRequired"));
      }
      const response = await fetch(apiUrl("/blood-pressures"), {
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
    const hasMetrics = form.systolic || form.diastolic || form.pulse;
    if (!hasMetrics) {
      setError(t("bpPrompt.saveError"));
      return;
    }
    setError(null);
    const fallbackRecord = createLocalRecord(form, "");
    let stored = false;
    if (authHeaders && userId !== null) {
      setSaving(true);
      try {
        const record = await persistRecord(form, "");
        setHistory(prev => [record, ...prev]);
        stored = true;
      } catch (err) {
        console.error("Failed to persist blood pressure record", err);
        setError(err instanceof Error ? err.message : t("common.networkError", { message: "unknown" }));
      } finally {
        setSaving(false);
      }
    }
    if (!stored) {
      setHistory(prev => [fallbackRecord, ...prev]);
    }
  }, [authHeaders, form, persistRecord, t, userId]);

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
        let stored = false;
        if (authHeaders && userId !== null) {
          try {
            const record = await persistRecord(form, reply);
            setHistory(prev => [record, ...prev]);
            stored = true;
          } catch (err) {
            console.error("Failed to persist blood pressure record", err);
            setError(err instanceof Error ? err.message : t("common.networkError", { message: "unknown" }));
          }
        }
        if (!stored) {
          const localRecord = createLocalRecord(form, reply);
          setHistory(prev => [localRecord, ...prev]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("bpPrompt.submitError"));
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [authHeaders, form, persistRecord, requestAdvice, t, userId]
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
