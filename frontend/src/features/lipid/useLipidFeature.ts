import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { apiUrl } from "../../lib/api";
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

type HeadersShape = Record<string, string> | undefined;

type UseLipidOptions = {
  authHeaders?: HeadersShape;
  jsonHeaders?: HeadersShape;
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

const formatFromDate = (value: Date): string =>
  [
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}`
  ].join(" ");

const formatDateForApi = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return formatFromDate(new Date());
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return `${trimmed} 00:00:00`;
  }

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatFromDate(parsed);
  }

  return trimmed;
};

const normalizeDate = (value: unknown): string => {
  if (typeof value !== "string") {
    return new Date().toISOString();
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return new Date().toISOString();
  }

  const normalized = trimmed.replace(" ", "T");
  const parsed = new Date(normalized);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00`).toISOString();
  }

  return new Date().toISOString();
};

const normalizeApiRecord = (value: unknown): LipidRecord | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const dt = typeof value.dt === "string" ? value.dt : "";
  const datePart = dt.includes(" ") ? dt.split(" ")[0] : dt;

  return {
    id: typeof id === "number" || typeof id === "string" ? String(id) : createRecordId(),
    createdAt: normalizeDate(dt || value.created_at || value.updated_at),
    date: datePart,
    cholesterol: normalizeMetric(value.chol),
    hdl: normalizeMetric(value.hdl),
    ldl: normalizeMetric(value.ldl),
    triglycerides: normalizeMetric(value.trig),
    glucose: normalizeMetric(value.glucose),
    question: "",
    comment: typeof value.note === "string" ? value.note : "",
    advice: typeof value.advice === "string" ? value.advice : ""
  } satisfies LipidRecord;
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

type ParsedMetrics = {
  chol: number | null;
  hdl: number | null;
  ldl: number | null;
  trig: number | null;
  glucose: number | null;
};

const parseInputMetric = (value: string): { value: number | null; valid: boolean } => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { value: null, valid: true };
  }

  const normalized = trimmed.replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return { value: null, valid: false };
  }

  return { value: parsed, valid: true };
};

export const useLipidFeature = (
  userId: number | null,
  requestAdvice: (prompt: string) => Promise<string>,
  { authHeaders, jsonHeaders }: UseLipidOptions = {}
) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<LipidFormState>(DEFAULT_FORM);
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<LipidRecord[]>([]);

  useEffect(() => {
    if (authHeaders && userId != null) {
      let cancelled = false;

      const loadHistory = async () => {
        try {
          const response = await fetch(apiUrl("/lipids"), { headers: authHeaders });
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
                .filter((entry): entry is LipidRecord => entry !== null)
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

      setHistory([]);
      void loadHistory();

      return () => {
        cancelled = true;
      };
    }

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
  }, [authHeaders, t, userId]);

  useEffect(() => {
    if (authHeaders && userId != null) {
      return;
    }
    writeArchive("lipid", userId, history);
  }, [authHeaders, history, userId]);

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

  const normalizedMetrics = useMemo(() => {
    const chol = parseInputMetric(form.cholesterol);
    const hdl = parseInputMetric(form.hdl);
    const ldl = parseInputMetric(form.ldl);
    const trig = parseInputMetric(form.triglycerides);
    const glucose = parseInputMetric(form.glucose);

    const parsed: ParsedMetrics = {
      chol: chol.value,
      hdl: hdl.value,
      ldl: ldl.value,
      trig: trig.value,
      glucose: glucose.value
    };

    const anyProvided = Object.values(parsed).some(value => value !== null);
    const invalid = !chol.valid || !hdl.valid || !ldl.valid || !trig.valid || !glucose.valid;
    const date = form.date.trim();

    return {
      parsed,
      anyProvided,
      invalid,
      hasDate: date.length > 0,
      date
    };
  }, [
    form.cholesterol,
    form.date,
    form.glucose,
    form.hdl,
    form.ldl,
    form.triglycerides
  ]);

  const persistRecord = useCallback(
    async (payload: {
      dt: string;
      metrics: ParsedMetrics;
      note: string | null;
      advice: string | null;
    }): Promise<LipidRecord> => {
      if (!jsonHeaders) {
        throw new Error(t("common.loginRequired"));
      }

      const response = await fetch(apiUrl("/lipids"), {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({
          dt: payload.dt,
          chol: payload.metrics.chol,
          hdl: payload.metrics.hdl,
          ldl: payload.metrics.ldl,
          trig: payload.metrics.trig,
          glucose: payload.metrics.glucose,
          note: payload.note ?? null,
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

  const saveRecord = useCallback(() => {
    const run = async () => {
      if (!normalizedMetrics.hasDate || !normalizedMetrics.anyProvided || normalizedMetrics.invalid) {
        setError(t("lipidPrompt.saveError"));
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const persisted = await persistRecord({
          dt: formatDateForApi(normalizedMetrics.date),
          metrics: normalizedMetrics.parsed,
          note: form.comment.trim() ? form.comment.trim() : null,
          advice: null
        });

        const record: LipidRecord = {
          ...persisted,
          question: form.question.trim(),
          comment: form.comment.trim(),
          advice: persisted.advice
        };

        setHistory(prev => [record, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("common.requestError", { status: 500 }));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [form.comment, form.question, normalizedMetrics, persistRecord, t]);

  const submit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!normalizedMetrics.hasDate || !normalizedMetrics.anyProvided || normalizedMetrics.invalid) {
        setError(t("lipidPrompt.saveError"));
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const metrics: string[] = [];
        if (form.date) metrics.push(t("lipidPrompt.metrics.date", { value: form.date }));
        if (form.cholesterol)
          metrics.push(t("lipidPrompt.metrics.cholesterol", { value: form.cholesterol }));
        if (form.hdl) metrics.push(t("lipidPrompt.metrics.hdl", { value: form.hdl }));
        if (form.ldl) metrics.push(t("lipidPrompt.metrics.ldl", { value: form.ldl }));
        if (form.triglycerides)
          metrics.push(t("lipidPrompt.metrics.triglycerides", { value: form.triglycerides }));
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
        const persisted = await persistRecord({
          dt: formatDateForApi(normalizedMetrics.date),
          metrics: normalizedMetrics.parsed,
          note: form.comment.trim() ? form.comment.trim() : null,
          advice: reply.trim() ? reply : null
        });
        const record: LipidRecord = {
          ...persisted,
          question: form.question.trim(),
          comment: form.comment.trim(),
          advice: persisted.advice.trim() ? persisted.advice : reply
        };
        setHistory(prev => [record, ...prev]);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("lipidPrompt.submitError"));
        setAdvice("");
      } finally {
        setLoading(false);
      }
    },
    [
      form,
      normalizedMetrics,
      persistRecord,
      requestAdvice,
      t
    ]
  );

  const removeRecord = useCallback(
    async (id: string) => {
      if (!authHeaders || userId == null) {
        setHistory(prev => prev.filter(entry => entry.id !== id));
        return;
      }

      try {
        const response = await fetch(apiUrl(`/lipids/${encodeURIComponent(id)}`), {
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
    [authHeaders, t, userId]
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
