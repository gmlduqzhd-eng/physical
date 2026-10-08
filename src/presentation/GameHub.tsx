import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { readJsonStorage, writeStorage, isRecord } from '../application/browserStorage';
import { useModalDialog } from '../application/useModalDialog';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, Filter, BookOpen, Info, Award, Star, Shuffle, Sun, Moon, Edit3, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '../application/ThemeContext';
import { usePlayerProfile } from '../application/usePlayerProfile';
import { useVoiceCoach } from '../application/useVoiceCoach';
import { WarmupRoulette } from './components/WarmupRoulette';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { DailyStreakModal } from './components/DailyStreakModal';
import { DambangTamagotchiModal } from './components/DambangTamagotchiModal';
import { PhysicalMbtiTest } from './components/PhysicalMbtiTest';
import { SplitBattleGame } from './components/SplitBattleGame';
import { ClassPlaylistPlayer } from './components/ClassPlaylistPlayer';
import { StationCircuitMode } from './components/StationCircuitMode';
import { QuickPinClassroom } from './components/QuickPinClassroom';
import { MotionCamChallenge } from './components/MotionCamChallenge';
import { BadgeArchiveModal } from './components/BadgeArchiveModal';
import { GameMotionIcon } from './components/GameMotionIcon';
import { ThemeZone, type ThemeModeId } from './components/ThemeZone';

import {
  GAMES,
  GRADE_GROUPS,
  PE_DOMAINS,
  SPORT_SUB_TYPES,
  DEVICE_FILTERS,
  PLAY_MODE_FILTERS,
} from '../domain/gamesData';
import type {
  GradeGroup,
  PeDomain2022,
  SportType,
  DeviceType,
  DeviceFilter,
  PlayModeFilter,
  AchievementStandard,
  GameDef,
} from '../domain/gamesData';
import { CooldownTimerModal } from './components/CooldownTimerModal';

export const GameHub = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const { profile, createProfile, updateNickname, hasProfile } = usePlayerProfile();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [gradeFilter, setGradeFilter] = useState<GradeGroup>('전체');
  const [domainFilter, setDomainFilter] = useState<PeDomain2022>('전체');
  const [sportFilter, setSportFilter] = useState<SportType>('전체');
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('전체');
  const [playModeFilter, setPlayModeFilter] = useState<PlayModeFilter>('전체');
  const [activeAchievement, setActiveAchievement] = useState<AchievementStandard | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = readJsonStorage('physical_favorites');
    return new Set(Array.isArray(saved) ? saved.filter((type): type is string => typeof type === 'string' && GAMES.some(game => game.type === type)) : []);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const spinInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { writeStorage('physical_favorites', JSON.stringify([...favorites])); }, [favorites]);
  useEffect(() => () => { if (spinInterval.current) clearInterval(spinInterval.current); }, []);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [randomPick, setRandomPick] = useState<GameDef | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const achievementDialogRef = useModalDialog(!!activeAchievement, () => setActiveAchievement(null));
  const randomDialogRef = useModalDialog(!!randomPick && !isSpinning, () => setRandomPick(null));
  const [showWarmupRoulette, setShowWarmupRoulette] = useState(false);

  // 10대 신규 기능 모달 상태
  const { enabled: voiceEnabled, toggleEnabled: toggleVoice } = useVoiceCoach();
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showTamagotchiModal, setShowTamagotchiModal] = useState(false);
  const [showMbtiModal, setShowMbtiModal] = useState(false);
  const [showSplitBattle, setShowSplitBattle] = useState(false);
  const [showClassPlaylist, setShowClassPlaylist] = useState(false);
  const [showStationCircuit, setShowStationCircuit] = useState(false);
  const [showQuickPin, setShowQuickPin] = useState(() => new URLSearchParams(window.location.search).has('battle'));
  const [showMotionCam, setShowMotionCam] = useState(false);
  const [showBadgeArchive, setShowBadgeArchive] = useState(false);
  const [showCooldownModal, setShowCooldownModal] = useState(false);

  const openThemeMode = (id: ThemeModeId) => {
    const open: Record<ThemeModeId, () => void> = {
      streak: () => setShowStreakModal(true),
      tamagotchi: () => setShowTamagotchiModal(true),
      mbti: () => setShowMbtiModal(true),
      cooldown: () => setShowCooldownModal(true),
      splitBattle: () => setShowSplitBattle(true),
      quickPin: () => setShowQuickPin(true),
      stationCircuit: () => setShowStationCircuit(true),
      motionCam: () => setShowMotionCam(true),
      classPlaylist: () => setShowClassPlaylist(true),
      remote: () => navigate('/remote'),
    };
    open[id]();
  };

  // 스마트 체육 현장 맞춤 필터 (장소 · 센서)
  const [placeFilter, setPlaceFilter] = useState<'전체' | '교실' | '강당' | '운동장'>('전체');
  const [sensorFilter, setSensorFilter] = useState<'전체' | '터치' | '모션' | '자이로' | '음성'>('전체');

  // 오늘의 추천 3선 (날짜 기반 시드로 매일 변경)
  const todayPicks = useMemo(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();

    // 문자열 전체를 사용하는 해시 함수 (djb2 변형)
    const hashStr = (str: string, s: number) => {
      let h = s;
      for (let i = 0; i < str.length; i++) {
        h = ((h << 5) + h + str.charCodeAt(i)) | 0;
      }
      return h >>> 0; // unsigned
    };

    const shuffled = [...GAMES].sort((a, b) => {
      return hashStr(a.type, seed) - hashStr(b.type, seed);
    });

    // 각 영역에서 1개씩 추천
    const picks: GameDef[] = [];
    for (const domain of ['운동', '스포츠', '표현'] as const) {
      const found = shuffled.find(g => g.domain === domain && !picks.includes(g));
      if (found) picks.push(found);
    }
    return picks;
  }, []);

  const toggleFavorite = useCallback((type: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  }, []);

  const getGameSensor = (type: string): '터치' | '모션' | '자이로' | '음성' => {
    if (type === 'scream') return '음성';
    if (['jump', 'squat', 'run', 'tilt_balance', 'tilt_race', 'shake', 'arm_raise', 'wave', 'one_leg', 'freeze', 'plank', 'punch', 'foot-center-balance'].includes(type)) return '자이로';
    return '터치';
  };

  const getGamePlace = (type: string, domain: string): '교실' | '강당' | '운동장' => {
    if (['run', 'jump', 'trail-maze-run', 'slingshot-archery', 'crevasse-jump', 'bicycle-pedal-crank'].includes(type)) return '운동장';
    if (domain === '표현' || ['tug_of_war', 'badminton-smash-rhythm', 'basketball-free-throw', 'taekwondo-counter-kick', 'tabletennis-spin-read', 'spike-block-wall', 'rolling-curling', 'curling-weight-control'].includes(type)) return '강당';
    return '교실';
  };

  const filtered = GAMES.filter(g => {
    const gradeMatch = gradeFilter === '전체' || g.grades.includes(gradeFilter);
    const domainMatch = domainFilter === '전체' || g.domain === domainFilter;
    const sportMatch = domainFilter !== '스포츠' || sportFilter === '전체' || g.sportType === sportFilter;
    const deviceMatch = deviceFilter === '전체' || g.devices.includes(deviceFilter as DeviceType);
    const playModeMatch = playModeFilter === '전체' || g.playMode === playModeFilter;
    const favMatch = !showFavoritesOnly || favorites.has(g.type);
    const placeMatch = placeFilter === '전체' || getGamePlace(g.type, g.domain) === placeFilter;
    const sensorMatch = sensorFilter === '전체' || getGameSensor(g.type) === sensorFilter;
    const query = searchQuery.trim().toLocaleLowerCase();
    const searchMatch = !query || `${g.name} ${g.desc} ${g.subCategory} ${g.achievement.code} ${g.achievement.title}`.toLocaleLowerCase().includes(query);
    return gradeMatch && domainMatch && sportMatch && deviceMatch && playModeMatch && favMatch && placeMatch && sensorMatch && searchMatch;
  });

  const handleRandomPick = () => {
    if (spinInterval.current || filtered.length === 0) return;
    const candidates = [...filtered];
    setIsSpinning(true);
    setRandomPick(null);
    let count = 0;
    spinInterval.current = setInterval(() => {
      setRandomPick(candidates[Math.floor(Math.random() * candidates.length)]);
      if (++count >= 16) {
        if (spinInterval.current) clearInterval(spinInterval.current);
        spinInterval.current = null;
        setIsSpinning(false);
      }
    }, 100);
  };

  const hasActiveFilter = domainFilter !== '전체' || sportFilter !== '전체' || gradeFilter !== '전체' || deviceFilter !== '전체' || playModeFilter !== '전체' || placeFilter !== '전체' || sensorFilter !== '전체' || showFavoritesOnly || !!searchQuery;
  const resetAllFilters = () => {
    setDomainFilter('전체');
    setSportFilter('전체');
    setGradeFilter('전체');
    setDeviceFilter('전체');
    setPlayModeFilter('전체');
    setPlaceFilter('전체');
    setSensorFilter('전체');
    setShowFavoritesOnly(false);
    setSearchQuery('');
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white font-sans overflow-y-auto">
      {/* 성취기준 상세 모달 */}
      {activeAchievement && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveAchievement(null)}
        >
          <div
            ref={achievementDialogRef} role="dialog" aria-modal="true" aria-label="성취기준 상세" tabIndex={-1}
            className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-slate-900 border border-cyan-500/40 rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 font-mono font-black text-sm rounded-lg border border-cyan-500/30">
                {activeAchievement.code}
              </span>
              <span className="text-xs font-bold text-slate-400">2022 개정 초등 체육과 교육과정</span>
            </div>
            <h3 className="text-xl font-black text-white mb-2">{activeAchievement.title}</h3>
            <p className="text-sm text-slate-300 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 leading-relaxed">
              &ldquo;{activeAchievement.desc}&rdquo;
            </p>
            <button
              onClick={() => setActiveAchievement(null)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-bold text-sm text-white shadow-lg"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-slate-800/80">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[220px] bg-cyan-500/10 rounded-full blur-[100px]" />

        {/* 상단 네비게이션 Row (버튼과 배지 겹침 원천 방지) */}
        <div className="relative z-20 w-full max-w-5xl mx-auto px-4 pt-3 pb-1 flex flex-wrap items-center justify-between gap-2">
          {/* 2022 개정 배지 */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full shrink-0">
            <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-bold text-cyan-300 whitespace-nowrap">2022 개정 체육과 연계</span>
          </div>

          {/* 우측 상단 액션 버튼들 */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="h-9 px-2.5 sm:px-3.5 rounded-full flex items-center justify-center gap-1.5 transition-all hover:scale-105 active:scale-95 border shadow-md text-xs font-bold whitespace-nowrap"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)',
                color: isDark ? '#f8fafc' : '#334155',
              }}
              title="서비스 소개 페이지로 이동"
            >
              <span>💦</span>
              <span className="hidden sm:inline">소개 보기</span>
            </button>
            <button
              onClick={() => navigate('/manual')}
              className="h-9 px-2.5 sm:px-3.5 rounded-full flex items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 border shadow-md text-xs font-bold whitespace-nowrap"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)',
                color: isDark ? '#67e8f9' : '#0891b2',
              }}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">사용 설명서</span>
              <span className="xs:hidden">설명서</span>
            </button>
            <button
              onClick={() => navigate('/manual?tab=lesson')}
              className="h-9 px-2.5 sm:px-3.5 rounded-full flex items-center justify-center gap-1 transition-all hover:scale-105 active:scale-95 border shadow-md text-xs font-bold whitespace-nowrap"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(88, 28, 135, 0.6)' : 'rgba(192, 132, 252, 0.8)',
                color: isDark ? '#d8b4fe' : '#7c3aed',
              }}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xs:inline">지도안 생성기</span>
              <span className="xs:hidden">지도안</span>
            </button>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 border shadow-md shrink-0"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)',
              }}
              title={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
            >
              {isDark ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>
            <button
              onClick={toggleVoice}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 border shadow-md shrink-0"
              style={{
                backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)',
                borderColor: voiceEnabled ? 'rgba(6, 182, 212, 0.8)' : (isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(203, 213, 225, 0.8)'),
              }}
              title={voiceEnabled ? '음성 코칭 켜짐' : '음성 코칭 꺼짐'}
            >
              {voiceEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Hero Title & Desc */}
        <div className="relative z-10 flex flex-col items-center pt-2 pb-5 px-6">
          <h1
            onClick={() => navigate('/')}
            className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-300 text-center whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity"
            title="소개 페이지로 이동"
          >
            땀방울 원정대
          </h1>
          <p className="text-slate-400 font-medium mt-1.5 text-center text-xs md:text-sm max-w-xl break-keep leading-relaxed">
            초등 2022 개정 체육과 3대 영역(<span className="text-emerald-400 font-bold">운동</span> · <span className="text-blue-400 font-bold">스포츠</span> · <span className="text-purple-400 font-bold">표현</span>) 및 성취기준에 맞춘 스마트 체육 미니게임 플랫폼
          </p>
        </div>
      </div>

      {/* 📋 내 기록 */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-4 pb-2">

        {/* 🏆 내 기록 카드 */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 mb-3 shadow-lg">
          {!hasProfile ? (
            <div className="flex flex-col items-center gap-3">
              <p className="text-slate-400 text-sm font-bold text-center break-keep">👋 닉네임을 설정하면 게임 점수가 누적됩니다!</p>
              <div className="flex gap-2 w-full max-w-sm">
                <input
                  value={nicknameInput}
                  onChange={e => setNicknameInput(e.target.value)}
                  placeholder="이름(학교명)을 입력하세요"
                  className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  onKeyDown={e => { if (e.key === 'Enter' && nicknameInput.trim()) { createProfile(nicknameInput.trim()); setNicknameInput(''); } }}
                />
                <button
                  onClick={() => { if (nicknameInput.trim()) { createProfile(nicknameInput.trim()); setNicknameInput(''); } }}
                  className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-black text-sm whitespace-nowrap shrink-0 transition-transform active:scale-95 shadow-md"
                >
                  시작!
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shrink-0 shadow-lg">
                {profile!.nickname.slice(0, 1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {editingNickname ? (
                    <div className="flex gap-1.5">
                      <input
                        value={nicknameInput}
                        onChange={e => setNicknameInput(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-cyan-500 w-32"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter' && nicknameInput.trim()) { updateNickname(nicknameInput.trim()); setEditingNickname(false); } }}
                      />
                      <button onClick={() => { if (nicknameInput.trim()) { updateNickname(nicknameInput.trim()); setEditingNickname(false); } }} className="px-2 py-1 bg-cyan-600 text-white rounded-lg text-xs font-bold whitespace-nowrap">확인</button>
                      <button onClick={() => setEditingNickname(false)} className="px-2 py-1 bg-slate-700 text-slate-300 rounded-lg text-xs font-bold whitespace-nowrap">취소</button>
                    </div>
                  ) : (
                    <>
                      <span className="font-black text-white text-sm truncate">{profile!.nickname}</span>
                      <button onClick={() => { setNicknameInput(profile!.nickname); setEditingNickname(true); }} className="text-slate-500 hover:text-cyan-400 transition-colors shrink-0">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 font-bold whitespace-nowrap">총 {profile!.totalPlays}회 플레이 · {Object.keys(profile!.playCounts).length}종 게임 경험</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
                  {profile!.totalScore.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-bold whitespace-nowrap">누적 점수</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🏆 성취 뱃지 진열장 */}
      {hasProfile && (() => {
        const badges: Record<string, boolean> = (() => {
          const saved = readJsonStorage('physical_badges'); return isRecord(saved) ? Object.fromEntries(Object.entries(saved).filter(([, value]) => value === true).map(([name]) => [name, true])) : {};
        })();
        const BADGE_DEFS = [
          { id: 'high_scorer', emoji: '🏅', name: '하이스코어러', desc: '1회 500점 이상 달성', color: 'from-yellow-500 to-amber-600', border: 'border-yellow-500/50' },
          { id: 'veteran', emoji: '🎖️', name: '베테랑', desc: '10회 이상 플레이', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-500/50' },
          { id: 'master', emoji: '👑', name: '마스터', desc: '50회 이상 플레이', color: 'from-purple-500 to-indigo-600', border: 'border-purple-500/50' },
          { id: 'brave', emoji: '🦁', name: '용감한 도전자', desc: '어려움 난이도 클리어', color: 'from-red-500 to-orange-600', border: 'border-red-500/50' },
          { id: 'explorer', emoji: '🌍', name: '탐험가', desc: '10종 게임 플레이', color: 'from-emerald-500 to-teal-600', border: 'border-emerald-500/50' },
          { id: 'collector', emoji: '💎', name: '수집가', desc: '30종 게임 플레이', color: 'from-pink-500 to-rose-600', border: 'border-pink-500/50' },
        ];
        const earnedCount = BADGE_DEFS.filter(b => badges[b.id]).length;

        return (
          <div className="px-4 md:px-8 max-w-5xl mx-auto pt-2 pb-1">
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5 whitespace-nowrap">
                  🏆 성취 뱃지 <span className="text-[10px] font-bold text-slate-500">({earnedCount}/{BADGE_DEFS.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                  {earnedCount === BADGE_DEFS.length && (
                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 text-[10px] font-black rounded-full shadow-lg animate-pulse whitespace-nowrap">
                      🎉 ALL CLEAR!
                    </span>
                  )}
                  <button
                    id="badge-shelf-archive"
                    onClick={() => setShowBadgeArchive(true)}
                    className="flex items-center gap-0.5 text-[11px] font-bold text-slate-400 hover:text-amber-300 transition-colors"
                  >
                    도감 보기 <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {BADGE_DEFS.map(b => {
                  const earned = !!badges[b.id];
                  return (
                    <div
                      key={b.id}
                      className={`relative flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                        earned
                          ? `bg-gradient-to-br ${b.color} bg-opacity-20 ${b.border} shadow-lg`
                          : 'bg-slate-950/60 border-slate-800 opacity-40 grayscale'
                      }`}
                      title={earned ? `${b.name}: ${b.desc}` : `🔒 ${b.desc}`}
                    >
                      <span className={`text-2xl ${earned ? '' : 'opacity-50'}`}>{b.emoji}</span>
                      <span className={`text-[10px] font-black text-center whitespace-nowrap ${earned ? 'text-white' : 'text-slate-600'}`}>
                        {b.name}
                      </span>
                      {!earned && (
                        <span className="absolute top-1 right-1 text-[10px]">🔒</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🚀 스마트 체육 특별 테마존 — 용도별 그룹(혼자/대결/선생님) 카드는 ThemeZone 데이터로 관리 */}
      <ThemeZone onSelect={openThemeMode} onOpenBadgeArchive={() => setShowBadgeArchive(true)} />

      {/* 🌟 오늘의 추천 3선 + 즐겨찾기/랜덤 버튼 (모바일 줄바꿈 방지) */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
          <h2 className="text-sm sm:text-base font-black text-yellow-400 flex items-center gap-1.5 whitespace-nowrap">
            🌟 오늘의 추천 게임
          </h2>
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap transition-all border shrink-0 ${
                showFavoritesOnly
                  ? 'bg-yellow-500 text-yellow-900 border-yellow-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Star className={`w-3.5 h-3.5 shrink-0 ${showFavoritesOnly ? 'fill-yellow-900' : ''}`} />
              <span>즐겨찾기{favorites.size > 0 ? ` (${favorites.size})` : ''}</span>
            </button>
            <button
              onClick={handleRandomPick}
              disabled={isSpinning || filtered.length === 0}
              className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-400/30 hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-60 shrink-0"
            >
              <Shuffle className={`w-3.5 h-3.5 shrink-0 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>랜덤 뽑기</span>
            </button>
            <button
              onClick={() => setShowWarmupRoulette(true)}
              className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap bg-gradient-to-r from-amber-600 to-orange-600 text-white border border-amber-400/30 hover:from-amber-500 hover:to-orange-500 transition-all shrink-0"
            >
              <span>🎯 워밍업 룰렛</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {todayPicks.map(game => {
            const domainColor = game.domain === '운동' ? 'border-emerald-500/40 bg-emerald-950/30' : game.domain === '스포츠' ? 'border-blue-500/40 bg-blue-950/30' : 'border-purple-500/40 bg-purple-950/30';
            return (
              <button key={game.type} onClick={() => navigate(`/play/${game.type}`)} className={`p-3 rounded-xl border ${domainColor} flex items-center gap-3 hover:scale-[1.02] transition-all text-left group`}>
                <GameMotionIcon gameType={game.type} domain={game.domain} size="sm" showBadge={false} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate group-hover:text-cyan-300 transition-colors whitespace-nowrap">{game.name}</p>
                  <p className="text-[10px] text-slate-400 truncate whitespace-nowrap">{game.subCategory}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* 랜덤 뽑기 결과 모달 */}
      {randomPick && !isSpinning && (
        <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setRandomPick(null)}>
          <div ref={randomDialogRef} role="dialog" aria-modal="true" aria-label="랜덤 게임 추천" tabIndex={-1} className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-slate-900 border border-purple-500/40 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setRandomPick(null)} className="mb-3 px-3 py-1 rounded-lg border border-slate-700 text-sm text-slate-300">닫기</button>
            <div className="flex justify-center mb-4">
              <GameMotionIcon gameType={randomPick.type} domain={randomPick.domain} size="lg" showBadge={true} className="animate-bounce" />
            </div>
            <h3 className="text-2xl font-black text-white mb-1">{randomPick.name}</h3>
            <p className="text-sm text-slate-400 mb-2">{randomPick.desc}</p>
            <p className="text-xs text-purple-300 font-bold mb-6">{randomPick.domain} · {randomPick.subCategory}</p>
            <div className="flex gap-3">
              <button onClick={() => navigate(`/play/${randomPick.type}`)} className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-black text-sm">바로 시작!</button>
              <button onClick={handleRandomPick} className="flex-1 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold text-sm border border-slate-700 hover:bg-slate-700">다시 뽑기</button>
            </div>
          </div>
        </div>
      )}

      {/* 대영역 선택 (운동 · 스포츠 · 표현) */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-5 mb-4">
        <div className="flex items-center justify-between mb-2 px-1 gap-2">
          <h2 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 whitespace-nowrap">
            <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" /> 2022 개정 체육과 영역
          </h2>
          <span className="text-[11px] text-slate-400 whitespace-nowrap">교육부 고시 제2022-33호 기반</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {PE_DOMAINS.map(d => {
            const isSelected = domainFilter === d.key;
            return (
              <button
                key={d.key}
                onClick={() => {
                  setDomainFilter(d.key);
                  if (d.key !== '스포츠') setSportFilter('전체');
                }}
                className={`p-3 rounded-2xl text-left transition-all border relative overflow-hidden ${
                  isSelected
                    ? d.activeBg
                    : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800/90'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-2xl">{d.emoji}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {d.key === '전체' ? `${GAMES.length}종` : `${GAMES.filter(g => g.domain === d.key).length}종`}
                  </span>
                </div>
                <div className="font-black text-sm">{d.key}</div>
                <div className={`text-[10px] font-medium truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  {d.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 스포츠 영역 선택 시 세부 유형 (기술형 / 전략형 / 생태형) */}
      {domainFilter === '스포츠' && (
        <div className="px-4 md:px-8 max-w-5xl mx-auto mb-4 animate-in fade-in duration-200">
          <div className="p-3 bg-blue-950/40 rounded-2xl border border-blue-500/20">
            <h3 className="text-xs font-bold text-blue-300 mb-2 px-1 flex items-center gap-1.5">
              <span>⚽</span> 스포츠 세부 유형 (기술형 · 전략형 · 생태형)
            </h3>
            <div className="flex flex-wrap gap-2">
              {SPORT_SUB_TYPES.map(st => (
                <button
                  key={st.key}
                  onClick={() => setSportFilter(st.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    sportFilter === st.key
                      ? 'bg-blue-600 border-blue-400 text-white shadow-md shadow-blue-500/30'
                      : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{st.emoji}</span> {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 필터 그룹: 기기 지원 / 활동 형태 / 학년군 */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto mb-4 space-y-2.5 overflow-hidden">
        {/* 기기 분류 (스마트폰 · 태블릿 PC · 데스크톱 PC) */}
        <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-slate-300 px-1 flex items-center gap-1.5">
              <span>🖥️</span> 지원 기기 분류
            </h2>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              스마트폰 · 태블릿 PC · 데스크톱 PC
            </span>
          </div>
          <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
            {DEVICE_FILTERS.map(d => {
              const count = d.key === '전체' 
                ? GAMES.length 
                : GAMES.filter(g => g.devices.includes(d.key as DeviceType)).length;
              const isSelected = deviceFilter === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDeviceFilter(d.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-md shadow-emerald-900/30'
                      : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <span>{d.emoji}</span>
                  <span>{d.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 활동 형태 (개인/협동) & 학년군 선택 (2열 레이아웃) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 overflow-hidden">
          {/* 활동 형태 */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
            <h2 className="text-xs font-bold text-slate-300 mb-2 px-1 flex items-center gap-1.5">
              <span>👥</span> 활동 형태 (개인 / 협동)
            </h2>
            <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
              {PLAY_MODE_FILTERS.map(pm => {
                const count = pm.key === '전체'
                  ? GAMES.length
                  : GAMES.filter(g => g.playMode === pm.key).length;
                const isSelected = playModeFilter === pm.key;
                return (
                  <button
                    key={pm.key}
                    type="button"
                    onClick={() => setPlayModeFilter(pm.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-400 text-white shadow-md shadow-amber-900/30'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{pm.emoji}</span>
                    <span>{pm.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 학년군 선택 */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
            <h2 className="text-xs font-bold text-slate-300 mb-2 px-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-400" /> 학년군 선택
            </h2>
            <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
              {GRADE_GROUPS.map(g => {
                const count = g.key === '전체'
                  ? GAMES.length
                  : GAMES.filter(game => game.grades.includes(g.key as GameDef['grades'][number])).length;
                const isSelected = gradeFilter === g.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGradeFilter(g.key)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-700 border-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{g.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-cyan-800 text-cyan-100' : 'bg-slate-800 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 현장 맞춤 필터 (수업 장소 & 측정 센서) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 overflow-hidden pt-1">
          {/* 장소별 스마트 필터 */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
            <h2 className="text-xs font-bold text-slate-300 mb-2 px-1 flex items-center gap-1.5">
              <span>📍</span> 수업 장소 맞춤 (교실 · 강당 · 운동장)
            </h2>
            <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
              {([
                { key: '전체', label: '전체 장소', emoji: '🗺️' },
                { key: '교실', label: '교실(좁은공간)', emoji: '🏫' },
                { key: '강당', label: '강당(넓은공간)', emoji: '🏟️' },
                { key: '운동장', label: '운동장(야외)', emoji: '🏃' },
              ] as const).map(p => {
                const count = p.key === '전체'
                  ? GAMES.length
                  : GAMES.filter(g => getGamePlace(g.type, g.domain) === p.key).length;
                const isSelected = placeFilter === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlaceFilter(p.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-600 to-emerald-600 border-teal-400 text-white shadow-md shadow-teal-900/30'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{p.emoji}</span>
                    <span>{p.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 센서별 스마트 필터 */}
          <div className="bg-slate-900/70 p-3 rounded-2xl border border-slate-800/90 shadow-sm overflow-hidden">
            <h2 className="text-xs font-bold text-slate-300 mb-2 px-1 flex items-center gap-1.5">
              <span>📱</span> 측정 센서 분류 (터치 · 카메라 · 자이로 · 마이크)
            </h2>
            <div className="flex flex-wrap gap-2 overflow-hidden scrollbar-none">
              {([
                { key: '전체', label: '전체 센서', emoji: '⚡' },
                { key: '터치', label: '터치·버튼', emoji: '👆' },
                { key: '모션', label: '카메라 모션', emoji: '📷' },
                { key: '자이로', label: '자이로·가속도', emoji: '🧭' },
                { key: '음성', label: '마이크 음성', emoji: '🎤' },
              ] as const).map(s => {
                const count = s.key === '전체'
                  ? GAMES.length
                  : GAMES.filter(g => getGameSensor(g.type) === s.key).length;
                const isSelected = sensorFilter === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSensorFilter(s.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-indigo-400 text-white shadow-md shadow-indigo-900/30'
                        : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{s.emoji}</span>
                    <span>{s.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 max-w-5xl mx-auto mb-4">
        <label htmlFor="game-search" className="block mb-2 text-sm font-bold text-slate-300">게임 검색</label>
        <input id="game-search" type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="게임 이름, 활동, 성취기준 검색" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-white focus:outline-none focus:border-cyan-400" />
      </div>
      {/* 결과 카운트 및 안내 */}
      <div className="px-5 md:px-9 max-w-5xl mx-auto mb-3 flex items-center justify-between text-xs text-slate-400">
        <div className="font-bold flex flex-wrap items-center gap-2">
          <span>검색 결과 <strong className="text-cyan-400 font-black text-sm">{filtered.length}</strong> / {GAMES.length}개 게임</span>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-400 hover:text-cyan-300 border border-slate-700 transition-colors"
            >
              필터 초기화 ↺
            </button>
          )}
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          💡 성취기준 코드를 클릭하면 세부 목표를 볼 수 있습니다
        </span>
      </div>

      {/* Game Grid */}
      <div className="px-4 md:px-8 pb-8 max-w-5xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-600 bg-slate-900/40 rounded-3xl border border-slate-800">
            <span className="text-5xl block mb-3">🔍</span>
            <p className="font-bold text-slate-400">해당 조건에 일치하는 게임이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">영역이나 학년군 필터를 변경해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filtered.map(game => {
              const domainInfo = PE_DOMAINS.find(d => d.key === game.domain)!;
              return (
                <div
                  key={game.type}
                  className={`group relative bg-slate-900/90 backdrop-blur-sm border ${game.border} rounded-2xl p-4 text-left transition-all duration-300 hover:scale-[1.015] hover:shadow-xl ${game.glow} overflow-hidden flex flex-col justify-between`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${game.color} opacity-60 group-hover:opacity-100 transition-opacity`} />

                  <div>
                    {/* 상단 성취기준 태그 & 활동 형태 & 영역 태그 */}
                    <div className="flex items-center justify-between gap-1.5 mb-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAchievement(game.achievement);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800/90 hover:bg-cyan-950/80 border border-slate-700 hover:border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-300 transition-colors"
                          title="성취기준 상세 보기"
                        >
                          <Info className="w-2.5 h-2.5" />
                          <span>{game.achievement.code}</span>
                        </button>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                          game.playMode === '협동'
                            ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                            : 'bg-slate-800/80 text-slate-300 border-slate-700/60'
                        }`}>
                          {game.playMode === '협동' ? '🤝 협동' : '👤 개인'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                          game.domain === '운동' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50' :
                          game.domain === '스포츠' ? 'bg-blue-950 text-blue-300 border border-blue-800/50' :
                          'bg-purple-950 text-purple-300 border border-purple-800/50'
                        }`}>
                          {domainInfo.emoji} {game.domain}
                          {game.sportType && ` · ${game.sportType}`}
                        </span>
                      </div>
                    </div>

                    {/* 아이콘 및 게임명 */}
                    <div className="flex items-start gap-3.5 mb-2.5">
                      <GameMotionIcon gameType={game.type} domain={game.domain} size="md" showBadge={true} />
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-black text-base text-white line-clamp-2 group-hover:text-cyan-300 transition-colors">
                          {game.name}
                        </h3>
                        <p className="text-slate-400 text-xs font-medium line-clamp-1 mt-1">
                          {game.desc}
                        </p>
                      </div>
                    </div>

                    {/* 세부 활동 카테고리 & 성취기준 요지 */}
                    <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/80 mb-3">
                      <div className="text-[11px] font-bold text-slate-300 truncate">
                        🎯 {game.subCategory}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {game.achievement.title}
                      </div>
                    </div>
                  </div>

                  {/* 하단 학년군, 기기 아이콘 & 시작 버튼 */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        {game.grades.map(gr => (
                          <span key={gr} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold border border-slate-700/60">
                            {gr}
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-0.5 text-[11px] bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800/70" title={`지원 기기: ${game.devices.join(', ')}`}>
                        {game.devices.includes('스마트폰') && <span title="스마트폰 지원">📱</span>}
                        {game.devices.includes('태블릿 PC') && <span title="태블릿 PC 지원">📟</span>}
                        {game.devices.includes('데스크톱 PC') && <span title="데스크톱 PC 지원">🖥️</span>}
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/play/${game.type}`)}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1 active:scale-95 transition-all shrink-0"
                    >
                      시작 <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(game.type); }} className="p-1.5 rounded-lg hover:bg-slate-800 transition-colors" title="즐겨찾기">
                      <Star className={`w-4 h-4 ${favorites.has(game.type) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 워밍업 룰렛 모달 */}
      {showWarmupRoulette && (<WarmupRoulette isOpen={showWarmupRoulette} onClose={() => setShowWarmupRoulette(false)} />)}

      {/* 10대 신규 기능 모달들 */}
      {showStreakModal && (<DailyStreakModal
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        onLaunchGame={(type) => navigate(`/play/${type}`)}
      />)}

      {showTamagotchiModal && (<DambangTamagotchiModal
        isOpen={showTamagotchiModal}
        onClose={() => setShowTamagotchiModal(false)}
      />)}

      {showMbtiModal && (<PhysicalMbtiTest
        isOpen={showMbtiModal}
        onClose={() => setShowMbtiModal(false)}
        onSelectGame={(type) => navigate(`/play/${type}`)}
      />)}

      {showSplitBattle && (<SplitBattleGame
        isOpen={showSplitBattle}
        onClose={() => setShowSplitBattle(false)}
      />)}

      {showClassPlaylist && (<ClassPlaylistPlayer
        isOpen={showClassPlaylist}
        onClose={() => setShowClassPlaylist(false)}
      />)}

      {showStationCircuit && (<StationCircuitMode
        isOpen={showStationCircuit}
        onClose={() => setShowStationCircuit(false)}
        onLaunchGame={(type) => navigate(`/play/${type}`)}
      />)}

      {showQuickPin && (<QuickPinClassroom
        isOpen={showQuickPin}
        onClose={() => setShowQuickPin(false)}
        onStartGame={(type, context) => navigate(`/play/${type}${context ? `?room=${encodeURIComponent(context.roomId)}&group=${encodeURIComponent(context.groupId)}` : ''}`)}
      />)}

      {showMotionCam && (<MotionCamChallenge
        isOpen={showMotionCam}
        onClose={() => setShowMotionCam(false)}
      />)}

      {showBadgeArchive && (<BadgeArchiveModal
        isOpen={showBadgeArchive}
        onClose={() => setShowBadgeArchive(false)}
      />)}

      {showCooldownModal && (<CooldownTimerModal
        isOpen={showCooldownModal}
        onClose={() => setShowCooldownModal(false)}
      />)}

      {/* PWA 설치 유도 배너 */}
      <PwaInstallBanner />

      {/* Footer */}
      <div className="px-4 md:px-8 pb-10 max-w-5xl mx-auto">
        <div className="border-t border-slate-800/80 pt-6">
          <p className="text-center text-slate-400 text-[11px] font-medium">
            땀방울 원정대 ⓒ2026. 엽쌤 All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
