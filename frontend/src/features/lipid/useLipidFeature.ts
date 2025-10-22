import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
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
      setError("Укажите хотя бы один показатель, чтобы сохранить запись");
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
        if (form.date) metrics.push(`дата анализа ${form.date}`);
        if (form.cholesterol) metrics.push(`общий холестерин ${form.cholesterol} ммоль/л`);
        if (form.hdl) metrics.push(`ЛПВП ${form.hdl} ммоль/л`);
        if (form.ldl) metrics.push(`ЛПНП ${form.ldl} ммоль/л`);
        if (form.triglycerides) metrics.push(`триглицериды ${form.triglycerides} ммоль/л`);
        if (form.glucose) metrics.push(`глюкоза крови ${form.glucose} ммоль/л`);
        if (form.comment) metrics.push(`комментарий: ${form.comment}`);
        const prompt = [
          "Ты — врач профилактической медицины и эндокринолог.",
          metrics.length > 0
            ? `Актуальные показатели пациента: ${metrics.join(", ")}.`
            : "Пациент не указал текущие показатели.",
          "Дай рекомендации, как поддерживать липидный профиль и уровень сахара в безопасных пределах.",
          "Составь план из нескольких пунктов: питание, активность, контроль образа жизни и когда нужно обратиться к врачу.",
          form.question ? `Дополнительный вопрос пациента: ${form.question}.` : ""
        ]
          .filter(Boolean)
          .join(" ");
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
