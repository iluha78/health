import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../lib/datetime";
import type { LipidFormState, LipidRecord } from "../../types/forms";

export type LipidTabProps = {
  form: LipidFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  disabledReason: string | null;
  history: LipidRecord[];
  onFieldChange: (key: keyof LipidFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave: () => void;
  onDeleteRecord: (id: string) => void;
};

const handleChange = (key: keyof LipidFormState, handler: LipidTabProps["onFieldChange"]) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handler(key, event.target.value);

export const LipidTab = ({
  form,
  advice,
  loading,
  error,
  disabled,
  disabledReason,
  history,
  onFieldChange,
  onSubmit,
  onSave,
  onDeleteRecord
}: LipidTabProps) => {
  const { t } = useTranslation();

  return (
    <div className="tab-panel tab-stack">
      <h2>{t("lipid.title")}</h2>
      <form className="card form-card" onSubmit={onSubmit}>
        {disabled && <p className="error">{disabledReason ?? t("lipid.disabled")}</p>}
        <div className="metrics-grid">
          <label>
            {t("lipid.date")}
            <input type="date" value={form.date} onChange={handleChange("date", onFieldChange)} />
          </label>
          <label>
            {t("lipid.cholesterol")}
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.cholesterol}
              onChange={handleChange("cholesterol", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.hdl")}
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.hdl}
              onChange={handleChange("hdl", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.ldl")}
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.ldl}
              onChange={handleChange("ldl", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.triglycerides")}
            <input
              type="number"
              step="0.1"
              min="0"
              value={form.triglycerides}
              onChange={handleChange("triglycerides", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.glucose")}
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
          {t("lipid.question")}
          <textarea
            placeholder={t("lipid.questionPlaceholder")}
            value={form.question}
            onChange={handleChange("question", onFieldChange)}
          />
        </label>
        <label>
          {t("lipid.comment")}
          <textarea
            placeholder={t("lipid.commentPlaceholder")}
            value={form.comment}
            onChange={handleChange("comment", onFieldChange)}
          />
        </label>
        <div className="form-actions">
          <button type="button" className="ghost" onClick={onSave} disabled={loading}>
            {t("lipid.save")}
          </button>
          <button type="submit" disabled={loading || disabled}>
            {loading ? t("lipid.loading") : t("lipid.submit")}
          </button>
          {!disabled && error && <p className="error">{error}</p>}
        </div>
      </form>
      {advice && (
        <article className="card advice-result form-card">
          <h3>{t("lipid.adviceTitle")}</h3>
          <pre className="advice-text">{advice}</pre>
        </article>
      )}
      {history.length > 0 && (
        <details className="card history-card form-card" open>
          <summary>{t("lipid.historyTitle")}</summary>
          <ul className="history-list">
            {history.map(entry => (
              <li key={entry.id} className="history-item">
                <div className="history-header">
                  <div className="history-meta">
                    <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                    <div className="metric-tags">
                      {entry.date && <span className="metric-tag">{t("lipid.metrics.date", { value: entry.date })}</span>}
                      {entry.cholesterol && (
                        <span className="metric-tag">{t("lipid.metrics.cholesterol", { value: entry.cholesterol })}</span>
                      )}
                      {entry.hdl && <span className="metric-tag">{t("lipid.metrics.hdl", { value: entry.hdl })}</span>}
                      {entry.ldl && <span className="metric-tag">{t("lipid.metrics.ldl", { value: entry.ldl })}</span>}
                      {entry.triglycerides && (
                        <span className="metric-tag">{t("lipid.metrics.triglycerides", { value: entry.triglycerides })}</span>
                      )}
                      {entry.glucose && (
                        <span className="metric-tag">{t("lipid.metrics.glucose", { value: entry.glucose })}</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => onDeleteRecord(entry.id)}
                  >
                    {t("lipid.historyRemove")}
                  </button>
                </div>
                {entry.question && (
                  <p className="history-question">
                    <strong>{t("lipid.questionLabel")}:</strong> {entry.question}
                  </p>
                )}
                {entry.comment && (
                  <p className="history-comment">
                    <strong>{t("lipid.commentLabel")}:</strong> {entry.comment}
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
