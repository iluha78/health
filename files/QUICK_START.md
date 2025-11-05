# 🚀 Быстрая шпаргалка - CholestoFit Database Update

## ⚡ Установка за 3 команды

```bash
# 1. Скопировать файлы
chmod +x install.sh && ./install.sh

# 2. Применить миграцию (если не сделал скрипт)
cd backend && composer migrate

# 3. Перезапустить (Docker)
docker-compose restart backend
```

## 📁 Структура файлов

```
✅ README.md                           - Главная инструкция (начни отсюда)
✅ INSTALLATION_GUIDE.md               - Подробная документация
✅ CHANGES_SUMMARY.md                  - Примеры кода для frontend
✅ install.sh                          - Скрипт автоматической установки

Backend файлы:
├── backend_migrations_004_blood_pressure.sql    → backend/migrations/
├── backend_BloodPressureRecord.php              → backend/src/Models/
├── backend_BloodPressureController.php          → backend/src/Controllers/
└── routes.php                                   → backend/config/
```

## 🎯 Куда копировать файлы

```bash
# Из корня проекта:
cp backend_migrations_004_blood_pressure.sql backend/migrations/004_blood_pressure.sql
cp backend_BloodPressureRecord.php backend/src/Models/BloodPressureRecord.php
cp backend_BloodPressureController.php backend/src/Controllers/BloodPressureController.php
cp routes.php backend/config/routes.php
```

## 🔍 Быстрая проверка

```bash
# Проверить таблицу
mysql -u root -p cholestofit -e "SHOW TABLES LIKE 'blood_pressure_records';"

# Тест API
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/blood-pressure
```

## 📊 Новые API Endpoints

| Endpoint | Метод | Описание |
|----------|-------|----------|
| `/blood-pressure` | GET | Список измерений |
| `/blood-pressure` | POST | Создать измерение |
| `/blood-pressure/{id}` | DELETE | Удалить измерение |

## 💻 Пример POST запроса

```bash
curl -X POST http://localhost:8080/blood-pressure \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "measured_at": "2025-11-02T10:30:00Z",
    "systolic": 120,
    "diastolic": 80,
    "pulse": 72,
    "glucose": 5.5,
    "note": "После завтрака"
  }'
```

## 🎨 Frontend пример (TypeScript)

```typescript
// Загрузка истории
const response = await fetch('/api/blood-pressure', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const history = await response.json();

// Сохранение
await fetch('/api/blood-pressure', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    measured_at: new Date().toISOString(),
    systolic: 120,
    diastolic: 80,
    pulse: 72
  })
});
```

## 🐛 Типичные проблемы

| Проблема | Решение |
|----------|---------|
| "Class not found" | `cd backend && composer dump-autoload` |
| "Table already exists" | `DROP TABLE blood_pressure_records;` затем `composer migrate` |
| API возвращает 401 | Проверить JWT токен |
| Данные не сохраняются | `docker-compose logs -f backend` |

## 📚 Документация

- **README.md** → Общий обзор и быстрый старт
- **INSTALLATION_GUIDE.md** → Полная документация API
- **CHANGES_SUMMARY.md** → Примеры React кода

## ✅ Чеклист

- [ ] Скопировал файлы
- [ ] Применил миграцию
- [ ] Обновил autoload (`composer dump-autoload`)
- [ ] Протестировал API
- [ ] Обновил frontend
- [ ] Удалил код с localStorage

## 🎉 Готово!

Теперь все данные в базе! 

**Что хранится в БД:**
✅ Давление и пульс
✅ Сахар
✅ Липидный профиль
✅ AI-советы
✅ AI-ассистент
✅ Анализ фото
✅ Профиль пользователя
