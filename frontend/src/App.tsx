import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { observer } from "mobx-react-lite";
import { userStore } from "./stores/user";
import type { AssistantMessage } from "./types/api";
import { apiUrl } from "./lib/api";
import "./App.css";

type TabKey = "bp" | "metabolic" | "nutrition" | "assistant";
type AdjustmentGoal = "lower" | "raise";

const TAB_ITEMS: { key: TabKey; label: string; icon: string }[] = [
  { key: "bp", label: "Давление и пульс", icon: "🩺" },
  { key: "metabolic", label: "Холестерин и сахар", icon: "🩸" },
  { key: "nutrition", label: "Нутрициолог", icon: "🥗" },
  { key: "assistant", label: "AI ассистент", icon: "🤖" }
];

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
    question: ""
  });
  const [bpAdvice, setBpAdvice] = useState("");
  const [bpLoading, setBpLoading] = useState(false);
  const [bpError, setBpError] = useState<string | null>(null);

  const [metabolicForm, setMetabolicForm] = useState({
    cholesterol: "",
    sugar: "",
    cholGoal: "lower" as AdjustmentGoal,
    sugarGoal: "lower" as AdjustmentGoal,
    question: ""
  });
  const [metabolicAdvice, setMetabolicAdvice] = useState("");
  const [metabolicLoading, setMetabolicLoading] = useState(false);
  const [metabolicError, setMetabolicError] = useState<string | null>(null);

  const [nutritionForm, setNutritionForm] = useState({
    weight: "",
    height: "",
    calories: "",
    activity: "",
    question: ""
  });
  const [nutritionAdvice, setNutritionAdvice] = useState("");
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);

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

  function resetState() {
    setActiveTab("bp");
    setBpForm({ systolic: "", diastolic: "", pulse: "", goal: "lower", question: "" });
    setBpAdvice("");
    setBpError(null);
    setMetabolicForm({ cholesterol: "", sugar: "", cholGoal: "lower", sugarGoal: "lower", question: "" });
    setMetabolicAdvice("");
    setMetabolicError(null);
    setNutritionForm({ weight: "", height: "", calories: "", activity: "", question: "" });
    setNutritionAdvice("");
    setNutritionError(null);
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
      setBpAdvice(reply);
    } catch (err) {
      setBpError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
      setBpAdvice("");
    } finally {
      setBpLoading(false);
    }
  }

  async function handleMetabolicSubmit(e: FormEvent) {
    e.preventDefault();
    setMetabolicLoading(true);
    setMetabolicError(null);
    try {
      const metrics: string[] = [];
      if (metabolicForm.cholesterol) metrics.push(`общий холестерин ${metabolicForm.cholesterol} ммоль/л`);
      if (metabolicForm.sugar) metrics.push(`уровень сахара натощак ${metabolicForm.sugar} ммоль/л`);
      const goalParts: string[] = [];
      if (metabolicForm.cholesterol) {
        goalParts.push(`Нужно ${metabolicForm.cholGoal === "lower" ? "снизить" : "повысить"} холестерин.`);
      }
      if (metabolicForm.sugar) {
        goalParts.push(`Нужно ${metabolicForm.sugarGoal === "lower" ? "снизить" : "повысить"} уровень сахара.`);
      }
      const prompt = [
        "Ты — врач профилактической медицины и эндокринолог.",
        metrics.length > 0 ? `Актуальные показатели пациента: ${metrics.join(", ")}.` : "Пациент не указал текущие показатели.",
        goalParts.join(" "),
        "Составь план из нескольких пунктов: питание, активность, контроль образа жизни и когда нужно обратиться к врачу.",
        metabolicForm.question ? `Дополнительный вопрос пациента: ${metabolicForm.question}.` : ""
      ]
        .filter(Boolean)
        .join(" ");
      const reply = await askAssistant(prompt);
      setMetabolicAdvice(reply);
    } catch (err) {
      setMetabolicError(err instanceof Error ? err.message : "Не удалось получить рекомендации");
      setMetabolicAdvice("");
    } finally {
      setMetabolicLoading(false);
    }
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
      const prompt = [
        "Ты — нутрициолог. На основе данных клиента составь рекомендации по питанию и режиму на ближайшие 1-2 недели.",
        facts.length > 0 ? `Исходные данные: ${facts.join(", ")}.` : "Клиент не указал исходные данные.",
        nutritionForm.question
          ? `Дополнительный запрос клиента: ${nutritionForm.question}.`
          : "Сделай рекомендации универсальными и безопасными.",
        "Напомни о необходимости консультации врача при хронических заболеваниях."
      ].join(" ");
      const reply = await askAssistant(prompt);
      setNutritionAdvice(reply);
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
        <h2>Контроль давления и пульса</h2>
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
          <div className="form-actions">
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
      </div>
    );
  }

  function renderMetabolicTab() {
    return (
      <div className="tab-panel tab-stack">
        <h2>Холестерин и сахар</h2>
        <form className="card" onSubmit={handleMetabolicSubmit}>
          <div className="metrics-grid">
            <label>
              Общий холестерин, ммоль/л
              <input
                type="number"
                step="0.1"
                min="0"
                value={metabolicForm.cholesterol}
                onChange={e => setMetabolicForm({ ...metabolicForm, cholesterol: e.target.value })}
              />
            </label>
            <label>
              Глюкоза натощак, ммоль/л
              <input
                type="number"
                step="0.1"
                min="0"
                value={metabolicForm.sugar}
                onChange={e => setMetabolicForm({ ...metabolicForm, sugar: e.target.value })}
              />
            </label>
          </div>
          <div className="goal-columns">
            <div className="goal-group">
              <span className="goal-label">Цель по холестерину:</span>
              <label className="goal-option">
                <input
                  type="radio"
                  name="chol-goal"
                  value="lower"
                  checked={metabolicForm.cholGoal === "lower"}
                  onChange={() => setMetabolicForm({ ...metabolicForm, cholGoal: "lower" })}
                />
                Снизить
              </label>
              <label className="goal-option">
                <input
                  type="radio"
                  name="chol-goal"
                  value="raise"
                  checked={metabolicForm.cholGoal === "raise"}
                  onChange={() => setMetabolicForm({ ...metabolicForm, cholGoal: "raise" })}
                />
                Повысить
              </label>
            </div>
            <div className="goal-group">
              <span className="goal-label">Цель по сахару:</span>
              <label className="goal-option">
                <input
                  type="radio"
                  name="sugar-goal"
                  value="lower"
                  checked={metabolicForm.sugarGoal === "lower"}
                  onChange={() => setMetabolicForm({ ...metabolicForm, sugarGoal: "lower" })}
                />
                Снизить
              </label>
              <label className="goal-option">
                <input
                  type="radio"
                  name="sugar-goal"
                  value="raise"
                  checked={metabolicForm.sugarGoal === "raise"}
                  onChange={() => setMetabolicForm({ ...metabolicForm, sugarGoal: "raise" })}
                />
                Повысить
              </label>
            </div>
          </div>
          <label>
            Что ещё важно уточнить?
            <textarea
              placeholder="Например: принимаю статины и хочу понять, что добавить в рацион"
              value={metabolicForm.question}
              onChange={e => setMetabolicForm({ ...metabolicForm, question: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={metabolicLoading}>
              {metabolicLoading ? "Запрашиваем рекомендации..." : "Получить советы"}
            </button>
            {metabolicError && <p className="error">{metabolicError}</p>}
          </div>
        </form>
        {metabolicAdvice && (
          <article className="card advice-result">
            <h3>Рекомендации</h3>
            <pre className="advice-text">{metabolicAdvice}</pre>
          </article>
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
          {activeTab === "metabolic" && renderMetabolicTab()}
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
