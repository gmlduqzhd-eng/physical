import React, { useState, useEffect } from 'react';
import { Heart, Wind, CheckCircle, X, Activity } from 'lucide-react';
import { sfxSuccess, sfxTap } from '../../application/soundEffects';

interface CooldownTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CooldownTimerModal: React.FC<CooldownTimerModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'breath' | 'pulse' | 'stretch'>('breath');

  // 1. 호흡 사이클 상태 (4초 들이마심 -> 7초 멈춤 -> 8초 내쉼)
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale'>('inhale');
  const [breathCounter, setBreathCounter] = useState<number>(4);

  // 2. 맥박 측정 상태
  const [isPulseTiming, setIsPulseTiming] = useState(false);
  const [pulseSecondsLeft, setPulseSecondsLeft] = useState(15);
  const [pulseCountInput, setPulseCountInput] = useState('');
  const [calculatedBpm, setCalculatedBpm] = useState<number | null>(null);

  // 3. 스트레칭 체크
  const [stretches, setStretches] = useState<Record<string, boolean>>({
    neck: false,
    shoulder: false,
    quads: false,
    calf: false,
  });

  // 호흡 타이머
  useEffect(() => {
    if (!isOpen || mode !== 'breath') return;

    const timer = setInterval(() => {
      setBreathCounter(prev => {
        if (prev <= 1) {
          if (breathPhase === 'inhale') {
            setBreathPhase('hold');
            return 7;
          } else if (breathPhase === 'hold') {
            setBreathPhase('exhale');
            return 8;
          } else {
            setBreathPhase('inhale');
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, mode, breathPhase]);

  // 맥박 15초 타이머
  useEffect(() => {
    if (!isPulseTiming) return;
    if (pulseSecondsLeft <= 0) {
      setIsPulseTiming(false);
      sfxSuccess();
      return;
    }
    const t = setInterval(() => {
      setPulseSecondsLeft(s => s - 1);
    }, 1000);
    return () => clearInterval(t);
  }, [isPulseTiming, pulseSecondsLeft]);

  const startPulseTimer = () => {
    setPulseSecondsLeft(15);
    setIsPulseTiming(true);
    setCalculatedBpm(null);
    sfxTap();
  };

  const handleCalculatePulse = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(pulseCountInput, 10);
    if (!isNaN(count) && count > 0) {
      const bpm = count * 4;
      setCalculatedBpm(bpm);
      sfxSuccess();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white">쿨다운 & 심박수 회복 루틴</h3>
            <p className="text-xs text-slate-400">운동 후 체온과 심박수를 정상화하여 부상을 방지합니다</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 rounded-2xl mb-5 border border-slate-800">
          <button
            onClick={() => setMode('breath')}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'breath' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400'
            }`}
          >
            <Wind className="w-4 h-4" /> 4-7-8 호흡
          </button>
          <button
            onClick={() => setMode('pulse')}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'pulse' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400'
            }`}
          >
            <Activity className="w-4 h-4" /> 맥박 체크
          </button>
          <button
            onClick={() => setMode('stretch')}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              mode === 'stretch' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400'
            }`}
          >
            <CheckCircle className="w-4 h-4" /> 정리 스트레칭
          </button>
        </div>

        {/* 1. 호흡 모드 */}
        {mode === 'breath' && (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="relative flex items-center justify-center w-48 h-48 mb-6">
              <div
                className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                  breathPhase === 'inhale'
                    ? 'scale-110 bg-emerald-500/20 border-2 border-emerald-400 animate-pulse'
                    : breathPhase === 'hold'
                    ? 'scale-100 bg-amber-500/20 border-2 border-amber-400'
                    : 'scale-90 bg-cyan-500/10 border-2 border-cyan-400'
                }`}
              />
              <div className="flex flex-col items-center z-10">
                <span className="text-3xl font-black font-mono">{breathCounter}</span>
                <span className="text-sm font-bold text-slate-300 mt-1">
                  {breathPhase === 'inhale' && '숨 들이쉬기'}
                  {breathPhase === 'hold' && '숨 멈추기'}
                  {breathPhase === 'exhale' && '천천히 내쉬기'}
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-xs">
              부교감 신경을 활성화하여 심장 박동을 안정시키고 근육의 긴장을 풀어줍니다.
            </p>
          </div>
        )}

        {/* 2. 맥박 측정 */}
        {mode === 'pulse' && (
          <div className="space-y-4 py-2">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 leading-relaxed">
              👉 검지와 중지를 목 옆(경동맥)이나 손목 안쪽에 가볍게 대고 15초간 뛰는 횟수를 셉니다.
            </div>

            <div className="flex flex-col items-center">
              {isPulseTiming ? (
                <div className="text-center my-4">
                  <div className="text-5xl font-mono font-black text-emerald-400 animate-pulse">
                    {pulseSecondsLeft}초
                  </div>
                  <p className="text-xs text-slate-400 mt-2">심장 박동을 조용히 세어보세요...</p>
                </div>
              ) : (
                <button
                  onClick={startPulseTimer}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-sm shadow-lg shadow-emerald-500/20 mb-3"
                >
                  {pulseSecondsLeft === 0 ? '🔄 15초 측정 다시하기' : '⏱️ 15초 측정 시작'}
                </button>
              )}
            </div>

            <form onSubmit={handleCalculatePulse} className="flex gap-2">
              <input
                type="number"
                value={pulseCountInput}
                onChange={e => setPulseCountInput(e.target.value)}
                placeholder="15초간 잰 맥박수 입력"
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm text-center text-white"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 font-bold rounded-xl text-sm border border-slate-700"
              >
                계산
              </button>
            </form>

            {calculatedBpm !== null && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center">
                <span className="text-xs text-slate-400">1분당 추정 심박수</span>
                <div className="text-3xl font-black text-emerald-400 mt-0.5">{calculatedBpm} BPM</div>
                <p className="text-xs text-slate-300 mt-1">
                  {calculatedBpm <= 100
                    ? '🟢 정상 안정 심박수 상태로 잘 회복되었습니다!'
                    : '🟡 아직 활동 후 회복 중입니다. 4-7-8 호흡을 2~3회 더 진행해 주세요.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 3. 정리 스트레칭 */}
        {mode === 'stretch' && (
          <div className="space-y-2 py-2">
            {[
              { key: 'neck', name: '목 좌우 늘려주기 (15초)', desc: '고개를 좌우로 부드럽게 지그시 당겨 목 근육 이완' },
              { key: 'shoulder', name: '팔 교차 어깨 늘리기 (15초)', desc: '한쪽 팔을 가슴 앞으로 당겨 삼각근 스트레칭' },
              { key: 'quads', name: '발목 잡고 허벅지 앞쪽 늘리기', desc: '한 발로 서서 발목을 엉덩이 쪽으로 당겨 대퇴사두근 이완' },
              { key: 'calf', name: '벽 밀며 종아리 늘리기', desc: '한쪽 다리를 뒤로 뻗고 뒤꿈치를 바닥에 밀착' },
            ].map(item => (
              <button
                key={item.key}
                onClick={() => {
                  sfxTap();
                  setStretches(s => ({ ...s, [item.key]: !s[item.key] }));
                }}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                  stretches[item.key]
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">{item.name}</div>
                  <div className="text-[11px] text-slate-400">{item.desc}</div>
                </div>
                <CheckCircle className={`w-5 h-5 flex-shrink-0 ${stretches[item.key] ? 'text-emerald-400' : 'text-slate-600'}`} />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-colors"
        >
          확인 완료
        </button>
      </div>
    </div>
  );
};
