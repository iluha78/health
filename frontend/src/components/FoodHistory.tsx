import React, { useState, useEffect } from 'react';
import { useDailyFood, type DayHistory } from '../hooks/useDailyFood';
import './FoodHistory.css';

interface FoodHistoryProps {
  token: string;
  onSelectDate?: (date: string) => void;
}

export function FoodHistory({ token, onSelectDate }: FoodHistoryProps) {
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [limit, setLimit] = useState(30);
  const { loading, error, getHistory } = useDailyFood(token);

  useEffect(() => {
    loadHistory();
  }, [limit]);

  const loadHistory = async () => {
    try {
      const data = await getHistory(limit);
      setHistory(data);
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
    }
  };

  const getTotalCalories = () => {
    return history.reduce((sum, day) => sum + day.total_calories, 0);
  };

  const getAverageCalories = () => {
    if (history.length === 0) return 0;
    return Math.round(getTotalCalories() / history.length);
  };

  const handleDateClick = (date: string) => {
    if (onSelectDate) {
      onSelectDate(date);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '🔵 Сегодня';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '⚪ Вчера';
    }

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long',
      weekday: 'short'
    };
    return date.toLocaleDateString('ru-RU', options);
  };

  if (loading && history.length === 0) {
    return <div className="food-history loading">Загрузка истории...</div>;
  }

  return (
    <div className="food-history">
      <div className="history-header">
        <h2>📊 История питания</h2>
        
        <div className="history-stats">
          <div className="stat-card">
            <div className="stat-label">Дней с записями</div>
            <div className="stat-value">{history.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Средняя калорийность</div>
            <div className="stat-value">{getAverageCalories()} ккал</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Всего калорий</div>
            <div className="stat-value">{getTotalCalories().toLocaleString()} ккал</div>
          </div>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="history-controls">
        <label>
          Показать дней:
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
            <option value={90}>90</option>
          </select>
        </label>
      </div>

      {history.length === 0 ? (
        <div className="empty-state">
          <p>📭 История пуста</p>
          <p className="hint">Начните добавлять фото блюд для отслеживания калорий</p>
        </div>
      ) : (
        <div className="history-list">
          {history.map((day) => (
            <div
              key={day.date}
              className="history-item"
              onClick={() => handleDateClick(day.date)}
            >
              <div className="history-date">
                <span className="date-label">{formatDate(day.date)}</span>
                <span className="date-full">{day.date}</span>
              </div>
              
              <div className="history-info">
                <div className="info-item">
                  <span className="info-icon">📸</span>
                  <span className="info-text">{day.photos_count} фото</span>
                </div>
                <div className="info-item calories">
                  <span className="info-icon">🔥</span>
                  <span className="info-text">{day.total_calories} ккал</span>
                </div>
              </div>

              <div className="history-bar">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.min((day.total_calories / 2500) * 100, 100)}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && history.length > 0 && (
        <div className="loading-more">Загрузка...</div>
      )}
    </div>
  );
}
