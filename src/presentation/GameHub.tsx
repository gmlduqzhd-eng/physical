import {useActivityFavorites} from '../application/useActivityFavorites';
import {FEATURED_GAMES} from '../domain/featuredGames';
import {achievementLabel,PENDING_CURRICULUM_CODE} from '../domain/curriculumCode';
import {RecentGameRecords} from './components/RecentGameRecords';
import { AccessQrDialog, type AccessQrDialogHandle } from "./components/AccessQrDialog";
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react';
import { useBackgroundMusic } from '../application/BackgroundMusicContext';
import { HeaderToolbar } from './components/HeaderToolbar';
import { readJsonStorage, isRecord } from '../application/browserStorage';
import { useModalDialog } from '../application/useModalDialog';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ChevronRight, BookOpen, Home, QrCode, Award, Star, Shuffle, Edit3, Settings, X } from 'lucide-react';
import { usePlayerProfile } from '../application/usePlayerProfile';
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
import './GameHub.css';
import { ThemeZone, type ThemeModeId } from './components/ThemeZone';

import { AVAILABLE_GAMES as GAMES } from '../domain/gamesData';
import type { AchievementStandard, GameDef } from '../domain/gamesData';
import { CooldownTimerModal } from './components/CooldownTimerModal';

const HUB_TABS = [{ id: 'games', label: '⭐ 즐겨찾기·뽑기' }, { id: 'activities', label: '⚡ 특별 활동' }, { id: 'teacher', label: '🧑‍🏫 선생님 도구' }, { id: 'records', label: '🏆 내 기록' }] as const;

export const GameHub = () => {
  const accessQrDialog = useRef<AccessQrDialogHandle>(null);
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'games' | 'activities' | 'teacher' | 'records'>(()=>new URLSearchParams(window.location.search).get('tab')==='records'?'records':'games');
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useModalDialog(showMenu, () => setShowMenu(false));
  const catalogRef = useRef<HTMLDivElement>(null);
  const { profile, createProfile, updateNickname, hasProfile } = usePlayerProfile();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [activeAchievement, setActiveAchievement] = useState<AchievementStandard | null>(null);
  const { isFavorite, toggleFavorite, favoriteTypes } = useActivityFavorites();
  const spinInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (spinInterval.current) clearInterval(spinInterval.current); }, []);
  const [randomPick, setRandomPick] = useState<GameDef | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const achievementDialogRef = useModalDialog(!!activeAchievement, () => setActiveAchievement(null));
  const randomDialogRef = useModalDialog(!!randomPick && !isSpinning, () => setRandomPick(null));
  const [showWarmupRoulette, setShowWarmupRoulette] = useState(false);

  // 10대 신규 기능 모달 상태
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
  const { suppress } = useBackgroundMusic();
  const activityOpen = showWarmupRoulette || showTamagotchiModal || showMbtiModal || showSplitBattle || showClassPlaylist || showStationCircuit || showQuickPin || showMotionCam || showCooldownModal;
  useLayoutEffect(() => { suppress(activityOpen); }, [activityOpen, suppress]);
  useLayoutEffect(() => () => suppress(false), [suppress]);

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

    // 오늘의 추천은 대표 게임에서 고른다(대표 게임이 비어 있으면 전체에서).
    const shuffled = [...(FEATURED_GAMES.length ? FEATURED_GAMES : GAMES)].sort((a, b) => {
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


  // 즐겨찾기가 있으면 즐겨찾기에서, 없으면 대표 게임에서 뽑는다. 조건으로 찾기는 활동 목록(/hub) 한 곳에서 한다.
  const favoriteGames = GAMES.filter(g => favoriteTypes.has(g.type));
  const filtered = favoriteGames.length ? favoriteGames : FEATURED_GAMES.length ? FEATURED_GAMES : GAMES;

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


  return (
    <div className="hub-page min-h-[100dvh] bg-slate-950 text-white font-sans overflow-y-auto">
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
                {achievementLabel(activeAchievement.code)}
              </span>
              {activeAchievement.code!==PENDING_CURRICULUM_CODE&&<span className="text-xs font-bold text-slate-400">2022 개정 초등 체육과 교육과정</span>}
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

      <AccessQrDialog dialogRef={accessQrDialog} />
      <header className="hub-header">
        <div className="hub-header-row">
          <div className="hub-brand-row">
            <h1><button type="button" onClick={() => navigate('/')} className="hub-brand">땀방울 원정대</button></h1>
            <span className="hub-curriculum"><Award className="w-3.5 h-3.5" /> 2022 개정 체육과 연계</span>
          </div>
          <HeaderToolbar><button type="button" className="icon-toolbar-action" title="메인 화면" onClick={() => navigate('/')}><Home aria-hidden="true"/><span>메인 화면</span></button><button type="button" className="icon-toolbar-action" title="메뉴" onClick={() => setShowMenu(true)} aria-haspopup="dialog"><Settings aria-hidden="true"/><span>메뉴</span></button></HeaderToolbar>
        </div>
        <p>기록 · 즐겨찾기 · 특별 활동 · 선생님 도구 · 활동 {GAMES.length}개는 <button type="button" className="underline" onClick={() => navigate('/hub')}>활동 목록</button>에서 찾아요</p>
      </header>
      {showMenu && (
        <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowMenu(false)}>
          <div ref={menuRef} role="dialog" aria-modal="true" aria-label="허브 메뉴" tabIndex={-1} className="hub-menu bg-slate-900 border border-slate-700 rounded-2xl p-5" onClick={event => event.stopPropagation()}>
            <div className="flex justify-between items-center mb-5"><h2 className="text-lg font-black">메뉴 · 설정</h2><button type="button" onClick={() => setShowMenu(false)} aria-label="메뉴 닫기" className="p-2"><X className="w-5 h-5" /></button></div>
            <div className="hub-menu-items">
              <button type="button" onClick={() => { setShowMenu(false); requestAnimationFrame(() => { void accessQrDialog.current?.open(); }); }}><QrCode className="w-4 h-4"/>접속 QR 크게 보기</button>
              <button type="button" onClick={() => navigate('/manual')}><BookOpen className="w-4 h-4" /> 사용 설명서</button>
              <button type="button" onClick={() => navigate('/manual?tab=lesson')}><BookOpen className="w-4 h-4" /> 지도안 생성기 (자동 · 바로 만들기)</button>
              <button type="button" onClick={() => navigate('/teacher-ai')}><Sparkles className="w-4 h-4" /> AI로 지도안 · 수업 준비실</button>
              <p className="hub-menu-note">글씨 크기·밝기·음성 안내·음악은 맨 위 '화면·소리'에서 바꿔요.</p>
            </div>
          </div>
        </div>
      )}
      <div className="hub-summary">
        <span className="hub-avatar">{profile?.nickname.slice(0, 1) || '땀'}</span>
        <div className="min-w-0 flex-1"><strong className="block truncate">{profile?.nickname || '땀방울 원정대에 오신 것을 환영합니다'}</strong><p>{hasProfile ? `총 ${profile!.totalPlays}회 플레이 · ${Object.keys(profile!.playCounts).length}종 게임 경험` : '게임은 바로 시작할 수 있어요. 내 기록에서 닉네임을 설정하세요.'}</p></div>
        <strong className="hub-score">{(profile?.totalScore || 0).toLocaleString()}점</strong>
        <button type="button" onClick={() => setActiveTab('records')} className="hub-record-link">🏆 내 기록 ›</button>
      </div>
      {/* 갈래 줄: 화살표 키(←→·Home·End)로 옮기고, 고른 갈래만 Tab 순서에 둔다. */}
      <div className="hub-tabs" role="tablist" aria-label="놀이 모음 메뉴" onKeyDown={event => {
        const ids = HUB_TABS.map(tab => tab.id), at = ids.indexOf(activeTab);
        const next = event.key === 'ArrowRight' ? ids[(at + 1) % ids.length] : event.key === 'ArrowLeft' ? ids[(at + ids.length - 1) % ids.length] : event.key === 'Home' ? ids[0] : event.key === 'End' ? ids[ids.length - 1] : null;
        if (!next) return;
        event.preventDefault(); setActiveTab(next);
        event.currentTarget.querySelector<HTMLElement>(`#hub-tab-${next}`)?.focus();
      }}>
        {HUB_TABS.map(tab => (
          <button key={tab.id} type="button" role="tab" id={`hub-tab-${tab.id}`} aria-selected={activeTab === tab.id} tabIndex={activeTab === tab.id ? 0 : -1} aria-controls={`hub-panel-${tab.id}`} onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
        ))}
      </div>
      <section id="hub-panel-records" role="tabpanel" aria-labelledby="hub-tab-records" hidden={activeTab !== 'records'}>
      <div className="px-4 md:px-8 max-w-5xl mx-auto py-4"><RecentGameRecords profile={profile}/></div>
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
                  placeholder="별명만 입력 (실명·학교명 금지)"
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
                <p className="text-[13px] text-slate-500 font-bold whitespace-nowrap">총 {profile!.totalPlays}회 플레이 · {Object.keys(profile!.playCounts).length}종 게임 경험</p>
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400">
                  {profile!.totalScore.toLocaleString()}
                </div>
                <div className="text-[13px] text-slate-500 font-bold whitespace-nowrap">누적 점수</div>
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
          { id: 'explorer', emoji: '🌍', name: '탐험가', desc: '10종 게임 플레이', color: 'from-emerald-500 to-teal-600', border: 'border-emerald-500/50' },
          { id: 'collector', emoji: '💎', name: '수집가', desc: '30종 게임 플레이', color: 'from-pink-500 to-rose-600', border: 'border-pink-500/50' },
        ];
        const earnedCount = BADGE_DEFS.filter(b => badges[b.id]).length;

        return (
          <div className="px-4 md:px-8 max-w-5xl mx-auto pt-2 pb-1">
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-amber-400 flex items-center gap-1.5 whitespace-nowrap">
                  🏆 성취 뱃지 <span className="text-[13px] font-bold text-slate-500">({earnedCount}/{BADGE_DEFS.length})</span>
                </h3>
                <div className="flex items-center gap-2">
                  {earnedCount === BADGE_DEFS.length && (
                    <span className="px-2.5 py-0.5 bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-950 text-[13px] font-black rounded-full shadow-lg animate-pulse whitespace-nowrap">
                      🎉 ALL CLEAR!
                    </span>
                  )}
                  <button
                    id="badge-shelf-archive"
                    onClick={() => setShowBadgeArchive(true)}
                    className="flex items-center gap-0.5 text-[13px] font-bold text-slate-400 hover:text-amber-300 transition-colors"
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
                      <span className={`text-[13px] font-black text-center whitespace-nowrap ${earned ? 'text-white' : 'text-slate-600'}`}>
                        {b.name}
                      </span>
                      {!earned && (
                        <span className="absolute top-1 right-1 text-[13px]">🔒</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      </section>
      {activeTab === 'activities' || activeTab === 'teacher' ? (
        <section id={`hub-panel-${activeTab}`} role="tabpanel" aria-labelledby={`hub-tab-${activeTab}`}>
          {activeTab === 'teacher' && <div className="p-4 max-w-5xl mx-auto"><button className="rounded-xl bg-cyan-700 text-white px-5 py-4 font-bold" onClick={() => navigate('/teacher-ai')}>✦ 수업 준비실 · 활동 추천 / 난이도 / 지도안</button><button className="ml-3 underline" onClick={() => navigate('/privacy')}>기기 정보 관리</button></div>}
          <ThemeZone groupFilter={activeTab === 'teacher' ? 'teacher' : 'activities'} onSelect={openThemeMode} onOpenBadgeArchive={() => setShowBadgeArchive(true)} />
        </section>
      ) : null}
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

      <section id="hub-panel-games" role="tabpanel" aria-labelledby="hub-tab-games" hidden={activeTab !== 'games'}>
      <div ref={catalogRef} className="hub-catalog-heading"><div><h2>⭐ 즐겨찾기와 뽑기</h2><p>조건(어디서 · 몇 명 · 몇 분)으로 찾기는 활동 목록에서 해요. 여기서는 즐겨찾기와 뽑기만 해요.</p></div>          <div className="grid grid-cols-2 sm:flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={() => navigate('/hub')} className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap bg-gradient-to-r from-cyan-600 to-blue-600 text-white border border-cyan-400/30 shrink-0"><span>🔎 조건으로 찾기</span></button>
            <button
              onClick={handleRandomPick}
              disabled={isSpinning || filtered.length === 0}
              className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-400/30 hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-60 shrink-0"
            >
              <Shuffle className={`w-3.5 h-3.5 shrink-0 ${isSpinning ? 'animate-spin' : ''}`} />
              <span>{favoriteGames.length ? '즐겨찾기에서 뽑기' : '추천 활동에서 뽑기'}</span>
            </button>
            <button
              onClick={() => setShowWarmupRoulette(true)}
              className="px-2.5 sm:px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 whitespace-nowrap bg-gradient-to-r from-amber-600 to-orange-600 text-white border border-amber-400/30 hover:from-amber-500 hover:to-orange-500 transition-all shrink-0"
            >
              <span>🎯 워밍업 룰렛</span>
            </button>
          </div></div>
      <div className="px-4 md:px-8 pb-8 max-w-5xl mx-auto">
        {favoriteGames.length === 0 ? (
          <div className="text-center py-12 text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
            <span className="text-4xl block mb-3">☆</span>
            <p className="font-bold">아직 즐겨찾기한 활동이 없어요.</p>
            <p className="text-sm mt-1">활동 목록에서 카드의 ☆를 누르면 여기에 모여요.</p>
            <button type="button" onClick={() => navigate('/hub')} className="mt-4 px-4 py-2 rounded-xl bg-cyan-600 text-white font-bold text-sm">활동 목록 열기</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {favoriteGames.map(game => (
              <div key={game.type} data-game-card={game.type} className={`relative bg-slate-900/90 border ${game.border} rounded-2xl p-4 text-left flex flex-col justify-between gap-3`}>
                <div className="flex items-start gap-3.5">
                  <GameMotionIcon gameType={game.type} domain={game.domain} size="md" showBadge={true} />
                  <div className="flex-1 min-w-0 pt-0.5">
                    <h3 className="font-black text-base text-white">{game.name}</h3>
                    <p className="text-slate-400 text-xs font-medium mt-1">{game.desc}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button onClick={() => navigate(`/play/${game.type}`)} className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-black flex items-center gap-1 shrink-0">시작 <ChevronRight className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => toggleFavorite(game.type)} aria-pressed={isFavorite(game.type)} className="p-1.5 rounded-lg hover:bg-slate-800" title="즐겨찾기 빼기" aria-label={`${game.name} 즐겨찾기 빼기`}>
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <details className="hub-recommendations"><summary>🌟 오늘의 추천 게임 보기</summary>
      {/* 🌟 오늘의 추천 3선 + 즐겨찾기/랜덤 버튼 (모바일 줄바꿈 방지) */}
      <div className="px-4 md:px-8 max-w-5xl mx-auto pt-4 pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
          <h2 className="text-sm sm:text-base font-black text-yellow-400 flex items-center gap-1.5 whitespace-nowrap">
            🌟 오늘의 추천 게임
          </h2>

        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {todayPicks.map(game => {
            const domainColor = game.domain === '운동' ? 'border-emerald-500/40 bg-emerald-950/30' : game.domain === '스포츠' ? 'border-blue-500/40 bg-blue-950/30' : 'border-purple-500/40 bg-purple-950/30';
            return (
              <button key={game.type} onClick={() => navigate(`/play/${game.type}`)} className={`p-3 rounded-xl border ${domainColor} flex items-center gap-3 hover:scale-[1.02] transition-all text-left group`}>
                <GameMotionIcon gameType={game.type} domain={game.domain} size="sm" showBadge={false} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white group-hover:text-cyan-300 transition-colors">{game.name}</p>
                  <p className="text-[13px] text-slate-400">{game.subCategory}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      </details>
      </section>
      <footer className="hub-footer">땀방울 원정대 · 움직임의 즐거움을<span>설명서 · 지도안 · 음악 / 테마 / 음성 설정은 상단 메뉴에서</span></footer>
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
          <p className="text-center text-slate-400 text-[13px] font-medium">
            땀방울 원정대 ⓒ2026. 엽쌤 All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};
