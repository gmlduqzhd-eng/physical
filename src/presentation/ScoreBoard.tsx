import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { useAudio } from '../application/useAudio';
import { Shield, Clock, AlertTriangle, Flame, QrCode, FileText, Volume2, ShieldAlert, Sparkles } from 'lucide-react';
import { GameIcons as LucideIcons } from './icons';
import { ClassReportModal } from './components/ClassReportModal';
import { sfxWhistle } from '../application/soundEffects';

export const ScoreBoard = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { scores, gameRoom, loading, error, refresh } = useGameLogic(roomId);
  const { mins, secs, isDanger } = useGameTimer(gameRoom);
  const { playSiren } = useAudio();
  
  const sirenPlayed = useRef(false);
  const plankPlayed = useRef(false);
  const whistlePlayed = useRef(false);
  const [showQR, setShowQR] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const prevScoresRef = useRef<{id:string;score:number;rank:number}[]>([]);
  const [confetti, setConfetti] = useState<{id:number;x:number;color:string;delay:number;spinDuration:number}[]>([]);

  useEffect(() => {
    if (!gameRoom?.status || gameRoom.status === 'waiting') { plankPlayed.current = false; sirenPlayed.current = false; whistlePlayed.current = false; prevScoresRef.current = []; setConfetti([]); }
  }, [roomId, gameRoom?.status]);

  // 순위 역전 감지 토스트
  useEffect(() => {
    if (scores.length < 2) return;
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const currentRanks = sorted.map((s, i) => ({ id: s.id, score: s.score, rank: i + 1, name: s.group_name }));
    const prev = prevScoresRef.current;
    if (prev.length > 0) {
      const prevFirst = prev.find(p => p.rank === 1);
      const currFirst = currentRanks.find(c => c.rank === 1);
      if (prevFirst && currFirst && prevFirst.id !== currFirst.id) {
        setToast(`🔥 ${currFirst.name}이(가) 1등을 탈환!`);
        setTimeout(() => setToast(null), 3500);
      }
    }
    prevScoresRef.current = currentRanks.map(c => ({ id: c.id, score: c.score, rank: c.rank }));
  }, [scores]);

  // 게임 종료 시 컨페티
  useEffect(() => {
    if (gameRoom?.status === 'finished') {
      setConfetti(prev => {
        if (prev.length > 0) return prev;
        return Array.from({ length: 60 }, (_, i) => ({
          id: i,
          x: Math.random() * 100,
          color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98FB98'][i % 8],
          delay: Math.random() * 2,
          spinDuration: 0.5 + Math.random(),
        }));
      });
    }
  }, [gameRoom?.status]);
  
  const isTsunami = gameRoom?.status === 'tsunami';
  const isWhistle = gameRoom?.announcement === 'WHISTLE';
  const isPlankEvent = mins === '01' && secs === '00' && gameRoom?.status === 'playing';

  useEffect(() => {
    if (isPlankEvent && !plankPlayed.current) {
      playSiren();
      plankPlayed.current = true;
    }
    if (isTsunami && !sirenPlayed.current) {
      playSiren();
      sirenPlayed.current = true;
    } else if (!isTsunami) {
      sirenPlayed.current = false;
    }
  }, [isPlankEvent, isTsunami, playSiren]);

  useEffect(() => {
    if (isWhistle && !whistlePlayed.current) {
      sfxWhistle();
      whistlePlayed.current = true;
    } else if (!isWhistle) {
      whistlePlayed.current = false;
    }
  }, [isWhistle]);

  if (!gameRoom) return <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center gap-4 p-6 text-center text-slate-800"><p>{error || (loading ? '전광판 정보를 불러오는 중...' : '수업 방 정보가 없습니다.')}</p><button onClick={refresh} className="px-5 py-3 rounded-xl bg-cyan-600 text-white font-bold">다시 시도</button><a href="/board" className="underline">다른 PIN으로 입장</a></div>;

  if (gameRoom?.status === 'finished') {
    const sorted = [...scores].sort((a, b) => b.score - a.score);
    const top3 = sorted.slice(0, 3);

    return (
      <div className="min-h-[100dvh] font-sans overflow-y-auto relative bg-slate-900 text-white flex flex-col items-center py-12 px-8 pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-500/20 via-slate-900 to-slate-900 animate-[pulse_4s_ease-in-out_infinite] pointer-events-none"></div>
        
        {/* 컨페티 애니메이션 */}
        {confetti.map(p => (
          <div key={p.id} className="fixed top-0 z-50 pointer-events-none" style={{
            left: `${p.x}%`,
            animation: `confettiFall ${3 + p.delay}s ease-in forwards`,
            animationDelay: `${p.delay}s`,
          }}>
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color, animation: `confettiSpin ${p.spinDuration}s linear infinite` }} />
          </div>
        ))}
        <style>{`
          @keyframes confettiFall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
          @keyframes confettiSpin { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
        `}</style>

        <h1 className="text-3xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-12 drop-shadow-lg relative z-10 tracking-widest">🏆 최종 결과 발표 🏆</h1>

        <div className="flex items-end justify-center gap-2 md:gap-6 h-64 md:h-80 mb-16 relative z-10 w-full max-w-5xl mt-12">
          {/* 2nd Place */}
          {top3[1] && (
            <div className="flex flex-col items-center w-1/3">
              <div className="bg-slate-200 text-slate-800 px-4 py-2 rounded-t-xl font-black text-2xl mb-2 flex items-center gap-2 shadow-lg"><LucideIcons.Medal className="w-6 h-6 text-slate-500"/> {top3[1].group_name}</div>
              <div className="text-4xl font-mono font-bold text-slate-300 mb-4 drop-shadow-md">{top3[1].score}점</div>
              <div className="w-full bg-gradient-to-t from-slate-500 to-slate-300 h-48 rounded-t-2xl shadow-2xl flex justify-center items-start pt-6 border-t-4 border-slate-100">
                <span className="text-6xl font-black text-white/50">2</span>
              </div>
            </div>
          )}
          {/* 1st Place */}
          {top3[0] && (
            <div className="flex flex-col items-center w-1/3 z-10 -mx-4 mb-4">
              <LucideIcons.Crown className="w-20 h-20 text-yellow-400 mb-2 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
              <div className="bg-yellow-400 text-yellow-900 px-6 py-3 rounded-t-xl font-black text-lg md:text-3xl mb-2 shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center gap-2"><LucideIcons.Trophy className="w-8 h-8"/> {top3[0].group_name}</div>
              <div className="text-5xl font-mono font-black text-yellow-400 mb-4 drop-shadow-lg">{top3[0].score}점</div>
              <div className="w-full bg-gradient-to-t from-yellow-600 to-yellow-400 h-64 rounded-t-2xl shadow-2xl flex justify-center items-start pt-6 border-t-4 border-yellow-200">
                <span className="text-8xl font-black text-white/50">1</span>
              </div>
            </div>
          )}
          {/* 3rd Place */}
          {top3[2] && (
            <div className="flex flex-col items-center w-1/3">
              <div className="bg-orange-300 text-orange-900 px-4 py-2 rounded-t-xl font-black text-2xl mb-2 flex items-center gap-2 shadow-lg"><LucideIcons.Medal className="w-6 h-6 text-orange-700"/> {top3[2].group_name}</div>
              <div className="text-4xl font-mono font-bold text-orange-300 mb-4 drop-shadow-md">{top3[2].score}점</div>
              <div className="w-full bg-gradient-to-t from-orange-700 to-orange-400 h-40 rounded-t-2xl shadow-2xl flex justify-center items-start pt-6 border-t-4 border-orange-200">
                <span className="text-6xl font-black text-white/50">3</span>
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 gap-4 relative z-10">
          {sorted.map(s => (
            <div key={s.id} className="bg-white/10 backdrop-blur border border-white/20 p-5 rounded-xl flex flex-col justify-between shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-xl text-slate-100 flex items-center gap-2">
                  {(LucideIcons as unknown as Record<string, React.ElementType>)[s.avatar || 'Smile'] && (() => {
                    const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[s.avatar || 'Smile'];
                    return <Icon className="w-5 h-5 text-slate-400" />;
                  })()}
                  {s.group_name}
                </span>
                <span className="font-mono text-xl font-bold text-cyan-300">{s.score}점</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {s.badges && s.badges.includes('rich') && <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded text-xs font-bold border border-yellow-500/30 flex items-center gap-1 shadow-inner"><LucideIcons.Coins className="w-3 h-3"/> 만수르</span>}
                {s.badges && s.badges.includes('shopaholic') && <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-bold border border-purple-500/30 flex items-center gap-1 shadow-inner"><LucideIcons.ShoppingCart className="w-3 h-3"/> 쇼핑 중독</span>}
                {s.badges && s.badges.includes('bingo') && <span className="px-2 py-1 bg-orange-500/20 text-orange-300 rounded text-xs font-bold border border-orange-500/30 flex items-center gap-1 shadow-inner"><LucideIcons.Grid className="w-3 h-3"/> 빙고 마스터</span>}
                {(!s.badges || s.badges.length === 0) && <span className="text-xs text-slate-500 italic">배지 없음</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 relative z-10 flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-base shadow-xl active:scale-95 transition-all"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span>📝 2022 개정 NEIS 세특 자동 완성 & 리포트</span>
          </button>
        </div>

        <ClassReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          gameRoom={gameRoom}
          scores={scores}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-[100dvh] font-sans overflow-y-auto relative transition-colors duration-1000 ${isTsunami ? 'bg-blue-100' : isDanger ? 'bg-red-50' : 'bg-slate-50'} text-slate-900 pb-20`}>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      
      {isTsunami && (
        <div className="absolute inset-0 z-40 bg-blue-600/30 flex flex-col items-center justify-center animate-pulse backdrop-blur-sm">
          <AlertTriangle className="w-48 h-48 text-blue-400 mb-8" />
          <h1 className="text-8xl font-black text-slate-900 text-center drop-shadow-2xl">해일 경보 발령!</h1>
          <p className="text-4xl text-blue-200 mt-8 font-bold">즉시 매트 위(안전구역)로 대피하십시오!</p>
        </div>
      )}

      {isPlankEvent && !isTsunami && (
        <div className="absolute inset-0 z-40 bg-red-600/30 flex flex-col items-center justify-center animate-pulse backdrop-blur-sm">
          <Flame className="w-48 h-48 text-red-500 mb-8" />
          <h1 className="text-8xl font-black text-slate-900 text-center drop-shadow-2xl">코어 과부하!</h1>
          <p className="text-4xl text-yellow-300 mt-8 font-bold">전원 30초 플랭크 실시!</p>
        </div>
      )}

      {/* 순위 역전 토스트 알림 */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] bg-gradient-to-r from-orange-500 to-red-500 text-white px-10 py-5 rounded-2xl shadow-2xl text-3xl font-black animate-bounce border-2 border-yellow-300">
          {toast}
        </div>
      )}

      {/* 최종 1분 전체 화면 펄스 */}
      {isDanger && !isTsunami && !isPlankEvent && (
        <div className="fixed inset-0 z-[1] pointer-events-none border-8 border-red-500/40 animate-pulse" />
      )}

      <header className="relative z-10 flex justify-between items-center px-4 md:px-12 py-6 md:py-8 flex-wrap gap-4 bg-white/80 backdrop-blur-md border-b border-cyan-200">
        <div className="flex items-center gap-4">
          <Shield className="w-12 h-12 text-cyan-400" />
          <h1 className="text-xl md:text-4xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
            {gameRoom ? gameRoom.name : '폭탄 해체 작전'}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {/* 수업 결과 리포트 버튼 */}
          <button onClick={() => setShowReportModal(true)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 transition-colors shadow-sm" title="수업 결과 리포트">
            <FileText className="w-6 h-6 text-cyan-600" />
          </button>
          {/* 미니 QR 코드 (지각생 입장용) */}
          <button onClick={() => setShowQR(!showQR)} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-cyan-50 transition-colors shadow-sm" title="QR 코드 표시">
            <QrCode className="w-6 h-6 text-cyan-500" />
          </button>
          <div className={`flex items-center gap-6 px-8 py-4 rounded-xl border ${isDanger ? 'bg-red-50 border-red-300 animate-pulse' : 'bg-white border-slate-200 shadow-sm'}`}>
            <Clock className={`w-8 h-8 ${isDanger ? 'text-red-600' : 'text-red-500'}`} />
            <span className={`text-5xl font-bold font-mono tracking-wider ${isDanger ? 'text-red-600' : 'text-red-500'}`}>
              {mins}:{secs}
            </span>
          </div>
        </div>
      </header>

      {/* 🚨 체육관 집중 휘슬 긴급 배너 */}
      {isWhistle && (
        <div className="relative z-30 w-full bg-red-600 text-white px-8 py-3.5 flex items-center justify-center gap-4 text-2xl md:text-3xl font-black animate-pulse shadow-xl border-b-4 border-yellow-300">
          <Volume2 className="w-8 h-8 animate-bounce text-yellow-300" />
          <span>🚨 체육관 전체 집중! 호루라기 신호 (선생님을 주목하세요)</span>
        </div>
      )}

      {/* 📢 선생님 라이브 공지사항 배너 */}
      {gameRoom?.announcement && gameRoom.announcement !== 'WHISTLE' && (
        <div className="relative z-20 w-full bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white px-8 py-3 flex items-center justify-center gap-3 text-xl font-black shadow-md border-b border-cyan-400">
          <LucideIcons.Sparkles className="w-6 h-6 text-yellow-300 animate-spin" />
          <span className="text-yellow-300 font-extrabold">[선생님 공지]</span>
          <span className="tracking-wide">{gameRoom.announcement}</span>
        </div>
      )}

      {/* ⚡ 플래시 세일 알림 */}
      {gameRoom?.flash_sale && (
        <div className="relative z-10 w-full bg-amber-400 text-amber-950 px-8 py-2 flex items-center justify-center gap-2 font-black text-sm md:text-base shadow-sm animate-pulse border-b border-amber-500">
          <LucideIcons.Zap className="w-5 h-5 fill-amber-950" />
          <span>⚡ 상점 50% 플래시 세일 오픈! 지금 스마트폰 상점에서 모든 아이템 반값 구매 가능!</span>
        </div>
      )}

      {/* 🛡️ 진지 방어전 배너 */}
      {gameRoom?.status === 'defense' && (
        <div className="relative z-10 w-full bg-orange-600 text-white px-8 py-2.5 flex items-center justify-center gap-3 font-black text-base shadow-md animate-pulse border-b border-orange-500">
          <ShieldAlert className="w-5 h-5" />
          <span>🛡️ 진지 방어전 진행 중! (2초마다 모둠 점수 5점 지속 차감 - 활동 미션을 완수하여 체력을 유지하세요!)</span>
        </div>
      )}

      {/* ⏱️ 타임어택 모드 배너 */}
      {gameRoom?.status === 'time_attack' && (
        <div className="relative z-10 w-full bg-emerald-600 text-white px-8 py-2.5 flex items-center justify-center gap-3 font-black text-base shadow-md animate-pulse border-b border-emerald-500">
          <Clock className="w-5 h-5" />
          <span>⏱️ 타임어택 서킷 모드 진행 중! (모든 미션을 완주하여 랩(Lap) 스코어를 달성하세요!)</span>
        </div>
      )}

      {/* 🧟 좀비 바이러스 배너 */}
      {gameRoom?.status === 'zombie' && (
        <div className="relative z-10 w-full bg-stone-900 border-b border-green-500 text-green-400 px-8 py-2.5 flex items-center justify-center gap-3 font-black text-base shadow-md animate-pulse">
          <LucideIcons.Ghost className="w-5 h-5" />
          <span>🧟 좀비 바이러스 살포 중! (감염자 술래 조를 피해 생존하세요!)</span>
        </div>
      )}

      {/* 🕵️ 마피아 게임 배너 */}
      {gameRoom?.status === 'mafia' && (
        <div className="relative z-10 w-full bg-red-950 text-red-200 border-b border-red-800 px-8 py-2.5 flex items-center justify-center gap-3 font-black text-base shadow-md animate-pulse">
          <LucideIcons.UserX className="w-5 h-5" />
          <span>🕵️ 마피아 게임 진행 중! (각 모둠 내 비밀 스파이를 조심하세요!)</span>
        </div>
      )}

      {/* 🎮 단체 미니게임 진행 알림 */}
      {gameRoom?.active_minigame && (
        <div className="relative z-10 w-full bg-indigo-600 text-white px-8 py-2.5 flex items-center justify-center gap-3 font-black text-base shadow-md animate-pulse border-b border-indigo-500">
          <LucideIcons.Gamepad2 className="w-5 h-5" />
          <span>🎮 단체 숏폼 미니게임 발동 중! 학생 스마트폰 화면을 확인하세요!</span>
        </div>
      )}

      {/* QR 코드 패널 */}
      {showQR && (
        <div className="relative z-10 px-12 py-4 bg-cyan-50 border-b border-cyan-200 flex items-center justify-center gap-6">
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/lobby`)}`} alt="입장 QR" className="w-24 h-24 border border-cyan-200 rounded-lg" />
          <div>
            <p className="text-lg font-black text-cyan-800">📱 지금 바로 참여하세요!</p>
            <p className="text-sm text-cyan-600">QR 코드를 스캔하고 PIN을 입력하면 바로 입장!</p>
            {gameRoom && <p className="text-2xl font-black text-cyan-700 mt-1 font-mono">PIN: {gameRoom.pin_code}</p>}
          </div>
        </div>
      )}

      {gameRoom?.status === 'boss_raid' && (
        <div className="relative z-10 px-12 py-6 bg-slate-900 border-b border-slate-800 shadow-xl flex flex-col items-center justify-center">
          <div className="flex items-center gap-4 mb-2">
            <LucideIcons.Swords className="w-10 h-10 text-red-500 animate-pulse" />
            <h2 className="text-3xl font-black text-white">보스 레이드: 체육관의 수호자</h2>
          </div>
          <div className="w-full max-w-4xl bg-slate-800 rounded-full h-10 border-4 border-slate-700 relative overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-1000 ease-out"
              style={{ width: `${Math.max(0, ((gameRoom.boss_hp || 0) / (gameRoom.boss_max_hp || 1)) * 100)}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center text-white font-black font-mono text-xl text-shadow-sm">
              {gameRoom.boss_hp} / {gameRoom.boss_max_hp}
            </div>
          </div>
        </div>
      )}

      <main className="relative z-10 p-12 grid grid-cols-2 lg:grid-cols-3 gap-8">
        {(() => {
          const now = Date.now();
          return scores.map((score) => {
            const AvatarIcon = (LucideIcons as unknown as Record<string, React.ElementType>)[score.avatar || 'Smile'] || LucideIcons.Smile;
            return (
            <div key={score.id} className={`flex flex-col bg-white/90 backdrop-blur border-2 rounded-2xl p-6 shadow-md transition-all duration-500 relative overflow-hidden hover:scale-[1.02] hover:shadow-lg ${score.is_defused ? 'border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : score.is_hacked ? 'border-red-400 animate-pulse' : 'border-slate-200'}`}>
              {score.item_buff_until && new Date(score.item_buff_until).getTime() > now && (
                <div className="absolute inset-0 bg-yellow-400/10 animate-pulse pointer-events-none"></div>
              )}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-600 border border-slate-200 shadow-sm relative">
                    <AvatarIcon className="w-6 h-6" />
                    {(() => {
                      const cnt = score.completed_missions?.length || 0;
                      const pet = cnt >= 20 ? '🔥' : cnt >= 10 ? '🐔' : cnt >= 5 ? '🐥' : '🥚';
                      return <span className="absolute -top-2 -right-2 text-xl drop-shadow-md">{pet}</span>;
                    })()}
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">{score.group_name}</h2>
                </div>
                {score.is_defused ? (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-bold rounded">해체 완료</span>
                ) : score.is_hacked ? (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-bold rounded">해킹됨</span>
                ) : score.item_buff_until && new Date(score.item_buff_until).getTime() > now ? (
                  <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 text-sm font-bold rounded flex items-center gap-1"><LucideIcons.Zap className="w-3 h-3" /> 점수 2배!</span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 text-sm font-bold rounded">작전 중</span>
                )}
              </div>
            
            <div className="flex-1 flex flex-col items-center justify-center py-6 relative z-10">
              <span className={`text-6xl font-black font-mono ${score.is_hacked ? 'text-red-500 glitch-text' : 'text-transparent bg-clip-text bg-gradient-to-b from-slate-900 to-slate-500'}`}>
                {score.score}
              </span>
              <span className="text-slate-500 mt-2 font-medium text-sm">점수</span>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-3 mb-2 overflow-hidden border border-slate-200 relative z-10">
              <div className={`h-full rounded-full transition-all duration-1000 ${score.is_defused ? 'bg-emerald-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{ width: `${Math.min(100, (score.score / 1000) * 100)}%` }}></div>
            </div>
            </div>
            );
          });
        })()}
        {scores.length === 0 && <p className="text-slate-500 col-span-full text-center text-xl">아직 접속한 모둠이 없습니다.</p>}
      </main>

      <ClassReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        gameRoom={gameRoom}
        scores={scores}
      />
    </div>
  );
};
