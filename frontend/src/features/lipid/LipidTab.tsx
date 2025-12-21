import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../lib/datetime";
import {LIPID_RANGES, getMetricTagClassName, BLOOD_PRESSURE_RANGES} from "../../lib/metrics";
import type { LipidFormState, LipidRecord } from "../../types/forms";

export type LipidTabProps = {
  form: LipidFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  disabledReason: string | null;
  history: LipidRecord[];
  onFieldChange: (key: keyof LipidFormState, value: string | boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSave: () => void;
  onDeleteRecord: (id: string) => void;
};

const handleChange = (key: keyof LipidFormState, handler: LipidTabProps["onFieldChange"]) =>
  (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handler(key, event.target.value);

const handleCheckboxChange = (key: keyof LipidFormState, handler: LipidTabProps["onFieldChange"]) =>
  (event: ChangeEvent<HTMLInputElement>) => handler(key, event.target.checked);

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
              step="0.01"
              min="0"
              value={form.cholesterol}
              onChange={handleChange("cholesterol", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.hdl")}
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.hdl}
              onChange={handleChange("hdl", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.ldl")}
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.ldl}
              onChange={handleChange("ldl", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.triglycerides")}
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.triglycerides}
              onChange={handleChange("triglycerides", onFieldChange)}
            />
          </label>
          <label>
            {t("lipid.glucose")}
            <input
              type="number"
              step="0.01"
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
        <label className="form-checkbox">
          <input
            type="checkbox"
            checked={form.compareWithPrevious}
            onChange={handleCheckboxChange("compareWithPrevious", onFieldChange)}
          />
          <span>
            <span className="form-checkbox-title">{t("lipid.compareWithPrevious")}</span>
            <span className="form-checkbox-description">{t("lipid.compareWithPreviousHelp")}</span>
          </span>
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
        <details className="card history-card form-card">
          <summary>{t("lipid.historyTitle")}</summary>
          <ul className="history-list">
            {history.map(entry => (
              <li key={entry.id} className="history-item">
                <div className="history-header">
                  <div className="history-meta">
                    <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                    <div className="metric-tags">
                      {entry.cholesterol && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.cholesterol, LIPID_RANGES.cholesterol)}`}
                          >
                            <span className="opacity-70">{t("lipid.metrics.cholesterol")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.cholesterol}</span>
                          </div>
                      )}
                      {entry.hdl && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.hdl, LIPID_RANGES.hdl)}`}
                          >
                            <span className="opacity-70">{t("lipid.metrics.hdl")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.hdl}</span>
                          </div>
                      )}
                      {entry.ldl && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.ldl, LIPID_RANGES.ldl)}`}
                          >
                            <span className="opacity-70">{t("lipid.metrics.ldl")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.ldl}</span>
                          </div>
                      )}
                      {entry.triglycerides && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.triglycerides, LIPID_RANGES.triglycerides)}`}
                          >
                            <span className="opacity-70">{t("lipid.metrics.triglycerides")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.triglycerides}</span>
                          </div>
                      )}
                      {entry.glucose && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.glucose, LIPID_RANGES.glucose)}`}
                          >
                            <span className="opacity-70">{t("lipid.metrics.glucose")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.glucose}</span>
                          </div>

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
                {entry.advice && (
                  <details className="history-advice-collapsible">
                    <summary>
                      <span className="history-advice-toggle-closed">
                        {t("lipid.historyAdviceShow")}
                      </span>
                      <span className="history-advice-toggle-open">
                        {t("lipid.historyAdviceHide")}
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
