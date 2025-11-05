import { useState, useCallback } from 'react';

export interface FoodPhoto {
  id: number;
  date: string;
  time: string;
  title: string;
  description: string | null;
  estimated_calories: number | null;
  note: string | null;
  created_at: string;
}

export interface DayData {
  date: string;
  photos: FoodPhoto[];
  total_calories: number;
}

export interface DayHistory {
  date: string;
  photos_count: number;
  total_calories: number;
}

interface UseDailyFoodReturn {
  loading: boolean;
  error: string | null;
  getDay: (date: string) => Promise<DayData>;
  addPhoto: (photo: File, date: string, time?: string, note?: string) => Promise<FoodPhoto>;
  addManual: (data: ManualFoodData) => Promise<FoodPhoto>;
  getHistory: (limit?: number) => Promise<DayHistory[]>;
  deletePhoto: (id: number) => Promise<void>;
}

export interface ManualFoodData {
  date: string;
  title: string;
  description?: string;
  calories?: number;
  time?: string;
  note?: string;
}

export function useDailyFood(token: string | null): UseDailyFoodReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const addPhoto = useCallback(async (
    photo: File,
    date: string,
    time?: string,
    note?: string
  ): Promise<FoodPhoto> => {
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
        throw new Error(data.error || 'Ошибка загрузки фото');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const addManual = useCallback(async (data: ManualFoodData): Promise<FoodPhoto> => {
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
        const result = await response.json();
        throw new Error(result.error || 'Ошибка сохранения');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка сохранения';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getHistory = useCallback(async (limit = 30): Promise<DayHistory[]> => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/daily-food-history?limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error('Не удалось загрузить историю');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка загрузки истории';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const deletePhoto = useCallback(async (id: number): Promise<void> => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/daily-food/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить запись');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка удаления';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
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
