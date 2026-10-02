import React, { useState, useRef, useEffect } from 'react';
import { useModalDialog } from '../../application/useModalDialog';
import { X, ArrowRight, RotateCcw, Play } from 'lucide-react';

interface PhysicalMbtiTestProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectGame: (gameType: string) => void;
}

type Step = 'intro' | 'step1' | 'step2' | 'step3' | 'result';

interface AnimalPersona {
  type: string;
  name: string;
  emoji: string;
  title: string;
  description: string;
  strengths: string[];
  recommendedGames: { name: string; type: string }[];
  color: string;
}

const PERSONAS: Record<string, AnimalPersona> = {
  cheetah: {
    type: 'cheetah',
    name: '날렵한 치타형',
    emoji: '🐆',
    title: '광속의 반응속도 종결자',
    description: '눈 깜짝할 사이에 반응하고 움직이는 천부적인 순발력을 가지고 있어요! 속도감 넘치는 민첩성 게임에 최강입니다.',
    strengths: ['초고속 반사신경', '폭발적인 순간 스피드', '순간 판단력'],
    recommendedGames: [
      { name: '반응속도 테스트', type: 'reaction' },
      { name: '방향 스와이프', type: 'direction' },
      { name: '타깃 슈팅', type: 'target' }
    ],
    color: 'from-amber-500 to-orange-600'
  },
  bear: {
    type: 'bear',
    name: '우직한 불곰형',
    emoji: '🐻',
    title: '끝까지 버티는 지치지 않는 파워',
    description: '단단한 근력과 끈기 있는 지구력을 갖추었어요! 포기하지 않고 묵묵히 완주하는 체력 챔피언입니다.',
    strengths: ['지치지 않는 체력', '강한 근지구력', '안정적인 밸런스'],
    recommendedGames: [
      { name: '플랭크 버티기', type: 'plank' },
      { name: '스쿼트 챌린지', type: 'squat' },
      { name: '제자리 달리기', type: 'run' }
    ],
    color: 'from-emerald-500 to-teal-700'
  },
  dolphin: {
    type: 'dolphin',
    name: '유연한 돌고래형',
    emoji: '🐬',
    title: '리듬을 타는 감각적인 밸런서',
    description: '물 흐르듯 부드러운 유연성과 정확한 리듬 감각을 지녔어요! 댄스, 균형 유지, 표현 운동에 두각을 나타냅니다.',
    strengths: ['탁월한 신체 균형', '정확한 템포 감각', '유연한 관절 가동성'],
    recommendedGames: [
      { name: '댄스 포즈 따라하기', type: 'dance_pose' },
      { name: '외발 서기 균형', type: 'one_leg' },
      { name: '스트레칭 타이머', type: 'stretch' }
    ],
    color: 'from-cyan-500 to-blue-600'
  },
  eagle: {
    type: 'eagle',
    name: '정밀한 독수리형',
    emoji: '🦅',
    title: '목표를 놓치지 않는 냉철한 집중력',
    description: '흔들리지 않는 고도의 집중력과 눈과 손의 협응력이 뛰어납니다! 정교한 조준과 두뇌 회전 종목의 마스터예요.',
    strengths: ['흔들림 없는 집중력', '손-눈 협응력', '침착한 상황 제어'],
    recommendedGames: [
      { name: '농구 자유투', type: 'basketball-free-throw' },
      { name: '컬러 워드 매치', type: 'color_word' },
      { name: '얼음 땡 게임', type: 'freeze' }
    ],
    color: 'from-purple-500 to-indigo-700'
  }
};

export const PhysicalMbtiTest: React.FC<PhysicalMbtiTestProps> = ({ isOpen, onClose, onSelectGame }) => {
  const dialogRef = useModalDialog(isOpen, onClose);
  const tapTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const tapDeadline = useRef(0);
  const [step, setStep] = useState<Step>('intro');
  
  // 테스트 결과 저장
  const [reactionScore, setReactionScore] = useState(0); // 낮을수록 좋음 (ms)
  const [tapScore, setTapScore] = useState(0); // 5초 연타 횟수
  const [timingScore, setTimingScore] = useState(0); // 1초 타이밍 오차(ms)
  
  // 1단계 반응속도 상태
  const [rxState, setRxState] = useState<'ready' | 'waiting' | 'now' | 'done'>('ready');
  const rxTimer = useRef<number | null>(null);
  const rxStartTime = useRef<number>(0);

  // 2단계 연타 상태
  const [tapTimeLeft, setTapTimeLeft] = useState(5);
  const [tapRunning, setTapRunning] = useState(false);
  const tapCount = useRef(0);

  // 3단계 스톱워치 상태
  const [stopwatchState, setStopwatchState] = useState<'idle' | 'running' | 'stopped'>('idle');
  const swStartTime = useRef<number>(0);
  const [swElapsed, setSwElapsed] = useState<number>(0);

  useEffect(() => () => {
    if (rxTimer.current) clearTimeout(rxTimer.current);
    if (tapTimer.current) clearInterval(tapTimer.current);
  }, []);
  if (!isOpen) return null;

  // 1단계 시작
  const startStep1 = () => {
    if (rxTimer.current) clearTimeout(rxTimer.current);
    setRxState('waiting');
    const delay = Math.floor(Math.random() * 2000) + 1500;
    rxTimer.current = window.setTimeout(() => {
      setRxState('now');
      rxStartTime.current = Date.now();
    }, delay);
  };

  const handleRxClick = () => {
    if (rxState === 'waiting') {
      if (rxTimer.current) clearTimeout(rxTimer.current);
      setRxState('ready');
      alert('너무 일찍 눌렀어요! 초록색이 되면 눌러주세요.');
    } else if (rxState === 'now') {
      const elapsed = Date.now() - rxStartTime.current;
      setReactionScore(elapsed);
      setRxState('done');
    }
  };

  // 2단계 연타 타이머
  const startStep2 = () => {
    setTapTimeLeft(5);
    tapCount.current = 0;
    setTapScore(0);
    setTapRunning(true);

    if (tapTimer.current) clearInterval(tapTimer.current);
    tapDeadline.current = Date.now() + 5000;
    tapTimer.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((tapDeadline.current - Date.now()) / 1000));
      setTapTimeLeft(remaining);
      if (remaining === 0) {
        if (tapTimer.current) clearInterval(tapTimer.current);
        tapTimer.current = null;
        setTapRunning(false);
      }
    }, 100);
  };

  const handleTap = () => {
    if (!tapRunning || Date.now() >= tapDeadline.current) return;
    tapCount.current += 1;
    setTapScore(tapCount.current);
  };

  // 3단계 1초 맞추기
  const startStep3 = () => {
    setStopwatchState('running');
    swStartTime.current = Date.now();
  };

  const stopStep3 = () => {
    const elapsed = Date.now() - swStartTime.current;
    setSwElapsed(elapsed);
    setTimingScore(Math.abs(elapsed - 1000));
    setStopwatchState('stopped');
  };

  // 결과 계산
  const calculateResult = (): AnimalPersona => {
    // 치타: 반응속도 빠름 (300ms 이하)
    // 곰: 5초 연타 35회 이상 (체력/파워)
    // 돌고래: 1초 타이밍 오차 100ms 이내 (균형/리듬)
    // 독수리: 복합 집중형
    if (reactionScore > 0 && reactionScore < 320) {
      return PERSONAS.cheetah;
    }
    if (tapScore >= 32) {
      return PERSONAS.bear;
    }
    if (timingScore < 150) {
      return PERSONAS.dolphin;
    }
    return PERSONAS.eagle;
  };

  const persona = calculateResult();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="체육 MBTI 테스트" tabIndex={-1}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-slate-900 border border-purple-500/40 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 인트로 */}
        {step === 'intro' && (
          <div className="text-center py-4">
            <div className="text-5xl mb-3 animate-bounce">🦁</div>
            <h2 className="text-2xl font-black mb-2">나의 체육 MBTI 테스트</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              1분 만에 끝나는 초간단 3단계 미니 테스트로<br />
              나만의 <span className="font-bold text-amber-400">신체 페르소나 동물</span>을 찾고<br />
              찰떡궁합 추천 게임을 알아보세요!
            </p>
            <button
              onClick={() => setStep('step1')}
              className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 font-black rounded-2xl shadow-xl shadow-purple-500/30 flex items-center justify-center gap-2 text-lg active:scale-95 transition-all"
            >
              테스트 시작하기
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* 1단계: 번개 반응속도 */}
        {step === 'step1' && (
          <div className="text-center">
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/30">
              1단계 / 3단계: 순발력
            </span>
            <h3 className="text-xl font-black mt-2 mb-1">번개 반응속도 테스트</h3>
            <p className="text-xs text-slate-400 mb-4">화면이 초록색으로 바뀌면 번개처럼 터치하세요!</p>

            <div
              onClick={rxState === 'now' || rxState === 'waiting' ? handleRxClick : undefined}
              className={`h-48 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all select-none border-2 ${
                rxState === 'now'
                  ? 'bg-emerald-500 border-emerald-300 shadow-xl shadow-emerald-500/40 text-slate-950 font-black text-2xl'
                  : rxState === 'waiting'
                  ? 'bg-red-500/20 border-red-500/40 text-red-300 font-bold'
                  : rxState === 'done'
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 hover:border-slate-500'
              }`}
            >
              {rxState === 'ready' && (
                <button
                  onClick={startStep1}
                  className="px-6 py-3 bg-purple-600 rounded-xl font-bold text-sm shadow-md"
                >
                  준비 시작
                </button>
              )}
              {rxState === 'waiting' && <span className="animate-pulse">초록색을 기다리세요...</span>}
              {rxState === 'now' && <span>지금 터치!! ⚡</span>}
              {rxState === 'done' && (
                <div>
                  <p className="text-2xl font-black text-white">{reactionScore} ms</p>
                  <p className="text-xs text-slate-300 mt-1">기록 측정 완료!</p>
                </div>
              )}
            </div>

            {rxState === 'done' && (
              <button
                onClick={() => setStep('step2')}
                className="mt-4 w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
              >
                다음 단계로 이동 <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 2단계: 5초 폭풍 연타 */}
        {step === 'step2' && (
          <div className="text-center">
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
              2단계 / 3단계: 근지구력
            </span>
            <h3 className="text-xl font-black mt-2 mb-1">5초 폭풍 연타 테스트</h3>
            <p className="text-xs text-slate-400 mb-4">5초 동안 버튼을 최대한 많이 연타하세요!</p>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/60 mb-4">
              <div className="flex justify-between items-center text-sm font-bold mb-4">
                <span className="text-amber-400">남은 시간: {tapTimeLeft}초</span>
                <span className="text-cyan-400 text-xl font-black">{tapScore} 회</span>
              </div>

              {!tapRunning && tapTimeLeft === 5 ? (
                <button
                  onClick={startStep2}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-lg shadow-lg shadow-amber-500/20"
                >
                  연타 시작하기!
                </button>
              ) : tapRunning ? (
                <button
                  onClick={handleTap}
                  className="w-full py-10 bg-gradient-to-r from-amber-500 to-orange-500 active:scale-95 text-slate-950 font-black text-3xl rounded-2xl shadow-xl shadow-orange-500/30 select-none"
                >
                  연타!! 💥
                </button>
              ) : (
                <div>
                  <p className="text-lg font-bold text-green-400">측정 완료! 총 {tapScore}회</p>
                </div>
              )}
            </div>

            {!tapRunning && tapTimeLeft === 0 && (
              <button
                onClick={() => setStep('step3')}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
              >
                다음 단계로 이동 <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 3단계: 정확한 1초 맞추기 (리듬 & 밸런스) */}
        {step === 'step3' && (
          <div className="text-center">
            <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30">
              3단계 / 3단계: 리듬 감각
            </span>
            <h3 className="text-xl font-black mt-2 mb-1">정확한 1.00초 맞추기</h3>
            <p className="text-xs text-slate-400 mb-4">마음속으로 1초를 세고 정확히 정지 버튼을 누르세요!</p>

            <div className="bg-slate-800/80 rounded-2xl p-6 border border-slate-700/60 mb-4">
              <div className="text-3xl font-mono font-black mb-4 text-cyan-300">
                {stopwatchState === 'stopped' ? `${(swElapsed / 1000).toFixed(2)} 초` : '?.?? 초'}
              </div>

              {stopwatchState === 'idle' && (
                <button
                  onClick={startStep3}
                  className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl text-base"
                >
                  타이머 시작
                </button>
              )}
              {stopwatchState === 'running' && (
                <button
                  onClick={stopStep3}
                  className="w-full py-6 bg-red-500 hover:bg-red-400 active:scale-95 text-white font-black text-xl rounded-xl shadow-lg shadow-red-500/30 animate-pulse"
                >
                  지금이다! 정지! 🛑
                </button>
              )}
              {stopwatchState === 'stopped' && (
                <p className="text-xs text-slate-300">
                  목표 1.00초와의 오차: <span className="font-bold text-amber-400">{timingScore} ms</span>
                </p>
              )}
            </div>

            {stopwatchState === 'stopped' && (
              <button
                onClick={() => setStep('result')}
                className="w-full py-4 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 font-black rounded-2xl text-base shadow-xl shadow-purple-500/30 flex items-center justify-center gap-1.5"
              >
                결과 카드 확인하기! ✨
              </button>
            )}
          </div>
        )}

        {/* 결과 발표 */}
        {step === 'result' && (
          <div className="text-center py-2 animate-in zoom-in-95 duration-300">
            <div className={`p-6 rounded-3xl bg-gradient-to-br ${persona.color} shadow-2xl mb-4 text-white relative overflow-hidden`}>
              <div className="text-6xl mb-2">{persona.emoji}</div>
              <span className="text-xs uppercase tracking-wider font-extrabold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                신체 페르소나 분석 완료
              </span>
              <h3 className="text-2xl font-black mt-2">{persona.name}</h3>
              <p className="text-sm font-semibold opacity-90 mt-1">{persona.title}</p>
              <p className="text-xs mt-3 opacity-80 leading-relaxed bg-black/20 p-3 rounded-xl backdrop-blur-sm">
                {persona.description}
              </p>

              {/* 핵심 역량 칩 */}
              <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                {persona.strengths.map((str, i) => (
                  <span key={i} className="text-[11px] font-bold bg-white/20 px-2.5 py-1 rounded-lg">
                    ✓ {str}
                  </span>
                ))}
              </div>
            </div>

            {/* 맞춤 추천 게임 리스트 */}
            <div className="text-left bg-slate-800/80 p-4 rounded-2xl border border-slate-700/60 mb-4">
              <h4 className="text-xs font-bold text-cyan-400 mb-2">🎯 나와 찰떡궁합 추천 게임</h4>
              <div className="space-y-1.5">
                {persona.recommendedGames.map((g, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelectGame(g.type);
                      onClose();
                    }}
                    className="w-full p-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 flex items-center justify-between text-xs font-bold text-slate-200 transition-all"
                  >
                    <span>{g.name}</span>
                    <span className="text-cyan-400 flex items-center gap-1">
                      플레이 <Play className="w-3 h-3 fill-cyan-400" />
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setStep('intro');
                setReactionScore(0);
                setTapScore(0);
                setTimingScore(0);
                setRxState('ready');
                setStopwatchState('idle');
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 mx-auto py-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 다시 테스트하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
