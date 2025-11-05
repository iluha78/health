# 📦 Обновление: Фото еды и консультации по дням

## 🎯 Что нового

### ✨ Фото еды с калориями
- **📸 AI-анализ фото** - автоматическое определение блюда и калорий
- **📊 Сумма калорий за день** - автоматический подсчет
- **📅 Организация по дням** - все записи привязаны к датам
- **✏️ Ручной ввод** - можно добавлять без фото
- **📖 История** - просмотр записей по дням

### 💡 Консультации нутрициолога
- **📅 Привязка к датам** - каждая консультация сохраняется с датой
- **📚 Просмотр по дням** - все консультации за выбранный день
- **📊 История** - сводка по дням с количеством консультаций

---

## 🚀 Быстрая установка

```bash
# Запустить скрипт установки
./install_daily_nutrition.sh

# Следовать инструкциям на экране
```

**Время установки:** ~3 минуты

---

## 📦 Содержимое пакета

### 📖 Документация (2 файла)
1. **DAILY_NUTRITION_API.md** - полная документация API
2. **DAILY_NUTRITION_QUICKSTART.md** - быстрый старт с примерами

### 🛠️ Backend файлы (6 файлов)

**Миграция:**
- `backend_migrations_006_daily_nutrition.sql` - создает таблицы

**Модели:**
- `backend_DailyFoodPhoto.php` - модель для фото еды
- `backend_NutritionAdvice.php` - обновленная модель консультаций

**Контроллеры:**
- `backend_DailyFoodPhotoController.php` - API для фото еды
- `backend_NutritionAdviceController.php` - API для консультаций

**Роуты:**
- `routes_updated.php` - обновленные роуты

### 🚀 Скрипт
- `install_daily_nutrition.sh` - автоматическая установка

---

## 📊 Новые API Endpoints

### Фото еды с калориями

```
GET    /daily-food/{date}        # Записи за день + сумма калорий
POST   /daily-food               # Добавить запись (с фото или вручную)
GET    /daily-food-history       # История по дням
DELETE /daily-food/{id}          # Удалить запись
```

### Консультации нутрициолога

```
GET    /nutrition-advice/{date}  # Консультации за день
POST   /nutrition-advice         # Создать консультацию
GET    /nutrition-advice-history # История по дням
DELETE /nutrition-advice/{id}    # Удалить консультацию
```

---

## 💡 Примеры использования

### 1. Добавить фото еды (AI анализ)

```bash
curl -X POST http://localhost:8080/daily-food \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "photo=@lunch.jpg" \
  -F "date=2025-11-07" \
  -F "time=13:00:00"
```

**Что происходит:**
- AI анализирует фото
- Определяет название блюда
- Оценивает калорийность
- Сохраняет в БД

### 2. Получить день с суммой калорий

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/daily-food/2025-11-07
```

**Ответ:**
```json
{
  "date": "2025-11-07",
  "photos": [...],
  "total_calories": 1850
}
```

### 3. Добавить консультацию

```bash
curl -X POST http://localhost:8080/nutrition-advice \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-07",
    "focus": "Снижение холестерина"
  }'
```

---

## 🔧 Ручная установка

### Шаг 1: Копирование файлов

```bash
# Миграция
cp backend_migrations_006_daily_nutrition.sql \
   backend/migrations/006_daily_nutrition.sql

# Модели
cp backend_DailyFoodPhoto.php \
   backend/src/Models/DailyFoodPhoto.php
cp backend_NutritionAdvice.php \
   backend/src/Models/NutritionAdvice.php

# Контроллеры
cp backend_DailyFoodPhotoController.php \
   backend/src/Controllers/DailyFoodPhotoController.php
cp backend_NutritionAdviceController.php \
   backend/src/Controllers/NutritionAdviceController.php

# Роуты
cp routes_updated.php \
   backend/config/routes.php
```

### Шаг 2: Обновление autoload

```bash
cd backend
composer dump-autoload
```

### Шаг 3: Применение миграции

```bash
# Вариант 1: Composer
composer migrate

# Вариант 2: Docker
docker-compose restart backend
```

---

## 🧪 Проверка установки

### 1. Проверить таблицы

```bash
mysql -u root -p cholestofit -e "SHOW TABLES LIKE 'daily_food_photos';"
mysql -u root -p cholestofit -e "DESCRIBE nutrition_advices;"
```

Должно быть:
- ✅ Таблица `daily_food_photos` создана
- ✅ В таблице `nutrition_advices` есть поле `advice_date`

### 2. Тест API

```bash
# Фото еды
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/daily-food/$(date +%Y-%m-%d)

# Консультации
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/nutrition-advice/$(date +%Y-%m-%d)
```

---

## 📊 Структура таблиц

### daily_food_photos (новая)

```sql
CREATE TABLE daily_food_photos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  photo_date DATE NOT NULL,
  title VARCHAR(190) NOT NULL,
  description TEXT,
  estimated_calories INT,
  photo_time TIME,
  note VARCHAR(500),
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### nutrition_advices (обновлена)

**Добавлено поле:**
```sql
advice_date DATE NOT NULL
```

**Индекс:**
```sql
INDEX idx_user_date (user_id, advice_date DESC)
```

---

## 🎨 Frontend интеграция

### React Hook

```typescript
import { useState, useCallback } from 'react';

export function useDailyFood(token: string) {
  // Получить день с суммой калорий
  const getDay = useCallback(async (date: string) => {
    const res = await fetch(`/api/daily-food/${date}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.json();
  }, [token]);

  // Добавить фото
  const addPhoto = useCallback(async (
    file: File,
    date: string
  ) => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('date', date);

    const res = await fetch('/api/daily-food', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    return res.json();
  }, [token]);

  return { getDay, addPhoto };
}
```

### Пример компонента

```typescript
function DailyFoodTracker() {
  const [date, setDate] = useState('2025-11-07');
  const [dayData, setDayData] = useState(null);
  const { getDay, addPhoto } = useDailyFood(token);

  useEffect(() => {
    getDay(date).then(setDayData);
  }, [date]);

  return (
    <div>
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      
      {dayData && (
        <>
          <h3>Калории за день: {dayData.total_calories} ккал</h3>
          {dayData.photos.map(photo => (
            <div key={photo.id}>
              <strong>{photo.title}</strong>
              <span>{photo.estimated_calories} ккал</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
```

---

## 💡 Ключевые особенности

### AI-анализ фото
- Автоматическое определение блюда
- Оценка калорийности
- Краткое описание состава
- Работает с любыми фото еды

### Подсчет калорий
- Автоматическая сумма за день
- Учитываются все записи
- Обновляется при добавлении/удалении

### Организация по дням
- Все данные привязаны к датам
- Удобный просмотр истории
- Группировка в API

---

## ⚠️ Важные замечания

1. **AI-анализ** использует лимит AI-запросов
2. **Калории** - приблизительная оценка
3. **Фото** сохраняются в закодированном виде (пока)
4. **Дата** по умолчанию - текущая
5. **Совместимость** - старые эндпоинты `/advice/nutrition` остаются

---

## 🔄 Миграция старых данных

Если у вас есть старые консультации без даты, миграция автоматически:
1. Добавит поле `advice_date`
2. Заполнит его из `created_at`
3. Сделает поле обязательным

Все данные сохранятся!

---

## 📚 Дополнительная документация

- **DAILY_NUTRITION_API.md** - подробное описание всех endpoints
- **DAILY_NUTRITION_QUICKSTART.md** - примеры использования
- **Примеры React кода** - в DAILY_NUTRITION_API.md

---

## ✅ Чеклист после установки

- [ ] Миграция применилась
- [ ] Таблица `daily_food_photos` создана
- [ ] Поле `advice_date` добавлено в `nutrition_advices`
- [ ] API endpoints отвечают
- [ ] Тест с фото работает
- [ ] Frontend обновлен

---

## 🎉 Готово!

Теперь у вас:
- ✅ Фото еды с AI-анализом калорий
- ✅ Автоматический подсчет суммы за день
- ✅ Консультации нутрициолога по дням
- ✅ Удобная история по дням
- ✅ Гибкое API для frontend

**Приятного использования! 🍽️**
