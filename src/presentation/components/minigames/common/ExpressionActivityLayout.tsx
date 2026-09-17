import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, Star, Trophy, RotateCcw, Info, Sparkles, Award } from 'lucide-react';
import { YouTubeExpressionPlayer } from './YouTubeExpressionPlayer';
import type { ExpressionGameData } from '../expression/expressionGamesData';
import { sfxSuccess } from '../../../../application/soundEffects';

interface ExpressionActivityLayoutProps {
  game: ExpressionGameData;
  onComplete: (score: number, meta?: any) => void;
  onExit?: () => void;
}

export const ExpressionActivityLayout = ({
  game,
  onComplete,
  onExit,
}: ExpressionActivityLayoutProps) => {
  // 단계: 'countdown' -> 'active' -> 'rubric' -> 'result'
  const [phase, setPhase] = useState<'countdown' | 'active' | 'rubric' | 'result'>('countdown');
  const [countdown, setCountdown] = useState<number>(3);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [timeLeft, setTimeLeft] = useState<number>(game.steps[0]?.durationSeconds || 30);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [showAchievementModal, setShowAchievementModal] = useState<boolean>(false);

  // 평가 점수 상태 (각 루브릭 항목별 1~5점)
  const [ratings, setRatings] = useState<number[]>(game.rubric.map(() => 5));
  const [selfReflection, setSelfReflection] = useState<string>('친구들과 함께 멋진 표현을 완성하여 보람찼습니다!');
  const [totalElapsedTime, setTotalElapsedTime] = useState<number>(0);

  // 카운트다운 3초
  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase('active');
      setTimeLeft(game.steps[0]?.durationSeconds || 30);
      setIsTimerRunning(true);
    }
  }, [phase, countdown, game.steps]);

  // 활동 타이머
  useEffect(() => {
    if (phase !== 'active' || !isTimerRunning) return;
    const interval = setInterval(() => {
      setTotalElapsedTime(t => t + 1);
      setTimeLeft(t => {
        if (t <= 1) {
          // 다음 단계 자동 전환 또는 루브릭 이동
          if (currentStepIdx < game.steps.length - 1) {
            setCurrentStepIdx(s => s + 1);
            return game.steps[currentStepIdx + 1]?.durationSeconds || 30;
          } else {
            // 마지막 단계 완료 -> 루브릭 평가 단계
            setPhase('rubric');
            return 0;
          }
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, isTimerRunning, currentStepIdx, game.steps]);

  const handleNextStep = useCallback(() => {
    if (currentStepIdx < game.steps.length - 1) {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      setTimeLeft(game.steps[nextIdx].durationSeconds);
    } else {
      setPhase('rubric');
    }
  }, [currentStepIdx, game.steps]);

  const handlePrevStep = () => {
    if (currentStepIdx > 0) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      setTimeLeft(game.steps[prevIdx].durationSeconds);
    }
  };

  // 루브릭 평가 제출 및 완료
  const handleFinishRubric = () => {
    sfxSuccess();
    setPhase('result');
    const avgScore = Math.round((ratings.reduce((a, b) => a + b, 0) / (ratings.length * 5)) * 100);
    onComplete(avgScore, {
      ratings,
      selfReflection,
      totalTime: totalElapsedTime,
    });
  };

  const currentStep = game.steps[currentStepIdx] || game.steps[0];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* 성취기준 세부 모달 */}
      {showAchievementModal && (
        <div
          className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowAchievementModal(false)}
        >
          <div
            className="bg-slate-900 border border-purple-500/50 rounded-3xl max-w-md w-full p-6 shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 font-mono font-black text-sm rounded-lg border border-purple-500/30">
                {game.achievement.code}
              </span>
              <span className="text-xs font-bold text-slate-400">2022 개정 초등 체육과 표현 영역</span>
            </div>
            <h3 className="text-xl font-black text-white mb-2">{game.achievement.title}</h3>
            <p className="text-sm text-slate-300 bg-slate-800/80 p-4 rounded-2xl border border-slate-700 leading-relaxed">
              &ldquo;{game.achievement.desc}&rdquo;
            </p>
            <button
              onClick={() => setShowAchievementModal(false)}
              className="mt-5 w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-sm text-white shadow-lg active:scale-95 transition-all"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* 상단 활동 메타 배너 */}
      <div className="bg-slate-900/90 border border-purple-500/30 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl shadow-lg shrink-0">
            {game.emoji}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-black text-white truncate">{game.name}</h2>
              <button
                type="button"
                onClick={() => setShowAchievementModal(true)}
                className="px-2 py-0.5 rounded-lg bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-[10px] font-mono font-bold text-purple-300 flex items-center gap-1 transition-colors"
                title="성취기준 상세 보기"
              >
                <Info className="w-2.5 h-2.5" />
                <span>{game.achievement.code}</span>
              </button>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold border ${
                game.playMode === '협동'
                  ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                  : 'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {game.playMode === '협동' ? '🤝 협동 활동' : '👤 개인 활동'}
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">{game.desc}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] bg-slate-950/60 px-3 py-1 rounded-xl border border-slate-800">
          <span className="text-slate-400">지원:</span>
          {game.devices.includes('스마트폰') && <span title="스마트폰">📱</span>}
          {game.devices.includes('태블릿 PC') && <span title="태블릿 PC">📟</span>}
          {game.devices.includes('데스크톱 PC') && <span title="데스크톱 PC">🖥️</span>}
        </div>
      </div>

      {/* 1. 3초 카운트다운 단계 */}
      {phase === 'countdown' && (
        <div className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-16 shadow-2xl flex flex-col items-center justify-center text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="text-xs font-black text-purple-400 uppercase tracking-widest animate-pulse">
            GET READY FOR EXPRESSION
          </div>
          <div className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-200 to-indigo-400 animate-bounce">
            {countdown}
          </div>
          <p className="text-sm text-slate-300 font-bold">
            온몸의 감각을 깨우고 첫 번째 표현 동작을 준비하세요!
          </p>
        </div>
      )}

      {/* 3. 본 활동 단계 */}
      {phase === 'active' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* 유튜브 영상 연계 플레이어 (영상 정보가 있는 게임) */}
          {game.videoInfo && (
            <YouTubeExpressionPlayer
              initialVideoId={game.videoInfo.videoId}
              videoTitle={game.videoInfo.title}
              defaultBpm={game.videoInfo.defaultBpm || 100}
            />
          )}

          {/* 단계별 네비게이션 & 타이머 카드 */}
          <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            {/* 진행 단계 헤더 & 남은 시간 */}
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-xs shadow-md">
                  단계 {currentStep.stepNum} / {game.steps.length}
                </span>
                <h3 className="font-black text-base sm:text-lg text-white">
                  {currentStep.title}
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1 rounded-xl border border-purple-500/30 font-mono font-black text-base text-cyan-400">
                  <span>⏱️</span>
                  <span>{timeLeft}초</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTimerRunning(p => !p)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  {isTimerRunning ? '일시정지' : '계속 진행'}
                </button>
              </div>
            </div>

            {/* 동작 가이드 & 팁 */}
            <div className="bg-slate-950/70 p-5 rounded-2xl border border-slate-800 space-y-3">
              <div className="text-sm sm:text-base text-slate-200 font-bold leading-relaxed">
                👉 {currentStep.guide}
              </div>
              <div className="text-xs text-purple-300 bg-purple-950/40 p-3 rounded-xl border border-purple-500/20 flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-purple-400" />
                <span><strong>표현 꿀팁:</strong> {currentStep.actionTip}</span>
              </div>
            </div>

            {/* 단계 이동 제어 바 */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={currentStepIdx === 0}
                onClick={handlePrevStep}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                  currentStepIdx === 0
                    ? 'bg-slate-950 text-slate-700 cursor-not-allowed'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <ChevronLeft className="w-4 h-4" /> 이전 단계
              </button>

              <div className="flex gap-1.5">
                {game.steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-2 rounded-full transition-all ${
                      i === currentStepIdx
                        ? 'w-6 bg-purple-500'
                        : i < currentStepIdx
                        ? 'w-2 bg-purple-900'
                        : 'w-2 bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleNextStep}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black shadow-md flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>{currentStepIdx === game.steps.length - 1 ? '활동 마치고 평가하기' : '다음 단계'}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. 자기/동료 루브릭 평가 단계 */}
      {phase === 'rubric' && (
        <div className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in duration-200">
          <div className="text-center pb-4 border-b border-slate-800 space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950 text-purple-300 text-xs font-bold border border-purple-800 mb-2">
              <Award className="w-3.5 h-3.5" /> 과정 중심 평가 &amp; 피드백
            </div>
            <h3 className="text-xl font-black text-white">표현 활동 성찰 및 루브릭 평가</h3>
            <p className="text-xs text-slate-400">
              오늘의 표현 활동에 참여한 느낌을 스스로 돌아보고 별점을 부여해 보세요.
            </p>
          </div>

          {/* 루브릭 항목 리스트 */}
          <div className="space-y-4">
            {game.rubric.map((item, idx) => (
              <div key={idx} className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-black text-sm text-purple-300">{item.criterion}</h4>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          const next = [...ratings];
                          next[idx] = star;
                          setRatings(next);
                        }}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-5 h-5 ${
                            star <= ratings[idx]
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-slate-700'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 성찰 한마디 */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              ✍️ 활동 후 느낀 점 (한 줄 성찰)
            </label>
            <input
              type="text"
              value={selfReflection}
              onChange={e => setSelfReflection(e.target.value)}
              placeholder="예: 온몸으로 날씨를 표현해보니 상쾌하고 친구들의 창의적인 동작이 인상 깊었습니다!"
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleFinishRubric}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg active:scale-95 transition-all flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              <span>평가 완료 및 활동 결과 보기</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. 최종 결과 리포트 단계 */}
      {phase === 'result' && (
        <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 mx-auto flex items-center justify-center text-4xl shadow-xl">
            🏆
          </div>

          <div>
            <h3 className="text-2xl font-black text-white">표현 활동 성공 완료!</h3>
            <p className="text-sm text-slate-400 mt-1">
              {game.name}을(를) 훌륭하게 수행하고 과정 평가를 마쳤습니다.
            </p>
          </div>

          {/* 점수 및 기록 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-center">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 font-bold">성취 평가</div>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {Math.round((ratings.reduce((a, b) => a + b, 0) / (ratings.length * 5)) * 100)}점
              </div>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 font-bold">활동 시간</div>
              <div className="text-2xl font-black text-cyan-400 mt-1">
                {totalElapsedTime}초
              </div>
            </div>
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <div className="text-xs text-slate-400 font-bold">성취기준</div>
              <div className="text-xs font-mono font-bold text-purple-400 mt-2">
                {game.achievement.code}
              </div>
            </div>
          </div>

          {/* 한 줄 성찰 출력 */}
          <div className="bg-purple-950/30 p-4 rounded-2xl border border-purple-500/20 max-w-lg mx-auto text-left">
            <div className="text-[11px] font-bold text-purple-300 mb-1">나의 성찰 기록:</div>
            <p className="text-xs text-slate-200 italic">&ldquo;{selfReflection}&rdquo;</p>
          </div>

          {/* 재도전 및 나가기 */}
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setPhase('countdown');
                setCountdown(3);
                setCurrentStepIdx(0);
                setTimeLeft(game.steps[0].durationSeconds);
              }}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 다시 하기
            </button>
            {onExit && (
              <button
                type="button"
                onClick={onExit}
                className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs shadow-md transition-colors"
              >
                홈 화면으로 이동
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
