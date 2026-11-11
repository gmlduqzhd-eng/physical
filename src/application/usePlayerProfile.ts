import { useState, useCallback, useEffect, useRef } from 'react';
import { normalizeGameResultDetails, type GameResultDetails } from '../domain/gameResultDetails';
import { deviceStorageGeneration, isRecord, nonnegativeNumber, readJsonStorage, removeStorage, writeStorage } from './browserStorage';

export interface GameRecord {
  gameType: string;
  gameName: string;
  score: number;
  playedAt: number; // timestamp
  difficulty?: string;
  details?: GameResultDetails;
  rpe?: number; // 운동 자각도 1~5 (1=너무 쉬움, 5=너무 힘듦)
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

export const normalizePlayerProfile = (value: unknown): PlayerProfile | null => {
  if (!isRecord(value) || typeof value.nickname !== 'string' || !value.nickname.trim()) return null;
  const numberMap = (map: unknown): Record<string, number> => isRecord(map)
    ? Object.fromEntries(Object.entries(map).filter(([, count]) => typeof count === 'number' && Number.isFinite(count) && count >= 0)) as Record<string, number>
    : {};
  const recentGames = Array.isArray(value.recentGames) ? value.recentGames.filter((record): record is Record<string, unknown> =>
    isRecord(record) && typeof record.gameType === 'string' && typeof record.gameName === 'string'
      && typeof record.score === 'number' && Number.isFinite(record.score)
      && (record.score >= 0 || (record.gameType === 'fate_card' && record.score === -300))
      && typeof record.playedAt === 'number' && Number.isFinite(record.playedAt)
  ).slice(0, 20).map(record => ({
    gameType: record.gameType as string, gameName: record.gameName as string,
    score: record.score as number, playedAt: record.playedAt as number,
    details: normalizeGameResultDetails(record.details),
    difficulty: typeof record.difficulty === 'string' ? record.difficulty : undefined,
    rpe: typeof record.rpe === 'number' && Number.isInteger(record.rpe) && record.rpe >= 1 && record.rpe <= 5 ? record.rpe : undefined,
  })) : [];
  return {
    nickname: value.nickname.trim().slice(0, 20),
    totalScore: nonnegativeNumber(value.totalScore),
    totalPlays: Math.floor(nonnegativeNumber(value.totalPlays)),
    highScores: numberMap(value.highScores),
    playCounts: numberMap(value.playCounts),
    recentGames,
    createdAt: nonnegativeNumber(value.createdAt, Date.now()),
  };
};

const loadProfile = () => normalizePlayerProfile(readJsonStorage(STORAGE_KEY));

const saveProfile = (profile: PlayerProfile) => {
  writeStorage(STORAGE_KEY, JSON.stringify(profile));
};

export const usePlayerProfile = () => {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => loadProfile());
  const storageGeneration=useRef(deviceStorageGeneration());
  const currentSession=useCallback(()=>{readJsonStorage(STORAGE_KEY);const current=deviceStorageGeneration();if(current!==storageGeneration.current){storageGeneration.current=current;return false;}return true;},[]);
  useEffect(() => { if (profile) {if(currentSession())saveProfile(profile);else setProfile(null);} }, [profile,currentSession]);
  useEffect(() => {
    const refresh = () => { if (!currentSession()) setProfile(null); };
    window.addEventListener?.('physical-device-cleared', refresh);
    window.addEventListener?.('focus', refresh);
    return () => {
      window.removeEventListener?.('physical-device-cleared', refresh);
      window.removeEventListener?.('focus', refresh);
    };
  }, [currentSession]);

  const createProfile = useCallback((nickname: string) => {
    currentSession();
    const newProfile: PlayerProfile = {
      nickname: nickname.trim().slice(0, 20) || '익명 원정대원',
      totalScore: 0,
      totalPlays: 0,
      highScores: {},
      playCounts: {},
      recentGames: [],
      createdAt: Date.now(),
    };
    setProfile(newProfile);
    return newProfile;
  }, [currentSession]);

  const updateNickname = useCallback((nickname: string) => {
    const validSession = currentSession();
    setProfile(prev => {
      if(!validSession)return null;
      if (!prev) return prev;
      const updated = { ...prev, nickname: nickname.trim().slice(0, 20) || prev.nickname };
      return updated;
    });
  }, [currentSession]);

  const addGameResult = useCallback((gameType: string, gameName: string, score: number, difficulty?: string, rpe?: number, details?: GameResultDetails, scoreKey?:string) => {
    // The losing fate card is a completed play, even though its result is a penalty.
    if (!Number.isFinite(score) || (score < 0 && !(gameType === 'fate_card' && score === -300)) || !gameType) return;
    // Capture expiry once before React may replay a state updater in Strict Mode.
    const validSession = currentSession();
    setProfile(prev => {
      const current = (validSession?prev:null) || {
        nickname: '익명 원정대원',
        totalScore: 0,
        totalPlays: 0,
        highScores: {},
        playCounts: {},
        recentGames: [],
        createdAt: Date.now(),
      };

      const record: GameRecord = { details: normalizeGameResultDetails(details), gameType, gameName, score, playedAt: Date.now(), difficulty, rpe: rpe && rpe >= 1 && rpe <= 5 ? rpe : undefined };
      const newHighScores = { ...current.highScores };
      newHighScores[scoreKey||gameType] = Math.max(newHighScores[scoreKey||gameType] || 0, score);
      const newPlayCounts = { ...current.playCounts };
      newPlayCounts[gameType] = (newPlayCounts[gameType] || 0) + 1;

      const updated: PlayerProfile = {
        ...current,
        totalScore: Math.max(0, current.totalScore + score),
        totalPlays: current.totalPlays + 1,
        highScores: newHighScores,
        playCounts: newPlayCounts,
        recentGames: [record, ...current.recentGames].slice(0, 20),
      };
      saveProfile(updated);
      return updated;
    });
  }, [currentSession]);

  const resetProfile = useCallback(() => {
    removeStorage(STORAGE_KEY);
    setProfile(null);
  }, []);

  const updateLatestRpe = useCallback((gameType: string, rpe: number) => {
    if (!Number.isInteger(rpe) || rpe < 1 || rpe > 5) return;
    const validSession = currentSession();
    setProfile(previous => {
      if(!validSession)return null;
      if (!previous || previous.recentGames[0]?.gameType !== gameType) return previous;
      return { ...previous, recentGames: previous.recentGames.map((record, index) => index === 0 ? { ...record, rpe } : record) };
    });
  }, [currentSession]);

  return { profile, createProfile, updateNickname, addGameResult, updateLatestRpe, resetProfile, hasProfile: !!profile };
};
