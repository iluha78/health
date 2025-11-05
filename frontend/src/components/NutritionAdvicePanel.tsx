import React, { useState, useEffect } from 'react';
import { useNutritionAdvice, type NutritionAdvice, type AdviceDay } from '../hooks/useNutritionAdvice';
import './NutritionAdvicePanel.css';

interface NutritionAdvicePanelProps {
  token: string;
}

export function NutritionAdvicePanel({ token }: NutritionAdvicePanelProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayData, setDayData] = useState<AdviceDay | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [focus, setFocus] = useState('');
  const { loading, error, getDay, createAdvice, deleteAdvice } = useNutritionAdvice(token);

  useEffect(() => {
    loadDay();
  }, [date]);

  const loadDay = async () => {
    try {
      const data = await getDay(date);
      setDayData(data);
    } catch (err) {
      console.error('Ошибка загрузки консультаций:', err);
    }
  };

  const handleCreateAdvice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createAdvice(date, focus || undefined);
      setFocus('');
      setShowNewForm(false);
      await loadDay();
    } catch (err) {
      console.error('Ошибка создания консультации:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту консультацию?')) return;

    try {
      await deleteAdvice(id);
      await loadDay();
    } catch (err) {
      console.error('Ошибка удаления:', err);
    }
  };

  const goToPreviousDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setDate(new Date().toISOString().split('T')[0]);
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="nutrition-advice-panel">
      <div className="panel-header">
        <h2>💡 Консультации нутрициолога</h2>
        
        <div className="date-navigation">
          <button onClick={goToPreviousDay} className="btn-nav">←</button>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="date-input"
          />
          <button onClick={goToNextDay} className="btn-nav">→</button>
          <button onClick={goToToday} className="btn-today">Сегодня</button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && !dayData && <div className="loading">Загрузка...</div>}

      {dayData && (
        <>
          <div className="advices-count">
            <span className="count-badge">
              {dayData.count} {dayData.count === 1 ? 'консультация' : 'консультаций'}
            </span>
          </div>

          <div className="advices-list">
            {dayData.advices.length === 0 ? (
              <div className="empty-state">
                <p>📭 Нет консультаций за этот день</p>
                <p className="hint">Получите персональные рекомендации от AI-нутрициолога</p>
              </div>
            ) : (
              dayData.advices.map((advice) => (
                <div key={advice.id} className="advice-card">
                  <div className="advice-header">
                    <div className="advice-meta">
                      <span className="advice-time">
                        ⏰ {formatTime(advice.created_at)}
                      </span>
                      {advice.focus && (
                        <span className="advice-focus">🎯 {advice.focus}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(advice.id)}
                      className="btn-delete"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="advice-content">
                    {advice.advice.split('\n').map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="action-section">
            {!showNewForm ? (
              <button
                onClick={() => setShowNewForm(true)}
                className="btn-new-advice"
                disabled={loading}
              >
                ✨ Получить консультацию
              </button>
            ) : (
              <form onSubmit={handleCreateAdvice} className="new-advice-form">
                <h3>Новая консультация</h3>
                
                <div className="form-group">
                  <label>
                    Фокус консультации (необязательно)
                  </label>
                  <input
                    type="text"
                    value={focus}
                    onChange={(e) => setFocus(e.target.value)}
                    placeholder="Например: Снижение холестерина, План питания на день..."
                    disabled={loading}
                  />
                  <p className="form-hint">
                    Оставьте пустым для общих рекомендаций на основе вашего профиля
                  </p>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={loading}
                  >
                    {loading ? '⏳ Получение консультации...' : '✅ Получить'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewForm(false);
                      setFocus('');
                    }}
                    className="btn-cancel"
                    disabled={loading}
                  >
                    ❌ Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
