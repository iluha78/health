# Сводка изменений: Хранение всех данных в базе

## 📋 Что изменилось

### ✅ Новая функциональность

**Измерения давления, пульса и сахара теперь в базе данных**

- ✅ Создана таблица `blood_pressure_records`
- ✅ Добавлены API endpoints: GET, POST, DELETE
- ✅ Поддержка истории измерений
- ✅ Возможность добавления заметок
- ✅ Автоматическая синхронизация между устройствами

### 📦 Добавленные файлы

1. **backend/migrations/004_blood_pressure.sql** - миграция БД
2. **backend/src/Models/BloodPressureRecord.php** - модель данных
3. **backend/src/Controllers/BloodPressureController.php** - контроллер API
4. **backend/config/routes.php** - обновленные роуты

### 🔄 Данные, которые уже в базе

| Тип данных | Endpoint | Таблица | Статус |
|------------|----------|---------|--------|
| Липидный профиль | `/lipids` | `lipids` | ✅ Работает |
| Профиль пользователя | `/profile`, `/targets` | `profiles` | ✅ Работает |
| Консультации нутрициолога | `/advice/nutrition` | `nutrition_advices` | ✅ Работает |
| AI-ассистент | `/assistant/chat` | `assistant_interactions` | ✅ Работает |
| Анализ фото | `/analysis/photo` | `photo_analyses` | ✅ Работает |
| Дневник питания | `/diary` | `diary_days`, `diary_items` | ✅ Работает |
| **Давление и сахар** | `/blood-pressure` | `blood_pressure_records` | 🆕 Новое |

---

## 🔧 Интеграция с фронтендом

### Пример: Обновленный хук для работы с давлением

```typescript
// frontend/src/features/blood-pressure/useBloodPressureData.ts
import { useState, useEffect, useCallback } from 'react';

interface BloodPressureRecord {
  id: number;
  measured_at: string;
  systolic: number | null;
  diastolic: number | null;
  pulse: number | null;
  glucose: number | null;
  note: string | null;
  created_at: string;
}

export function useBloodPressureData(token: string | null) {
  const [records, setRecords] = useState<BloodPressureRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка истории при монтировании
  const loadHistory = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/blood-pressure', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить историю');
      }

      const data = await response.json();
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Сохранение нового измерения
  const saveRecord = useCallback(async (data: {
    measured_at: string;
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    glucose?: number;
    note?: string;
  }) => {
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/blood-pressure', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось сохранить запись');
      }

      const newRecord = await response.json();
      setRecords(prev => [newRecord, ...prev]);
      
      return newRecord;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Удаление записи
  const deleteRecord = useCallback(async (id: number) => {
    if (!token) {
      throw new Error('Требуется авторизация');
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/blood-pressure/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить запись');
      }

      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Загрузка при монтировании
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    records,
    loading,
    error,
    saveRecord,
    deleteRecord,
    refreshHistory: loadHistory,
  };
}
```

### Пример использования в компоненте

```typescript
// frontend/src/features/blood-pressure/BloodPressureTab.tsx
import { useState } from 'react';
import { useBloodPressureData } from './useBloodPressureData';
import { userStore } from '../../stores/user';

export function BloodPressureTab() {
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [pulse, setPulse] = useState('');
  const [note, setNote] = useState('');

  const { records, loading, error, saveRecord } = useBloodPressureData(
    userStore.token
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await saveRecord({
        measured_at: new Date().toISOString(),
        systolic: systolic ? parseInt(systolic) : undefined,
        diastolic: diastolic ? parseInt(diastolic) : undefined,
        pulse: pulse ? parseInt(pulse) : undefined,
        note: note || undefined,
      });

      // Очистка формы после успешного сохранения
      setSystolic('');
      setDiastolic('');
      setPulse('');
      setNote('');

      alert('Измерение сохранено!');
    } catch (err) {
      console.error('Ошибка сохранения:', err);
    }
  };

  return (
    <div>
      <h2>Давление и пульс</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          type="number"
          placeholder="Систолическое (верхнее)"
          value={systolic}
          onChange={e => setSystolic(e.target.value)}
        />
        <input
          type="number"
          placeholder="Диастолическое (нижнее)"
          value={diastolic}
          onChange={e => setDiastolic(e.target.value)}
        />
        <input
          type="number"
          placeholder="Пульс"
          value={pulse}
          onChange={e => setPulse(e.target.value)}
        />
        <textarea
          placeholder="Заметка (опционально)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>

      <h3>История измерений</h3>
      {loading && <div>Загрузка...</div>}
      <ul>
        {records.map(record => (
          <li key={record.id}>
            <strong>{new Date(record.measured_at).toLocaleString()}</strong>
            {record.systolic && record.diastolic && (
              <span> - {record.systolic}/{record.diastolic}</span>
            )}
            {record.pulse && <span> - Пульс: {record.pulse}</span>}
            {record.note && <p>{record.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🚀 Быстрый старт

### 1. Установка backend

```bash
# Копирование файлов
cp backend_migrations_004_blood_pressure.sql backend/migrations/004_blood_pressure.sql
cp backend_BloodPressureRecord.php backend/src/Models/BloodPressureRecord.php
cp backend_BloodPressureController.php backend/src/Controllers/BloodPressureController.php
cp routes.php backend/config/routes.php

# Применение миграции
cd backend
composer migrate

# Перезапуск (если используете Docker)
docker-compose restart backend
```

### 2. Обновление frontend

- Удалите код работы с `localStorage` для давления и сахара
- Добавьте хук `useBloodPressureData` (см. пример выше)
- Обновите компоненты для использования нового хука
- Добавьте индикаторы загрузки и обработку ошибок

### 3. Проверка

```bash
# Тест API
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8080/blood-pressure

# Должен вернуть пустой массив [] или список записей
```

---

## 📊 Статус хранения данных

### ДО изменений
```
┌─────────────────────────────────────┐
│ Browser (localStorage)              │
│ • Давление ❌                        │
│ • Пульс ❌                           │
│ • Сахар ❌                           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Database                            │
│ • Липиды ✅                          │
│ • Профиль ✅                         │
│ • AI-советы ✅                       │
│ • AI-ассистент ✅                    │
│ • Анализ фото ✅                     │
└─────────────────────────────────────┘
```

### ПОСЛЕ изменений
```
┌─────────────────────────────────────┐
│ Browser (localStorage)              │
│ • Только UI состояние               │
│ • Токены авторизации                │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Database                            │
│ • Давление ✅                        │
│ • Пульс ✅                           │
│ • Сахар ✅                           │
│ • Липиды ✅                          │
│ • Профиль ✅                         │
│ • AI-советы ✅                       │
│ • AI-ассистент ✅                    │
│ • Анализ фото ✅                     │
└─────────────────────────────────────┘
```

---

## 💡 Дополнительные возможности

После базовой интеграции можно добавить:

1. **Графики и визуализация** - отображение динамики показателей
2. **Фильтры** - по дате, типу измерения
3. **Экспорт данных** - в CSV или PDF
4. **Напоминания** - регулярные напоминания о измерениях
5. **Анализ трендов** - автоматическое определение паттернов

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи backend
2. Убедитесь, что миграция применилась
3. Проверьте правильность путей к файлам
4. Проверьте наличие JWT токена в запросах

Подробные инструкции см. в файле `INSTALLATION_GUIDE.md`
