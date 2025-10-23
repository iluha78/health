import type { ChangeEvent, FormEvent } from "react";
import { formatDateTime } from "../../lib/datetime";
import type { BloodPressureFormState, BloodPressureRecord } from "../../types/forms";

export type BloodPressureTabProps = {
  form: BloodPressureFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  history: BloodPressureRecord[];
  onFieldChange: (key: keyof BloodPressureFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave: () => void;
};

const handleChange = (
  key: keyof BloodPressureFormState,
  handler: BloodPressureTabProps["onFieldChange"]
) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handler(key, event.target.value);

export const BloodPressureTab = ({
  form,
  advice,
  loading,
  error,
  history,
  onFieldChange,
  onSubmit,
  onSave
}: BloodPressureTabProps) => (
  <div className="tab-panel tab-stack">
    <h2>Давление и пульс</h2>
    <form className="card form-card" onSubmit={onSubmit}>
      <div className="metrics-grid">
        <label>
          Систолическое давление, мм рт. ст.
          <input type="number" value={form.systolic} onChange={handleChange("systolic", onFieldChange)} />
        </label>
        <label>
          Диастолическое давление, мм рт. ст.
          <input type="number" value={form.diastolic} onChange={handleChange("diastolic", onFieldChange)} />
        </label>
        <label>
          Пульс, уд/мин
          <input type="number" value={form.pulse} onChange={handleChange("pulse", onFieldChange)} />
        </label>
      </div>
      <label>
        Что вас беспокоит?
        <textarea
          placeholder="Например: скачет давление вечером"
          value={form.question}
          onChange={handleChange("question", onFieldChange)}
        />
      </label>
      <label>
        Комментарий к измерению
        <textarea
          placeholder="Дополнительные примечания"
          value={form.comment}
          onChange={handleChange("comment", onFieldChange)}
        />
      </label>
      <div className="form-actions">
        <button type="button" className="ghost" onClick={onSave} disabled={loading}>
          Сохранить показатели
        </button>
        <button type="submit" disabled={loading}>
          {loading ? "Запрашиваем рекомендации..." : "Получить советы"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    </form>
    {advice && (
      <article className="card advice-result form-card">
        <h3>Рекомендации</h3>
        <pre className="advice-text">{advice}</pre>
      </article>
    )}
    {history.length > 0 && (
      <details className="card history-card form-card" open>
        <summary>Архив давления и пульса</summary>
        <ul className="history-list">
          {history.map(entry => (
            <li key={entry.id} className="history-item">
              <div className="history-meta">
                <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                <div className="metric-tags">
                  {entry.systolic && <span className="metric-tag">Систолическое: {entry.systolic}</span>}
                  {entry.diastolic && <span className="metric-tag">Диастолическое: {entry.diastolic}</span>}
                  {entry.pulse && <span className="metric-tag">Пульс: {entry.pulse}</span>}
                </div>
              </div>
              {entry.question && (
                <p className="history-question">
                  <strong>Вопрос:</strong> {entry.question}
                </p>
              )}
              {entry.comment && (
                <p className="history-comment">
                  <strong>Комментарий:</strong> {entry.comment}
                </p>
              )}
              {entry.advice && <pre className="history-advice">{entry.advice}</pre>}
            </li>
          ))}
        </ul>
      </details>
    )}
  </div>
);
