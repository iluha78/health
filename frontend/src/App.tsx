import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { observer } from "mobx-react-lite";
import { userStore } from "./stores/user";
import type { AssistantMessage } from "./types/api";
import { apiUrl } from "./lib/api";
import "./App.css";

type TabKey = "bp" | "lipid" | "nutrition" | "assistant";
type AdjustmentGoal = "lower" | "raise";

type BloodPressureRecord = {
  id: string;
  createdAt: string;
  systolic: string;
  diastolic: string;
  pulse: string;
  goal: AdjustmentGoal;
  question: string;
  comment: string;
  advice: string;
};

type LipidRecord = {
  id: string;
  createdAt: string;
  date: string;
  cholesterol: string;
  hdl: string;
  ldl: string;
  triglycerides: string;
  glucose: string;
  goal: AdjustmentGoal;
  question: string;
  comment: string;
  advice: string;
};

type NutritionRecord = {
  id: string;
  createdAt: string;
  weight: string;
  height: string;
  calories: string;
  activity: string;
  question: string;
  comment: string;
  advice: string;
};

const TAB_ITEMS: { key: TabKey; label: string; icon: string }[] = [
  { key: "bp", label: "Давление и пульс", icon: "🩺" },
  { key: "lipid", label: "Липидный профиль и сахар", icon: "🩸" },
  { key: "nutrition", label: "Нутрициолог", icon: "🥗" },
  { key: "assistant", label: "AI ассистент", icon: "🤖" }
];

const createRecordId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch (err) {
    console.warn("Не удалось отформатировать дату", err);
    return value;
  }
};

const storageKey = (scope: string, userId: number | null) => `cholestofit_${scope}_archive_${userId ?? "guest"}`;

const App = observer(() => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<TabKey>("bp");

  const [bpForm, setBpForm] = useState({
    systolic: "",
    diastolic: "",
    pulse: "",
    goal: "lower" as AdjustmentGoal,
    question: "",
    comment: ""
  });
  const [bpAdvice, setBpAdvice] = useState("");
  const [bpLoading, setBpLoading] = useState(false);
  const [bpError, setBpError] = useState<string | null>(null);

  const [lipidForm, setLipidForm] = useState({
    date: "",
    cholesterol: "",
    hdl: "",
    ldl: "",
    triglycerides: "",
    glucose: "",
    goal: "lower" as AdjustmentGoal,
    question: "",
    comment: ""
  });
  const [lipidAdvice, setLipidAdvice] = useState("");
  const [lipidLoading, setLipidLoading] = useState(false);
  const [lipidError, setLipidError] = useState<string | null>(null);

  const [nutritionForm, setNutritionForm] = useState({
    weight: "",
    height: "",
    calories: "",
    activity: "",
    question: "",
    comment: ""
  });
  const [nutritionAdvice, setNutritionAdvice] = useState("");
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);

  const [bpHistory, setBpHistory] = useState<BloodPressureRecord[]>([]);
  const [lipidHistory, setLipidHistory] = useState<LipidRecord[]>([]);
  const [nutritionHistory, setNutritionHistory] = useState<NutritionRecord[]>([]);

  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([]);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);

  const jsonHeaders = useMemo(() => {
    if (!userStore.token) return undefined;
    return {
      Authorization: `Bearer ${userStore.token}`,
      "Content-Type": "application/json"
    } as Record<string, string>;
  }, [userStore.token]);

  const userId = userStore.me?.id ?? null;

  useEffect(() => {
    if (userStore.token) {
      setActiveTab("bp");
      if (!userStore.me) {
        void userStore.refresh();
      }
    } else {
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const archiveUserId = userId ?? null;
    const readArray = (key: string) => {
      const saved = window.localStorage.getItem(key);
      if (!saved) return null;
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? (parsed as unknown[]) : null;
      } catch (err) {
        console.warn(`Не удалось прочитать архив ${key}`, err);
        return null;
      }
    };

    const bpKey = storageKey("bp", archiveUserId);
    const lipidKey = storageKey("lipid", archiveUserId);
    const nutritionKey = storageKey("nutrition", archiveUserId);

    const bpData = readArray(bpKey) as Partial<BloodPressureRecord>[] | null;
    if (bpData && bpData.length > 0) {
      setBpHistory(
        bpData.map(item => ({
          id: item.id ?? createRecordId(),
          createdAt: item.createdAt ?? new Date().toISOString(),
          systolic: item.systolic ?? "",
          diastolic: item.diastolic ?? "",
          pulse: item.pulse ?? "",
          goal: item.goal ?? "lower",
          question: item.question ?? "",
          comment: item.comment ?? "",
          advice: item.advice ?? ""
        }))
      );
    } else {
      setBpHistory([]);
    }

    const lipidData = readArray(lipidKey) as Partial<LipidRecord>[] | null;
    if (lipidData && lipidData.length > 0) {
      setLipidHistory(
        lipidData.map(item => ({
          id: item.id ?? createRecordId(),
          createdAt: item.createdAt ?? new Date().toISOString(),
          date: item.date ?? "",
          cholesterol: item.cholesterol ?? "",
          hdl: item.hdl ?? "",
          ldl: item.ldl ?? "",
          triglycerides: item.triglycerides ?? "",
          glucose: item.glucose ?? "",
          goal: item.goal ?? "lower",
          question: item.question ?? "",
          comment: item.comment ?? "",
          advice: item.advice ?? ""
        }))
      );
    } else {
      const legacyKey = storageKey("metabolic", archiveUserId);
      const legacy = readArray(legacyKey) as
        | {
            id?: string;
            createdAt?: string;
            cholesterol?: string;
            sugar?: string;
            cholGoal?: AdjustmentGoal;
            sugarGoal?: AdjustmentGoal;
            question?: string;
            comment?: string;
            advice?: string;
          }[]
        | null;
      if (legacy && legacy.length > 0) {
        const converted: LipidRecord[] = legacy.map(item => ({
          id: item.id ?? createRecordId(),
          createdAt: item.createdAt ?? new Date().toISOString(),
          date: "",
          cholesterol: item.cholesterol ?? "",
          hdl: "",
          ldl: "",
          triglycerides: "",
          glucose: item.sugar ?? "",
          goal: item.cholGoal ?? "lower",
          question: item.question ?? "",
          comment: item.comment ?? "",
          advice: item.advice ?? ""
        }));
        setLipidHistory(converted);
      } else {
        setLipidHistory([]);
      }
    }

    const nutritionData = readArray(nutritionKey) as Partial<NutritionRecord>[] | null;
    if (nutritionData && nutritionData.length > 0) {
      setNutritionHistory(
        nutritionData.map(item => ({
          id: item.id ?? createRecordId(),
          createdAt: item.createdAt ?? new Date().toISOString(),
          weight: item.weight ?? "",
          height: item.height ?? "",
          calories: item.calories ?? "",
          activity: item.activity ?? "",
          question: item.question ?? "",
          comment: item.comment ?? "",
          advice: item.advice ?? ""
        }))
      );
    } else {
      setNutritionHistory([]);
    }
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const archiveUserId = userId ?? null;
    window.localStorage.setItem(storageKey("bp", archiveUserId), JSON.stringify(bpHistory));
  }, [bpHistory, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const archiveUserId = userId ?? null;
    window.localStorage.setItem(storageKey("lipid", archiveUserId), JSON.stringify(lipidHistory));
  }, [lipidHistory, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const archiveUserId = userId ?? null;
    window.localStorage.setItem(storageKey("nutrition", archiveUserId), JSON.stringify(nutritionHistory));
  }, [nutritionHistory, userId]);

  function resetState() {
    setActiveTab("bp");
    setBpForm({ systolic: "", diastolic: "", pulse: "", goal: "lower", question: "", comment: "" });
    setBpAdvice("");
    setBpError(null);
    setLipidForm({
      date: "",
      cholesterol: "",
      hdl: "",
      ldl: "",
      triglycerides: "",
      glucose: "",
      goal: "lower",
      question: "",
      comment: ""
    });
    setLipidAdvice("");
    setLipidError(null);
    setNutritionForm({ weight: "", height: "", calories: "", activity: "", question: "", comment: "" });
    setNutritionAdvice("");
    setNutritionError(null);
    setBpHistory([]);
    setLipidHistory([]);
    setNutritionHistory([]);
    setAssistantMessages([]);
    setAssistantInput("");
    setAssistantError(null);
    setAssistantLoading(false);
  }

  async function handleAuthSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (mode === "login") {
        await userStore.login(email, password);
      } else {
        await userStore.register(email, password);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function askAssistant(prompt: string): Promise<string> {
    if (!userStore.token || !jsonHeaders) {
      throw new Error("Необходимо войти в систему");
    }
    const r = await fetch(apiUrl("/assistant/chat"), {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({ message: prompt, history: [] })
    });
    const data = await r.json();
    if (!r.ok || typeof data.reply !== "string") {
      const message = typeof data.error === "string" ? data.error : "Не удалось получить ответ ассистента";
      throw new Error(message);
    }
    return data.reply.trim();
  }

  async function handleBloodPressureSubmit(e: FormEvent) {
    e.preventDefault();
    setBpLoading(true);
    setBpError(null);
    try {
      const metrics: string[] = [];
      if (bpForm.systolic) metrics.push(`систолическое давление ${bpForm.systolic} мм рт. ст.`);
      if (bpForm.diastolic) metrics.push(`диастолическое давление ${bpForm.diastolic} мм рт. ст.`);
      if (bpForm.pulse) metrics.push(`пульс ${bpForm.pulse} уд/мин`);
      if (bpForm.comment) metrics.push(`комментарий: ${bpForm.comment}`);
      const metricSummary = metrics.length > 0 ? metrics.join(", ") : "показатели не указаны";
      const goalText = bpForm.goal === "lower" ? "снизить" : "повысить";
      const prompt = [
        "Ты — кардиолог, который объясняет понятным языком.",
        `Пациент сообщает: ${metricSummary}.`,
        `Помоги ${goalText} давление и/или пульс безопасными методами.`,
        "Добавь практические советы по образу жизни и упомяни тревожные симптомы, при которых нужно немедленно обратиться к врачу.",
        bpForm.question ? `Дополнительный контекст от пациента: ${bpForm.question}.` : ""
      ]
        .filter(Boolean)
        .join(" ");
      const reply = await askAssistant(prompt);
      const trimmedReply = reply.trim();
      setBpAdvice(trimmedReply);
      const record: BloodPressureRecord = {
        id: createRecordId(),
        createdAt: new Date().toISOString(),
        systolic: bpForm.systolic,
        diastolic: bpForm.diastolic,
        pulse: bpForm.pulse,
        goal: bpForm.goal,
        question: bpForm.question.trim(),
        comment: bpForm.comment.trim(),
        advice: trimmedReply
      };
      setBpHistory(prev => [record, ...prev]);
    } catch (err) {
      setBpError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
      setBpAdvice("");
    } finally {
      setBpLoading(false);
    }
  }

  function saveBloodPressureToArchive() {
    const hasMetrics = bpForm.systolic || bpForm.diastolic || bpForm.pulse;
    if (!hasMetrics) {
      setBpError("Укажите хотя бы одно значение, чтобы сохранить его в архиве");
      return;
    }
    setBpError(null);
    const record: BloodPressureRecord = {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      systolic: bpForm.systolic,
      diastolic: bpForm.diastolic,
      pulse: bpForm.pulse,
      goal: bpForm.goal,
      question: bpForm.question.trim(),
      comment: bpForm.comment.trim(),
      advice: ""
    };
    setBpHistory(prev => [record, ...prev]);
  }

  async function handleLipidSubmit(e: FormEvent) {
    e.preventDefault();
    setLipidLoading(true);
    setLipidError(null);
    try {
      const metrics: string[] = [];
      if (lipidForm.date) metrics.push(`дата анализа ${lipidForm.date}`);
      if (lipidForm.cholesterol) metrics.push(`общий холестерин ${lipidForm.cholesterol} ммоль/л`);
      if (lipidForm.hdl) metrics.push(`ЛПВП ${lipidForm.hdl} ммоль/л`);
      if (lipidForm.ldl) metrics.push(`ЛПНП ${lipidForm.ldl} ммоль/л`);
      if (lipidForm.triglycerides) metrics.push(`триглицериды ${lipidForm.triglycerides} ммоль/л`);
      if (lipidForm.glucose) metrics.push(`глюкоза крови ${lipidForm.glucose} ммоль/л`);
      if (lipidForm.comment) metrics.push(`комментарий: ${lipidForm.comment}`);
      const prompt = [
        "Ты — врач профилактической медицины и эндокринолог.",
        metrics.length > 0 ? `Актуальные показатели пациента: ${metrics.join(", ")}.` : "Пациент не указал текущие показатели.",
        lipidForm.goal === "lower"
          ? "Помоги безопасно снизить показатели риска сердечно-сосудистых заболеваний."
          : "Подскажи, как безопасно повысить значения, если они слишком низкие.",
        "Составь план из нескольких пунктов: питание, активность, контроль образа жизни и когда нужно обратиться к врачу.",
        lipidForm.question ? `Дополнительный вопрос пациента: ${lipidForm.question}.` : ""
      ]
        .filter(Boolean)
        .join(" ");
      const reply = await askAssistant(prompt);
      const trimmedReply = reply.trim();
      setLipidAdvice(trimmedReply);
      const record: LipidRecord = {
        id: createRecordId(),
        createdAt: new Date().toISOString(),
        date: lipidForm.date,
        cholesterol: lipidForm.cholesterol,
        hdl: lipidForm.hdl,
        ldl: lipidForm.ldl,
        triglycerides: lipidForm.triglycerides,
        glucose: lipidForm.glucose,
        goal: lipidForm.goal,
        question: lipidForm.question.trim(),
        comment: lipidForm.comment.trim(),
        advice: trimmedReply
      };
      setLipidHistory(prev => [record, ...prev]);
    } catch (err) {
      setLipidError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
      setLipidAdvice("");
    } finally {
      setLipidLoading(false);
    }
  }

  function saveLipidToArchive() {
    const hasMetrics =
      lipidForm.date ||
      lipidForm.cholesterol ||
      lipidForm.hdl ||
      lipidForm.ldl ||
      lipidForm.triglycerides ||
      lipidForm.glucose;
    if (!hasMetrics) {
      setLipidError("Укажите хотя бы один показатель, чтобы сохранить запись");
      return;
    }
    setLipidError(null);
    const record: LipidRecord = {
      id: createRecordId(),
      createdAt: new Date().toISOString(),
      date: lipidForm.date,
      cholesterol: lipidForm.cholesterol,
      hdl: lipidForm.hdl,
      ldl: lipidForm.ldl,
      triglycerides: lipidForm.triglycerides,
      glucose: lipidForm.glucose,
      goal: lipidForm.goal,
      question: lipidForm.question.trim(),
      comment: lipidForm.comment.trim(),
      advice: ""
    };
    setLipidHistory(prev => [record, ...prev]);
  }

  async function handleNutritionSubmit(e: FormEvent) {
    e.preventDefault();
    setNutritionLoading(true);
    setNutritionError(null);
    try {
      const facts: string[] = [];
      if (nutritionForm.weight) facts.push(`масса тела ${nutritionForm.weight} кг`);
      if (nutritionForm.height) facts.push(`рост ${nutritionForm.height} см`);
      if (nutritionForm.calories) facts.push(`суточная калорийность ${nutritionForm.calories} ккал`);
      if (nutritionForm.activity) facts.push(`уровень активности: ${nutritionForm.activity}`);
      if (nutritionForm.comment) facts.push(`комментарий: ${nutritionForm.comment}`);
      const prompt = [
        "Ты — нутрициолог. На основе данных клиента составь рекомендации по питанию и режиму на ближайшие 1-2 недели.",
        facts.length > 0 ? `Исходные данные: ${facts.join(", ")}.` : "Клиент не указал исходные данные.",
        nutritionForm.question
          ? `Дополнительный запрос клиента: ${nutritionForm.question}.`
          : "Сделай рекомендации универсальными и безопасными.",
        "Напомни о необходимости консультации врача при хронических заболеваниях."
      ].join(" ");
      const reply = await askAssistant(prompt);
      const trimmedReply = reply.trim();
      setNutritionAdvice(trimmedReply);
      const record: NutritionRecord = {
        id: createRecordId(),
        createdAt: new Date().toISOString(),
        weight: nutritionForm.weight,
        height: nutritionForm.height,
        calories: nutritionForm.calories,
        activity: nutritionForm.activity,
        question: nutritionForm.question.trim(),
        comment: nutritionForm.comment.trim(),
        advice: trimmedReply
      };
      setNutritionHistory(prev => [record, ...prev]);
    } catch (err) {
      setNutritionError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
      setNutritionAdvice("");
    } finally {
      setNutritionLoading(false);
    }
  }

  async function sendAssistantMessage(e: FormEvent) {
    e.preventDefault();
    const text = assistantInput.trim();
    if (!text) return;
    if (!userStore.token || !jsonHeaders) {
      setAssistantError("Необходимо войти, чтобы общаться с ассистентом");
      return;
    }
    const historyPayload = assistantMessages.map(message => ({
      role: message.role,
      content: message.content
    }));
    setAssistantMessages(prev => [...prev, { role: "user", content: text }]);
    setAssistantInput("");
    setAssistantLoading(true);
    setAssistantError(null);
    try {
      const r = await fetch(apiUrl("/assistant/chat"), {
        method: "POST",
        headers: jsonHeaders,
        body: JSON.stringify({ message: text, history: historyPayload })
      });
      const data = await r.json();
      if (!r.ok || typeof data.reply !== "string") {
        const message = typeof data.error === "string" ? data.error : "Ассистент временно недоступен";
        throw new Error(message);
      }
      setAssistantMessages(prev => [...prev, { role: "assistant", content: data.reply.trim() }]);
    } catch (err) {
      setAssistantError(err instanceof Error ? err.message : "Ассистент временно недоступен");
    } finally {
      setAssistantLoading(false);
    }
  }

  function resetAssistant() {
    setAssistantMessages([]);
    setAssistantInput("");
    setAssistantError(null);
  }

  function renderAuth() {
    return (
      <div className="auth">
        <h1>CholestoFit</h1>
        <p>Войдите, чтобы получить рекомендации ассистента</p>
        <form className="card" onSubmit={handleAuthSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>
            Пароль
            <span className="password-input">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button type="button" className="ghost" onClick={() => setShowPassword(prev => !prev)}>
                {showPassword ? "Скрыть" : "Показать"}
              </button>
            </span>
          </label>
          <button type="submit">{mode === "login" ? "Войти" : "Зарегистрироваться"}</button>
          {userStore.error && <p className="error">{userStore.error}</p>}
        </form>
        <button className="ghost" type="button" onClick={() => setMode(prev => (prev === "login" ? "register" : "login"))}>
          {mode === "login" ? "Создать аккаунт" : "У меня уже есть аккаунт"}
        </button>
      </div>
    );
  }

  function renderBloodPressureTab() {
    return (
      <div className="tab-panel tab-stack">
        <h2>Давление и пульс</h2>
        <form className="card" onSubmit={handleBloodPressureSubmit}>
          <div className="metrics-grid">
            <label>
              Систолическое давление, мм рт. ст.
              <input
                type="number"
                min="0"
                value={bpForm.systolic}
                onChange={e => setBpForm({ ...bpForm, systolic: e.target.value })}
              />
            </label>
            <label>
              Диастолическое давление, мм рт. ст.
              <input
                type="number"
                min="0"
                value={bpForm.diastolic}
                onChange={e => setBpForm({ ...bpForm, diastolic: e.target.value })}
              />
            </label>
            <label>
              Пульс, уд/мин
              <input
                type="number"
                min="0"
                value={bpForm.pulse}
                onChange={e => setBpForm({ ...bpForm, pulse: e.target.value })}
              />
            </label>
          </div>
          <div className="goal-group">
            <span className="goal-label">Цель:</span>
            <label className="goal-option">
              <input
                type="radio"
                name="bp-goal"
                value="lower"
                checked={bpForm.goal === "lower"}
                onChange={() => setBpForm({ ...bpForm, goal: "lower" })}
              />
              Снизить
            </label>
            <label className="goal-option">
              <input
                type="radio"
                name="bp-goal"
                value="raise"
                checked={bpForm.goal === "raise"}
                onChange={() => setBpForm({ ...bpForm, goal: "raise" })}
              />
              Повысить
            </label>
          </div>
          <label>
            Дополнительный вопрос или симптомы
            <textarea
              placeholder="Например: какие упражнения безопасны?"
              value={bpForm.question}
              onChange={e => setBpForm({ ...bpForm, question: e.target.value })}
            />
          </label>
          <label>
            Комментарий к измерению
            <textarea
              placeholder="Например: измерял утром после пробуждения"
              value={bpForm.comment}
              onChange={e => setBpForm({ ...bpForm, comment: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={saveBloodPressureToArchive} disabled={bpLoading}>
              Сохранить показатели
            </button>
            <button type="submit" disabled={bpLoading}>
              {bpLoading ? "Запрашиваем рекомендации..." : "Получить советы"}
            </button>
            {bpError && <p className="error">{bpError}</p>}
          </div>
        </form>
        {bpAdvice && (
          <article className="card advice-result">
            <h3>Рекомендации</h3>
            <pre className="advice-text">{bpAdvice}</pre>
          </article>
        )}
        {bpHistory.length > 0 && (
          <details className="card history-card" open>
            <summary>Архив запросов</summary>
            <ul className="history-list">
              {bpHistory.map(entry => (
                <li key={entry.id} className="history-item">
                  <div className="history-meta">
                    <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                    <div className="metric-tags">
                      {entry.systolic && <span className="metric-tag">Систолическое: {entry.systolic}</span>}
                      {entry.diastolic && <span className="metric-tag">Диастолическое: {entry.diastolic}</span>}
                      {entry.pulse && <span className="metric-tag">Пульс: {entry.pulse}</span>}
                      <span
                        className={`metric-tag goal ${entry.goal === "lower" ? "goal-lower" : "goal-raise"}`}
                      >
                        Цель: {entry.goal === "lower" ? "Снизить" : "Повысить"}
                      </span>
                    </div>
                  </div>
                  {entry.question && (
                    <p className="history-question">
                      <strong>Вопрос:</strong> {entry.question}
                    </p>
                  )}
                  {entry.comment && (
                    <p className="history-comment">
                      <strong>Комментарий:</strong> {entry.comment}
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
  }

  function renderLipidTab() {
    return (
      <div className="tab-panel tab-stack">
        <h2>Липидный профиль и сахар</h2>
        <form className="card" onSubmit={handleLipidSubmit}>
          <div className="metrics-grid">
            <label>
              Дата анализа
              <input type="date" value={lipidForm.date} onChange={e => setLipidForm({ ...lipidForm, date: e.target.value })} />
            </label>
            <label>
              Общий холестерин, ммоль/л
              <input
                type="number"
                step="0.1"
                min="0"
                value={lipidForm.cholesterol}
                onChange={e => setLipidForm({ ...lipidForm, cholesterol: e.target.value })}
              />
            </label>
            <label>
              Холестерин ЛПВП (HDL), ммоль/л
              <input
                type="number"
                step="0.1"
                min="0"
                value={lipidForm.hdl}
                onChange={e => setLipidForm({ ...lipidForm, hdl: e.target.value })}
              />
            </label>
            <label>
              Холестерин ЛПНП (LDL), ммоль/л
              <input
                type="number"
                step="0.1"
                min="0"
                value={lipidForm.ldl}
                onChange={e => setLipidForm({ ...lipidForm, ldl: e.target.value })}
              />
            </label>
            <label>
              Триглицериды, ммоль/л
              <input
                type="number"
                step="0.1"
                min="0"
                value={lipidForm.triglycerides}
                onChange={e => setLipidForm({ ...lipidForm, triglycerides: e.target.value })}
              />
            </label>
            <label>
              Уровень сахара (глюкоза), ммоль/л
              <input
                type="number"
                step="0.1"
                min="0"
                value={lipidForm.glucose}
                onChange={e => setLipidForm({ ...lipidForm, glucose: e.target.value })}
              />
            </label>
          </div>
          <div className="goal-columns">
            <div className="goal-group">
              <span className="goal-label">Цель:</span>
              <label className="goal-option">
                <input
                  type="radio"
                  name="lipid-goal"
                  value="lower"
                  checked={lipidForm.goal === "lower"}
                  onChange={() => setLipidForm({ ...lipidForm, goal: "lower" })}
                />
                Снизить риски
              </label>
              <label className="goal-option">
                <input
                  type="radio"
                  name="lipid-goal"
                  value="raise"
                  checked={lipidForm.goal === "raise"}
                  onChange={() => setLipidForm({ ...lipidForm, goal: "raise" })}
                />
                Повысить значения
              </label>
            </div>
          </div>
          <label>
            Что ещё важно уточнить?
            <textarea
              placeholder="Например: принимаю статины и хочу понять, что добавить в рацион"
              value={lipidForm.question}
              onChange={e => setLipidForm({ ...lipidForm, question: e.target.value })}
            />
          </label>
          <label>
            Комментарий к анализу
            <textarea
              placeholder="Например: сдавал анализ после курса терапии"
              value={lipidForm.comment}
              onChange={e => setLipidForm({ ...lipidForm, comment: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="button" className="ghost" onClick={saveLipidToArchive} disabled={lipidLoading}>
              Сохранить показатели
            </button>
            <button type="submit" disabled={lipidLoading}>
              {lipidLoading ? "Запрашиваем рекомендации..." : "Получить советы"}
            </button>
            {lipidError && <p className="error">{lipidError}</p>}
          </div>
        </form>
        {lipidAdvice && (
          <article className="card advice-result">
            <h3>Рекомендации</h3>
            <pre className="advice-text">{lipidAdvice}</pre>
          </article>
        )}
        {lipidHistory.length > 0 && (
          <details className="card history-card" open>
            <summary>Архив липидов и сахара</summary>
            <ul className="history-list">
              {lipidHistory.map(entry => (
                <li key={entry.id} className="history-item">
                  <div className="history-meta">
                    <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                    <div className="metric-tags">
                      {entry.date && <span className="metric-tag">Дата анализа: {entry.date}</span>}
                      {entry.cholesterol && <span className="metric-tag">Общий холестерин: {entry.cholesterol}</span>}
                      {entry.hdl && <span className="metric-tag">ЛПВП: {entry.hdl}</span>}
                      {entry.ldl && <span className="metric-tag">ЛПНП: {entry.ldl}</span>}
                      {entry.triglycerides && <span className="metric-tag">Триглицериды: {entry.triglycerides}</span>}
                      {entry.glucose && <span className="metric-tag">Глюкоза: {entry.glucose}</span>}
                      <span className={`metric-tag goal ${entry.goal === "lower" ? "goal-lower" : "goal-raise"}`}>
                        Цель: {entry.goal === "lower" ? "Снизить риски" : "Повысить значения"}
                      </span>
                    </div>
                  </div>
                  {entry.question && (
                    <p className="history-question">
                      <strong>Вопрос:</strong> {entry.question}
                    </p>
                  )}
                  {entry.comment && (
                    <p className="history-comment">
                      <strong>Комментарий:</strong> {entry.comment}
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
  }

  function renderNutritionTab() {
    return (
      <div className="tab-panel tab-stack">
        <h2>Консультация нутрициолога</h2>
        <form className="card" onSubmit={handleNutritionSubmit}>
          <div className="metrics-grid">
            <label>
              Вес, кг
              <input
                type="number"
                min="0"
                step="0.1"
                value={nutritionForm.weight}
                onChange={e => setNutritionForm({ ...nutritionForm, weight: e.target.value })}
              />
            </label>
            <label>
              Рост, см
              <input
                type="number"
                min="0"
                value={nutritionForm.height}
                onChange={e => setNutritionForm({ ...nutritionForm, height: e.target.value })}
              />
            </label>
            <label>
              Калорийность рациона, ккал
              <input
                type="number"
                min="0"
                value={nutritionForm.calories}
                onChange={e => setNutritionForm({ ...nutritionForm, calories: e.target.value })}
              />
            </label>
            <label>
              Активность
              <input
                placeholder="Например: 2 тренировки в неделю"
                value={nutritionForm.activity}
                onChange={e => setNutritionForm({ ...nutritionForm, activity: e.target.value })}
              />
            </label>
          </div>
          <label>
            Опишите цель или вопрос
            <textarea
              placeholder="Например: хочу снизить вес без жестких диет"
              value={nutritionForm.question}
              onChange={e => setNutritionForm({ ...nutritionForm, question: e.target.value })}
            />
          </label>
          <label>
            Комментарий к измерениям
            <textarea
              placeholder="Дополнительные примечания: как чувствовали себя, что ели"
              value={nutritionForm.comment}
              onChange={e => setNutritionForm({ ...nutritionForm, comment: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={nutritionLoading}>
              {nutritionLoading ? "Запрашиваем рекомендации..." : "Получить советы"}
            </button>
            {nutritionError && <p className="error">{nutritionError}</p>}
          </div>
        </form>
        {nutritionAdvice && (
          <article className="card advice-result">
            <h3>Рекомендации</h3>
            <pre className="advice-text">{nutritionAdvice}</pre>
          </article>
        )}
        {nutritionHistory.length > 0 && (
          <details className="card history-card" open>
            <summary>Архив нутрициолога</summary>
            <ul className="history-list">
              {nutritionHistory.map(entry => (
                <li key={entry.id} className="history-item">
                  <div className="history-meta">
                    <span className="history-tag">{formatDateTime(entry.createdAt)}</span>
                    <div className="metric-tags">
                      {entry.weight && <span className="metric-tag">Вес: {entry.weight} кг</span>}
                      {entry.height && <span className="metric-tag">Рост: {entry.height} см</span>}
                      {entry.calories && <span className="metric-tag">Калории: {entry.calories}</span>}
                      {entry.activity && <span className="metric-tag">Активность: {entry.activity}</span>}
                    </div>
                  </div>
                  {entry.question && (
                    <p className="history-question">
                      <strong>Запрос:</strong> {entry.question}
                    </p>
                  )}
                  {entry.comment && (
                    <p className="history-comment">
                      <strong>Комментарий:</strong> {entry.comment}
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
  }

  function renderAssistantTab() {
    return (
      <div className="tab-panel assistant-panel">
        <h2>AI ассистент</h2>
        <div className="card assistant-card">
          <div className="assistant-messages">
            {assistantMessages.length === 0 && <p className="muted">Задайте вопрос, и ассистент ответит.</p>}
            {assistantMessages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`assistant-message ${message.role}`}>
                <span className="assistant-role">{message.role === "user" ? "Вы" : "Ассистент"}</span>
                <p>{message.content}</p>
              </div>
            ))}
          </div>
          <form className="assistant-form" onSubmit={sendAssistantMessage}>
            <textarea
              placeholder="Напишите, что вас беспокоит"
              value={assistantInput}
              onChange={e => setAssistantInput(e.target.value)}
              rows={3}
            />
            <div className="assistant-actions">
              <button type="submit" disabled={assistantLoading}>
                {assistantLoading ? "Ассистент думает..." : "Отправить"}
              </button>
              <button type="button" className="ghost" onClick={resetAssistant}>
                Очистить диалог
              </button>
              {assistantError && <p className="error">{assistantError}</p>}
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!userStore.token) {
    return renderAuth();
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <h1>CholestoFit</h1>
          <p>Персональные рекомендации по здоровью</p>
        </div>
        <div className="topbar-profile">
          <div className="topbar-profile-text">
            <span className="topbar-profile-label">Аккаунт</span>
            <span className="topbar-profile-email">{userStore.me?.email ?? email}</span>
          </div>
          <button className="ghost" type="button" onClick={() => userStore.logout()}>
            Выйти
          </button>
        </div>
      </header>
      <main className="content">
        <div className="tab-container">
          {activeTab === "bp" && renderBloodPressureTab()}
          {activeTab === "lipid" && renderLipidTab()}
          {activeTab === "nutrition" && renderNutritionTab()}
          {activeTab === "assistant" && renderAssistantTab()}
        </div>
      </main>
      <nav className="tabbar">
        {TAB_ITEMS.map(item => (
          <button
            key={item.key}
            type="button"
            className={`tab-button${activeTab === item.key ? " active" : ""}`}
            onClick={() => setActiveTab(item.key)}
          >
            <span className="tab-icon" aria-hidden>{item.icon}</span>
            <span className="tab-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
});

export default App;
