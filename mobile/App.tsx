import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";

const TOKEN_STORAGE_KEY = "cholestofit_token";

const resolveApiBaseUrl = (): string => {
  const extra = Constants.expoConfig?.extra ?? Constants.manifest?.extra ?? {};
  const envValue = (extra as Record<string, unknown>).apiBaseUrl;
  const raw =
    (typeof envValue === "string" && envValue.length > 0
      ? envValue
      : (process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8180"));
  return raw.replace(/\/+$/, "");
};

const API_BASE_URL = resolveApiBaseUrl();

const buildUrl = (path: string): string => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

type TabKey = "bp" | "lipid" | "nutrition" | "assistant" | "settings";

type BloodPressureForm = {
  systolic: string;
  diastolic: string;
  pulse: string;
  question: string;
  comment: string;
};

type BloodPressureRecord = BloodPressureForm & {
  id: string;
  createdAt: string;
  advice: string;
};

type LipidForm = {
  date: string;
  cholesterol: string;
  hdl: string;
  ldl: string;
  triglycerides: string;
  glucose: string;
  question: string;
  comment: string;
};

type LipidRecord = LipidForm & {
  id: string;
  createdAt: string;
  advice: string;
};

type NutritionForm = {
  weight: string;
  height: string;
  calories: string;
  activity: string;
  question: string;
  comment: string;
};

type NutritionRecord = NutritionForm & {
  id: string;
  createdAt: string;
  advice: string;
};

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};

type SettingsForm = {
  sex: string;
  age: string;
  height: string;
  weight: string;
  activity: string;
  kcalGoal: string;
  sfaLimit: string;
  fiberGoal: string;
};

type UserSummary = {
  id: number;
  email: string;
};

type ProfileTargets = {
  user_id: number;
  sex: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity: string | null;
  kcal_goal: number | null;
  sfa_limit_g: number | null;
  fiber_goal_g: number | null;
};

const createRecordId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const storageKey = (scope: string, userId: number | null) => `cholestofit_${scope}_archive_${userId ?? "guest"}`;

const normalizeList = <T,>(value: unknown, fallback: T[]): T[] => {
  if (!Array.isArray(value)) return fallback;
  return value as T[];
};

const readArchive = async <T,>(scope: string, userId: number | null): Promise<T[]> => {
  const key = storageKey(scope, userId);
  try {
    const saved = await AsyncStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return normalizeList<T>(parsed, []);
  } catch (err) {
    console.warn(`Не удалось прочитать архив ${scope}`, err);
    return [];
  }
};

const writeArchive = async (scope: string, userId: number | null, value: unknown[]) => {
  const key = storageKey(scope, userId);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Не удалось сохранить архив ${scope}`, err);
  }
};

const DEFAULT_BP_FORM: BloodPressureForm = {
  systolic: "",
  diastolic: "",
  pulse: "",
  question: "",
  comment: "",
};

const DEFAULT_LIPID_FORM: LipidForm = {
  date: "",
  cholesterol: "",
  hdl: "",
  ldl: "",
  triglycerides: "",
  glucose: "",
  question: "",
  comment: "",
};

const DEFAULT_NUTRITION_FORM: NutritionForm = {
  weight: "",
  height: "",
  calories: "",
  activity: "",
  question: "",
  comment: "",
};

const DEFAULT_SETTINGS_FORM: SettingsForm = {
  sex: "",
  age: "",
  height: "",
  weight: "",
  activity: "",
  kcalGoal: "",
  sfaLimit: "",
  fiberGoal: "",
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "bp", label: "Давление" },
  { key: "lipid", label: "Липиды" },
  { key: "nutrition", label: "Нутрициолог" },
  { key: "assistant", label: "AI ассистент" },
  { key: "settings", label: "Профиль" },
];

const App: React.FC = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [me, setMe] = useState<UserSummary | null>(null);
  const [targets, setTargets] = useState<ProfileTargets | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("bp");

  const [bpForm, setBpForm] = useState<BloodPressureForm>(DEFAULT_BP_FORM);
  const [bpAdvice, setBpAdvice] = useState("");
  const [bpHistory, setBpHistory] = useState<BloodPressureRecord[]>([]);
  const [bpLoading, setBpLoading] = useState(false);
  const [bpError, setBpError] = useState<string | null>(null);
  const [bpLoaded, setBpLoaded] = useState(false);

  const [lipidForm, setLipidForm] = useState<LipidForm>(DEFAULT_LIPID_FORM);
  const [lipidAdvice, setLipidAdvice] = useState("");
  const [lipidHistory, setLipidHistory] = useState<LipidRecord[]>([]);
  const [lipidLoading, setLipidLoading] = useState(false);
  const [lipidError, setLipidError] = useState<string | null>(null);
  const [lipidLoaded, setLipidLoaded] = useState(false);

  const [nutritionForm, setNutritionForm] = useState<NutritionForm>(DEFAULT_NUTRITION_FORM);
  const [nutritionAdvice, setNutritionAdvice] = useState("");
  const [nutritionHistory, setNutritionHistory] = useState<NutritionRecord[]>([]);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [nutritionLoaded, setNutritionLoaded] = useState(false);

  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  const [settingsForm, setSettingsForm] = useState<SettingsForm>(DEFAULT_SETTINGS_FORM);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const userId = me?.id ?? null;

  const authHeaders = useMemo(() => {
    if (!token) return undefined;
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
    } as Record<string, string>;
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const saved = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
        if (cancelled || !saved) return;
        setToken(saved);
        await refreshProfile(saved);
      } catch (err) {
        console.warn("Не удалось восстановить сессию", err);
      }
    };
    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistToken = useCallback(async (value: string | null) => {
    if (!value) {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    } else {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, value);
    }
  }, []);

  const refreshProfile = useCallback(async (customToken?: string | null) => {
    const useToken = customToken ?? token;
    if (!useToken) return;
    try {
      const [meResponse, targetsResponse] = await Promise.all([
        fetch(buildUrl("/me"), {
          headers: { Authorization: `Bearer ${useToken}` },
        }),
        fetch(buildUrl("/targets"), {
          headers: { Authorization: `Bearer ${useToken}` },
        }),
      ]);
      if (meResponse.ok) {
        const meData = (await meResponse.json()) as UserSummary;
        setMe(meData);
      }
      if (targetsResponse.ok) {
        const tData = (await targetsResponse.json()) as ProfileTargets;
        setTargets(tData);
      }
    } catch (err) {
      console.warn("Не удалось обновить профиль", err);
    }
  }, [token]);

  const clearSession = useCallback(async () => {
    setToken(null);
    setMe(null);
    setTargets(null);
    setActiveTab("bp");
    setAssistantMessages([]);
    setAssistantInput("");
    setSettingsForm(DEFAULT_SETTINGS_FORM);
    setSettingsError(null);
    setSettingsSuccess(false);
    await persistToken(null);
  }, [persistToken]);

  const handleAuth = useCallback(async () => {
    if (!email || !password) {
      setAuthError("Введите email и пароль");
      return;
    }
    setAuthBusy(true);
    setAuthError(null);
    try {
      const response = await fetch(buildUrl(`/auth/${mode === "login" ? "login" : "register"}`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, pass: password }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data.token !== "string") {
        const message = data && typeof data.error === "string" ? data.error : "Не удалось выполнить запрос";
        setAuthError(message);
        return;
      }
      setToken(data.token);
      await persistToken(data.token);
      setActiveTab("bp");
      setBpForm(DEFAULT_BP_FORM);
      setLipidForm(DEFAULT_LIPID_FORM);
      setNutritionForm(DEFAULT_NUTRITION_FORM);
      setAssistantMessages([]);
      setAssistantInput("");
      await refreshProfile(data.token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Ошибка сети");
    } finally {
      setAuthBusy(false);
    }
  }, [email, mode, password, persistToken, refreshProfile]);

  const requestAdvice = useCallback(async (prompt: string) => {
    if (!authHeaders) {
      throw new Error("Необходимо войти в систему");
    }
    const response = await fetch(buildUrl("/assistant/chat"), {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ message: prompt, history: [] }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data || typeof data.reply !== "string") {
      const message = data && typeof data.error === "string" ? data.error : "Не удалось получить рекомендации";
      throw new Error(message);
    }
    return data.reply.trim();
  }, [authHeaders]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const records = await readArchive<BloodPressureRecord>("bp", userId);
      if (!cancelled) {
        setBpHistory(records);
        setBpLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!bpLoaded) return;
    void writeArchive("bp", userId, bpHistory);
  }, [bpHistory, bpLoaded, userId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const records = await readArchive<LipidRecord>("lipid", userId);
      if (!cancelled) {
        setLipidHistory(records);
        setLipidLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!lipidLoaded) return;
    void writeArchive("lipid", userId, lipidHistory);
  }, [lipidHistory, lipidLoaded, userId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const records = await readArchive<NutritionRecord>("nutrition", userId);
      if (!cancelled) {
        setNutritionHistory(records);
        setNutritionLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!nutritionLoaded) return;
    void writeArchive("nutrition", userId, nutritionHistory);
  }, [nutritionHistory, nutritionLoaded, userId]);

  useEffect(() => {
    if (!targets) return;
    setNutritionForm(prev => ({
      ...prev,
      weight: prev.weight || (targets.weight_kg != null ? String(targets.weight_kg) : ""),
      height: prev.height || (targets.height_cm != null ? String(targets.height_cm) : ""),
      calories: prev.calories || (targets.kcal_goal != null ? String(targets.kcal_goal) : ""),
      activity: prev.activity || (targets.activity ?? ""),
    }));
    setSettingsForm({
      sex: targets.sex ?? "",
      age: targets.age != null ? String(targets.age) : "",
      height: targets.height_cm != null ? String(targets.height_cm) : "",
      weight: targets.weight_kg != null ? String(targets.weight_kg) : "",
      activity: targets.activity ?? "",
      kcalGoal: targets.kcal_goal != null ? String(targets.kcal_goal) : "",
      sfaLimit: targets.sfa_limit_g != null ? String(targets.sfa_limit_g) : "",
      fiberGoal: targets.fiber_goal_g != null ? String(targets.fiber_goal_g) : "",
    });
  }, [targets]);

  const handleBpField = useCallback((key: keyof BloodPressureForm, value: string) => {
    setBpForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleLipidField = useCallback((key: keyof LipidForm, value: string) => {
    setLipidForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleNutritionField = useCallback((key: keyof NutritionForm, value: string) => {
    setNutritionForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSettingsField = useCallback((key: keyof SettingsForm, value: string) => {
    setSettingsForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleBpSave = useCallback(() => {
    const hasMetrics = bpForm.systolic || bpForm.diastolic || bpForm.pulse;
    if (!hasMetrics) {
      setBpError("Укажите показатели давления, чтобы сохранить запись");
      return;
    }
    const record: BloodPressureRecord = {
      ...bpForm,
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      advice: "",
    };
    setBpHistory(prev => [record, ...prev]);
    setBpError(null);
  }, [bpForm]);

  const handleBpSubmit = useCallback(async () => {
    setBpLoading(true);
    setBpError(null);
    try {
      const metrics: string[] = [];
      if (bpForm.systolic) metrics.push(`систолическое давление ${bpForm.systolic} мм рт. ст.`);
      if (bpForm.diastolic) metrics.push(`диастолическое давление ${bpForm.diastolic} мм рт. ст.`);
      if (bpForm.pulse) metrics.push(`пульс ${bpForm.pulse} уд/мин`);
      if (bpForm.comment) metrics.push(`комментарий: ${bpForm.comment}`);
      const prompt = [
        "Ты — кардиолог, который объясняет понятным языком.",
        metrics.length > 0 ? `Пациент сообщает: ${metrics.join(", ")}.` : "Пациент не указал показатели.",
        "Дай советы для стабилизации давления и пульса, укажи тревожные симптомы.",
        bpForm.question ? `Дополнительный контекст: ${bpForm.question}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const reply = await requestAdvice(prompt);
      const record: BloodPressureRecord = {
        ...bpForm,
        id: createRecordId(),
        createdAt: new Date().toISOString(),
        advice: reply,
      };
      setBpHistory(prev => [record, ...prev]);
      setBpAdvice(reply);
    } catch (err) {
      setBpAdvice("");
      setBpError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
    } finally {
      setBpLoading(false);
    }
  }, [bpForm, requestAdvice]);

  const handleLipidSave = useCallback(() => {
    const hasMetrics =
      lipidForm.date ||
      lipidForm.cholesterol ||
      lipidForm.hdl ||
      lipidForm.ldl ||
      lipidForm.triglycerides ||
      lipidForm.glucose;
    if (!hasMetrics) {
      setLipidError("Добавьте хотя бы один показатель");
      return;
    }
    const record: LipidRecord = {
      ...lipidForm,
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      advice: "",
    };
    setLipidHistory(prev => [record, ...prev]);
    setLipidError(null);
  }, [lipidForm]);

  const handleLipidSubmit = useCallback(async () => {
    setLipidLoading(true);
    setLipidError(null);
    try {
      const metrics: string[] = [];
      if (lipidForm.date) metrics.push(`дата анализа ${lipidForm.date}`);
      if (lipidForm.cholesterol) metrics.push(`общий холестерин ${lipidForm.cholesterol} ммоль/л`);
      if (lipidForm.hdl) metrics.push(`ЛПВП ${lipidForm.hdl} ммоль/л`);
      if (lipidForm.ldl) metrics.push(`ЛПНП ${lipidForm.ldl} ммоль/л`);
      if (lipidForm.triglycerides) metrics.push(`триглицериды ${lipidForm.triglycerides} ммоль/л`);
      if (lipidForm.glucose) metrics.push(`глюкоза ${lipidForm.glucose} ммоль/л`);
      if (lipidForm.comment) metrics.push(`комментарий: ${lipidForm.comment}`);
      const prompt = [
        "Ты — врач профилактической медицины и эндокринолог.",
        metrics.length > 0
          ? `Актуальные показатели пациента: ${metrics.join(", ")}.`
          : "Пациент не указал текущие показатели.",
        "Дай рекомендации по питанию, активности и контролю образа жизни.",
        lipidForm.question ? `Дополнительный вопрос: ${lipidForm.question}.` : "",
      ]
        .filter(Boolean)
        .join(" ");
      const reply = await requestAdvice(prompt);
      const record: LipidRecord = {
        ...lipidForm,
        id: createRecordId(),
        createdAt: new Date().toISOString(),
        advice: reply,
      };
      setLipidHistory(prev => [record, ...prev]);
      setLipidAdvice(reply);
    } catch (err) {
      setLipidAdvice("");
      setLipidError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
    } finally {
      setLipidLoading(false);
    }
  }, [lipidForm, requestAdvice]);

  const handleNutritionSubmit = useCallback(async () => {
    setNutritionLoading(true);
    setNutritionError(null);
    try {
      const facts: string[] = [];
      if (nutritionForm.weight) facts.push(`масса тела ${nutritionForm.weight} кг`);
      if (nutritionForm.height) facts.push(`рост ${nutritionForm.height} см`);
      if (nutritionForm.calories) facts.push(`суточная калорийность ${nutritionForm.calories} ккал`);
      if (nutritionForm.activity) facts.push(`уровень активности ${nutritionForm.activity}`);
      if (nutritionForm.comment) facts.push(`комментарий: ${nutritionForm.comment}`);
      const prompt = [
        "Ты — нутрициолог. На основе данных клиента составь рекомендации по питанию и режиму.",
        facts.length > 0 ? `Исходные данные: ${facts.join(", ")}.` : "Клиент не указал исходные данные.",
        nutritionForm.question
          ? `Дополнительный запрос клиента: ${nutritionForm.question}.`
          : "Сделай рекомендации универсальными и безопасными.",
        "Напомни о необходимости консультации врача при хронических заболеваниях.",
      ].join(" ");
      const reply = await requestAdvice(prompt);
      const record: NutritionRecord = {
        ...nutritionForm,
        id: createRecordId(),
        createdAt: new Date().toISOString(),
        advice: reply,
      };
      setNutritionHistory(prev => [record, ...prev]);
      setNutritionAdvice(reply);
    } catch (err) {
      setNutritionAdvice("");
      setNutritionError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
    } finally {
      setNutritionLoading(false);
    }
  }, [nutritionForm, requestAdvice]);

  const handleAssistantSubmit = useCallback(async () => {
    const text = assistantInput.trim();
    if (!text) return;
    if (!authHeaders) {
      setAssistantError("Необходимо войти, чтобы продолжить");
      return;
    }
    const nextMessages = [...assistantMessages, { role: "user" as const, content: text }];
    setAssistantMessages(nextMessages);
    setAssistantInput("");
    setAssistantLoading(true);
    setAssistantError(null);
    try {
      const payloadHistory = nextMessages.map(message => ({ role: message.role, content: message.content }));
      const response = await fetch(buildUrl("/assistant/chat"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ message: text, history: payloadHistory }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data || typeof data.reply !== "string") {
        const message = data && typeof data.error === "string" ? data.error : "Ассистент недоступен";
        throw new Error(message);
      }
      setAssistantMessages(prev => [...prev, { role: "assistant", content: data.reply.trim() }]);
    } catch (err) {
      setAssistantError(err instanceof Error ? err.message : "Ассистент недоступен");
    } finally {
      setAssistantLoading(false);
    }
  }, [assistantInput, assistantMessages, authHeaders]);

  const handleSettingsSubmit = useCallback(async () => {
    if (!authHeaders) {
      setSettingsError("Необходимо войти в систему");
      return;
    }
    setSettingsSaving(true);
    setSettingsError(null);
    setSettingsSuccess(false);
    const payload = {
      sex: settingsForm.sex || null,
      age: settingsForm.age ? Number(settingsForm.age) : null,
      height_cm: settingsForm.height ? Number(settingsForm.height) : null,
      weight_kg: settingsForm.weight ? Number(settingsForm.weight) : null,
      activity: settingsForm.activity || null,
      kcal_goal: settingsForm.kcalGoal ? Number(settingsForm.kcalGoal) : null,
      sfa_limit_g: settingsForm.sfaLimit ? Number(settingsForm.sfaLimit) : null,
      fiber_goal_g: settingsForm.fiberGoal ? Number(settingsForm.fiberGoal) : null,
    };
    try {
      const response = await fetch(buildUrl("/profile"), {
        method: "PUT",
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data && typeof data.error === "string" ? data.error : "Не удалось сохранить профиль";
        throw new Error(message);
      }
      setSettingsSuccess(true);
      await refreshProfile();
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Не удалось сохранить профиль");
    } finally {
      setSettingsSaving(false);
    }
  }, [authHeaders, refreshProfile, settingsForm]);

  useEffect(() => {
    if (!settingsSuccess) return;
    const timer = setTimeout(() => setSettingsSuccess(false), 4000);
    return () => clearTimeout(timer);
  }, [settingsSuccess]);

  if (!token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.authContainer}>
          <Text style={styles.brandTitle}>CholestoFit</Text>
          <Text style={styles.brandSubtitle}>Персональные рекомендации по здоровью</Text>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="user@example.com"
            />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Пароль</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholder="••••••••"
            />
          </View>
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          <Pressable onPress={handleAuth} style={styles.primaryButton} disabled={authBusy}>
            {authBusy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === "login" ? "Войти" : "Зарегистрироваться"}</Text>}
          </Pressable>
          <Pressable
            onPress={() => setMode(prev => (prev === "login" ? "register" : "login"))}
            style={styles.switchButton}
          >
            <Text style={styles.switchButtonText}>
              {mode === "login" ? "Нет аккаунта? Зарегистрируйтесь" : "Уже есть аккаунт? Войти"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brandTitle}>CholestoFit</Text>
          <Text style={styles.brandSubtitle}>Персональные рекомендации по здоровью</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userLabel}>Аккаунт</Text>
          <Text style={styles.userEmail}>{me?.email ?? email}</Text>
          <Pressable onPress={clearSession} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Выйти</Text>
          </Pressable>
        </View>
      </View>
      <View style={styles.tabRow}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          >
            <Text style={[styles.tabButtonText, activeTab === tab.key && styles.tabButtonTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "bp" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Давление и пульс</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Систолическое</Text>
                <TextInput
                  value={bpForm.systolic}
                  onChangeText={value => handleBpField("systolic", value)}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="120"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Диастолическое</Text>
                <TextInput
                  value={bpForm.diastolic}
                  onChangeText={value => handleBpField("diastolic", value)}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="80"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Пульс</Text>
                <TextInput
                  value={bpForm.pulse}
                  onChangeText={value => handleBpField("pulse", value)}
                  keyboardType="numeric"
                  style={styles.input}
                  placeholder="70"
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Комментарий</Text>
              <TextInput
                value={bpForm.comment}
                onChangeText={value => handleBpField("comment", value)}
                style={[styles.input, styles.multiline]}
                placeholder="Когда измеряли, самочувствие"
                multiline
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Вопрос врачу</Text>
              <TextInput
                value={bpForm.question}
                onChangeText={value => handleBpField("question", value)}
                style={[styles.input, styles.multiline]}
                placeholder="Что вас беспокоит"
                multiline
              />
            </View>
            {bpError ? <Text style={styles.errorText}>{bpError}</Text> : null}
            <View style={styles.actionsRow}>
              <Pressable onPress={handleBpSave} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Сохранить в архив</Text>
              </Pressable>
              <Pressable onPress={handleBpSubmit} style={styles.primaryButton}>
                {bpLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Получить советы</Text>}
              </Pressable>
            </View>
            {bpAdvice ? (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceTitle}>Рекомендации</Text>
                <Text style={styles.adviceText}>{bpAdvice}</Text>
              </View>
            ) : null}
            {bpHistory.length > 0 && (
              <View style={styles.historyBox}>
                <Text style={styles.historyTitle}>Архив</Text>
                {bpHistory.map(item => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                    <Text style={styles.historyText}>
                      {item.systolic}/{item.diastolic} мм рт. ст., пульс {item.pulse || "—"}
                    </Text>
                    {item.advice ? <Text style={styles.historyAdvice}>{item.advice}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {activeTab === "lipid" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Липидный профиль и сахар</Text>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Дата анализа</Text>
              <TextInput
                value={lipidForm.date}
                onChangeText={value => handleLipidField("date", value)}
                style={styles.input}
                placeholder="2024-03-01"
              />
            </View>
            <View style={styles.fieldRow}>
              {([
                ["cholesterol", "Общий холестерин"],
                ["hdl", "ЛПВП"],
                ["ldl", "ЛПНП"],
              ] as const).map(([key, label]) => (
                <View style={styles.fieldColumn} key={key}>
                  <Text style={styles.label}>{label}</Text>
                  <TextInput
                    value={lipidForm[key]}
                    onChangeText={value => handleLipidField(key, value)}
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="4.2"
                  />
                </View>
              ))}
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Триглицериды</Text>
                <TextInput
                  value={lipidForm.triglycerides}
                  onChangeText={value => handleLipidField("triglycerides", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="1.3"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Глюкоза</Text>
                <TextInput
                  value={lipidForm.glucose}
                  onChangeText={value => handleLipidField("glucose", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="5.2"
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Комментарий</Text>
              <TextInput
                value={lipidForm.comment}
                onChangeText={value => handleLipidField("comment", value)}
                style={[styles.input, styles.multiline]}
                multiline
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Вопрос</Text>
              <TextInput
                value={lipidForm.question}
                onChangeText={value => handleLipidField("question", value)}
                style={[styles.input, styles.multiline]}
                multiline
              />
            </View>
            {lipidError ? <Text style={styles.errorText}>{lipidError}</Text> : null}
            <View style={styles.actionsRow}>
              <Pressable onPress={handleLipidSave} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Сохранить в архив</Text>
              </Pressable>
              <Pressable onPress={handleLipidSubmit} style={styles.primaryButton}>
                {lipidLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Получить советы</Text>}
              </Pressable>
            </View>
            {lipidAdvice ? (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceTitle}>Рекомендации</Text>
                <Text style={styles.adviceText}>{lipidAdvice}</Text>
              </View>
            ) : null}
            {lipidHistory.length > 0 && (
              <View style={styles.historyBox}>
                <Text style={styles.historyTitle}>Архив</Text>
                {lipidHistory.map(item => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                    <Text style={styles.historyText}>
                      {item.date || "Дата не указана"}: ХС {item.cholesterol || "—"}, ЛПВП {item.hdl || "—"}, ЛПНП {item.ldl || "—"}
                    </Text>
                    {item.advice ? <Text style={styles.historyAdvice}>{item.advice}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {activeTab === "nutrition" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Нутрициолог</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Вес</Text>
                <TextInput
                  value={nutritionForm.weight}
                  onChangeText={value => handleNutritionField("weight", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="70"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Рост</Text>
                <TextInput
                  value={nutritionForm.height}
                  onChangeText={value => handleNutritionField("height", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="175"
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Калории</Text>
                <TextInput
                  value={nutritionForm.calories}
                  onChangeText={value => handleNutritionField("calories", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="2000"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Активность</Text>
                <TextInput
                  value={nutritionForm.activity}
                  onChangeText={value => handleNutritionField("activity", value)}
                  style={styles.input}
                  placeholder="умеренная"
                />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Комментарий</Text>
              <TextInput
                value={nutritionForm.comment}
                onChangeText={value => handleNutritionField("comment", value)}
                style={[styles.input, styles.multiline]}
                multiline
              />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Вопрос</Text>
              <TextInput
                value={nutritionForm.question}
                onChangeText={value => handleNutritionField("question", value)}
                style={[styles.input, styles.multiline]}
                multiline
              />
            </View>
            {nutritionError ? <Text style={styles.errorText}>{nutritionError}</Text> : null}
            <Pressable onPress={handleNutritionSubmit} style={styles.primaryButton}>
              {nutritionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Получить план</Text>}
            </Pressable>
            {nutritionAdvice ? (
              <View style={styles.adviceBox}>
                <Text style={styles.adviceTitle}>Рекомендации</Text>
                <Text style={styles.adviceText}>{nutritionAdvice}</Text>
              </View>
            ) : null}
            {nutritionHistory.length > 0 && (
              <View style={styles.historyBox}>
                <Text style={styles.historyTitle}>Архив</Text>
                {nutritionHistory.map(item => (
                  <View key={item.id} style={styles.historyItem}>
                    <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                    <Text style={styles.historyText}>
                      Вес {item.weight || "—"} кг, рост {item.height || "—"} см, калории {item.calories || "—"}
                    </Text>
                    {item.advice ? <Text style={styles.historyAdvice}>{item.advice}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
        {activeTab === "assistant" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>AI ассистент</Text>
            <View style={styles.fieldGroup}>
              <TextInput
                value={assistantInput}
                onChangeText={setAssistantInput}
                style={[styles.input, styles.multiline]}
                placeholder="Задайте вопрос ассистенту"
                multiline
              />
            </View>
            {assistantError ? <Text style={styles.errorText}>{assistantError}</Text> : null}
            <Pressable onPress={handleAssistantSubmit} style={styles.primaryButton}>
              {assistantLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Отправить</Text>}
            </Pressable>
            <View style={styles.chatBox}>
              {assistantMessages.length === 0 ? (
                <Text style={styles.mutedText}>История диалога появится здесь</Text>
              ) : (
                assistantMessages.map((message, index) => (
                  <View
                    key={`${message.role}-${index}`}
                    style={[styles.chatMessage, message.role === "user" ? styles.chatUser : styles.chatAssistant]}
                  >
                    <Text style={styles.chatRole}>{message.role === "user" ? "Вы" : "Ассистент"}</Text>
                    <Text style={styles.chatText}>{message.content}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}
        {activeTab === "settings" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Профиль и цели</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Пол</Text>
                <TextInput
                  value={settingsForm.sex}
                  onChangeText={value => handleSettingsField("sex", value)}
                  style={styles.input}
                  placeholder="женский/мужской"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Возраст</Text>
                <TextInput
                  value={settingsForm.age}
                  onChangeText={value => handleSettingsField("age", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="35"
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Рост</Text>
                <TextInput
                  value={settingsForm.height}
                  onChangeText={value => handleSettingsField("height", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="175"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Вес</Text>
                <TextInput
                  value={settingsForm.weight}
                  onChangeText={value => handleSettingsField("weight", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="70"
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Активность</Text>
                <TextInput
                  value={settingsForm.activity}
                  onChangeText={value => handleSettingsField("activity", value)}
                  style={styles.input}
                  placeholder="низкая/умеренная"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Ккал цель</Text>
                <TextInput
                  value={settingsForm.kcalGoal}
                  onChangeText={value => handleSettingsField("kcalGoal", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="2000"
                />
              </View>
            </View>
            <View style={styles.fieldRow}>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Предел ЖКТ, г</Text>
                <TextInput
                  value={settingsForm.sfaLimit}
                  onChangeText={value => handleSettingsField("sfaLimit", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="20"
                />
              </View>
              <View style={styles.fieldColumn}>
                <Text style={styles.label}>Клетчатка, г</Text>
                <TextInput
                  value={settingsForm.fiberGoal}
                  onChangeText={value => handleSettingsField("fiberGoal", value)}
                  style={styles.input}
                  keyboardType="numeric"
                  placeholder="25"
                />
              </View>
            </View>
            {settingsError ? <Text style={styles.errorText}>{settingsError}</Text> : null}
            {settingsSuccess ? <Text style={styles.successText}>Цели сохранены</Text> : null}
            <Pressable onPress={handleSettingsSubmit} style={styles.primaryButton}>
              {settingsSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Сохранить профиль</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  authContainer: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 16,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
  },
  brandSubtitle: {
    fontSize: 14,
    color: "#475569",
    marginTop: 4,
  },
  fieldGroup: {
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    color: "#475569",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  errorText: {
    marginTop: 12,
    color: "#dc2626",
    fontSize: 13,
  },
  successText: {
    marginTop: 12,
    color: "#16a34a",
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 16,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "500",
  },
  switchButton: {
    marginTop: 8,
    alignItems: "center",
  },
  switchButtonText: {
    color: "#2563eb",
  },
  header: {
    padding: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
  },
  userInfo: {
    alignItems: "flex-end",
  },
  userLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  userEmail: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "600",
    marginBottom: 8,
  },
  logoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  logoutText: {
    fontSize: 13,
    color: "#334155",
  },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    alignItems: "center",
  },
  tabButtonActive: {
    backgroundColor: "#2563eb",
  },
  tabButtonText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "500",
  },
  tabButtonTextActive: {
    color: "#fff",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0f172a",
  },
  fieldRow: {
    flexDirection: "row",
    gap: 12,
  },
  fieldColumn: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  adviceBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 16,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1d4ed8",
    marginBottom: 6,
  },
  adviceText: {
    fontSize: 14,
    color: "#1e293b",
  },
  historyBox: {
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
    paddingTop: 12,
    gap: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
  },
  historyItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
  },
  historyDate: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  historyText: {
    fontSize: 13,
    color: "#0f172a",
  },
  historyAdvice: {
    marginTop: 6,
    fontSize: 13,
    color: "#1e293b",
  },
  chatBox: {
    marginTop: 16,
    gap: 12,
  },
  mutedText: {
    fontSize: 13,
    color: "#94a3b8",
  },
  chatMessage: {
    borderRadius: 12,
    padding: 12,
  },
  chatUser: {
    backgroundColor: "#e0f2fe",
    alignSelf: "flex-end",
  },
  chatAssistant: {
    backgroundColor: "#ede9fe",
    alignSelf: "flex-start",
  },
  chatRole: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 4,
  },
  chatText: {
    fontSize: 14,
    color: "#0f172a",
  },
});

export default App;
