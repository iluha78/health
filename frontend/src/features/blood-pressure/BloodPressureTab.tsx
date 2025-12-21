import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../lib/datetime";
import { BLOOD_PRESSURE_RANGES, getMetricTagClassName } from "../../lib/metrics";
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



const TrashIcon = ({ size = 25, className = "" }) => (
    <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
    >
      {/* оставил только нужный path (без мусора-обвязки) */}
      <path d="M14.2792,2 C15.1401,2 15.9044,2.55086 16.1766,3.36754 L16.7208,5 L20,5 C20.5523,5 21,5.44772 21,6 C21,6.55227 20.5523,6.99998 20,7 L19.9975,7.07125 L19.1301,19.2137 C19.018,20.7837 17.7117,22 16.1378,22 L7.86224,22 C6.28832,22 4.982,20.7837 4.86986,19.2137 L4.00254,7.07125 C4.00083,7.04735 3.99998,7.02359 3.99996,7 C3.44769,6.99998 3,6.55227 3,6 C3,5.44772 3.44772,5 4,5 L7.27924,5 L7.82339,3.36754 C8.09562,2.55086 8.8599,2 9.72076,2 L14.2792,2 Z M17.9975,7 L6.00255,7 L6.86478,19.0712 C6.90216,19.5946 7.3376,20 7.86224,20 L16.1378,20 C16.6624,20 17.0978,19.5946 17.1352,19.0712 L17.9975,7 Z M10,10 C10.51285,10 10.9355092,10.386027 10.9932725,10.8833761 L11,11 L11,16 C11,16.5523 10.5523,17 10,17 C9.48715929,17 9.06449214,16.613973 9.00672766,16.1166239 L9,16 L9,11 C9,10.4477 9.44771,10 10,10 Z M14,10 C14.5523,10 15,10.4477 15,11 L15,16 C15,16.5523 14.5523,17 14,17 C13.4477,17 13,16.5523 13,16 L13,11 C13,10.4477 13.4477,10 14,10 Z M14.2792,4 L9.72076,4 L9.38743,5 L14.6126,5 L14.2792,4 Z" />
    </svg>
);

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
                    <a
                        type="button"
                        className=" small"
                        onClick={() => onDeleteRecord(entry.id)}
                    >
                      <TrashIcon className="trashIcon" />
                    </a>

                    <div className="metric-tags">
                      {entry.systolic && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.systolic, BLOOD_PRESSURE_RANGES.systolic)}`}
                          >
                            <span className="opacity-70">{t("bp.metrics.systolic")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.systolic}</span>
                          </div>
                      )}
                      {entry.diastolic && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.diastolic, BLOOD_PRESSURE_RANGES.diastolic)}`}
                          >
                            <span className="opacity-70">{t("bp.metrics.diastolic")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.diastolic}</span>
                          </div>
                      )}
                      {entry.pulse && (
                          <div
                              className={`flex flex-col items-center 
                              ${getMetricTagClassName(entry.pulse, BLOOD_PRESSURE_RANGES.pulse)}`}
                          >
                            <span className="opacity-70">{t("bp.metrics.pulse")}</span>
                            <span className="text-2xl font-bold leading-none">{entry.pulse}</span>
                          </div>
                      )}
                    </div>
                  </div>
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
