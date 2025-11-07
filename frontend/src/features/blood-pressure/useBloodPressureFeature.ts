import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { apiUrl } from "../../lib/api";
import { createRecordId } from "../../lib/ids";
import type { BloodPressureFormState, BloodPressureRecord } from "../../types/forms";

const DEFAULT_FORM: BloodPressureFormState = {
  systolic: "",
  diastolic: "",
  pulse: "",
  question: "",
  comment: ""
};

type HeadersShape = Record<string, string> | undefined;

type UseBloodPressureOptions = {
  authHeaders?: HeadersShape;
  jsonHeaders?: HeadersShape;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const normalizeMetric = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
};

const pad = (value: number): string => value.toString().padStart(2, "0");

const formatDateTime = (value: Date): string =>
  [
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
  ].join(" ");

const normalizeDate = (value: unknown): string => {
  if (typeof value !== "string" || value.length === 0) {
    return new Date().toISOString();
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toISOString();
};

const normalizeApiRecord = (value: unknown): BloodPressureRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const measured = value.measured_at ?? value.created_at;

  return {
    id: typeof id === "number" || typeof id === "string" ? String(id) : createRecordId(),
    createdAt: normalizeDate(measured),
    systolic: normalizeMetric(value.systolic),
    diastolic: normalizeMetric(value.diastolic),
    pulse: normalizeMetric(value.pulse),
    question: "",
    comment: "",
    advice: typeof value.advice === "string" ? value.advice : ""
  } satisfies BloodPressureRecord;
};

const extractErrorMessage = (status: number, payload: unknown, fallback: string): string => {
  if (status === 401) {
    return fallback;
  }

  if (isRecord(payload)) {
    if (typeof payload.error === "string" && payload.error.length > 0) {
      return payload.error;
    }
    if (isRecord(payload.errors)) {
      const firstError = Object.values(payload.errors)[0];
      if (Array.isArray(firstError) && firstError.length > 0) {
        const first = firstError[0];
        if (typeof first === "string") {
          return first;
        }
      }
      if (typeof firstError === "string" && firstError.length > 0) {
        return firstError;
      }
    }
  }

  return fallback;
};

export const useBloodPressureFeature = (
  userId: number | null,
  requestAdvice: (prompt: string) => Promise<string>,
  { authHeaders, jsonHeaders }: UseBloodPressureOptions = {}
) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<BloodPressureFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<BloodPressureRecord[]>([]);

  useEffect(() => {
    if (!authHeaders || userId == null) {
      setHistory([]);
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        const response = await fetch(apiUrl("/pressure"), { headers: authHeaders });
        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : [];

        if (!response.ok) {
          const message = extractErrorMessage(
            response.status,
            payload,
            t("common.requestError", { status: response.status })
          );
          if (!cancelled) {
            setError(message);
          }
          return;
        }

        const records = Array.isArray(payload)
          ? payload
              .map(normalizeApiRecord)
              .filter((entry): entry is BloodPressureRecord => entry !== null)
          : [];

        if (!cancelled) {
          setError(null);
          setHistory(records);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : t("common.requestError", { status: 500 });
          setError(message);
        }
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
    setError(null);
    setHistory([]);
  }, []);

  const normalizedMetrics = useMemo(() => {
    const systolic = form.systolic.trim();
    const diastolic = form.diastolic.trim();
    const pulse = form.pulse.trim();
    const allProvided = systolic !== "" && diastolic !== "" && pulse !== "";
    return {
      systolic,
      diastolic,
      pulse,
      allProvided,
      parsed: {
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        pulse: Number(pulse)
      }
    };
  }, [form.diastolic, form.pulse, form.systolic]);

  const persistRecord = useCallback(
    async (payload: { systolic: number; diastolic: number; pulse: number; advice?: string }) => {
      if (!jsonHeaders) {
        throw new Error(t("common.loginRequired"));
      }

      const response = await fetch(apiUrl("/pressure"), {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          systolic: payload.systolic,
          diastolic: payload.diastolic,
          pulse: payload.pulse,
          measured_at: formatDateTime(new Date()),
          advice: payload.advice ?? null
        })
      });

      const raw = await response.text();
      const data = raw ? JSON.parse(raw) : null;

      if (!response.ok) {
        const message = extractErrorMessage(
          response.status,
          data,
          t("common.requestError", { status: response.status })
        );
        throw new Error(message);
      }

      const record = normalizeApiRecord(data);
      if (!record) {
        throw new Error(t("common.requestError", { status: response.status }));
      }

      return record;
    },
    [jsonHeaders, t]
  );

  const saveRecord = useCallback(async () => {
    if (!normalizedMetrics.allProvided) {
      setError(t("bpPrompt.saveError"));
      return;
    }

    if (
      Number.isNaN(normalizedMetrics.parsed.systolic) ||
      Number.isNaN(normalizedMetrics.parsed.diastolic) ||
      Number.isNaN(normalizedMetrics.parsed.pulse)
    ) {
      setError(t("bpPrompt.saveError"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const persisted = await persistRecord({
        systolic: normalizedMetrics.parsed.systolic,
        diastolic: normalizedMetrics.parsed.diastolic,
        pulse: normalizedMetrics.parsed.pulse,
        advice: ""
      });

      const record: BloodPressureRecord = {
        ...persisted,
        question: form.question.trim(),
        comment: form.comment.trim(),
        advice: ""
      };

      setHistory(prev => [record, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.requestError", { status: 500 }));
    } finally {
      setLoading(false);
    }
  }, [form.comment, form.question, normalizedMetrics, persistRecord, t]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!normalizedMetrics.allProvided) {
        setError(t("bpPrompt.saveError"));
        return;
      }
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
        const persisted = await persistRecord({
          systolic: normalizedMetrics.parsed.systolic,
          diastolic: normalizedMetrics.parsed.diastolic,
          pulse: normalizedMetrics.parsed.pulse,
          advice: reply
        });
        const record: BloodPressureRecord = {
          ...persisted,
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
    [
      form,
      normalizedMetrics.allProvided,
      normalizedMetrics.parsed.diastolic,
      normalizedMetrics.parsed.pulse,
      normalizedMetrics.parsed.systolic,
      persistRecord,
      requestAdvice,
      t
    ]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      if (!authHeaders) {
        setHistory(prev => prev.filter(entry => entry.id !== id));
        return;
      }

      try {
        const response = await fetch(apiUrl(`/pressure/${encodeURIComponent(id)}`), {
          method: "DELETE",
          headers: authHeaders
        });
        const raw = await response.text();
        const payload = raw ? JSON.parse(raw) : null;

        if (!response.ok) {
          const message = extractErrorMessage(
            response.status,
            payload,
            t("common.requestError", { status: response.status })
          );
          setError(message);
          return;
        }

        setHistory(prev => prev.filter(entry => entry.id !== id));
      } catch (err) {
        const message = err instanceof Error ? err.message : t("common.requestError", { status: 500 });
        setError(message);
      }
    },
    [authHeaders, t]
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
    removeRecord
  };
};
