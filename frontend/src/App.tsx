import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent, SVGProps } from "react";
import { observer } from "mobx-react-lite";
import { useTranslation } from "./i18n";
import { userStore } from "./stores/user";
import type { TabKey } from "./types/forms";
import { AuthPanel } from "./features/auth/AuthPanel";
import { TabNavigation, type TabItem } from "./components/TabNavigation";
import { useBloodPressureFeature } from "./features/blood-pressure/useBloodPressureFeature";
import { BloodPressureTab } from "./features/blood-pressure/BloodPressureTab";
import { useLipidFeature } from "./features/lipid/useLipidFeature";
import { LipidTab } from "./features/lipid/LipidTab";
import { useNutritionFeature } from "./features/nutrition/useNutritionFeature";
import { NutritionTab } from "./features/nutrition/NutritionTab";
import { useAssistantChat } from "./features/assistant/useAssistantChat";
import { AssistantTab } from "./features/assistant/AssistantTab";
import { SettingsDialog } from "./features/settings/SettingsDialog";
import { useSettingsState, type SettingsTabKey } from "./features/settings/useSettingsState";
import { useBillingControls } from "./features/settings/useBillingControls";
import { requestAssistantPrompt } from "./lib/assistant";
import { LanguageSelector } from "./components/LanguageSelector";
import "./App.css";

const SettingsIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 0 0 2.572-1.065z" />
    <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
  </svg>
);

const LogoutIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15" />
    <path d="M12 9l3 3-3 3m3-3H9" />
  </svg>
);

const App = observer(() => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("bp");
  const { t } = useTranslation();

  const tabItems: TabItem[] = useMemo(
    () => [
      { key: "bp", label: t("tabs.bp") },
      { key: "lipid", label: t("tabs.lipid") },
      { key: "nutrition", label: t("tabs.nutrition") },
      { key: "assistant", label: t("tabs.assistant") }
    ],
    [t]
  );

  const jsonHeaders = useMemo(() => {
    if (!userStore.token) return undefined;
    return {
      Authorization: `Bearer ${userStore.token}`,
      "Content-Type": "application/json"
    } as Record<string, string>;
  }, [userStore.token]);

  const userId = userStore.me?.id ?? null;
  const billing = userStore.billing;
  const billingError = userStore.billingError;
  const balanceLabel = billing ? `${billing.balance} ${billing.currency}` : "—";

  const { adviceEnabled, adviceDisabledReason, assistantEnabled, assistantDisabledReason } = useMemo(() => {
    if (!billing) {
      return {
        adviceEnabled: false,
        adviceDisabledReason: t("billing.loading"),
        assistantEnabled: false,
        assistantDisabledReason: t("billing.loading"),
      };
    }
    const balanceCents = billing.balance_cents;
    const remainingCents = billing.ai_usage.remaining_cents;
    const adviceCost = billing.costs.advice_cents;
    const assistantCost = billing.costs.assistant_cents;

    let adviceReason: string | null = null;
    if (!billing.features.advice) {
      adviceReason = t("billing.adviceNotIncluded");
    } else if (balanceCents < adviceCost) {
      adviceReason = t("billing.insufficientBalance");
    } else if (remainingCents < adviceCost) {
      adviceReason = t("billing.monthlyLimitReached");
    }

    let assistantReason: string | null = null;
    if (!billing.features.assistant) {
      assistantReason = t("billing.assistantNotIncluded");
    } else if (balanceCents < assistantCost) {
      assistantReason = t("billing.insufficientBalance");
    } else if (remainingCents < assistantCost) {
      assistantReason = t("billing.monthlyLimitReached");
    }

    return {
      adviceEnabled: adviceReason === null,
      adviceDisabledReason: adviceReason,
      assistantEnabled: assistantReason === null,
      assistantDisabledReason: assistantReason,
    };
  }, [billing, t]);

  const requestAdvice = useCallback(
    async (prompt: string) => {
      if (!jsonHeaders) {
        throw new Error(t("common.loginRequired"));
      }
      if (!adviceEnabled) {
        throw new Error(adviceDisabledReason ?? t("common.aiAdviceUnavailable"));
      }
      const reply = await requestAssistantPrompt(jsonHeaders, prompt);
      await userStore.refresh();
      return reply;
    },
    [adviceDisabledReason, adviceEnabled, jsonHeaders, t, userStore]
  );

  const {
    form: bpForm,
    advice: bpAdvice,
    loading: bpLoading,
    error: bpError,
    history: bpHistory,
    updateField: updateBpField,
    saveRecord: saveBpRecord,
    submit: submitBp,
    reset: resetBp
  } = useBloodPressureFeature(userId, requestAdvice);

  const {
    form: lipidForm,
    advice: lipidAdvice,
    loading: lipidLoading,
    error: lipidError,
    history: lipidHistory,
    updateField: updateLipidField,
    saveRecord: saveLipidRecord,
    submit: submitLipid,
    reset: resetLipid
  } = useLipidFeature(userId, requestAdvice);

  const nutritionDefaults = useMemo(
    () => ({
      weight: userStore.targets?.weight_kg ?? null,
      height: userStore.targets?.height_cm ?? null,
      calories: userStore.targets?.kcal_goal ?? null,
      activity: userStore.targets?.activity ?? null
    }),
    [
      userStore.targets?.weight_kg,
      userStore.targets?.height_cm,
      userStore.targets?.kcal_goal,
      userStore.targets?.activity
    ]
  );

  const {
    form: nutritionForm,
    advice: nutritionAdvice,
    loading: nutritionLoading,
    error: nutritionError,
    history: nutritionHistory,
    updateField: updateNutritionField,
    submit: submitNutrition,
    reset: resetNutrition
  } = useNutritionFeature(userId, requestAdvice, nutritionDefaults);

  const {
    messages: assistantMessages,
    input: assistantInput,
    loading: assistantLoading,
    error: assistantError,
    handleInputChange: handleAssistantInput,
    submit: submitAssistant,
    reset: resetAssistant
  } = useAssistantChat(
    userStore.token,
    jsonHeaders,
    assistantEnabled,
    assistantDisabledReason,
    async () => {
      await userStore.refresh();
    }
  );

  const {
    open: settingsOpen,
    form: settingsForm,
    saving: settingsSaving,
    error: settingsError,
    success: settingsSuccess,
    activeTab: settingsActiveTab,
    openDialog: openSettings,
    closeDialog: closeSettings,
    handleFieldChange: handleSettingsField,
    submit: submitSettings,
    reset: resetSettings,
    setActiveTab: setSettingsActiveTab
  } = useSettingsState(userStore, jsonHeaders);

  const {
    depositAmount,
    depositLoading,
    depositError,
    depositSuccess,
    setDepositAmount,
    submitDeposit,
    selectedPlan,
    setSelectedPlan,
    planLoading,
    planError,
    planSuccess,
    submitPlanChange,
    resetFlags: resetBillingFlags
  } = useBillingControls(userStore, jsonHeaders);

  const resetAll = useCallback(() => {
    setActiveTab("bp");
    resetBp();
    resetLipid();
    resetNutrition();
    resetAssistant();
    resetSettings();
    resetBillingFlags();
  }, [resetAssistant, resetBillingFlags, resetBp, resetLipid, resetNutrition, resetSettings]);

  const handleOpenSettings = useCallback(
    (event?: ReactMouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
      resetBillingFlags();
      openSettings(event);
    },
    [openSettings, resetBillingFlags]
  );

  const handleCloseSettings = useCallback(() => {
    resetBillingFlags();
    closeSettings();
  }, [closeSettings, resetBillingFlags]);

  const handleSettingsTabSelect = useCallback(
    (tab: SettingsTabKey) => {
      if (tab === "billing") {
        resetBillingFlags();
        if (billing?.plan) {
          setSelectedPlan(billing.plan);
        }
      }
      setSettingsActiveTab(tab);
    },
    [billing?.plan, resetBillingFlags, setSelectedPlan, setSettingsActiveTab]
  );

  const handleReloadBilling = useCallback(() => {
    void userStore.refresh();
  }, []);

  useEffect(() => {
    if (userStore.token) {
      setActiveTab("bp");
      if (!userStore.me) {
        void userStore.refresh();
      }
    } else {
      resetAll();
    }
  }, [resetAll, userStore.me, userStore.token]);

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (mode === "login") {
        await userStore.login(email, password);
      } else {
        await userStore.register(email, password);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!userStore.token) {
    return (
      <AuthPanel
        mode={mode}
        email={email}
        password={password}
        showPassword={showPassword}
        error={userStore.error}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onTogglePassword={() => setShowPassword(prev => !prev)}
        onSwitchMode={() => setMode(prev => (prev === "login" ? "register" : "login"))}
        onSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="app-shell text-slate-900">
      <header className="topbar rounded-2xl bg-white/70 px-4 py-3 shadow-sm backdrop-blur md:px-6 md:py-4">
        <div className="brand">
          <h1>CholestoFit</h1>
          <p>{t("common.tagline")}</p>
        </div>
        <div className="topbar-profile">
          <div className="topbar-profile-text">
            <span className="topbar-profile-label">{t("common.account")}</span>
            <span className="topbar-profile-email">{userStore.me?.email ?? email}</span>
            <span className="topbar-profile-meta">{t("common.balanceLabel")}: {balanceLabel}</span>
          </div>
          <div className="topbar-actions">
            <LanguageSelector className="topbar-language" />
            <button
              className="ghost topbar-icon-button"
              onClick={handleOpenSettings}
              type="button"
              aria-label={t("common.openSettings")}
              title={t("common.settings")}
            >
              <SettingsIcon className="topbar-icon" />
            </button>
            <button
              className="ghost topbar-icon-button"
              type="button"
              onClick={() => userStore.logout()}
              aria-label={t("common.logoutTitle")}
              title={t("common.logout")}
            >
              <LogoutIcon className="topbar-icon" />
            </button>
          </div>
        </div>
      </header>
      <main className="content pb-6 md:pb-8">
        <div className="tab-container">
          {activeTab === "bp" && (
            <BloodPressureTab
              form={bpForm}
              advice={bpAdvice}
              loading={bpLoading}
              error={bpError}
              disabled={!adviceEnabled}
              disabledReason={adviceDisabledReason}
              history={bpHistory}
              onFieldChange={updateBpField}
              onSubmit={submitBp}
              onSave={saveBpRecord}
            />
          )}
          {activeTab === "lipid" && (
            <LipidTab
              form={lipidForm}
              advice={lipidAdvice}
              loading={lipidLoading}
              error={lipidError}
              disabled={!adviceEnabled}
              disabledReason={adviceDisabledReason}
              history={lipidHistory}
              onFieldChange={updateLipidField}
              onSubmit={submitLipid}
              onSave={saveLipidRecord}
            />
          )}
          {activeTab === "nutrition" && (
            <NutritionTab
              form={nutritionForm}
              advice={nutritionAdvice}
              loading={nutritionLoading}
              error={nutritionError}
              disabled={!adviceEnabled}
              disabledReason={adviceDisabledReason}
              history={nutritionHistory}
              onFieldChange={updateNutritionField}
              onSubmit={submitNutrition}
            />
          )}
          {activeTab === "assistant" && (
            <AssistantTab
              messages={assistantMessages}
              input={assistantInput}
              loading={assistantLoading}
              error={assistantError}
              disabled={!assistantEnabled}
              disabledReason={assistantDisabledReason}
              onInputChange={handleAssistantInput}
              onSubmit={submitAssistant}
              onReset={resetAssistant}
            />
          )}
        </div>
      </main>
      <SettingsDialog
        open={settingsOpen}
        form={settingsForm}
        saving={settingsSaving}
        error={settingsError}
        success={settingsSuccess}
        billing={billing ?? null}
        billingError={billingError ?? null}
        depositAmount={depositAmount}
        depositLoading={depositLoading}
        depositError={depositError}
        depositSuccess={depositSuccess}
        onDepositAmountChange={value => setDepositAmount(value)}
        onDepositSubmit={submitDeposit}
        selectedPlan={selectedPlan}
        onSelectPlan={value => setSelectedPlan(value)}
        planLoading={planLoading}
        planError={planError}
        planSuccess={planSuccess}
        onPlanSubmit={submitPlanChange}
        activeTab={settingsActiveTab}
        onSelectTab={handleSettingsTabSelect}
        onReloadBilling={handleReloadBilling}
        onClose={handleCloseSettings}
        onSubmit={submitSettings}
        onFieldChange={handleSettingsField}
      />
      <TabNavigation
        items={tabItems}
        activeTab={activeTab}
        onSelect={setActiveTab}
        className="border border-white/60 bg-white/80 shadow-2xl backdrop-blur md:bottom-8"
      />
    </div>
  );
});

export default App;
