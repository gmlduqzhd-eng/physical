import { useState, useCallback } from 'react';

export interface DailyStreakState {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string; // YYYY-MM-DD
  history: string[]; // ['2026-09-28', ...]
  points: number;
}

const STORAGE_KEY = 'dambang_daily_streak_v1';

export const useDailyStreak = () => {
  const [streakData, setStreakData] = useState<DailyStreakState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return {
      currentStreak: 0,
      bestStreak: 0,
      lastCompletedDate: '',
      history: [],
      points: 0
    };
  });

  const getTodayStr = () => new Date().toISOString().slice(0, 10);

  const isTodayCompleted = useCallback(() => {
    return streakData.lastCompletedDate === getTodayStr();
  }, [streakData.lastCompletedDate]);

  // 완료 처리 함수
  const completeTodayMission = useCallback((bonusPoints = 50) => {
    const today = getTodayStr();
    setStreakData(prev => {
      if (prev.lastCompletedDate === today) return prev; // 이미 오늘 완료됨

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const isConsecutive = prev.lastCompletedDate === yesterday;
      const newStreak = isConsecutive ? prev.currentStreak + 1 : 1;
      const newBest = Math.max(newStreak, prev.bestStreak);

      const nextData: DailyStreakState = {
        currentStreak: newStreak,
        bestStreak: newBest,
        lastCompletedDate: today,
        history: Array.from(new Set([...prev.history, today])),
        points: prev.points + bonusPoints
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      } catch {}

      return nextData;
    });
  }, []);

  return {
    streakData,
    isTodayCompleted,
    completeTodayMission
  };
};
