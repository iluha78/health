import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "../../i18n";
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
  billingError: string | null;
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
  onReloadBilling: () => void;
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
  billingError,
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
  onReloadBilling,
  onClose,
  onSubmit,
  onFieldChange
}: SettingsDialogProps) => {
  const { t } = useTranslation();
  const formatCents = (value: number) => (value / 100).toFixed(2);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const activityOptions = useMemo(
    () => [
      { value: "", label: t("settingsActivity.none") },
      { value: "sed", label: t("settingsActivity.sedentary") },
      { value: "light", label: t("settingsActivity.light") },
      { value: "mod", label: t("settingsActivity.moderate") },
      { value: "high", label: t("settingsActivity.high") },
      { value: "ath", label: t("settingsActivity.athletic") }
    ],
    [t]
  );

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
      ? t("settingsDialog.fullAccess")
      : billing.features.advice
        ? t("settingsDialog.adviceOnly")
        : t("settingsDialog.noAi")
    : t("settingsDialog.loading");

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
            <h2>{t("settings.title")}</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            {t("settings.close")}
          </button>
        </div>
        <div className="settings-tabs" role="tablist" aria-label={t("settings.tabsLabel")}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "profile"}
            className={`settings-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => onSelectTab("profile")}
          >
            {t("settings.profileTab")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "billing"}
            className={`settings-tab ${activeTab === "billing" ? "active" : ""}`}
            onClick={() => onSelectTab("billing")}
          >
            {t("settings.billingTab")}
          </button>
        </div>
        {activeTab === "profile" && (
          <form className="settings-form" onSubmit={onSubmit}>
            <div className="settings-grid">
              <label>
                {t("settings.gender")}
                <select value={form.sex} onChange={event => onFieldChange("sex", event.target.value)}>
                  <option value="">{t("settings.genderNotSpecified")}</option>
                  <option value="male">{t("settings.genderMale")}</option>
                  <option value="female">{t("settings.genderFemale")}</option>
                </select>
              </label>
              <label>
                {t("settings.age")}
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.age}
                  onChange={event => onFieldChange("age", event.target.value)}
                />
              </label>
              <label>
                {t("settings.height")}
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.height}
                  onChange={event => onFieldChange("height", event.target.value)}
                />
              </label>
              <label>
                {t("settings.weight")}
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
                {t("settings.activity")}
                <select value={form.activity} onChange={event => onFieldChange("activity", event.target.value)}>
                  {activityOptions.map(option => (
                    <option key={option.value || "none"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("settings.calories")}
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.kcalGoal}
                  onChange={event => onFieldChange("kcalGoal", event.target.value)}
                />
              </label>
              <label>
                {t("settings.satFat")}
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={form.sfaLimit}
                  onChange={event => onFieldChange("sfaLimit", event.target.value)}
                />
              </label>
              <label>
                {t("settings.fiber")}
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
                {saving ? t("settings.saving") : t("settings.save")}
              </button>
              {error && <p className="error">{error}</p>}
              {success && <p className="success">{t("settings.success")}</p>}
            </div>
          </form>
        )}
        {activeTab === "billing" && billing && (
          <section className="billing-section" aria-live="polite">
            <div className="billing-summary">
              <div className="billing-summary-card">
                <span className="billing-label">{t("settings.planLabel")}</span>
                <strong>{billing.plan_label}</strong>
                <p className="muted">{t("settings.monthlyFee", { amount: formatCents(billing.monthly_fee_cents) })}</p>
                <p className="billing-plan-description">{planDescription}</p>
                <ul className="plan-features">
                  <li>
                    {billing.features.advice
                      ? t("settings.adviceAvailable")
                      : t("settings.adviceUnavailable")}
                  </li>
                  <li>
                    {billing.features.assistant
                      ? t("settings.assistantAvailable")
                      : t("settings.assistantUnavailable")}
                  </li>
                </ul>
                <div className="billing-plan-actions">
                  <button type="button" className="ghost" onClick={handlePlanToggle}>
                    {showPlanSelector ? t("settings.togglePlansShow") : t("settings.togglePlansHide")}
                  </button>
                  {planSuccess && <p className="success">{t("settings.planUpdated")}</p>}
                  {planError && !showPlanSelector && <p className="error">{planError}</p>}
                </div>
              </div>
              <div className="billing-summary-card">
                <span className="billing-label">{t("common.balanceLabel")}</span>
                <strong>
                  {billing.balance} {billing.currency}
                </strong>
                <p className="muted">
                  {t("billing.aiSpent", {
                    used: billing.ai_usage.used_requests,
                    limit: billing.ai_usage.limit_requests
                  })}
                </p>
              </div>
            </div>
            {showPlanSelector && (
              <form className="billing-form" onSubmit={handlePlanSubmit}>
                <h4>{t("settings.plansTitle")}</h4>
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
                          <li>
                            {plan.features.advice
                              ? t("settings.adviceAvailable")
                              : t("settings.adviceUnavailable")}
                          </li>
                          <li>
                            {plan.features.assistant
                              ? t("settings.assistantAvailable")
                              : t("settings.assistantUnavailable")}
                          </li>
                        </ul>
                      </div>
                    </label>
                  ))}
                </div>
                <button type="submit" disabled={planLoading}>
                  {planLoading ? t("settings.planSaving") : t("settings.planSave")}
                </button>
                {planError && <p className="error">{planError}</p>}
              </form>
            )}
            <form className="billing-form" onSubmit={handleDepositSubmit}>
              <h4>{t("settings.depositTitle")}</h4>
              <label>
                {t("settings.depositAmount")}
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
                {depositLoading ? t("settings.depositSubmitting") : t("settings.depositSubmit")}
              </button>
              {depositError && <p className="error">{depositError}</p>}
              {depositSuccess && <p className="success">{t("settings.depositSuccess")}</p>}
            </form>
            <p className="muted billing-note">
              {t("billing.aiCosts", {
                limit: billing.ai_usage.limit_requests
              })}
            </p>
          </section>
        )}
        {activeTab === "billing" && !billing && (
          <div className="billing-section loading">
            <p className={billingError ? "error" : "muted"}>
              {billingError ?? t("settingsDialog.errorFallback")}
            </p>
            {billingError && (
              <button type="button" className="ghost" onClick={onReloadBilling}>
                {t("common.retry")}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
