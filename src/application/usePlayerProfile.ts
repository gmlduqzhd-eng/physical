import { useState, useCallback } from 'react';

export interface GameRecord {
  gameType: string;
  gameName: string;
  score: number;
  playedAt: number; // timestamp
  difficulty?: string;
}

export interface PlayerProfile {
  nickname: string;
  totalScore: number;
  totalPlays: number;
  highScores: Record<string, number>; // gameType -> highest score
  playCounts: Record<string, number>; // gameType -> play count
  recentGames: GameRecord[]; // last 20 games
  createdAt: number;
}

const STORAGE_KEY = 'physical_player_profile';

const loadProfile = (): PlayerProfile | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};

const saveProfile = (profile: PlayerProfile) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
};

export const usePlayerProfile = () => {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => loadProfile());

  const createProfile = useCallback((nickname: string) => {
    const newProfile: PlayerProfile = {
      nickname,
      totalScore: 0,
      totalPlays: 0,
      highScores: {},
      playCounts: {},
      recentGames: [],
      createdAt: Date.now(),
    };
    saveProfile(newProfile);
    setProfile(newProfile);
    return newProfile;
  }, []);

  const updateNickname = useCallback((nickname: string) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, nickname };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const addGameResult = useCallback((gameType: string, gameName: string, score: number, difficulty?: string) => {
    setProfile(prev => {
      const current = prev || {
        nickname: '익명 원정대원',
        totalScore: 0,
        totalPlays: 0,
        highScores: {},
        playCounts: {},
        recentGames: [],
        createdAt: Date.now(),
      };

      const record: GameRecord = { gameType, gameName, score, playedAt: Date.now(), difficulty };
      const newHighScores = { ...current.highScores };
      if (!newHighScores[gameType] || score > newHighScores[gameType]) {
        newHighScores[gameType] = score;
      }
      const newPlayCounts = { ...current.playCounts };
      newPlayCounts[gameType] = (newPlayCounts[gameType] || 0) + 1;

      const updated: PlayerProfile = {
        ...current,
        totalScore: current.totalScore + score,
        totalPlays: current.totalPlays + 1,
        highScores: newHighScores,
        playCounts: newPlayCounts,
        recentGames: [record, ...current.recentGames].slice(0, 20),
      };
      saveProfile(updated);
      return updated;
    });
  }, []);

  const resetProfile = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setProfile(null);
  }, []);

  return { profile, createProfile, updateNickname, addGameResult, resetProfile, hasProfile: !!profile };
};
