import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../lib/datetime";
import type { BloodPressureFormState, BloodPressureRecord } from "../../types/forms";

export type BloodPressureTabProps = {
  form: BloodPressureFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  disabledReason: string | null;
  history: BloodPressureRecord[];
  onFieldChange: (key: keyof BloodPressureFormState, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave: () => void;
  onDeleteRecord: (id: string) => void;
};

const handleChange = (
  key: keyof BloodPressureFormState,
  handler: BloodPressureTabProps["onFieldChange"]
) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handler(key, event.target.value);

const handleCheckboxChange = (
  key: keyof BloodPressureFormState,
  handler: BloodPressureTabProps["onFieldChange"]
) =>
  (event: ChangeEvent<HTMLInputElement>) => handler(key, event.target.checked);

export const BloodPressureTab = ({
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
}: BloodPressureTabProps) => {
  const { t } = useTranslation();

  return (
    <div className="tab-panel tab-stack">
      <h2>{t("bp.title")}</h2>
      <form className="card form-card" onSubmit={onSubmit}>
        {disabled && <p className="error">{disabledReason ?? t("bp.disabled")}</p>}
        <div className="metrics-grid">
          <label>
            {t("bp.systolic")}
            <input type="number" value={form.systolic} onChange={handleChange("systolic", onFieldChange)} />
          </label>
          <label>
            {t("bp.diastolic")}
            <input type="number" value={form.diastolic} onChange={handleChange("diastolic", onFieldChange)} />
          </label>
          <label>
            {t("bp.pulse")}
            <input type="number" value={form.pulse} onChange={handleChange("pulse", onFieldChange)} />
          </label>
        </div>
        <label>
          {t("bp.concern")}
          <textarea
            placeholder={t("bp.concernPlaceholder")}
            value={form.question}
            onChange={handleChange("question", onFieldChange)}
          />
        </label>
        <label>
          {t("bp.comment")}
          <textarea
            placeholder={t("bp.commentPlaceholder")}
            value={form.comment}
            onChange={handleChange("comment", onFieldChange)}
          />
        </label>
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={form.compareWithPrevious}
            onChange={handleCheckboxChange("compareWithPrevious", onFieldChange)}
          />
          <span>
            <span className="form-checkbox-title">{t("bp.compareWithPrevious")}</span>
            <span className="form-checkbox-description">{t("bp.compareWithPreviousHelp")}</span>
          </span>
        </label>
        <div className="form-actions">
          <button type="button" className="ghost" onClick={onSave} disabled={loading}>
            {t("bp.save")}
          </button>
          <button type="submit" disabled={loading || disabled}>
            {loading ? t("bp.loading") : t("bp.submit")}
          </button>
          {!disabled && error && <p className="error">{error}</p>}
        </div>
      </form>
      {advice && (
        <article className="card advice-result form-card">
          <h3>{t("bp.adviceTitle")}</h3>
          <pre className="advice-text">{advice}</pre>
        </article>
      )}
      {history.length > 0 && (
        <details className="card history-card form-card">
          <summary>{t("bp.historyTitle")}</summary>
          <ul className="history-list">
            {history.map(entry => (
              <li key={entry.id} className="history-item">
                <div className="history-header">
                  <div className="history-meta">
                    <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                    <div className="metric-tags">
                      {entry.systolic && (
                        <span className="metric-tag">{t("bp.metrics.systolic", { value: entry.systolic })}</span>
                      )}
                      {entry.diastolic && (
                        <span className="metric-tag">{t("bp.metrics.diastolic", { value: entry.diastolic })}</span>
                      )}
                      {entry.pulse && <span className="metric-tag">{t("bp.metrics.pulse", { value: entry.pulse })}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ghost small"
                    onClick={() => onDeleteRecord(entry.id)}
                  >
                    {t("bp.historyRemove")}
                  </button>
                </div>
                {entry.question && (
                  <p className="history-question">
                    <strong>{t("bp.question")}:</strong> {entry.question}
                  </p>
                )}
                {entry.comment && (
                  <p className="history-comment">
                    <strong>{t("bp.commentLabel")}:</strong> {entry.comment}
                  </p>
                )}
                {entry.advice && (
                  <details className="history-advice-collapsible">
                    <summary>
                      <span className="history-advice-toggle-closed">
                        {t("bp.historyAdviceShow")}
                      </span>
                      <span className="history-advice-toggle-open">
                        {t("bp.historyAdviceHide")}
                      </span>
                    </summary>
                    <pre className="history-advice">{entry.advice}</pre>
                  </details>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
};
