import type { FormEvent } from "react";
import type { SettingsFormState } from "../../types/forms";

export type SettingsDialogProps = {
  open: boolean;
  form: SettingsFormState;
  saving: boolean;
  error: string | null;
  success: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onFieldChange: <TKey extends keyof SettingsFormState>(key: TKey, value: string) => void;
};

export const SettingsDialog = ({
  open,
  form,
  saving,
  error,
  success,
  onClose,
  onSubmit,
  onFieldChange
}: SettingsDialogProps) => {
  if (!open) return null;
  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="card settings-card">
        <div className="settings-header">
          <div className="settings-heading">
            <h2>Цели и профиль</h2>
            <p>CholestoFit — ваш персональный помощник по здоровью сердца</p>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Закрыть
          </button>
        </div>
        <form className="settings-form" onSubmit={onSubmit}>
          <div className="settings-grid">
            <label>
              Пол
              <select value={form.sex} onChange={event => onFieldChange("sex", event.target.value)}>
                <option value="">Не указан</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </label>
            <label>
              Возраст
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.age}
                onChange={event => onFieldChange("age", event.target.value)}
              />
            </label>
            <label>
              Рост (см)
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.height}
                onChange={event => onFieldChange("height", event.target.value)}
              />
            </label>
            <label>
              Вес (кг)
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={form.weight}
                onChange={event => onFieldChange("weight", event.target.value)}
              />
            </label>
            <label>
              Активность
              <select value={form.activity} onChange={event => onFieldChange("activity", event.target.value)}>
                <option value="">Не выбрано</option>
                <option value="Сидячая">Сидячая</option>
                <option value="Лёгкая">Лёгкая</option>
                <option value="Умеренная">Умеренная</option>
                <option value="Высокая">Высокая</option>
              </select>
            </label>
            <label>
              Цель по калориям, ккал
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.kcalGoal}
                onChange={event => onFieldChange("kcalGoal", event.target.value)}
              />
            </label>
            <label>
              Лимит насыщенных жиров, г
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.sfaLimit}
                onChange={event => onFieldChange("sfaLimit", event.target.value)}
              />
            </label>
            <label>
              Цель по клетчатке, г
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={form.fiberGoal}
                onChange={event => onFieldChange("fiberGoal", event.target.value)}
              />
            </label>
          </div>
          <div className="settings-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
            {error && <p className="error">{error}</p>}
            {success && <p className="success">Профиль обновлен</p>}
          </div>
        </form>
      </div>
    </div>
  );
};
