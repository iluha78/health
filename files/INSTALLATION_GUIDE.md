# Инструкция по обновлению для хранения данных в базе

## Обзор изменений

Теперь все данные о давлении, пульсе и сахаре хранятся в базе данных, а не в браузере. Это обеспечивает:
- Сохранность данных между сессиями
- Доступ с разных устройств
- Возможность анализа истории
- Надежное резервное копирование

## Установка файлов

### 1. Backend файлы

Скопируйте файлы в соответствующие директории:

```bash
# Миграция базы данных
cp backend_migrations_004_blood_pressure.sql backend/migrations/004_blood_pressure.sql

# Модель
cp backend_BloodPressureRecord.php backend/src/Models/BloodPressureRecord.php

# Контроллер
cp backend_BloodPressureController.php backend/src/Controllers/BloodPressureController.php

# Роуты (заменить существующий)
cp routes.php backend/config/routes.php
```

### 2. Применение миграции

После копирования файлов запустите миграцию:

```bash
cd backend
composer migrate
```

Или если используете Docker:

```bash
docker-compose restart backend
```

Миграция создаст таблицу `blood_pressure_records` со следующей структурой:
- `id` - уникальный идентификатор
- `user_id` - ID пользователя
- `measured_at` - дата и время измерения
- `systolic` - систолическое давление (верхнее)
- `diastolic` - диастолическое давление (нижнее)
- `pulse` - пульс
- `glucose` - уровень сахара
- `note` - заметка
- `created_at` - время создания записи

## API Endpoints

### Получить список измерений

```http
GET /blood-pressure
Authorization: Bearer {token}
```

**Ответ:**
```json
[
  {
    "id": 1,
    "measured_at": "2025-11-02T10:30:00+00:00",
    "systolic": 120,
    "diastolic": 80,
    "pulse": 72,
    "glucose": 5.5,
    "note": "Утреннее измерение",
    "created_at": "2025-11-02T10:30:15"
  }
]
```

### Создать новое измерение

```http
POST /blood-pressure
Authorization: Bearer {token}
Content-Type: application/json

{
  "measured_at": "2025-11-02T10:30:00",
  "systolic": 120,
  "diastolic": 80,
  "pulse": 72,
  "glucose": 5.5,
  "note": "Утреннее измерение"
}
```

**Примечание:** Все поля кроме `measured_at` опциональны. Нужно указать хотя бы один показатель.

**Ответ:** (201 Created)
```json
{
  "id": 1,
  "measured_at": "2025-11-02T10:30:00+00:00",
  "systolic": 120,
  "diastolic": 80,
  "pulse": 72,
  "glucose": 5.5,
  "note": "Утреннее измерение",
  "created_at": "2025-11-02T10:30:15"
}
```

### Удалить измерение

```http
DELETE /blood-pressure/{id}
Authorization: Bearer {token}
```

**Ответ:**
```json
{
  "status": "ok"
}
```

## Примеры использования

### Пример 1: Сохранение только давления

```javascript
const response = await fetch('http://your-api.com/blood-pressure', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    measured_at: new Date().toISOString(),
    systolic: 125,
    diastolic: 82,
    pulse: 75
  })
});

const data = await response.json();
console.log('Saved:', data);
```

### Пример 2: Сохранение только сахара

```javascript
const response = await fetch('http://your-api.com/blood-pressure', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    measured_at: new Date().toISOString(),
    glucose: 5.8,
    note: 'После еды'
  })
});
```

### Пример 3: Получение истории

```javascript
const response = await fetch('http://your-api.com/blood-pressure', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const history = await response.json();
console.log('История измерений:', history);
```

## Изменения во фронтенде

Теперь фронтенд должен:

1. **При загрузке приложения** - запрашивать историю измерений из API
2. **При сохранении** - отправлять данные на сервер через POST запрос
3. **При удалении** - использовать DELETE запрос
4. **Не использовать localStorage** для хранения этих данных

## Что уже хранится в базе

Эти данные уже корректно работают с базой данных:

✅ **Липидный профиль** (`/lipids`) - таблица `lipids`
✅ **Профиль пользователя** (`/profile`, `/targets`) - таблица `profiles`
✅ **Консультации нутрициолога** (`/advice/nutrition`) - таблица `nutrition_advices`
✅ **История AI-ассистента** (`/assistant/chat`) - таблица `assistant_interactions`
✅ **Анализ фото** (`/analysis/photo`) - таблица `photo_analyses`
✅ **Дневник питания** (`/diary`) - таблицы `diary_days`, `diary_items`

## Проверка работоспособности

После установки проверьте:

```bash
# 1. Проверьте, что миграция применилась
mysql -u root -p cholestofit -e "SHOW TABLES LIKE 'blood_pressure_records';"

# 2. Проверьте структуру таблицы
mysql -u root -p cholestofit -e "DESCRIBE blood_pressure_records;"

# 3. Проверьте API (замените {token} на реальный токен)
curl -H "Authorization: Bearer {token}" http://localhost:8080/blood-pressure
```

## Возможные проблемы и решения

### Ошибка "Table already exists"

Если таблица уже существует, удалите её и запустите миграцию заново:

```sql
DROP TABLE IF EXISTS blood_pressure_records;
```

Затем снова запустите `composer migrate`.

### Ошибка "Class not found"

Убедитесь, что файлы скопированы в правильные директории и composer autoload обновлен:

```bash
cd backend
composer dump-autoload
```

### Данные не сохраняются

Проверьте логи backend:

```bash
# Для Docker
docker-compose logs -f backend

# Для локального запуска
tail -f backend/logs/error.log
```

## Безопасность

- Все endpoints защищены JWT авторизацией
- Пользователь может видеть только свои данные
- Валидация на стороне сервера
- Защита от SQL-инъекций через Eloquent ORM

## Следующие шаги

После установки рекомендуется:

1. Обновить фронтенд для работы с новыми API
2. Удалить код работы с localStorage для этих данных
3. Добавить индикаторы загрузки при запросах к API
4. Реализовать обработку ошибок сети
5. Добавить offline-режим с синхронизацией (опционально)
