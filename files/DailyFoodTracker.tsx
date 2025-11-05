import React, { useState, useEffect, useRef } from 'react';
import { useDailyFood, type FoodPhoto, type DayData } from './useDailyFood';
import './DailyFoodTracker.css';

interface DailyFoodTrackerProps {
  token: string;
}

export function DailyFoodTracker({ token }: DailyFoodTrackerProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayData, setDayData] = useState<DayData | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualData, setManualData] = useState({
    title: '',
    description: '',
    calories: '',
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    note: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { loading, error, getDay, addPhoto, addManual, deletePhoto } = useDailyFood(token);

  useEffect(() => {
    loadDay();
  }, [date]);

  const loadDay = async () => {
    try {
      const data = await getDay(date);
      setDayData(data);
    } catch (err) {
      console.error('Ошибка загрузки дня:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const time = new Date().toTimeString().split(' ')[0];
      await addPhoto(file, date, time);
      await loadDay();
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      console.error('Ошибка загрузки фото:', err);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualData.title.trim()) {
      alert('Укажите название блюда');
      return;
    }

    try {
      await addManual({
        date,
        title: manualData.title,
        description: manualData.description || undefined,
        calories: manualData.calories ? parseInt(manualData.calories) : undefined,
        time: manualData.time || undefined,
        note: manualData.note || undefined
      });
      
      setManualData({
        title: '',
        description: '',
        calories: '',
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        note: ''
      });
      setShowManualForm(false);
      await loadDay();
    } catch (err) {
      console.error('Ошибка добавления записи:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту запись?')) return;

    try {
      await deletePhoto(id);
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

  return (
    <div className="daily-food-tracker">
      <div className="tracker-header">
        <h2>📸 Дневник питания</h2>
        
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
      {loading && <div className="loading">Загрузка...</div>}

      {dayData && (
        <>
          <div className="total-calories">
            <div className="calories-card">
              <span className="calories-label">Всего калорий за день:</span>
              <span className="calories-value">{dayData.total_calories} ккал</span>
            </div>
          </div>

          <div className="food-photos">
            {dayData.photos.length === 0 ? (
              <div className="empty-state">
                <p>📭 Пока нет записей за этот день</p>
                <p className="hint">Добавьте фото блюда или внесите данные вручную</p>
              </div>
            ) : (
              dayData.photos.map((photo) => (
                <div key={photo.id} className="photo-card">
                  <div className="photo-header">
                    <span className="photo-time">⏰ {photo.time}</span>
                    <button
                      onClick={() => handleDelete(photo.id)}
                      className="btn-delete"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                  
                  <h3 className="photo-title">{photo.title}</h3>
                  
                  {photo.description && (
                    <p className="photo-description">{photo.description}</p>
                  )}
                  
                  {photo.estimated_calories !== null && (
                    <div className="photo-calories">
                      🔥 {photo.estimated_calories} ккал
                    </div>
                  )}
                  
                  {photo.note && (
                    <div className="photo-note">
                      📝 {photo.note}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="action-buttons">
            <label className="btn-upload">
              📸 Загрузить фото
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={loading}
                style={{ display: 'none' }}
              />
            </label>

            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="btn-manual"
            >
              ✏️ {showManualForm ? 'Отмена' : 'Добавить вручную'}
            </button>
          </div>

          {showManualForm && (
            <form onSubmit={handleManualSubmit} className="manual-form">
              <h3>Добавить запись вручную</h3>
              
              <div className="form-group">
                <label>Название блюда *</label>
                <input
                  type="text"
                  value={manualData.title}
                  onChange={(e) => setManualData({ ...manualData, title: e.target.value })}
                  placeholder="Например: Греческий салат"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Время</label>
                  <input
                    type="time"
                    value={manualData.time}
                    onChange={(e) => setManualData({ ...manualData, time: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Калории</label>
                  <input
                    type="number"
                    value={manualData.calories}
                    onChange={(e) => setManualData({ ...manualData, calories: e.target.value })}
                    placeholder="350"
                    min="0"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Описание</label>
                <textarea
                  value={manualData.description}
                  onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
                  placeholder="Состав блюда..."
                  rows={2}
                />
              </div>

              <div className="form-group">
                <label>Заметка</label>
                <input
                  type="text"
                  value={manualData.note}
                  onChange={(e) => setManualData({ ...manualData, note: e.target.value })}
                  placeholder="Завтрак, обед, ужин..."
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Сохранение...' : '✅ Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="btn-cancel"
                >
                  ❌ Отмена
                </button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
