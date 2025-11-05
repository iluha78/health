# ⚡ БЫСТРОЕ ИСПРАВЛЕНИЕ: Ошибка липидов

## Ошибка
```
Out of range value for column 'chol'
```

## Причина
`DECIMAL(4,2)` → максимум 99.99  
Ваши значения (120 мг/дл) → больше 99.99

## Исправление за 30 секунд

### Способ 1: Автоматический (рекомендуется)
```bash
./fix_lipids.sh
```

### Способ 2: Вручную
```bash
# Скопировать миграцию
cp backend_migrations_005_fix_lipids_range.sql backend/migrations/005_fix_lipids_range.sql

# Применить (выберите один из вариантов)
cd backend && composer migrate
# ИЛИ
docker-compose restart backend
```

### Способ 3: Прямо в SQL
```sql
mysql -u root -p cholestofit

ALTER TABLE lipids
  MODIFY COLUMN chol DECIMAL(6,2),
  MODIFY COLUMN hdl DECIMAL(6,2),
  MODIFY COLUMN ldl DECIMAL(6,2),
  MODIFY COLUMN trig DECIMAL(6,2);
```

## Проверка
```bash
mysql -u root -p cholestofit -e "DESCRIBE lipids;"
```

Должно быть: `decimal(6,2)`

## Готово!
Теперь поддерживаются значения до 9999.99

---

Подробнее: **FIX_LIPIDS_ERROR.md**
