import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../lib/datetime";
import type { NutritionFormState, NutritionRecord } from "../../types/forms";

export type NutritionTabProps = {
  form: NutritionFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  disabledReason: string | null;
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
  disabled,
  disabledReason,
  history,
  onFieldChange,
  onSubmit
}: NutritionTabProps) => {
  const { t } = useTranslation();

  return (
    <div className="tab-panel tab-stack">
      <h2>{t("nutrition.title")}</h2>
      <form className="card form-card" onSubmit={onSubmit}>
        {disabled && <p className="error">{disabledReason ?? t("nutrition.disabled")}</p>}
        <div className="metrics-grid">
          <label>
            {t("nutrition.weight")}
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.weight}
              onChange={handleChange("weight", onFieldChange)}
            />
          </label>
          <label>
            {t("nutrition.height")}
            <input type="number" min="0" value={form.height} onChange={handleChange("height", onFieldChange)} />
          </label>
          <label>
            {t("nutrition.calories")}
            <input type="number" min="0" value={form.calories} onChange={handleChange("calories", onFieldChange)} />
          </label>
          <label>
            {t("nutrition.activity")}
            <input
              placeholder={t("nutrition.activityPlaceholder")}
              value={form.activity}
              onChange={handleChange("activity", onFieldChange)}
            />
          </label>
        </div>
        <label>
          {t("nutrition.question")}
          <textarea
            placeholder={t("nutrition.questionPlaceholder")}
            value={form.question}
            onChange={handleChange("question", onFieldChange)}
          />
        </label>
        <label>
          {t("nutrition.comment")}
          <textarea
            placeholder={t("nutrition.commentPlaceholder")}
            value={form.comment}
            onChange={handleChange("comment", onFieldChange)}
          />
        </label>
        <div className="form-actions">
          <button type="submit" disabled={loading || disabled}>
            {loading ? t("nutrition.loading") : t("nutrition.submit")}
          </button>
          {!disabled && error && <p className="error">{error}</p>}
        </div>
      </form>
      {advice && (
        <article className="card advice-result form-card">
          <h3>{t("nutrition.adviceTitle")}</h3>
          <pre className="advice-text">{advice}</pre>
        </article>
      )}
      {history.length > 0 && (
        <details className="card history-card form-card" open>
          <summary>{t("nutrition.historyTitle")}</summary>
          <ul className="history-list">
            {history.map(entry => (
              <li key={entry.id} className="history-item">
                <div className="history-meta">
                  <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                  <div className="metric-tags">
                    {entry.weight && <span className="metric-tag">{t("nutrition.metrics.weight", { value: entry.weight })}</span>}
                    {entry.height && <span className="metric-tag">{t("nutrition.metrics.height", { value: entry.height })}</span>}
                    {entry.calories && <span className="metric-tag">{t("nutrition.metrics.calories", { value: entry.calories })}</span>}
                    {entry.activity && <span className="metric-tag">{t("nutrition.metrics.activity", { value: entry.activity })}</span>}
                  </div>
                </div>
                {entry.question && (
                  <p className="history-question">
                    <strong>{t("nutrition.metrics.question")}</strong> {entry.question}
                  </p>
                )}
                {entry.comment && (
                  <p className="history-comment">
                    <strong>{t("nutrition.metrics.comment")}</strong> {entry.comment}
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
};
