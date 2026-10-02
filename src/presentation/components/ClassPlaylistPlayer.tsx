import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Play, Pause, SkipForward, Clock, CheckCircle, RotateCcw } from 'lucide-react';
import { useAudio } from '../../application/useAudio';
import { useVoiceCoach } from '../../application/useVoiceCoach';
import { useModalDialog } from '../../application/useModalDialog';

interface ClassPlaylistPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGame?: (gameType: string) => void;
}

interface StepInfo {
  phase: string;
  durationSec: number;
  title: string;
  desc: string;
  activities: string[];
  emoji: string;
  color: string;
}

const DEFAULT_LESSON_STEPS: StepInfo[] = [
  {
    phase: '1단계: 도입 (5분)',
    durationSec: 5 * 60,
    title: '워밍업 & 안전 체조',
    desc: '부상 방지를 위해 손목, 발목, 목, 허리를 천천히 돌리고 가벼운 조깅으로 체온을 올립니다.',
    activities: ['국민건강체조 1회', '관절 가동성 스트레칭', '체육관 2바퀴 조깅'],
    emoji: '🤸',
    color: 'from-cyan-600 to-blue-700'
  },
  {
    phase: '2단계: 전개 A (15분)',
    durationSec: 15 * 60,
    title: '기초 기능 익히기 & 개인 챌린지',
    desc: '오늘의 핵심 동작을 익히고 개인별 미니게임을 통해 목표 기록에 도전합니다.',
    activities: ['기본 동작 시범 및 따라하기', '스마트폰 1인 미니게임 3회 도전', '스스로 기록 피드백'],
    emoji: '🎯',
    color: 'from-amber-600 to-orange-700'
  },
  {
    phase: '3단계: 전개 B (15분)',
    durationSec: 15 * 60,
    title: '모둠 협동 & 모의 경기',
    desc: '모둠원들과 전략을 세우고 규칙을 지키며 협동 게임 및 간이 경기를 펼칩니다.',
    activities: ['모둠별 작전 회의 2분', '4인 1조 릴레이 챌린지', '상대 팀 칭찬 및 악수'],
    emoji: '🤝',
    color: 'from-emerald-600 to-teal-700'
  },
  {
    phase: '4단계: 정리 (5분)',
    durationSec: 5 * 60,
    title: '쿨다운 스트레칭 & 수업 성찰',
    desc: '가쁜 숨을 고르고 정적 스트레칭으로 근육을 이완하며 오늘 수업을 되돌아봅니다.',
    activities: ['깊은 복식 호흡 5회', '하체 정적 스트레칭', '오늘의 베스트 플레이어 박수'],
    emoji: '🧘',
    color: 'from-purple-600 to-indigo-700'
  }
];

export const ClassPlaylistPlayer: React.FC<ClassPlaylistPlayerProps> = ({ isOpen, onClose }) => {
  const { playBeep } = useAudio();
  const { speak, stop } = useVoiceCoach();

  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_LESSON_STEPS[0].durationSec);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const deadlineRef = useRef<number | null>(null);

  // 모달 닫힘 감지 시 음성 즉시 정지
  useEffect(() => {
    if (!isOpen) {
      stop();
      setIsRunning(false);
      deadlineRef.current = null;
    }
  }, [isOpen, stop]);

  // 컴포넌트 언마운트 시 음성 완전 정지
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const step = DEFAULT_LESSON_STEPS[currentStepIdx];

  const handleNextStep = useCallback(() => {
    if (currentStepIdx < DEFAULT_LESSON_STEPS.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      setTimeLeft(DEFAULT_LESSON_STEPS[nextIdx].durationSec);
      deadlineRef.current = isRunning ? Date.now() + DEFAULT_LESSON_STEPS[nextIdx].durationSec * 1000 : null;
      speak(`${DEFAULT_LESSON_STEPS[nextIdx].phase}, ${DEFAULT_LESSON_STEPS[nextIdx].title}을 시작합니다.`, true);
    } else {
      setIsRunning(false);
      setTimeLeft(0);
      setIsComplete(true);
      deadlineRef.current = null;
      speak('모든 체육 수업이 성공적으로 끝났습니다. 수고하셨습니다!', true);
    }
  }, [currentStepIdx, isRunning, speak]);

  useEffect(() => {
    if (!isOpen || !isRunning) return;
    let warned = false;
    const tick = () => {
      if (deadlineRef.current === null) return;
      const remaining = Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 10 && remaining > 0 && !warned) {
        warned = true;
        speak('10초 남았습니다. 다음 활동을 준비하세요.');
      }
      if (remaining === 0) {
        deadlineRef.current = null;
        playBeep();
        handleNextStep();
      }
    };
    const timer = window.setInterval(tick, 250);
    return () => clearInterval(timer);
  }, [isOpen, isRunning, currentStepIdx, handleNextStep, playBeep, speak]);

  const handleClose = () => {
    stop();
    setIsRunning(false);
    deadlineRef.current = null;
    onClose();
  };
  const dialogRef = useModalDialog(isOpen, handleClose);

  if (!isOpen) return null;

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      setTimeLeft(DEFAULT_LESSON_STEPS[prevIdx].durationSec);
      setIsComplete(false);
      deadlineRef.current = isRunning ? Date.now() + DEFAULT_LESSON_STEPS[prevIdx].durationSec * 1000 : null;
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="40분 체육 수업 플레이어" tabIndex={-1} className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-4 sm:p-6 overflow-y-auto">
      {/* 상단 네비게이션 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{step.emoji}</span>
          <div>
            <span className="text-xs uppercase tracking-wider font-extrabold text-cyan-400">
              교사용 40분 체육 수업 플레이어
            </span>
            <h2 className="text-xl font-black">{step.phase} - {step.title}</h2>
          </div>
        </div>
        <button
          onClick={handleClose}
          aria-label="수업 플레이어 닫기"
          className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-300 hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* 4단계 스텝 프로그레스 바 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-4 shrink-0">
        {DEFAULT_LESSON_STEPS.map((s, idx) => {
          const isDone = idx < currentStepIdx;
          const isCurrent = idx === currentStepIdx;
          return (
            <div
              key={idx}
              className={`p-3 rounded-2xl border transition-all ${
                isCurrent
                  ? 'bg-cyan-500/20 border-cyan-400 shadow-lg shadow-cyan-500/20'
                  : isDone
                  ? 'bg-slate-900 border-slate-700 opacity-60'
                  : 'bg-slate-900/50 border-slate-800 opacity-40'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold mb-1">
                <span className={isCurrent ? 'text-cyan-300' : 'text-slate-400'}>{s.phase}</span>
                {isDone && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
              </div>
              <p className="text-xs font-extrabold truncate text-white">{s.title}</p>
            </div>
          );
        })}
      </div>

      {/* 메인 타이머 및 활동 뷰어 */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-4 sm:gap-8 py-4">
        {/* 대형 타이머 디스플레이 */}
        <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-700/80 rounded-3xl p-8 w-full max-w-sm aspect-square shadow-2xl relative">
          <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-cyan-400" />
            남은 시간
          </div>
          <div className="text-7xl font-mono font-black text-cyan-400 tracking-tighter my-2 drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            {formatTime(timeLeft)}
          </div>
          <p className="text-xs text-slate-400 text-center mt-2">{step.desc}</p>
        </div>

        {/* 현재 단계 주요 활동 리스트 */}
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
          <h3 className="text-base font-bold text-amber-400 mb-3 flex items-center gap-2">
            📋 지금 진행할 수업 체크리스트
          </h3>
          <div className="space-y-3">
            {step.activities.map((act, i) => (
              <div
                key={i}
                className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-3 text-sm font-semibold text-slate-200"
              >
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-black shrink-0">
                  {i + 1}
                </div>
                <span>{act}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 제어 컨트롤 바 */}
      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 border-t border-slate-800 pt-4 shrink-0">
        <button
          onClick={handlePrevStep}
          disabled={currentStepIdx === 0}
          className="px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 rounded-2xl font-bold text-sm text-slate-300"
        >
          이전 단계
        </button>

        <button
          onClick={() => {
            if (isRunning) {
              stop();
              if (deadlineRef.current !== null) setTimeLeft(Math.max(0, Math.ceil((deadlineRef.current - Date.now()) / 1000)));
              deadlineRef.current = null;
              setIsRunning(false);
            } else {
              if (isComplete) {
                setCurrentStepIdx(0);
                setTimeLeft(DEFAULT_LESSON_STEPS[0].durationSec);
                setIsComplete(false);
              }
              deadlineRef.current = Date.now() + (isComplete ? DEFAULT_LESSON_STEPS[0].durationSec : timeLeft) * 1000;
              setIsRunning(true);
              speak('수업 타이머를 시작합니다.');
            }
          }}
          className={`px-8 py-4 rounded-2xl font-black text-lg flex items-center gap-2 shadow-xl transition-all ${
            isRunning
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
              : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20'
          }`}
        >
          {isRunning ? <><Pause className="w-6 h-6" /> 일시정지</> : isComplete ? <><RotateCcw className="w-6 h-6" /> 수업 다시 시작</> : <><Play className="w-6 h-6 fill-slate-950" /> 수업 시작</>}
        </button>

        <button
          onClick={handleNextStep}
          disabled={isComplete}
          className="px-5 py-3 bg-slate-800 hover:bg-slate-700 rounded-2xl font-bold text-sm text-slate-300 flex items-center gap-1.5"
        >
          다음 단계 <SkipForward className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
