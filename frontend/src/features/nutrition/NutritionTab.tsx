import { useId } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../lib/datetime";
import type {
  NutritionFormState,
  NutritionPhotoRecord,
  NutritionRecord
} from "../../types/forms";
import type { NutritionPhotoAnalysis } from "../../lib/nutrition";

export type NutritionTabProps = {
  form: NutritionFormState;
  advice: string;
  loading: boolean;
  error: string | null;
  disabled: boolean;
  disabledReason: string | null;
  history: NutritionRecord[];
  photoHistory: NutritionPhotoRecord[];
  onFieldChange: (key: keyof NutritionFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  photoFile: File | null;
  photoPreview: string | null;
  photoResult: NutritionPhotoAnalysis | null;
  photoError: string | null;
  photoLoading: boolean;
  photoDebug: string[];
  photoDescription: string;
  onPhotoChange: (file: File | null) => void;
  onPhotoClear: () => void;
  onPhotoDescriptionChange: (value: string) => void;
  onPhotoAnalyze: () => void;
  onPhotoHistoryRemove: (id: string) => void;
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
  photoHistory,
  onFieldChange,
  onSubmit,
  photoFile,
  photoPreview,
  photoResult,
  photoError,
  photoLoading,
  photoDebug,
  photoDescription,
  onPhotoChange,
  onPhotoClear,
  onPhotoDescriptionChange,
  onPhotoAnalyze,
  onPhotoHistoryRemove
}: NutritionTabProps) => {
  const { t } = useTranslation();
  const photoInputId = useId();
  const uploadDisabled = disabled || photoLoading;

  const handlePhotoInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    onPhotoChange(nextFile);
    event.target.value = "";
  };


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
  const caloriesText = photoResult?.calories != null
    ? t("nutrition.photo.calories", { value: Math.round(photoResult.calories) })
    : null;

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
      <section className="card form-card nutrition-photo-card">
        <h3>{t("nutrition.photo.title")}</h3>
        <p className="muted">{t("nutrition.photo.subtitle")}</p>
        <div className="photo-upload">
          <label
            htmlFor={photoInputId}
            className={`photo-upload-button${uploadDisabled ? " disabled" : ""}`}
            aria-disabled={uploadDisabled}
          >
            {t("nutrition.photo.uploadLabel")}
          </label>
          <input
            id={photoInputId}
            type="file"
            accept="image/*"
            onChange={handlePhotoInput}
            disabled={uploadDisabled}
          />
          <span className="photo-hint">{t("nutrition.photo.hint")}</span>
        </div>
        {photoPreview && (
          <div className="photo-preview-wrapper">
            <img src={photoPreview} alt={t("nutrition.photo.previewAlt")} className="photo-preview" />
            <div className="photo-meta">
              {photoFile && <p className="photo-name">{photoFile.name}</p>}
              <button
                type="button"
                className="ghost small"
                onClick={onPhotoClear}
                disabled={photoLoading}
              >
                {t("nutrition.photo.remove")}
              </button>
            </div>
          </div>
        )}
        <div className="photo-actions">
          <button
            type="button"
            onClick={onPhotoAnalyze}
            disabled={disabled || photoLoading || !photoFile}
          >
            {photoLoading ? t("nutrition.photo.analyzing") : t("nutrition.photo.analyze")}
          </button>
        </div>
        <label>
          {t("nutrition.photo.descriptionLabel")}
          <textarea
            placeholder={t("nutrition.photo.descriptionPlaceholder")}
            value={photoDescription}
            onChange={event => onPhotoDescriptionChange(event.target.value)}
            disabled={disabled || photoLoading}
          />
        </label>
        {photoError && <p className="error">{photoError}</p>}
        {photoDebug.length > 0 && (
          <details className="photo-debug" open>
            <summary>{t("nutrition.photo.debugTitle")}</summary>
            <ul>
              {photoDebug.map((entry, index) => (
                <li key={`${entry}-${index}`}>
                  <code>{entry}</code>
                </li>
              ))}
            </ul>
          </details>
        )}
        {photoResult && (
          <div className="photo-result">
            {caloriesText && <p className="photo-calories">{caloriesText}</p>}
            {photoResult.confidence && (
              <p className="photo-confidence">{t("nutrition.photo.confidence", { value: photoResult.confidence })}</p>
            )}
            {photoResult.notes && (
              <div className="photo-notes">
                <h4>{t("nutrition.photo.notesTitle")}</h4>
                <p>{photoResult.notes}</p>
              </div>
            )}
            {photoDescription && (
              <div className="photo-description">
                <h4>{t("nutrition.photo.descriptionTitle")}</h4>
                <p>{photoDescription}</p>
              </div>
            )}
            {photoResult.ingredients.length > 0 && (
              <div className="photo-ingredients">
                <h4>{t("nutrition.photo.ingredientsTitle")}</h4>
                <ul>
                  {photoResult.ingredients.map(item => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
      {photoHistory.length > 0 && (
        <details className="card form-card photo-history">
          <summary>{t("nutrition.photo.historyTitle")}</summary>
          <ul className="history-list">
            {photoHistory.map(entry => {
              const calories =
                entry.calories != null
                  ? t("nutrition.photo.calories", { value: Math.round(entry.calories) })
                  : t("nutrition.photo.caloriesUnknown");
              return (
                <li key={entry.id} className="history-item">
                  <header className="history-header">
                    <div className="history-meta">
                      <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                      <a
                          type="button"
                          className="small"
                          onClick={() => onPhotoHistoryRemove(entry.id)}
                      >
                        <TrashIcon className="trashIcon" />

                      </a>
                    </div>

                  </header>
                  <p className="photo-history-calories">{calories}</p>
                  {entry.confidence && (
                    <p className="photo-history-confidence">
                      {t("nutrition.photo.confidence", { value: entry.confidence })}
                    </p>
                  )}
                  {entry.notes && (
                    <div className="photo-history-notes">
                      <h4>{t("nutrition.photo.notesTitle")}</h4>
                      <p>{entry.notes}</p>
                    </div>
                  )}
                  {entry.description && (
                    <div className="photo-history-description">
                      <h4>{t("nutrition.photo.descriptionTitle")}</h4>
                      <p>{entry.description}</p>
                    </div>
                  )}
                  {entry.ingredients.length > 0 && (
                    <div className="photo-history-ingredients">
                      <h4>{t("nutrition.photo.ingredientsTitle")}</h4>
                      <ul>
                        {entry.ingredients.map(item => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
      {advice && (
        <article className="card advice-result form-card">
          <h3>{t("nutrition.adviceTitle")}</h3>
          <pre className="advice-text">{advice}</pre>
        </article>
      )}
      {history.length > 0 && (
        <details className="card history-card form-card">
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
