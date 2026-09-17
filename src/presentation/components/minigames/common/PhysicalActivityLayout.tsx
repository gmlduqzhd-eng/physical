import { useState, type ReactNode } from 'react';
import { ShieldCheck, Play, ArrowLeft, RotateCcw, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface SafetyItem {
  id: string;
  text: string;
}

const DEFAULT_SAFETY_ITEMS: SafetyItem[] = [
  { id: 'obstacle', text: '주변 장애물을 치워 안전한 공간을 확보했나요?' },
  { id: 'distance', text: '친구와 부딪히지 않도록 안전거리를 충분히 두었나요?' },
  { id: 'floor', text: '바닥이 미끄럽지 않고 넘어질 위험이 없나요?' },
  { id: 'equipment', text: '사용하는 공이나 도구가 안전하고 파손되지 않았나요?' },
  { id: 'health', text: '몸이 아프거나 어지러우면 언제든 즉시멈출 준비가 되었나요?' },
];

interface Props {
  title: string;
  emoji: string;
  domain: '운동' | '스포츠' | '표현';
  sportType?: '기술형' | '전략형' | '생태형';
  achievementCode: string;
  achievementTitle: string;
  activityType: '개인' | '짝' | '모둠';
  expectedMinutes: number;
  equipment?: string[];
  instructions: string[];
  safetyItems?: SafetyItem[];
  colorTheme?: string;
  children: (props: {
    phase: 'activity' | 'result';
    onComplete: (summary?: string) => void;
    onReplay: () => void;
  }) => ReactNode;
}

export const PhysicalActivityLayout = ({
  title,
  emoji,
  domain,
  sportType,
  achievementCode,
  achievementTitle,
  activityType,
  expectedMinutes,
  equipment = [],
  instructions,
  safetyItems = DEFAULT_SAFETY_ITEMS,
  children,
}: Props) => {
  const navigate = useNavigate();
  // flow: 'intro' -> 'safety' -> 'countdown' -> 'active' -> 'completed'
  const [step, setStep] = useState<'intro' | 'safety' | 'countdown' | 'active' | 'completed'>('intro');
  const [countdown, setCountdown] = useState(3);
  const [checkedSafety, setCheckedSafety] = useState<Record<string, boolean>>({});
  const [selfRating, setSelfRating] = useState<number | null>(null);
  const [completionSummary, setCompletionSummary] = useState<string>('');

  const allSafetyChecked = safetyItems.every(item => checkedSafety[item.id]);

  const handleStartSafety = () => {
    setStep('safety');
  };

  const handlePassSafety = () => {
    setStep('countdown');
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep('active');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleActivityComplete = (summary?: string) => {
    if (summary) setCompletionSummary(summary);
    setStep('completed');
  };

  const handleReplay = () => {
    setSelfRating(null);
    setCompletionSummary('');
    setStep('countdown');
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStep('active');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const toggleSafetyItem = (id: string) => {
    setCheckedSafety(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAllSafety = () => {
    const next: Record<string, boolean> = {};
    safetyItems.forEach(item => { next[item.id] = true; });
    setCheckedSafety(next);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white font-sans flex flex-col justify-between p-4 md:p-6 select-none overflow-y-auto">
      {/* 1. 인트로 단계: 활동 개요, 준비물, 교육과정 안내 */}
      {step === 'intro' && (
        <div className="max-w-xl w-full mx-auto my-auto py-8 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-cyan-950 text-cyan-400 border border-cyan-800">
              {achievementCode}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
              {domain} {sportType ? `· ${sportType}` : ''}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-amber-300">
              👥 {activityType} 활동
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl">{emoji}</span>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white">{title}</h1>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{achievementTitle}</p>
            </div>
          </div>

          {/* 준비물 및 예상 시간 */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 mb-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-400">⏱️ 예상 소요 시간</span>
              <span className="font-bold text-cyan-300">약 {expectedMinutes}분</span>
            </div>
            <div className="flex items-start justify-between text-xs pt-2 border-t border-slate-800/80">
              <span className="font-bold text-slate-400 shrink-0 mr-2">🎒 준비물</span>
              <span className="font-medium text-slate-300 text-right">
                {equipment.length > 0 ? equipment.join(', ') : '별도 준비물 없음 (간편한 복장)'}
              </span>
            </div>
          </div>

          {/* 활동 방법 */}
          <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800 mb-6">
            <h3 className="text-xs font-bold text-slate-300 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> 활동 방법
            </h3>
            <ol className="space-y-2 text-xs text-slate-300 font-medium list-decimal list-inside leading-relaxed">
              {instructions.map((inst, i) => (
                <li key={i} className="pl-1"><span className="text-white">{inst}</span></li>
              ))}
            </ol>
          </div>

          <button
            onClick={handleStartSafety}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-2xl font-black text-base shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" /> 안전 수칙 확인 후 시작하기
          </button>
        </div>
      )}

      {/* 2. 안전 확인 단계: 5대 안전 수칙 체크 */}
      {step === 'safety' && (
        <div className="max-w-xl w-full mx-auto my-auto py-6 animate-in fade-in duration-200">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-2xl">
              ⚠️
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white mb-1">체육활동 안전 확인</h2>
            <p className="text-xs text-slate-400">신나고 안전한 체육활동을 위해 항목을 꼼꼼히 확인하세요.</p>
          </div>

          <div className="space-y-2.5 mb-6">
            {safetyItems.map(item => {
              const isChecked = !!checkedSafety[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleSafetyItem(item.id)}
                  type="button"
                  className={`w-full p-3.5 rounded-2xl border text-left text-xs md:text-sm font-bold flex items-center gap-3 transition-all ${
                    isChecked
                      ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    isChecked ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700 bg-slate-800'
                  }`}>
                    {isChecked && <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className="flex-1 leading-snug">{item.text}</span>
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={selectAllSafety}
              type="button"
              className="px-4 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 rounded-2xl font-bold text-xs shrink-0"
            >
              모두 체크
            </button>
            <button
              type="button"
              onClick={handlePassSafety}
              disabled={!allSafetyChecked}
              className={`flex-1 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                allSafetyChecked
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-emerald-500/20 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              <Play className="w-4 h-4" /> 준비 완료! 시작 (3초 카운트)
            </button>
          </div>
        </div>
      )}

      {/* 3. 3초 준비 카운트다운 */}
      {step === 'countdown' && (
        <div className="max-w-md w-full mx-auto my-auto text-center py-12 animate-in zoom-in-90 duration-300">
          <p className="text-sm font-bold text-cyan-400 mb-2">몸과 마음의 준비를 하세요!</p>
          <div className="text-8xl md:text-9xl font-black text-white font-mono mb-4 animate-bounce">
            {countdown}
          </div>
          <p className="text-xs text-slate-400">
            {countdown > 1 ? '호흡을 고르고 제자리에 섭니다' : '출발 준비 완료!'}
          </p>
        </div>
      )}

      {/* 4. 실제 신체활동 진행 화면 */}
      {step === 'active' && (
        <div className="flex-1 flex flex-col justify-center w-full max-w-2xl mx-auto py-2">
          {children({
            phase: 'activity',
            onComplete: handleActivityComplete,
            onReplay: handleReplay,
          })}
        </div>
      )}

      {/* 5. 활동 완료 & 자기평가 화면 */}
      {step === 'completed' && (
        <div className="max-w-md w-full mx-auto my-auto py-6 animate-in fade-in duration-200">
          <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 md:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg">
              🎉
            </div>
            <h2 className="text-2xl font-black text-white mb-1">{title} 완료!</h2>
            <p className="text-xs text-emerald-400 font-bold mb-4">
              성취기준 {achievementCode} 학습 목표를 성공적으로 수행했습니다.
            </p>

            {completionSummary && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5 text-left">
                <span className="text-[10px] font-bold text-slate-500 block mb-1">활동 요약</span>
                <p className="text-xs text-slate-300 font-medium leading-relaxed">{completionSummary}</p>
              </div>
            )}

            {/* 자기평가 */}
            <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 mb-6">
              <span className="text-xs font-bold text-slate-300 block mb-2.5">
                오늘 나의 신체활동 만족도는?
              </span>
              <div className="flex justify-center gap-3">
                {[
                  { rating: 1, label: '노력 필요', icon: '🌱' },
                  { rating: 2, label: '보통', icon: '🌿' },
                  { rating: 3, label: '열심히 함', icon: '⭐' },
                  { rating: 4, label: '완벽 실천', icon: '🔥' },
                ].map(r => (
                  <button
                    key={r.rating}
                    type="button"
                    onClick={() => setSelfRating(r.rating)}
                    className={`flex flex-col items-center p-2.5 rounded-xl border transition-all ${
                      selfRating === r.rating
                        ? 'bg-cyan-950 border-cyan-500 scale-105 shadow-md shadow-cyan-500/20 text-cyan-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-2xl mb-1">{r.icon}</span>
                    <span className="text-[10px] font-bold">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReplay}
                type="button"
                className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> 다시 하기
              </button>
              <button
                onClick={() => navigate('/')}
                type="button"
                className="flex-1 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-lg"
              >
                <ArrowLeft className="w-4 h-4" /> 대시보드 복귀
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
