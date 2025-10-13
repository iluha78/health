import { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import { userStore } from "./stores/user";
import "./App.css";

type Lipid = {
  id: number;
  dt: string;
  chol?: number;
  hdl?: number;
  ldl?: number;
  trig?: number;
  note?: string;
};

type Food = {
  id: number;
  name: string;
  kcal: number;
  protein_g?: number;
  fat_g?: number;
  sfa_g?: number;
  carbs_g?: number;
  fiber_g?: number;
  soluble_fiber_g?: number;
};

type DiaryItem = {
  id: number;
  grams: number;
  note?: string;
  food: Food | null;
};

type DiaryDay = {
  date: string;
  items: DiaryItem[];
};

const App = observer(() => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [lipids, setLipids] = useState<Lipid[]>([]);
  const [lipidForm, setLipidForm] = useState({ dt: "", chol: "", hdl: "", ldl: "", trig: "", note: "" });

  const [profileForm, setProfileForm] = useState({
    sex: "",
    age: "",
    height_cm: "",
    weight_kg: "",
    activity: "",
    kcal_goal: "",
    sfa_limit_g: "",
    fiber_goal_g: ""
  });

  const [diaryDate, setDiaryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [diary, setDiary] = useState<DiaryDay | null>(null);
  const [foodQuery, setFoodQuery] = useState("");
  const [foods, setFoods] = useState<Food[]>([]);
  const [diaryForm, setDiaryForm] = useState({ foodId: "", grams: "", note: "" });

  useEffect(() => {
    if (userStore.targets) {
      setProfileForm({
        sex: userStore.targets.sex ?? "",
        age: userStore.targets.age ?? "",
        height_cm: userStore.targets.height_cm ?? "",
        weight_kg: userStore.targets.weight_kg ?? "",
        activity: userStore.targets.activity ?? "",
        kcal_goal: userStore.targets.kcal_goal ?? "",
        sfa_limit_g: userStore.targets.sfa_limit_g ?? "",
        fiber_goal_g: userStore.targets.fiber_goal_g ?? ""
      });
    }
  }, [userStore.targets]);

  useEffect(() => {
    if (userStore.token) {
      loadLipids();
      loadDiary(diaryDate);
      if (!userStore.me) {
        userStore.refresh();
      }
    } else {
      setLipids([]);
      setDiary(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStore.token]);

  const authHeaders = useMemo(() => {
    const headers = new Headers();
    if (userStore.token) {
      headers.set("Authorization", `Bearer ${userStore.token}`);
      headers.set("Content-Type", "application/json");
    }
    return headers;
  }, [userStore.token]);

  async function handleAuthSubmit(e: React.FormEvent) {
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

  async function loadLipids() {
    if (!userStore.token) return;
    const r = await fetch("/backend/lipids", { headers: authHeaders });
    const data = await r.json();
    setLipids(Array.isArray(data) ? data : []);
  }

  async function saveLipid(e: React.FormEvent) {
    e.preventDefault();
    if (!userStore.token) return;
    const body = {
      dt: lipidForm.dt,
      chol: lipidForm.chol ? Number(lipidForm.chol) : undefined,
      hdl: lipidForm.hdl ? Number(lipidForm.hdl) : undefined,
      ldl: lipidForm.ldl ? Number(lipidForm.ldl) : undefined,
      trig: lipidForm.trig ? Number(lipidForm.trig) : undefined,
      note: lipidForm.note || undefined
    };
    const r = await fetch("/backend/lipids", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body)
    });
    if (r.ok) {
      setLipidForm({ dt: "", chol: "", hdl: "", ldl: "", trig: "", note: "" });
      await loadLipids();
    }
  }

  async function deleteLipid(id: number) {
    if (!userStore.token) return;
    await fetch(`/backend/lipids/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${userStore.token}` } });
    await loadLipids();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userStore.token) return;
    const r = await fetch("/backend/profile", {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify(profileForm)
    });
    if (r.ok) {
      await userStore.refresh();
    }
  }

  async function loadDiary(date: string) {
    if (!userStore.token) return;
    const r = await fetch(`/backend/diary/${date}`, { headers: { Authorization: `Bearer ${userStore.token}` } });
    const data = await r.json();
    setDiary(data);
  }

  async function addDiaryItem(e: React.FormEvent) {
    e.preventDefault();
    if (!userStore.token || !diary) return;
    const body = {
      food_id: Number(diaryForm.foodId),
      grams: diaryForm.grams ? Number(diaryForm.grams) : null,
      note: diaryForm.note || undefined
    };
    const r = await fetch(`/backend/diary/${diary.date}/items`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body)
    });
    if (r.ok) {
      setDiaryForm({ foodId: "", grams: "", note: "" });
      await loadDiary(diary.date);
    }
  }

  async function searchFoods(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userStore.token) return;
    const r = await fetch(`/backend/foods?q=${encodeURIComponent(foodQuery)}`, {
      headers: { Authorization: `Bearer ${userStore.token}` }
    });
    const data = await r.json();
    setFoods(Array.isArray(data) ? data : []);
  }

  async function createFood(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!userStore.token) return;
    const form = new FormData(e.currentTarget);
    const numericFields = new Set(["kcal", "protein_g", "fat_g", "sfa_g", "carbs_g", "fiber_g", "soluble_fiber_g"]);
    const body: Record<string, string | number> = {};
    form.forEach((value, key) => {
      if (value === "") {
        return;
      }
      if (numericFields.has(key)) {
        body[key] = Number(value);
      } else {
        body[key] = value.toString();
      }
    });
    const r = await fetch("/backend/foods", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(body)
    });
    if (r.ok) {
      e.currentTarget.reset();
      await searchFoods();
    }
  }

  if (!userStore.token) {
    return (
      <div className="auth">
        <h1>CholestoFit</h1>
        <p>Войдите или зарегистрируйтесь, чтобы начать отслеживать здоровье сердца.</p>
        <div className="toggle">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Вход</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Регистрация</button>
        </div>
        <form onSubmit={handleAuthSubmit} className="card">
          <label>Email
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </label>
          <label>Пароль
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
          <button type="submit">{mode === "login" ? "Войти" : "Создать аккаунт"}</button>
          {userStore.error && <p className="error">{userStore.error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>CholestoFit</h1>
        <div>
          <span>{userStore.me?.email}</span>
          <button onClick={() => userStore.logout()}>Выйти</button>
        </div>
      </header>

      <section>
        <h2>Цели и профиль</h2>
        <form className="card" onSubmit={saveProfile}>
          <div className="grid">
            <label>Пол
              <select value={profileForm.sex} onChange={e => setProfileForm({ ...profileForm, sex: e.target.value })}>
                <option value="">-</option>
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
              </select>
            </label>
            <label>Возраст
              <input type="number" value={profileForm.age} onChange={e => setProfileForm({ ...profileForm, age: e.target.value })} />
            </label>
            <label>Рост (см)
              <input type="number" value={profileForm.height_cm} onChange={e => setProfileForm({ ...profileForm, height_cm: e.target.value })} />
            </label>
            <label>Вес (кг)
              <input type="number" value={profileForm.weight_kg} onChange={e => setProfileForm({ ...profileForm, weight_kg: e.target.value })} />
            </label>
            <label>Активность
              <select value={profileForm.activity} onChange={e => setProfileForm({ ...profileForm, activity: e.target.value })}>
                <option value="">-</option>
                <option value="sed">Минимальная</option>
                <option value="light">Лёгкая</option>
                <option value="mod">Средняя</option>
                <option value="high">Высокая</option>
                <option value="ath">Спортивная</option>
              </select>
            </label>
            <label>Цель по калориям
              <input type="number" value={profileForm.kcal_goal} onChange={e => setProfileForm({ ...profileForm, kcal_goal: e.target.value })} />
            </label>
            <label>Лимит насыщенных жиров (г)
              <input type="number" value={profileForm.sfa_limit_g} onChange={e => setProfileForm({ ...profileForm, sfa_limit_g: e.target.value })} />
            </label>
            <label>Цель по клетчатке (г)
              <input type="number" value={profileForm.fiber_goal_g} onChange={e => setProfileForm({ ...profileForm, fiber_goal_g: e.target.value })} />
            </label>
          </div>
          <button type="submit">Сохранить профиль</button>
        </form>
      </section>

      <section>
        <h2>Липидный профиль</h2>
        <form className="card" onSubmit={saveLipid}>
          <div className="grid">
            <label>Дата
              <input type="date" value={lipidForm.dt} onChange={e => setLipidForm({ ...lipidForm, dt: e.target.value })} required />
            </label>
            <label>Общий холестерин (ммоль/л)
              <input type="number" step="0.01" value={lipidForm.chol} onChange={e => setLipidForm({ ...lipidForm, chol: e.target.value })} />
            </label>
            <label>ЛПВП (HDL)
              <input type="number" step="0.01" value={lipidForm.hdl} onChange={e => setLipidForm({ ...lipidForm, hdl: e.target.value })} />
            </label>
            <label>ЛПНП (LDL)
              <input type="number" step="0.01" value={lipidForm.ldl} onChange={e => setLipidForm({ ...lipidForm, ldl: e.target.value })} />
            </label>
            <label>Триглицериды
              <input type="number" step="0.01" value={lipidForm.trig} onChange={e => setLipidForm({ ...lipidForm, trig: e.target.value })} />
            </label>
            <label>Комментарий
              <input value={lipidForm.note} onChange={e => setLipidForm({ ...lipidForm, note: e.target.value })} />
            </label>
          </div>
          <button type="submit">Добавить запись</button>
        </form>
        <ul className="list">
          {lipids.map(lipid => (
            <li key={lipid.id}>
              <strong>{lipid.dt}</strong> — холестерин: {lipid.chol ?? "-"} ммоль/л, HDL: {lipid.hdl ?? "-"}, LDL: {lipid.ldl ?? "-"}
              <button onClick={() => deleteLipid(lipid.id)}>Удалить</button>
              {lipid.note && <div className="note">{lipid.note}</div>}
            </li>
          ))}
          {lipids.length === 0 && <li>Записей пока нет.</li>}
        </ul>
      </section>

      <section>
        <h2>Пищевой дневник</h2>
        <div className="card">
          <label>Дата
            <input type="date" value={diaryDate} onChange={async e => {
              const value = e.target.value;
              setDiaryDate(value);
              await loadDiary(value);
            }} />
          </label>
          <form className="diary-form" onSubmit={addDiaryItem}>
            <select value={diaryForm.foodId} onChange={e => setDiaryForm({ ...diaryForm, foodId: e.target.value })} required>
              <option value="">Выберите продукт</option>
              {foods.map(food => (
                <option key={food.id} value={food.id}>
                  {food.name} · {food.kcal} ккал
                </option>
              ))}
            </select>
            <input type="number" placeholder="Масса, г" value={diaryForm.grams} onChange={e => setDiaryForm({ ...diaryForm, grams: e.target.value })} required />
            <input placeholder="Комментарий" value={diaryForm.note} onChange={e => setDiaryForm({ ...diaryForm, note: e.target.value })} />
            <button type="submit">Добавить</button>
          </form>
          <form className="search" onSubmit={searchFoods}>
            <input value={foodQuery} onChange={e => setFoodQuery(e.target.value)} placeholder="Поиск продукта" />
            <button type="submit">Найти</button>
          </form>
          <div className="diary-items">
            {diary?.items?.map(item => (
              <div key={item.id} className="diary-item">
                <strong>{item.food?.name ?? "Без продукта"}</strong>
                <span>{item.grams} г</span>
                {item.note && <span className="note">{item.note}</span>}
              </div>
            ))}
            {!diary || diary.items.length === 0 ? <p>Добавьте продукты, чтобы увидеть рацион.</p> : null}
          </div>
        </div>
        <details className="card">
          <summary>Добавить собственный продукт</summary>
          <form className="food-form" onSubmit={createFood}>
            <input name="name" placeholder="Название" required />
            <input name="kcal" type="number" placeholder="ккал" required />
            <input name="protein_g" type="number" step="0.1" placeholder="Белки, г" />
            <input name="fat_g" type="number" step="0.1" placeholder="Жиры, г" />
            <input name="sfa_g" type="number" step="0.1" placeholder="Насыщенные жиры, г" />
            <input name="carbs_g" type="number" step="0.1" placeholder="Углеводы, г" />
            <input name="fiber_g" type="number" step="0.1" placeholder="Клетчатка, г" />
            <input name="soluble_fiber_g" type="number" step="0.1" placeholder="Растворимая клетчатка, г" />
            <button type="submit">Создать продукт</button>
          </form>
        </details>
      </section>
    </div>
  );
});

export default App;
