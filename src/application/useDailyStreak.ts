import { useState, useCallback, useEffect } from 'react';
import { isRecord, localDateKey, nonnegativeNumber, readJsonStorage, writeStorage } from './browserStorage';

export interface DailyStreakState {
  currentStreak: number;
  bestStreak: number;
  lastCompletedDate: string; // YYYY-MM-DD
  history: string[]; // ['2026-09-28', ...]
  points: number;
}

const STORAGE_KEY = 'dambang_daily_streak_v1';

export const normalizeDailyStreak = (value: unknown): DailyStreakState => {
  const saved = isRecord(value) ? value : {};
  const validDate = (date: unknown): date is string => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  return {
    currentStreak: Math.floor(nonnegativeNumber(saved.currentStreak)),
    bestStreak: Math.floor(nonnegativeNumber(saved.bestStreak)),
    lastCompletedDate: validDate(saved.lastCompletedDate) ? saved.lastCompletedDate : '',
    history: Array.isArray(saved.history) ? [...new Set(saved.history.filter(validDate))].slice(-366) : [],
    points: nonnegativeNumber(saved.points),
  };
};

export const useDailyStreak = () => {
  const [streakData, setStreakData] = useState<DailyStreakState>(() => normalizeDailyStreak(readJsonStorage(STORAGE_KEY)));
  useEffect(() => { writeStorage(STORAGE_KEY, JSON.stringify(streakData)); }, [streakData]);

  const isTodayCompleted = useCallback(() => {
    return streakData.lastCompletedDate === localDateKey();
  }, [streakData.lastCompletedDate]);

  // 완료 처리 함수
  const completeTodayMission = useCallback((bonusPoints = 50) => {
    const today = localDateKey();
    if (!Number.isFinite(bonusPoints) || bonusPoints < 0) return;
    setStreakData(prev => {
      if (prev.lastCompletedDate === today) return prev; // 이미 오늘 완료됨

      const previousDate = new Date();
      previousDate.setDate(previousDate.getDate() - 1);
      const yesterday = localDateKey(previousDate);
      const isConsecutive = prev.lastCompletedDate === yesterday;
      const newStreak = isConsecutive ? prev.currentStreak + 1 : 1;
      const newBest = Math.max(newStreak, prev.bestStreak);

      const nextData: DailyStreakState = {
        currentStreak: newStreak,
        bestStreak: newBest,
        lastCompletedDate: today,
        history: Array.from(new Set([...prev.history, today])).slice(-366),
        points: prev.points + bonusPoints
      };

      return nextData;
    });
  }, []);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const streakIsActive = streakData.lastCompletedDate === localDateKey() || streakData.lastCompletedDate === localDateKey(yesterday);
  return {
    streakData: { ...streakData, currentStreak: streakIsActive ? streakData.currentStreak : 0 },
    isTodayCompleted,
    completeTodayMission
  };
};
