# 📸 Фото еды и консультации по дням - API документация

## 🎯 Что нового

### 1. Фото еды с калориями (по дням)
- ✅ Сохранение фото еды с анализом калорий
- ✅ Группировка по дням
- ✅ Автоматический подсчет суммы калорий за день
- ✅ История по дням

### 2. Консультации нутрициолога (по дням)
- ✅ Сохранение консультаций с привязкой к дате
- ✅ Просмотр всех консультаций за день
- ✅ История консультаций по дням

---

## 📊 API Endpoints

### Фото еды с калориями

#### 1. Получить записи за день (с суммой калорий)

```http
GET /daily-food/{date}
Authorization: Bearer {token}
```

**Параметры:**
- `date` - дата в формате YYYY-MM-DD (например, 2025-11-07)

**Ответ:**
```json
{
  "date": "2025-11-07",
  "photos": [
    {
      "id": 1,
      "date": "2025-11-07",
      "time": "08:30:00",
      "title": "Овсянка с фруктами",
      "description": "Овсянка на молоке с бананом и ягодами",
      "estimated_calories": 350,
      "note": "Завтрак",
      "created_at": "2025-11-07T08:32:15"
    },
    {
      "id": 2,
      "date": "2025-11-07",
      "time": "13:00:00",
      "title": "Куриная грудка с овощами",
      "description": "Запеченная куриная грудка с брокколи и морковью",
      "estimated_calories": 420,
      "note": "Обед",
      "created_at": "2025-11-07T13:05:22"
    }
  ],
  "total_calories": 770
}
```

#### 2. Создать запись с фото (AI анализ)

```http
POST /daily-food
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Параметры:**
- `photo` (file, обязательный) - фото блюда
- `date` (string, опциональный) - дата, по умолчанию текущая
- `time` (string, опциональный) - время (HH:MM:SS), по умолчанию текущее
- `note` (string, опциональный) - заметка

**Пример:**
```bash
curl -X POST http://localhost:8080/daily-food \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@breakfast.jpg" \
  -F "date=2025-11-07" \
  -F "time=08:30:00" \
  -F "note=Завтрак"
```

**Ответ:**
```json
{
  "id": 1,
  "date": "2025-11-07",
  "time": "08:30:00",
  "title": "Овсянка с фруктами",
  "description": "Овсянка на молоке с бананом, черникой и медом",
  "estimated_calories": 350,
  "note": "Завтрак",
  "created_at": "2025-11-07T08:32:15"
}
```

#### 3. Создать запись вручную (без фото)

```http
POST /daily-food
Authorization: Bearer {token}
Content-Type: application/json
```

**Параметры:**
```json
{
  "date": "2025-11-07",
  "time": "20:00:00",
  "title": "Греческий салат",
  "description": "Помидоры, огурцы, фета, оливки",
  "calories": 280,
  "note": "Ужин"
}
```

**Ответ:**
```json
{
  "id": 3,
  "date": "2025-11-07",
  "time": "20:00:00",
  "title": "Греческий салат",
  "description": "Помидоры, огурцы, фета, оливки",
  "estimated_calories": 280,
  "note": "Ужин",
  "created_at": "2025-11-07T20:05:10"
}
```

#### 4. Получить историю по дням

```http
GET /daily-food-history?limit=30
Authorization: Bearer {token}
```

**Параметры:**
- `limit` (опциональный) - количество дней, по умолчанию 30, максимум 90

**Ответ:**
```json
[
  {
    "date": "2025-11-07",
    "photos_count": 3,
    "total_calories": 1050
  },
  {
    "date": "2025-11-06",
    "photos_count": 4,
    "total_calories": 1850
  },
  {
    "date": "2025-11-05",
    "photos_count": 2,
    "total_calories": 890
  }
]
```

#### 5. Удалить запись

```http
DELETE /daily-food/{id}
Authorization: Bearer {token}
```

**Ответ:**
```json
{
  "status": "ok"
}
```

---

### Консультации нутрициолога

#### 1. Получить консультации за день

```http
GET /nutrition-advice/{date}
Authorization: Bearer {token}
```

**Параметры:**
- `date` - дата в формате YYYY-MM-DD

**Ответ:**
```json
{
  "date": "2025-11-07",
  "advices": [
    {
      "id": 1,
      "date": "2025-11-07",
      "focus": "Снижение холестерина",
      "advice": "Рекомендую увеличить потребление растворимой клетчатки...",
      "created_at": "2025-11-07T10:15:30Z"
    },
    {
      "id": 2,
      "date": "2025-11-07",
      "focus": "План питания на день",
      "advice": "Для снижения холестерина рекомендую следующий план...",
      "created_at": "2025-11-07T14:20:15Z"
    }
  ],
  "count": 2
}
```

#### 2. Создать консультацию

```http
POST /nutrition-advice
Authorization: Bearer {token}
Content-Type: application/json
```

**Параметры:**
```json
{
  "date": "2025-11-07",
  "focus": "Снижение холестерина"
}
```

**Ответ:**
```json
{
  "advice": "Для эффективного снижения холестерина рекомендую...",
  "record": {
    "id": 1,
    "date": "2025-11-07",
    "focus": "Снижение холестерина",
    "advice": "Для эффективного снижения холестерина рекомендую...",
    "created_at": "2025-11-07T10:15:30Z"
  }
}
```

#### 3. Получить историю консультаций по дням

```http
GET /nutrition-advice-history?limit=30
Authorization: Bearer {token}
```

**Параметры:**
- `limit` (опциональный) - количество дней, по умолчанию 30, максимум 90

**Ответ:**
```json
[
  {
    "date": "2025-11-07",
    "advices_count": 2
  },
  {
    "date": "2025-11-05",
    "advices_count": 1
  },
  {
    "date": "2025-11-03",
    "advices_count": 3
  }
]
```

#### 4. Удалить консультацию

```http
DELETE /nutrition-advice/{id}
Authorization: Bearer {token}
```

**Ответ:**
```json
{
  "status": "ok"
}
```

---

## 🔧 Установка

### 1. Скопировать файлы

```bash
# Миграция
cp backend_migrations_006_daily_nutrition.sql backend/migrations/006_daily_nutrition.sql

# Модели
cp backend_DailyFoodPhoto.php backend/src/Models/DailyFoodPhoto.php
cp backend_NutritionAdvice.php backend/src/Models/NutritionAdvice.php

# Контроллеры
cp backend_DailyFoodPhotoController.php backend/src/Controllers/DailyFoodPhotoController.php
cp backend_NutritionAdviceController.php backend/src/Controllers/NutritionAdviceController.php

# Роуты (заменить существующий)
cp routes_updated.php backend/config/routes.php
```

### 2. Применить миграцию

```bash
cd backend
composer dump-autoload
composer migrate
```

Или через Docker:

```bash
docker-compose restart backend
```

### 3. Проверка

```bash
# Проверить таблицы
mysql -u root -p cholestofit -e "SHOW TABLES LIKE 'daily_food_photos';"
mysql -u root -p cholestofit -e "DESCRIBE nutrition_advices;"

# Тест API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/daily-food/2025-11-07
```

---

## 💻 Примеры использования (Frontend)

### React Hook для фото еды

```typescript
import { useState, useCallback } from 'react';

interface FoodPhoto {
  id: number;
  date: string;
  time: string;
  title: string;
  description: string;
  estimated_calories: number | null;
  note: string | null;
}

interface DayData {
  date: string;
  photos: FoodPhoto[];
  total_calories: number;
}

export function useDailyFood(token: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Получить записи за день
  const getDay = useCallback(async (date: string): Promise<DayData> => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/daily-food/${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить данные');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Добавить фото с анализом
  const addPhoto = useCallback(async (
    photo: File,
    date: string,
    time?: string,
    note?: string
  ) => {
    if (!token) throw new Error('Требуется авторизация');

    const formData = new FormData();
    formData.append('photo', photo);
    formData.append('date', date);
    if (time) formData.append('time', time);
    if (note) formData.append('note', note);

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/daily-food', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка загрузки');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Добавить вручную
  const addManual = useCallback(async (data: {
    date: string;
    title: string;
    description?: string;
    calories?: number;
    time?: string;
    note?: string;
  }) => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/daily-food', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка сохранения');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Получить историю
  const getHistory = useCallback(async (limit = 30) => {
    if (!token) throw new Error('Требуется авторизация');

    const response = await fetch(
      `/api/daily-food-history?limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    if (!response.ok) {
      throw new Error('Не удалось загрузить историю');
    }

    return await response.json();
  }, [token]);

  // Удалить запись
  const deletePhoto = useCallback(async (id: number) => {
    if (!token) throw new Error('Требуется авторизация');

    const response = await fetch(`/api/daily-food/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error('Не удалось удалить запись');
    }
  }, [token]);

  return {
    loading,
    error,
    getDay,
    addPhoto,
    addManual,
    getHistory,
    deletePhoto
  };
}
```

### Пример компонента

```typescript
import React, { useState, useEffect } from 'react';
import { useDailyFood } from './useDailyFood';

export function DailyFoodTracker({ token }: { token: string }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayData, setDayData] = useState<any>(null);
  const { loading, error, getDay, addPhoto, addManual } = useDailyFood(token);

  useEffect(() => {
    loadDay();
  }, [date]);

  const loadDay = async () => {
    try {
      const data = await getDay(date);
      setDayData(data);
    } catch (err) {
      console.error('Ошибка загрузки:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await addPhoto(file, date);
      await loadDay(); // Перезагрузить данные
    } catch (err) {
      console.error('Ошибка загрузки фото:', err);
    }
  };

  return (
    <div className="daily-food-tracker">
      <h2>Дневник питания</h2>
      
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {error && <div className="error">{error}</div>}
      {loading && <div>Загрузка...</div>}

      {dayData && (
        <>
          <div className="total-calories">
            <h3>Калории за день: {dayData.total_calories} ккал</h3>
          </div>

          <div className="photos">
            {dayData.photos.map((photo: any) => (
              <div key={photo.id} className="photo-card">
                <div className="time">{photo.time}</div>
                <h4>{photo.title}</h4>
                <p>{photo.description}</p>
                {photo.estimated_calories && (
                  <div className="calories">
                    {photo.estimated_calories} ккал
                  </div>
                )}
                {photo.note && <div className="note">{photo.note}</div>}
              </div>
            ))}
          </div>

          <div className="add-photo">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              disabled={loading}
            />
          </div>
        </>
      )}
    </div>
  );
}
```

---

## 🎯 Типичные сценарии использования

### Сценарий 1: Добавление фото завтрака

```typescript
// Пользователь делает фото завтрака
const file = /* получаем из input */;
await addPhoto(file, '2025-11-07', '08:30:00', 'Завтрак');

// Система автоматически:
// 1. Анализирует фото через AI
// 2. Определяет блюдо и калории
// 3. Сохраняет в БД
// 4. Возвращает результат
```

### Сценарий 2: Просмотр дня с суммой калорий

```typescript
// Получаем данные за день
const data = await getDay('2025-11-07');

// Показываем:
console.log(`Всего калорий: ${data.total_calories}`);
console.log(`Приемов пищи: ${data.photos.length}`);
data.photos.forEach(photo => {
  console.log(`${photo.time}: ${photo.title} - ${photo.estimated_calories} ккал`);
});
```

### Сценарий 3: История по дням

```typescript
// Получаем историю за месяц
const history = await getHistory(30);

// Показываем сводку
history.forEach(day => {
  console.log(`${day.date}: ${day.total_calories} ккал (${day.photos_count} фото)`);
});
```

---

## ⚠️ Важные замечания

1. **AI анализ** тратит запросы из лимита (как и другие AI функции)
2. **Фото сохраняются** в закодированном виде (пока не реализовано хранение файлов)
3. **Калории** - приблизительная оценка AI
4. **Дата** по умолчанию - текущая
5. **Время** по умолчанию - текущее

---

## 📊 Структура таблиц

### daily_food_photos
```sql
id               INT PRIMARY KEY
user_id          INT (FK → users)
photo_date       DATE NOT NULL
title            VARCHAR(190)
description      TEXT
estimated_calories INT
photo_time       TIME
note             VARCHAR(500)
created_at       TIMESTAMP
```

### nutrition_advices (обновлена)
```sql
id               INT PRIMARY KEY
user_id          INT (FK → users)
advice_date      DATE NOT NULL  ← НОВОЕ ПОЛЕ
focus            VARCHAR(255)
advice           TEXT
created_at       TIMESTAMP
```

---

## ✅ Готово!

Теперь у вас есть:
- ✅ Фото еды с AI-анализом калорий
- ✅ Автоматический подсчет суммы за день
- ✅ Консультации нутрициолога с привязкой к дате
- ✅ История по дням для обоих типов данных
