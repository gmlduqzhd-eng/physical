import { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { ShieldAlert, ShieldCheck, Timer, Users, Trophy, Zap, AlertTriangle } from 'lucide-react';
import { sfxSuccess, sfxFail, sfxCoin } from '../../../application/soundEffects';

interface Zone {
  id: number;
  label: string;
  name: string;
  color: string;
  bgLight: string;
  border: string;
  text: string;
}

const ZONES: Zone[] = [
  { id: 1, label: '1구역 (A)', name: '빨강 콘 구역', color: 'red', bgLight: 'bg-red-950/40', border: 'border-red-500', text: 'text-red-400' },
  { id: 2, label: '2구역 (B)', name: '파랑 콘 구역', color: 'blue', bgLight: 'bg-blue-950/40', border: 'border-blue-500', text: 'text-blue-400' },
  { id: 3, label: '3구역 (C)', name: '노랑 콘 구역', color: 'amber', bgLight: 'bg-amber-950/40', border: 'border-amber-500', text: 'text-amber-400' },
  { id: 4, label: '4구역 (D)', name: '초록 콘 구역', color: 'emerald', bgLight: 'bg-emerald-950/40', border: 'border-emerald-500', text: 'text-emerald-400' },
];

interface Props {
  groupId?: string;
  enqueueAction?: (a: any) => void;
  onExit?: () => void;
}

export const SpaceOccupier = ({ groupId = 'group-1', enqueueAction, onExit }: Props) => {
  // 1: 구역 세팅 및 작전회의, 2: 실시간 공간 침투 게임 (라운드제), 3: 전술 리뷰
  const [phase, setPhase] = useState<'setup' | 'playing' | 'round_result' | 'finished'>('setup');
  const [round, setRound] = useState<number>(1);
  const totalRounds = 5;

  const [dangerZoneId, setDangerZoneId] = useState<number>(1);
  const [safeTargetIds, setSafeTargetIds] = useState<number[]>([2, 3, 4]);
  const [occupiedZoneIds, setOccupiedZoneIds] = useState<number[]>([]);
  const [roundTimer, setRoundTimer] = useState<number>(7);
  const [score, setScore] = useState<number>(0);
  const [history, setHistory] = useState<{ round: number; success: boolean; timeUsed: number; points: number }[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundFinishedRef = useRef(false);
  const occupiedRef = useRef<number[]>([]);

  // 라운드 시작 시 새로운 위험 구역과 안전 공간 무작위 배치
  const startRound = () => {
    roundFinishedRef.current = false;
    occupiedRef.current = [];
    const danger = Math.floor(Math.random() * 4) + 1;
    const safe = [1, 2, 3, 4].filter(id => id !== danger);
    setDangerZoneId(danger);
    setSafeTargetIds(safe);
    setOccupiedZoneIds([]);
    setRoundTimer(7); // 7초 내에 모둠원이 3개 안전 구역으로 분산 이동
    setPhase('playing');
  };

  useEffect(() => {
    if (phase !== 'playing') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setRoundTimer(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const finishRound = useCallback((success: boolean) => {
    if (roundFinishedRef.current) return;
    roundFinishedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    const points = success ? 50 + roundTimer * 10 : 0;
    setHistory(prev => [...prev, { round, success, timeUsed: 7 - roundTimer, points }]);

    if (round < totalRounds) {
      setPhase('round_result');
    } else {
      setPhase('finished');
      if (enqueueAction) {
        enqueueAction({
          type: 'SCORE_GAME',
          payload: {
            groupId,
            gameId: 'space-occupier',
            score: score + points,
            amount: score + points,
          },
        });
      }
    }
  }, [round, totalRounds, roundTimer, score, groupId, enqueueAction]);

  useEffect(() => {
    if (phase === 'playing' && roundTimer === 0) {
      sfxFail();
      finishRound(false);
    }
  }, [phase, roundTimer, finishRound]);

  // 구역 터치 (실제 콘에 도착한 학생이 태그하거나 모둠장이 터치)
  const toggleZoneOccupied = (zoneId: number) => {
    if (phase !== 'playing' || roundFinishedRef.current) return;

    if (zoneId === dangerZoneId) {
      // 위험 구역 침투 시 즉시 실패
      sfxFail();
      finishRound(false);
      return;
    }

    if (occupiedRef.current.includes(zoneId)) return;

    const nextOccupied = [...occupiedRef.current, zoneId];
    occupiedRef.current = nextOccupied;
    setOccupiedZoneIds(nextOccupied);
    sfxCoin();

    // 3개 안전 구역을 모두 다른 모둠원이 분산 점령 완료
    if (nextOccupied.length === safeTargetIds.length) {
      sfxSuccess();
      const points = 50 + roundTimer * 10;
      setScore(s => s + points);
      finishRound(true);
    }
  };

  const nextRound = () => {
    setRound(r => r + 1);
    startRound();
  };

  return (
    <PhysicalActivityLayout
      title="스마트 코트: 빈 공간 점령 작전"
      emoji="🗺️"
      domain="스포츠"
      sportType="전략형"
      achievementCode="[4체02-06]"
      achievementTitle="전략형 스포츠 - 빈 공간 만들기 및 분산 침투"
      activityType="모둠"
      expectedMinutes={15}
      equipment={['4색 콘 (빨강, 파랑, 노랑, 초록)', '팀 조끼']}
      instructions={[
        '체육관 또는 교실 바닥의 4개 코너에 빨강, 파랑, 노랑, 초록 콘을 배치합니다.',
        '기기 화면에 빨간색 [위험 구역]과 안전한 [빈 공간] 3곳이 실시간으로 표시됩니다.',
        '신호가 울리면 모둠원들이 겹치지 않게 각기 다른 빈 공간 콘으로 전력 질주합니다.',
        '콘에 도착하면 화면의 해당 구역 버튼을 눌러 점령을 확정합니다.',
      ]}
      onExit={onExit}
    >
      {({ onComplete }) => (
        <div className="w-full max-w-lg mx-auto flex flex-col gap-5 p-4 text-white">
          {phase === 'setup' && (
            <div className="flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 text-cyan-400">
                <Users className="w-6 h-6" />
                <h3 className="text-xl font-bold">오프라인 코트 준비</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                바닥 4곳에 <strong>빨강·파랑·노랑·초록 콘</strong>을 넓게 배치해 주세요.
                모둠원 3~4명이 코트 중앙에서 대기하다가, 화면에 빈 공간이 열리면 서로 부딪히지 않게 각자 다른 콘으로 질주해야 합니다!
              </p>
              
              <div className="grid grid-cols-2 gap-3 my-2">
                {ZONES.map(z => (
                  <div key={z.id} className={`p-3 rounded-xl border ${z.border} ${z.bgLight} flex items-center gap-2`}>
                    <span className="w-3 h-3 rounded-full bg-current" />
                    <span className="text-sm font-semibold">{z.name}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => startRound()}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" /> 작전 시작 (1라운드)
              </button>
            </div>
          )}

          {phase === 'playing' && (
            <div className="flex flex-col gap-4">
              {/* 상단 라운드 및 타이머 헤더 */}
              <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-3">
                <div className="text-sm font-bold text-slate-400">
                  라운드 <span className="text-white text-base">{round}</span> / {totalRounds}
                </div>
                <div className="flex items-center gap-2 font-mono font-extrabold text-xl text-amber-400">
                  <Timer className="w-5 h-5 animate-pulse" />
                  <span>{roundTimer}초</span>
                </div>
                <div className="text-sm font-bold text-cyan-400">
                  점수: {score}점
                </div>
              </div>

              {/* 지령 인디케이터 배너 */}
              <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-3 flex items-center gap-3 text-red-200">
                <ShieldAlert className="w-6 h-6 text-red-400 shrink-0 animate-bounce" />
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-red-400">{ZONES.find(z => z.id === dangerZoneId)?.name}</span>은 수비수 밀집 지역! 
                  절대 가지 마세요!
                </div>
              </div>

              {/* 4분면 인터랙션 코트 */}
              <div className="grid grid-cols-2 gap-3 aspect-square max-w-sm mx-auto w-full my-2">
                {ZONES.map(zone => {
                  const isDanger = zone.id === dangerZoneId;
                  const isOccupied = occupiedZoneIds.includes(zone.id);

                  return (
                    <button
                      key={zone.id}
                      onClick={() => toggleZoneOccupied(zone.id)}
                      disabled={isOccupied}
                      className={`relative rounded-2xl border-2 flex flex-col items-center justify-center p-4 transition-all duration-200 select-none ${
                        isDanger
                          ? 'border-red-600 bg-red-950/70 hover:bg-red-900/80 active:scale-95'
                          : isOccupied
                          ? 'border-cyan-400 bg-cyan-950/90 shadow-lg shadow-cyan-500/30'
                          : `${zone.border} ${zone.bgLight} hover:scale-102 active:scale-95 shadow-md`
                      }`}
                    >
                      {isDanger ? (
                        <>
                          <AlertTriangle className="w-10 h-10 text-red-400 mb-1 animate-pulse" />
                          <span className="font-black text-red-300 text-sm">{zone.name}</span>
                          <span className="text-[11px] text-red-400 font-bold mt-1 bg-red-950 px-2 py-0.5 rounded border border-red-800">
                            위험! 수비 밀집
                          </span>
                        </>
                      ) : isOccupied ? (
                        <>
                          <ShieldCheck className="w-10 h-10 text-cyan-400 mb-1" />
                          <span className="font-bold text-cyan-200 text-sm">{zone.name}</span>
                          <span className="text-xs font-black text-cyan-300 mt-1 bg-cyan-900/80 px-2.5 py-0.5 rounded-full border border-cyan-500">
                            점령 완료 ✓
                          </span>
                        </>
                      ) : (
                        <>
                          <div className={`w-8 h-8 rounded-full border-2 ${zone.border} flex items-center justify-center font-black ${zone.text} mb-1`}>
                            {zone.label.slice(0, 1)}
                          </div>
                          <span className="font-bold text-slate-200 text-sm">{zone.name}</span>
                          <span className="text-[11px] text-slate-400 mt-1">도착 후 터치</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="text-center text-xs text-slate-400">
                💡 모둠원이 각자 다른 빈 공간으로 달려가 콘을 찍고, 화면 버튼을 눌러 점령하세요!
              </div>
            </div>
          )}

          {phase === 'round_result' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-4 text-center">
              <h4 className="text-xl font-bold text-white">라운드 {round} 종료</h4>
              <p className="text-sm text-slate-300">
                {history[history.length - 1]?.success ? (
                  <span className="text-cyan-400 font-semibold">🎉 성공! 모둠원들이 겹치지 않고 신속하게 공간을 확보했습니다!</span>
                ) : (
                  <span className="text-red-400 font-semibold">⚠️ 실패! 위험 구역으로 가거나 시간 내에 분산하지 못했습니다.</span>
                )}
              </p>
              <div className="text-2xl font-black text-amber-400">
                현재 총점: {score}점
              </div>
              <button
                onClick={nextRound}
                className="w-full py-3.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 font-bold text-white transition-all shadow-lg active:scale-95"
              >
                다음 라운드 도전 ({round + 1} / {totalRounds})
              </button>
            </div>
          )}

          {phase === 'finished' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-5 text-center">
              <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
              <div>
                <h4 className="text-2xl font-black text-white">공간 탈환 훈련 완수!</h4>
                <p className="text-sm text-slate-400 mt-1">2022 개정 체육과 전략형 스포츠 성취기준 달성</p>
              </div>

              <div className="w-full bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">최종 획득 점수</span>
                  <span className="text-xl font-black text-cyan-400">{score}점</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">성공 라운드</span>
                  <span className="font-bold text-white">
                    {history.filter(h => h.success).length} / {totalRounds} 라운드
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 text-left text-xs text-cyan-300 leading-relaxed">
                <strong>📝 전술 성찰 포인트:</strong><br />
                축구나 농구 등 전략형 스포츠에서는 수비수가 없는 빈 공간으로 팀원들이 분산해 움직일 때 가장 안전하고 위협적인 패스 기회가 열립니다.
              </div>

              <button
                onClick={() => onComplete(`공간 점령 훈련 완료! 점수: ${score}점`)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-lg text-white shadow-lg active:scale-95"
              >
                활동 완료 및 점수 기록
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
