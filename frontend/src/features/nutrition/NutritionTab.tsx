import type { ChangeEvent, FormEvent } from "react";
import { formatDateTime } from "../../lib/datetime";
import type { NutritionFormState, NutritionRecord } from "../../types/forms";

export type NutritionTabProps = {
  form: NutritionFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  history: NutritionRecord[];
  onFieldChange: (key: keyof NutritionFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const handleChange = (key: keyof NutritionFormState, handler: NutritionTabProps["onFieldChange"]) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handler(key, event.target.value);

export const NutritionTab = ({
  form,
  advice,
  loading,
  error,
  history,
  onFieldChange,
  onSubmit
}: NutritionTabProps) => (
  <div className="tab-panel tab-stack">
    <h2>Консультация нутрициолога</h2>
    <form className="card form-card" onSubmit={onSubmit}>
      <div className="metrics-grid">
        <label>
          Вес, кг
          <input
            type="number"
            min="0"
            step="0.1"
            value={form.weight}
            onChange={handleChange("weight", onFieldChange)}
          />
        </label>
        <label>
          Рост, см
          <input type="number" min="0" value={form.height} onChange={handleChange("height", onFieldChange)} />
        </label>
        <label>
          Калорийность рациона, ккал
          <input type="number" min="0" value={form.calories} onChange={handleChange("calories", onFieldChange)} />
        </label>
        <label>
          Активность
          <input
            placeholder="Например: 2 тренировки в неделю"
            value={form.activity}
            onChange={handleChange("activity", onFieldChange)}
          />
        </label>
      </div>
      <label>
        Опишите цель или вопрос
        <textarea
          placeholder="Например: хочу снизить вес без жестких диет"
          value={form.question}
          onChange={handleChange("question", onFieldChange)}
        />
      </label>
      <label>
        Комментарий к измерениям
        <textarea
          placeholder="Дополнительные примечания: как чувствовали себя, что ели"
          value={form.comment}
          onChange={handleChange("comment", onFieldChange)}
        />
      </label>
      <div className="form-actions">
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
        <summary>Архив нутрициолога</summary>
        <ul className="history-list">
          {history.map(entry => (
            <li key={entry.id} className="history-item">
              <div className="history-meta">
                <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                <div className="metric-tags">
                  {entry.weight && <span className="metric-tag">Вес: {entry.weight} кг</span>}
                  {entry.height && <span className="metric-tag">Рост: {entry.height} см</span>}
                  {entry.calories && <span className="metric-tag">Калории: {entry.calories}</span>}
                  {entry.activity && <span className="metric-tag">Активность: {entry.activity}</span>}
                </div>
              </div>
              {entry.question && (
                <p className="history-question">
                  <strong>Запрос:</strong> {entry.question}
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
