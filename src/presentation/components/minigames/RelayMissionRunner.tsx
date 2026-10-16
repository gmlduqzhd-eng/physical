import { useState, useEffect, useRef } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Flame, Timer, Users, Trophy, Play, CheckCircle2, ChevronRight, Activity } from 'lucide-react';
import { sfxSuccess, sfxCoin } from '../../../application/soundEffects';

interface FitnessMission {
  id: string;
  name: string;
  desc: string;
  reps: number;
  unit: string;
  icon: string;
  color: string;
}

const MISSIONS: FitnessMission[] = [
  { id: 'squat', name: '파워 스쿼트', desc: '허리를 펴고 정확한 자세로', reps: 5, unit: '회', icon: '🏋️', color: 'from-blue-500 to-indigo-600' },
  { id: 'jump', name: '제자리 높이 점프', desc: '무릎을 굽혀 탄력 있게', reps: 5, unit: '회', icon: '🦘', color: 'from-amber-500 to-orange-600' },
  { id: 'fast_step', name: '제자리 전력 잔발뛰기', desc: '발을 빠르게 구르며', reps: 10, unit: '초', icon: '⚡', color: 'from-cyan-500 to-blue-600' },
  { id: 'jumping_jack', name: '팔 벌려 뛰기', desc: '머리 위로 손뼉을 치며', reps: 5, unit: '회', icon: '⭐', color: 'from-emerald-500 to-teal-600' },
  { id: 'burpee', name: '버피 테스트', desc: '가슴 닿고 힘차게 도약', reps: 3, unit: '회', icon: '🔥', color: 'from-rose-500 to-red-600' },
];

interface RunnerResult {
  runnerIndex: number;
  missionName: string;
  lapTime: number; // 초 단위
}

interface Props {
  groupId?: string;
  enqueueAction?: (a: any) => void;
  onExit?: () => void;
}

export const RelayMissionRunner = ({ groupId = 'group-1', enqueueAction, onExit }: Props) => {
  const totalRunners = 4;
  // setup -> running_out (반환점으로 질주) -> doing_mission (미션 수행) -> running_back (복귀 질주) -> baton_pass (바통 터치 대기) -> finished
  const [phase, setPhase] = useState<'setup' | 'running_out' | 'doing_mission' | 'running_back' | 'finished'>('setup');
  const [currentRunner, setCurrentRunner] = useState<number>(1);
  const [currentMission, setCurrentMission] = useState<FitnessMission>(MISSIONS[0]);
  const [currentMissionProgress, setCurrentMissionProgress] = useState<number>(0);

  const [totalTimer, setTotalTimer] = useState<number>(0);
  const [lapTimer, setLapTimer] = useState<number>(0);
  const [results, setResults] = useState<RunnerResult[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completionRef = useRef(false);
  const startedAtRef = useRef(0);
  const lapStartedAtRef = useRef(0);

  useEffect(() => {
    if (phase !== 'doing_mission' || currentMission.unit !== '초') return;
    const startedAt = performance.now();
    const timer = setInterval(() => {
      const seconds = Math.min(currentMission.reps, Math.floor((performance.now() - startedAt) / 1000));
      setCurrentMissionProgress(seconds);
      if (seconds >= currentMission.reps) {
        clearInterval(timer);
        sfxSuccess();
        setPhase('running_back');
      }
    }, 100);
    return () => clearInterval(timer);
  }, [phase, currentMission]);

  useEffect(() => {
    if (phase === 'setup' || phase === 'finished') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTotalTimer(Math.floor((performance.now() - startedAtRef.current) / 1000));
      setLapTimer(Math.floor((performance.now() - lapStartedAtRef.current) / 1000));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const startRelay = () => {
    completionRef.current = false;
    startedAtRef.current = performance.now();
    lapStartedAtRef.current = startedAtRef.current;
    setCurrentRunner(1);
    setTotalTimer(0);
    setLapTimer(0);
    setResults([]);
    pickMissionForRunner(1);
    setPhase('running_out');
    sfxCoin();
  };

  const pickMissionForRunner = (runnerIdx: number) => {
    const mission = MISSIONS[(runnerIdx - 1) % MISSIONS.length];
    setCurrentMission(mission);
    setCurrentMissionProgress(0);
  };

  // 1. 반환점 도착 시
  const handleArriveTurnpoint = () => {
    sfxCoin();
    setPhase('doing_mission');
  };

  // 2. 체력 미션 카운트
  const handleMissionCount = () => {
    if (phase !== 'doing_mission' || currentMission.unit === '초') return;
    const next = currentMissionProgress + 1;
    setCurrentMissionProgress(next);
    sfxCoin();

    if (next >= currentMission.reps) {
      sfxSuccess();
      setPhase('running_back');
    }
  };

  // 3. 복귀 후 다음 주자에게 바통 터치
  const handleBatonPass = () => {
    if (phase !== 'running_back' || completionRef.current) return;
    const now = performance.now();
    const elapsedTotal = Math.floor((now - startedAtRef.current) / 1000);
    setTotalTimer(elapsedTotal);
    sfxSuccess();
    const result: RunnerResult = {
      runnerIndex: currentRunner,
      missionName: currentMission.name,
      lapTime: Math.floor((now - lapStartedAtRef.current) / 1000),
    };
    const nextResults = [...results, result];
    setResults(nextResults);

    if (currentRunner < totalRunners) {
      const nextRunner = currentRunner + 1;
      setCurrentRunner(nextRunner);
      lapStartedAtRef.current = now;
      setLapTimer(0);
      pickMissionForRunner(nextRunner);
      setPhase('running_out');
    } else {
      completionRef.current = true;
      setPhase('finished');
      const baseScore = 200;
      const speedBonus = Math.max(0, 300 - elapsedTotal * 2);
      const finalScore = baseScore + speedBonus;
      if (enqueueAction) {
        enqueueAction({
          id: crypto.randomUUID(),
          type: 'INCREMENT_SCORE',
          timestamp: Date.now(),
          payload: {
            id: groupId,
            groupId,
            gameId: 'relay-mission-runner',
            score: finalScore,
            amount: finalScore,
            details: { totalTime: elapsedTotal, metrics: Object.fromEntries(nextResults.map(result => [`${result.runnerIndex}번 주자`, `${result.missionName} · ${result.lapTime}초`])) },
          },
        });
      }
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m > 0 ? `${m}분 ` : ''}${s}초`;
  };

  return (
    <PhysicalActivityLayout
      title="모둠 스마트 바통 릴레이"
      emoji="🏃"
      domain="운동"
      achievementCode="[4체01-02]"
      achievementTitle="기본 체력운동(순발력·심폐지구력) 실천과 모둠 릴레이"
      activityType="모둠"
      expectedMinutes={15}
      equipment={['반환점 콘 1개 (출발선에서 15m 거리)']}
      instructions={[
        '모둠원 4명이 순서를 정해 출발선에 한 줄로 섭니다.',
        '스마트폰은 모둠의 [스마트 바통]입니다. 1번 주자가 바통을 쥐고 출발합니다!',
        '15m 앞 반환점에 도착하면 [반환점 도착] 버튼을 누르고 화면의 체력 미션을 완수합니다.',
        '체력 미션 완료 후 출발선으로 전력 질주해 2번 주자에게 폰을 넘기며 [바통 터치!]를 누릅니다.',
      ]}
      onExit={onExit}
    >
      {({ onComplete }) => (
        <div className="w-full max-w-lg mx-auto flex flex-col gap-5 p-4 text-white">
          {phase === 'setup' && (
            <div className="flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 text-cyan-400">
                <Users className="w-6 h-6" />
                <h3 className="text-xl font-bold">스마트 바통 릴레이 준비</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                출발선에서 15m 앞에 <strong>반환점 콘</strong>을 하나 세워주세요.<br />
                모둠원 4명이 순서대로 폰을 들고 달려가 반환점 미션을 수행하고 돌아오는 릴레이입니다!
              </p>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="text-xs font-bold text-slate-400">주자별 수행 미션 예고</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {MISSIONS.slice(0, 4).map((m, idx) => (
                    <div key={m.id} className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/60 flex items-center gap-2">
                      <span className="text-base">{m.icon}</span>
                      <div>
                        <div className="font-bold text-white">{idx + 1}번: {m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.reps}{m.unit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={startRelay}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg shadow-cyan-500/25 active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> 릴레이 시작! (1번 주자 출발)
              </button>
            </div>
          )}

          {(phase === 'running_out' || phase === 'doing_mission' || phase === 'running_back') && (
            <div className="flex flex-col gap-4">
              {/* 상단 릴레이 진행 현황 바 */}
              <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center font-black text-cyan-300 text-sm">
                    {currentRunner}
                  </div>
                  <div className="text-sm font-bold text-slate-200">
                    {currentRunner}번 주자 <span className="text-xs text-slate-400">/ {totalRunners}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono font-black text-xl text-amber-400">
                  <Timer className="w-5 h-5 animate-pulse" />
                  <span>{formatTime(totalTimer)}</span>
                </div>
              </div>

              {/* 1단계: 반환점으로 질주 중 */}
              {phase === 'running_out' && (
                <div className="bg-gradient-to-b from-blue-950/60 to-slate-900 border-2 border-blue-500/60 rounded-2xl p-6 flex flex-col items-center gap-5 text-center shadow-xl">
                  <div className="w-20 h-20 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center text-4xl animate-bounce">
                    🏃💨
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">반환점으로 전력 질주!</h3>
                    <p className="text-sm text-slate-300 mt-1">15m 앞 콘을 향해 달려가세요!</p>
                  </div>

                  <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-slate-400">
                    구간 기록: <span className="font-mono text-sm font-bold text-cyan-400">{lapTimer}초 경과</span>
                  </div>

                  <button
                    onClick={handleArriveTurnpoint}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 font-extrabold text-lg text-white shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-6 h-6" /> 반환점 도착! 미션 열기
                  </button>
                </div>
              )}

              {/* 2단계: 체력 미션 수행 */}
              {phase === 'doing_mission' && (
                <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-500/60 rounded-2xl p-6 flex flex-col items-center gap-4 text-center shadow-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-bold">
                    <Activity className="w-4 h-4" /> 반환점 체력 미션
                  </div>

                  <div className="text-5xl my-1">{currentMission.icon}</div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{currentMission.name}</h3>
                    <p className="text-sm text-slate-300">{currentMission.desc}</p>
                  </div>

                  {/* 목표치 프로그레스 */}
                  <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-400">수행 완료</span>
                      <span className="text-amber-400 font-mono text-base">
                        {currentMissionProgress} / {currentMission.reps} {currentMission.unit}
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-200"
                        style={{ width: `${(currentMissionProgress / currentMission.reps) * 100}%` }}
                      />
                    </div>
                  </div>

                  {currentMission.unit === '초' ? <p role="status" className="w-full py-5 text-center text-amber-300 font-bold">
                    {currentMission.reps - currentMissionProgress}초 동안 계속 움직여 주세요. 시간이 끝나면 자동으로 넘어갑니다.
                  </p> : <button
                    onClick={handleMissionCount}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 font-black text-xl text-white shadow-xl shadow-amber-500/25 active:scale-95 flex items-center justify-center gap-3"
                  >
                    <Flame className="w-7 h-7 fill-current" /> 1회 수행 완료 터치!
                  </button>}
                </div>
              )}

              {/* 3단계: 출발선으로 귀환 및 바통 터치 */}
              {phase === 'running_back' && (
                <div className="bg-gradient-to-b from-emerald-950/60 to-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 flex flex-col items-center gap-5 text-center shadow-xl">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-4xl animate-bounce">
                    🏁⚡
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">미션 완료! 출발선으로 귀환!</h3>
                    <p className="text-sm text-slate-300 mt-1">
                      다음 {currentRunner < totalRunners ? `${currentRunner + 1}번 주자에게` : '결승선으로'} 달려가세요!
                    </p>
                  </div>

                  <button
                    onClick={handleBatonPass}
                    className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 font-black text-xl text-white shadow-xl shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-2"
                  >
                    <ChevronRight className="w-7 h-7" /> {currentRunner < totalRunners ? '바통 터치! 다음 주자 출발' : '결승선 골인! 완주 확정'}
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === 'finished' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-5 text-center">
              <Trophy className="w-16 h-16 text-amber-400 animate-bounce" />
              <div>
                <h4 className="text-2xl font-black text-white">모둠 릴레이 완주 성공!</h4>
                <p className="text-sm text-slate-400 mt-1">전원 순발력·지구력 미션 클리어</p>
              </div>

              {/* 기록 요약 카드 */}
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 text-left">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-sm text-slate-400">총 소요 시간</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">{formatTime(totalTimer)}</span>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <div className="text-xs font-bold text-slate-400">주자별 랩타임</div>
                  {results.map(r => (
                    <div key={r.runnerIndex} className="flex justify-between items-center text-xs bg-slate-900 p-2 rounded-lg border border-slate-800">
                      <span className="font-bold text-slate-300">{r.runnerIndex}번 주자 ({r.missionName})</span>
                      <span className="font-mono font-bold text-amber-400">{r.lapTime}초</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onComplete(`모둠 릴레이 완주! 총 기록: ${formatTime(totalTimer)}`)}
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
