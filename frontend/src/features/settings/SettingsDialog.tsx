import { useEffect, useState, type FormEvent } from "react";
import type { BillingStatus } from "../../types/api";
import type { SettingsFormState } from "../../types/forms";
import type { SettingsTabKey } from "./useSettingsState";

export type SettingsDialogProps = {
  open: boolean;
  form: SettingsFormState;
  saving: boolean;
  error: string | null;
  success: boolean;
  billing: BillingStatus | null;
  depositAmount: string;
  depositLoading: boolean;
  depositError: string | null;
  depositSuccess: boolean;
  onDepositAmountChange: (value: string) => void;
  onDepositSubmit: () => void;
  selectedPlan: string;
  onSelectPlan: (plan: string) => void;
  planLoading: boolean;
  planError: string | null;
  planSuccess: boolean;
  onPlanSubmit: () => void;
  activeTab: SettingsTabKey;
  onSelectTab: (tab: SettingsTabKey) => void;
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
  billing,
  depositAmount,
  depositLoading,
  depositError,
  depositSuccess,
  onDepositAmountChange,
  onDepositSubmit,
  selectedPlan,
  onSelectPlan,
  planLoading,
  planError,
  planSuccess,
  onPlanSubmit,
  activeTab,
  onSelectTab,
  onClose,
  onSubmit,
  onFieldChange
}: SettingsDialogProps) => {
  const formatCents = (value: number) => (value / 100).toFixed(2);
  const [showPlanSelector, setShowPlanSelector] = useState(false);

  useEffect(() => {
    if (!open) {
      setShowPlanSelector(false);
    }
  }, [open]);

  useEffect(() => {
    if (activeTab !== "billing") {
      setShowPlanSelector(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (planSuccess) {
      setShowPlanSelector(false);
    }
  }, [planSuccess]);

  if (!open) return null;

  const planDescription = billing
    ? billing.features.assistant
      ? "Полный доступ к AI-ассистенту и персональным советам."
      : billing.features.advice
        ? "Персональные AI-советы доступны, ассистент отключён."
        : "AI-инструменты в этом тарифе недоступны."
    : "Загрузка информации о тарифе...";

  const handlePlanToggle = () => {
    setShowPlanSelector(prev => {
      const next = !prev;
      if (next && billing?.plan) {
        onSelectPlan(billing.plan);
      }
      return next;
    });
  };

  const handleDepositSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onDepositSubmit();
  };
  const handlePlanSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onPlanSubmit();
  };
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
        <div className="settings-tabs" role="tablist" aria-label="Настройки">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            className={`settings-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => onSelectTab("profile")}
          >
            Профиль
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "billing"}
            className={`settings-tab ${activeTab === "billing" ? "active" : ""}`}
            onClick={() => onSelectTab("billing")}
          >
            Тариф
          </button>
        </div>
        {activeTab === "profile" && (
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
        )}
        {activeTab === "billing" && billing && (
          <section className="billing-section" aria-live="polite">
            <div className="billing-summary">
              <div className="billing-summary-card">
                <span className="billing-label">Текущий тариф</span>
                <strong>{billing.plan_label}</strong>
                <p className="muted">Месячный платёж: ${formatCents(billing.monthly_fee_cents)}</p>
                <p className="billing-plan-description">{planDescription}</p>
                <ul className="plan-features">
                  <li>{billing.features.advice ? "AI-советы доступны" : "AI-советы недоступны"}</li>
                  <li>{billing.features.assistant ? "AI-ассистент доступен" : "AI-ассистент недоступен"}</li>
                </ul>
                <div className="billing-plan-actions">
                  <button type="button" className="ghost" onClick={handlePlanToggle}>
                    {showPlanSelector ? "Скрыть тарифы" : "Сменить тариф"}
                  </button>
                  {planSuccess && <p className="success">Тариф обновлен</p>}
                  {planError && !showPlanSelector && <p className="error">{planError}</p>}
                </div>
              </div>
              <div className="billing-summary-card">
                <span className="billing-label">Баланс</span>
                <strong>
                  {billing.balance} {billing.currency}
                </strong>
                <p className="muted">
                  Расходы AI в этом месяце: ${formatCents(billing.ai_usage.spent_cents)} из ${formatCents(billing.ai_usage.budget_cents)}
                </p>
              </div>
            </div>
            {showPlanSelector && (
              <form className="billing-form" onSubmit={handlePlanSubmit}>
                <h4>Выберите подходящий тариф</h4>
                <div className="plan-options">
                  {billing.plans.map(plan => (
                    <label key={plan.code} className={`plan-option ${selectedPlan === plan.code ? "active" : ""}`}>
                      <input
                        type="radio"
                        name="plan"
                        value={plan.code}
                        checked={selectedPlan === plan.code}
                        onChange={() => onSelectPlan(plan.code)}
                      />
                      <div className="plan-option-body">
                        <div className="plan-option-header">
                          <span className="plan-name">{plan.label}</span>
                          <span className="plan-price">${formatCents(plan.monthly_fee_cents)}</span>
                        </div>
                        <ul className="plan-features">
                          <li>{plan.features.advice ? "AI-советы доступны" : "AI-советы недоступны"}</li>
                          <li>{plan.features.assistant ? "AI-ассистент доступен" : "AI-ассистент недоступен"}</li>
                        </ul>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="submit" disabled={planLoading}>
                  {planLoading ? "Обновляем..." : "Сохранить тариф"}
                </button>
                {planError && <p className="error">{planError}</p>}
              </form>
            )}
            <form className="billing-form" onSubmit={handleDepositSubmit}>
              <h4>Пополнить баланс</h4>
              <label>
                Сумма, USD
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={depositAmount}
                  onChange={event => onDepositAmountChange(event.target.value)}
                />
              </label>
              <button type="submit" disabled={depositLoading}>
                {depositLoading ? "Пополняем..." : "Пополнить"}
              </button>
              {depositError && <p className="error">{depositError}</p>}
              {depositSuccess && <p className="success">Баланс пополнен</p>}
            </form>
            <p className="muted billing-note">
              Лимит расходов на AI — ${formatCents(billing.ai_usage.budget_cents)} в месяц. Один совет стоит ${formatCents(billing.costs.advice_cents)}, обращение к ассистенту — ${formatCents(billing.costs.assistant_cents)}.
            </p>
          </section>
        )}
        {activeTab === "billing" && !billing && (
          <div className="billing-section loading">
            <p className="muted">Информация о тарифе загружается...</p>
          </div>
        )}
      </div>
    </div>
  );
};
