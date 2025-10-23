import type { ChangeEvent, FormEvent } from "react";
import { formatDateTime } from "../../lib/datetime";
import type { LipidFormState, LipidRecord } from "../../types/forms";

export type LipidTabProps = {
  form: LipidFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  history: LipidRecord[];
  onFieldChange: (key: keyof LipidFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave: () => void;
};

const handleChange = (key: keyof LipidFormState, handler: LipidTabProps["onFieldChange"]) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handler(key, event.target.value);

export const LipidTab = ({
  form,
  advice,
  loading,
  error,
  history,
  onFieldChange,
  onSubmit,
  onSave
}: LipidTabProps) => (
  <div className="tab-panel tab-stack">
    <h2>Липидный профиль и сахар</h2>
    <form className="card form-card" onSubmit={onSubmit}>
      <div className="metrics-grid">
        <label>
          Дата анализа
          <input type="date" value={form.date} onChange={handleChange("date", onFieldChange)} />
        </label>
        <label>
          Общий холестерин, ммоль/л
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.cholesterol}
            onChange={handleChange("cholesterol", onFieldChange)}
          />
        </label>
        <label>
          Холестерин ЛПВП (HDL), ммоль/л
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.hdl}
            onChange={handleChange("hdl", onFieldChange)}
          />
        </label>
        <label>
          Холестерин ЛПНП (LDL), ммоль/л
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.ldl}
            onChange={handleChange("ldl", onFieldChange)}
          />
        </label>
        <label>
          Триглицериды, ммоль/л
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.triglycerides}
            onChange={handleChange("triglycerides", onFieldChange)}
          />
        </label>
        <label>
          Уровень сахара (глюкоза), ммоль/л
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.glucose}
            onChange={handleChange("glucose", onFieldChange)}
          />
        </label>
      </div>
      <label>
        Что ещё важно уточнить?
        <textarea
          placeholder="Например: принимаю статины и хочу понять, что добавить в рацион"
          value={form.question}
          onChange={handleChange("question", onFieldChange)}
        />
      </label>
      <label>
        Комментарий к анализу
        <textarea
          placeholder="Например: сдавал анализ после курса терапии"
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
        <summary>Архив липидов и сахара</summary>
        <ul className="history-list">
          {history.map(entry => (
            <li key={entry.id} className="history-item">
              <div className="history-meta">
                <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                <div className="metric-tags">
                  {entry.date && <span className="metric-tag">Дата анализа: {entry.date}</span>}
                  {entry.cholesterol && <span className="metric-tag">Общий холестерин: {entry.cholesterol}</span>}
                  {entry.hdl && <span className="metric-tag">ЛПВП: {entry.hdl}</span>}
                  {entry.ldl && <span className="metric-tag">ЛНП: {entry.ldl}</span>}
                  {entry.triglycerides && <span className="metric-tag">Триглицериды: {entry.triglycerides}</span>}
                  {entry.glucose && <span className="metric-tag">Глюкоза: {entry.glucose}</span>}
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
