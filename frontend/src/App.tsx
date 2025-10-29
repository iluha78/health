import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, MouseEvent as ReactMouseEvent } from "react";
import { observer } from "mobx-react-lite";
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
import { useSettingsState } from "./features/settings/useSettingsState";
import { useBillingControls } from "./features/settings/useBillingControls";
import { requestAssistantPrompt } from "./lib/assistant";
import "./App.css";

const TAB_ITEMS: TabItem[] = [
  { key: "bp", label: "Давление и пульс" },
  { key: "lipid", label: "Липидный профиль и сахар" },
  { key: "nutrition", label: "Нутрициолог" },
  { key: "assistant", label: "AI ассистент" }
];

const App = observer(() => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("bp");

  const jsonHeaders = useMemo(() => {
    if (!userStore.token) return undefined;
    return {
      Authorization: `Bearer ${userStore.token}`,
      "Content-Type": "application/json"
    } as Record<string, string>;
  }, [userStore.token]);

  const userId = userStore.me?.id ?? null;
  const billing = userStore.billing;

  const { adviceEnabled, adviceDisabledReason, assistantEnabled, assistantDisabledReason } = useMemo(() => {
    if (!billing) {
      return {
        adviceEnabled: false,
        adviceDisabledReason: "Загрузка данных тарифа...",
        assistantEnabled: false,
        assistantDisabledReason: "Загрузка данных тарифа...",
      };
    }
    const balanceCents = billing.balance_cents;
    const remainingCents = billing.ai_usage.remaining_cents;
    const adviceCost = billing.costs.advice_cents;
    const assistantCost = billing.costs.assistant_cents;

    let adviceReason: string | null = null;
    if (!billing.features.advice) {
      adviceReason = "Ваш тариф не включает AI-советы.";
    } else if (balanceCents < adviceCost) {
      adviceReason = "Недостаточно средств на балансе.";
    } else if (remainingCents < adviceCost) {
      adviceReason = "Достигнут месячный лимит расходов на AI.";
    }

    let assistantReason: string | null = null;
    if (!billing.features.assistant) {
      assistantReason = "Ваш тариф не включает AI-ассистента.";
    } else if (balanceCents < assistantCost) {
      assistantReason = "Недостаточно средств на балансе.";
    } else if (remainingCents < assistantCost) {
      assistantReason = "Достигнут месячный лимит расходов на AI.";
    }

    return {
      adviceEnabled: adviceReason === null,
      adviceDisabledReason: adviceReason,
      assistantEnabled: assistantReason === null,
      assistantDisabledReason: assistantReason,
    };
  }, [billing]);

  const requestAdvice = useCallback(
    async (prompt: string) => {
      if (!jsonHeaders) {
        throw new Error("Необходимо войти в систему");
      }
      if (!adviceEnabled) {
        throw new Error(adviceDisabledReason ?? "AI-советы недоступны");
      }
      const reply = await requestAssistantPrompt(jsonHeaders, prompt);
      await userStore.refresh();
      return reply;
    },
    [adviceDisabledReason, adviceEnabled, jsonHeaders, userStore]
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
    openDialog: openSettings,
    closeDialog: closeSettings,
    handleFieldChange: handleSettingsField,
    submit: submitSettings,
    reset: resetSettings
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
          <p>Персональные рекомендации по здоровью</p>
        </div>
        <div className="topbar-profile">
          <div className="topbar-profile-text">
            <span className="topbar-profile-label">Аккаунт</span>
            <span className="topbar-profile-email">{userStore.me?.email ?? email}</span>
            <span className="topbar-profile-meta">
              Тариф: {billing?.plan_label ?? "—"} · Баланс: ${billing?.balance ?? "0.00"}
            </span>
          </div>
          <button className="button ghost" onClick={handleOpenSettings}>
            Настройки
          </button>
          <button className="ghost" type="button" onClick={() => userStore.logout()}>
            Выйти
          </button>
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
        onClose={handleCloseSettings}
        onSubmit={submitSettings}
        onFieldChange={handleSettingsField}
      />
      <TabNavigation
        items={TAB_ITEMS}
        activeTab={activeTab}
        onSelect={setActiveTab}
        className="border border-white/60 bg-white/80 shadow-2xl backdrop-blur md:bottom-8"
      />
    </div>
  );
});

export default App;
