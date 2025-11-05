import { useState, useCallback } from 'react';

export interface NutritionAdvice {
  id: number;
  date: string;
  focus: string | null;
  advice: string;
  created_at: string;
}

export interface AdviceDay {
  date: string;
  advices: NutritionAdvice[];
  count: number;
}

export interface AdviceHistory {
  date: string;
  advices_count: number;
}

interface UseNutritionAdviceReturn {
  loading: boolean;
  error: string | null;
  getDay: (date: string) => Promise<AdviceDay>;
  createAdvice: (date: string, focus?: string) => Promise<{ advice: string; record: NutritionAdvice }>;
  getHistory: (limit?: number) => Promise<AdviceHistory[]>;
  deleteAdvice: (id: number) => Promise<void>;
}

export function useNutritionAdvice(token: string | null): UseNutritionAdviceReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDay = useCallback(async (date: string): Promise<AdviceDay> => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/nutrition-advice/${date}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Не удалось загрузить консультации');
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

  const createAdvice = useCallback(async (
    date: string,
    focus?: string
  ): Promise<{ advice: string; record: NutritionAdvice }> => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/nutrition-advice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ date, focus })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Ошибка получения консультации');
      }

      return await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ошибка получения консультации';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [token]);

  const getHistory = useCallback(async (limit = 30): Promise<AdviceHistory[]> => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/nutrition-advice-history?limit=${limit}`,
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

  const deleteAdvice = useCallback(async (id: number): Promise<void> => {
    if (!token) throw new Error('Требуется авторизация');

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/nutrition-advice/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить консультацию');
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
    createAdvice,
    getHistory,
    deleteAdvice
  };
}
