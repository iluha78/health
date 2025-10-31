import type { ChangeEvent, FormEvent } from "react";
import { useTranslation } from "../../i18n";
import { formatDateTime } from "../../lib/datetime";
import type { NutritionFormState, NutritionRecord } from "../../types/forms";
import type { NutritionPhotoAnalysis } from "../../lib/nutrition";

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
  photoFile: File | null;
  photoPreview: string | null;
  photoResult: NutritionPhotoAnalysis | null;
  photoError: string | null;
  photoLoading: boolean;
  photoDebug: string[];
  onPhotoChange: (file: File | null) => void;
  onPhotoClear: () => void;
  onPhotoAnalyze: () => void;
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
  onSubmit,
  photoFile,
  photoPreview,
  photoResult,
  photoError,
  photoLoading,
  photoDebug,
  onPhotoChange,
  onPhotoClear,
  onPhotoAnalyze
}: NutritionTabProps) => {
  const { t } = useTranslation();

  const handlePhotoInput = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    onPhotoChange(nextFile);
    event.target.value = "";
  };

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
        <label className="photo-upload">
          {t("nutrition.photo.uploadLabel")}
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoInput}
            disabled={disabled || photoLoading}
          />
          <span className="photo-hint">{t("nutrition.photo.hint")}</span>
        </label>
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
