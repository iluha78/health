# 🎨 Frontend для фото еды и консультаций

## 📦 Структура файлов (10 файлов)

### Hooks (2 файла)
- `useDailyFood.ts` - хук для работы с фото еды и калориями
- `useNutritionAdvice.ts` - хук для консультаций нутрициолога

### Компоненты (4 файла)
- `NutritionApp.tsx` - главный компонент с табами
- `DailyFoodTracker.tsx` - дневник питания с фото
- `FoodHistory.tsx` - история по дням
- `NutritionAdvicePanel.tsx` - панель консультаций

### Стили (4 файла)
- `NutritionApp.css`
- `DailyFoodTracker.css`
- `FoodHistory.css`
- `NutritionAdvicePanel.css`

---

## 🚀 Быстрая установка

### 1. Скопировать файлы

```bash
# Frontend
frontend/
├── src/
│   ├── hooks/
│   │   ├── useDailyFood.ts
│   │   └── useNutritionAdvice.ts
│   ├── components/
│   │   ├── NutritionApp.tsx
│   │   ├── DailyFoodTracker.tsx
│   │   ├── FoodHistory.tsx
│   │   └── NutritionAdvicePanel.tsx
│   └── styles/
│       ├── NutritionApp.css
│       ├── DailyFoodTracker.css
│       ├── FoodHistory.css
│       └── NutritionAdvicePanel.css
```

### 2. Подключить в App.tsx

```typescript
import { NutritionApp } from './components/NutritionApp';

function App() {
  const token = localStorage.getItem('token'); // или из вашего стейта

  return (
    <div className="App">
      <NutritionApp token={token || ''} />
    </div>
  );
}

export default App;
```

### 3. Готово! 🎉

---

## 💡 Использование компонентов

### Вариант 1: Все вместе (с табами)

```typescript
import { NutritionApp } from './components/NutritionApp';

function MyApp() {
  return <NutritionApp token={myToken} />;
}
```

**Что включает:**
- ✅ Дневник питания с фото
- ✅ История по дням
- ✅ Консультации нутрициолога
- ✅ Навигация по табам

### Вариант 2: Отдельные компоненты

```typescript
import { DailyFoodTracker } from './components/DailyFoodTracker';
import { FoodHistory } from './components/FoodHistory';
import { NutritionAdvicePanel } from './components/NutritionAdvicePanel';

function MyPage() {
  return (
    <>
      <DailyFoodTracker token={token} />
      <FoodHistory token={token} />
      <NutritionAdvicePanel token={token} />
    </>
  );
}
```

### Вариант 3: Только хуки (кастомный UI)

```typescript
import { useDailyFood } from './hooks/useDailyFood';
import { useNutritionAdvice } from './hooks/useNutritionAdvice';

function MyCustomComponent() {
  const { getDay, addPhoto } = useDailyFood(token);
  const { createAdvice } = useNutritionAdvice(token);

  // Ваша кастомная логика
}
```

---

## 📋 API хуков

### useDailyFood

```typescript
const {
  loading,              // Загрузка
  error,                // Ошибка
  getDay,               // Получить день с калориями
  addPhoto,             // Добавить фото (AI анализ)
  addManual,            // Добавить вручную
  getHistory,           // История по дням
  deletePhoto           // Удалить запись
} = useDailyFood(token);
```

**Примеры:**

```typescript
// Получить день
const dayData = await getDay('2025-11-07');
console.log(dayData.total_calories); // 1850

// Добавить фото
const photo = await addPhoto(file, '2025-11-07', '08:30:00', 'Завтрак');

// Добавить вручную
const manual = await addManual({
  date: '2025-11-07',
  title: 'Греческий салат',
  calories: 280,
  time: '20:00:00'
});

// История
const history = await getHistory(30);
history.forEach(day => {
  console.log(`${day.date}: ${day.total_calories} ккал`);
});

// Удалить
await deletePhoto(photoId);
```

### useNutritionAdvice

```typescript
const {
  loading,              // Загрузка
  error,                // Ошибка
  getDay,               // Консультации за день
  createAdvice,         // Создать консультацию
  getHistory,           // История по дням
  deleteAdvice          // Удалить консультацию
} = useNutritionAdvice(token);
```

**Примеры:**

```typescript
// Получить консультации за день
const dayData = await getDay('2025-11-07');
console.log(`Консультаций: ${dayData.count}`);

// Создать консультацию
const result = await createAdvice('2025-11-07', 'Снижение холестерина');
console.log(result.advice); // Текст консультации

// История
const history = await getHistory(30);
history.forEach(day => {
  console.log(`${day.date}: ${day.advices_count} консультаций`);
});

// Удалить
await deleteAdvice(adviceId);
```

---

## 🎨 Компоненты

### 1. NutritionApp (главный с табами)

```typescript
<NutritionApp token={token} />
```

**Что показывает:**
- Три таба: Дневник | История | Консультации
- Автоматическое переключение при выборе даты из истории

### 2. DailyFoodTracker (дневник питания)

```typescript
<DailyFoodTracker token={token} />
```

**Возможности:**
- ✅ Навигация по дням (← сегодня →)
- ✅ Сумма калорий за день
- ✅ Список всех приемов пищи
- ✅ Загрузка фото (AI анализ)
- ✅ Ручной ввод
- ✅ Удаление записей

**Интерфейс:**
```
┌─────────────────────────────────┐
│  📸 Дневник питания             │
│  ← [2025-11-07] → [Сегодня]    │
├─────────────────────────────────┤
│  Всего калорий: 1850 ккал       │
├─────────────────────────────────┤
│  ⏰ 08:30                        │
│  Овсянка с фруктами             │
│  Овсянка на молоке с бананом    │
│  🔥 350 ккал                     │
├─────────────────────────────────┤
│  [📸 Загрузить] [✏️ Вручную]    │
└─────────────────────────────────┘
```

### 3. FoodHistory (история по дням)

```typescript
<FoodHistory 
  token={token}
  onSelectDate={(date) => console.log(date)}
/>
```

**Возможности:**
- ✅ История за 7-90 дней
- ✅ Статистика (дней, средняя, всего)
- ✅ Клик по дню → переход в дневник
- ✅ Визуальная шкала калорий

**Интерфейс:**
```
┌─────────────────────────────────┐
│  📊 История питания             │
│  ┌───────┬───────┬───────┐      │
│  │ Дней  │Средняя│ Всего │      │
│  │  30   │ 1820  │54,600 │      │
│  └───────┴───────┴───────┘      │
├─────────────────────────────────┤
│  🔵 Сегодня        2025-11-07   │
│  📸 3 фото         🔥 1850 ккал │
│  [████████░░] 74%               │
├─────────────────────────────────┤
│  ⚪ Вчера          2025-11-06   │
│  📸 4 фото         🔥 2100 ккал │
│  [██████████] 84%               │
└─────────────────────────────────┘
```

### 4. NutritionAdvicePanel (консультации)

```typescript
<NutritionAdvicePanel token={token} />
```

**Возможности:**
- ✅ Навигация по дням
- ✅ Все консультации за день
- ✅ Создание новой консультации
- ✅ Фокус (опционально)
- ✅ Удаление

**Интерфейс:**
```
┌─────────────────────────────────┐
│  💡 Консультации нутрициолога   │
│  ← [2025-11-07] → [Сегодня]    │
├─────────────────────────────────┤
│  2 консультации                 │
├─────────────────────────────────┤
│  ⏰ 10:15  🎯 Снижение холестер.│
│  Для эффективного снижения...   │
│  рекомендую увеличить...        │
├─────────────────────────────────┤
│  [✨ Получить консультацию]     │
└─────────────────────────────────┘
```

---

## 🎯 Пример интеграции

### Полный пример с авторизацией

```typescript
import React, { useState, useEffect } from 'react';
import { NutritionApp } from './components/NutritionApp';

function App() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверка токена при загрузке
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const handleLogin = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    setToken(data.token);
    localStorage.setItem('token', data.token);
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('token');
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <header>
        <h1>CholestoFit</h1>
        <button onClick={handleLogout}>Выйти</button>
      </header>
      
      <NutritionApp token={token} />
    </div>
  );
}

export default App;
```

---

## 🎨 Кастомизация стилей

### Изменить цветовую схему

В CSS файлах найдите градиенты:

```css
/* Основной градиент (фиолетовый) */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Зеленый градиент (консультации) */
background: linear-gradient(135deg, #27ae60 0%, #229954 100%);
```

Замените на свои цвета:

```css
/* Например, синий */
background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
```

### Изменить шрифты

```css
.daily-food-tracker {
  font-family: 'Your Font', sans-serif;
}
```

### Адаптивность

Все компоненты адаптивны для мобильных устройств.  
Брейкпоинт: `768px`

---

## 🔧 Настройка API endpoint

По умолчанию используется `/api/*`

Если ваш API на другом адресе:

```typescript
// useDailyFood.ts
const response = await fetch(`${API_URL}/daily-food/${date}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

Или создайте `config.ts`:

```typescript
export const API_URL = process.env.REACT_APP_API_URL || '/api';
```

---

## 📊 TypeScript типы

Все типы экспортируются из хуков:

```typescript
import type { 
  FoodPhoto, 
  DayData, 
  DayHistory 
} from './hooks/useDailyFood';

import type { 
  NutritionAdvice, 
  AdviceDay, 
  AdviceHistory 
} from './hooks/useNutritionAdvice';
```

---

## ✅ Чеклист установки

- [ ] Скопировали все 10 файлов
- [ ] Подключили в App.tsx
- [ ] Проверили работу компонентов
- [ ] Настроили API endpoint (если нужно)
- [ ] Кастомизировали стили (если нужно)

---

## 🎉 Готово!

Теперь у вас есть **полноценный frontend** для:
- ✅ Фото еды с AI-анализом
- ✅ Автоматического подсчета калорий
- ✅ Консультаций нутрициолога
- ✅ Истории по дням

**Приятного использования! 🍽️**
