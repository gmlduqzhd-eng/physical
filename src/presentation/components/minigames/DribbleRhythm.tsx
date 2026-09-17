import { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Volume2, VolumeX, Play, RotateCcw, CheckCircle2 } from 'lucide-react';
import { sfxSuccess } from '../../../application/soundEffects';

export const DribbleRhythm = () => {
  const [bpm, setBpm] = useState<number>(90);
  const [dribbleMode, setDribbleMode] = useState<'hand' | 'foot'>('hand');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [activityTimer, setActivityTimer] = useState<number>(20);
  const [pulseScale, setPulseScale] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [finished20s, setFinished20s] = useState<boolean>(false);
  const [missCount, setMissCount] = useState<string>('0');

  const audioCtxRef = useRef<AudioContext | null>(null);

  // 비프음 재생
  const playBeatSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      }
    } catch {
      // 무음 처리
    }
  }, [soundEnabled]);

  // BPM 메트로놈 인터벌
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = (60 / bpm) * 1000;
    const interval = setInterval(() => {
      setPulseScale(true);
      playBeatSound();
      setTimeout(() => setPulseScale(false), 120);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [isPlaying, bpm, playBeatSound]);

  // 20초 활동 타이머
  useEffect(() => {
    if (!isPlaying) return;
    const timerInterval = setInterval(() => {
      setActivityTimer(t => {
        if (t <= 1) {
          clearInterval(timerInterval);
          setIsPlaying(false);
          setFinished20s(true);
          sfxSuccess();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [isPlaying]);

  const handleStartActivity = () => {
    setActivityTimer(20);
    setFinished20s(false);
    setIsPlaying(true);
  };

  return (
    <PhysicalActivityLayout
      title="드리블 박자 공장"
      emoji="🥁"
      domain="스포츠"
      sportType="전략형"
      achievementCode="[4체02-03]"
      achievementTitle="조작 움직임 기술을 리듬과 박자에 맞추어 안정적으로 수행"
      activityType="개인"
      expectedMinutes={4}
      equipment={['공 1개 (농구공, 축구공, 탱탱볼 등)']}
      instructions={[
        '손(농구형 튀기기) 또는 발(축구형 몰기) 중 연습할 방식을 선택합니다.',
        '나에게 맞는 박자(느림 60, 보통 90, 빠름 120 BPM)를 고릅니다.',
        '화면의 커지는 원과 박자 비프음에 맞춰 20초간 실제 공을 바닥에 튀깁니다.',
        '화면을 보지 않아도 박자에 몸을 맡기며 공을 통제하는 감각을 길러보세요.',
      ]}
      colorTheme="orange"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl text-center">
          {!finished20s ? (
            <div>
              {/* 드리블 모드 선택 */}
              <div className="flex justify-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setDribbleMode('hand')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                    dribbleMode === 'hand' ? 'bg-orange-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  🏀 손 드리블 (튀기기)
                </button>
                <button
                  type="button"
                  onClick={() => setDribbleMode('foot')}
                  className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                    dribbleMode === 'foot' ? 'bg-orange-600 text-white' : 'bg-slate-950 text-slate-400 border border-slate-800'
                  }`}
                >
                  ⚽ 발 드리블 (몰기)
                </button>
              </div>

              {/* 템포 선택 (60 / 90 / 120 BPM) */}
              <div className="flex justify-center items-center gap-2 mb-6">
                {[
                  { bpmVal: 60, label: '느린 박자', speed: '60 BPM' },
                  { bpmVal: 90, label: '보통 박자', speed: '90 BPM' },
                  { bpmVal: 120, label: '빠른 박자', speed: '120 BPM' },
                ].map(item => (
                  <button
                    key={item.bpmVal}
                    type="button"
                    disabled={isPlaying}
                    onClick={() => setBpm(item.bpmVal)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      bpm === item.bpmVal
                        ? 'bg-orange-950 border-orange-500 text-orange-300 scale-105 shadow-md shadow-orange-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div>{item.label}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.speed}</div>
                  </button>
                ))}
              </div>

              {/* 박자 시각화 펄스 원 (음소거 상태에서도 동작) */}
              <div className="relative w-48 h-48 mx-auto mb-6 flex items-center justify-center">
                <div
                  className={`absolute rounded-full bg-orange-500/20 transition-transform duration-100 ${
                    pulseScale ? 'scale-125 opacity-80' : 'scale-90 opacity-30'
                  }`}
                  style={{ width: '160px', height: '160px' }}
                />
                <div
                  className={`w-28 h-28 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex flex-col items-center justify-center shadow-xl transition-transform duration-100 ${
                    pulseScale ? 'scale-110 shadow-orange-500/50' : 'scale-100'
                  }`}
                >
                  <span className="text-3xl mb-1">{dribbleMode === 'hand' ? '🏀' : '⚽'}</span>
                  <span className="text-xs font-black text-slate-950 font-mono">
                    {isPlaying ? `${activityTimer}초` : `${bpm} BPM`}
                  </span>
                </div>
              </div>

              {/* 사운드 토글 */}
              <div className="flex justify-center mb-5">
                <button
                  type="button"
                  onClick={() => setSoundEnabled(s => !s)}
                  className="px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs flex items-center gap-1.5 hover:text-slate-200"
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-cyan-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-600" />}
                  <span>{soundEnabled ? '박자 효과음 켜짐' : '박자 효과음 꺼짐 (시각 펄스만)'}</span>
                </button>
              </div>

              {/* 시작 버튼 */}
              {!isPlaying ? (
                <button
                  onClick={handleStartActivity}
                  className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-400 text-slate-950 rounded-2xl font-black text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Play className="w-4 h-4" /> 20초 박자 드리블 시작!
                </button>
              ) : (
                <p className="text-xs text-orange-300 font-bold animate-pulse">
                  공을 박자에 맞춰 일정하게 튕겨보세요! (20초간 유지)
                </p>
              )}
            </div>
          ) : (
            <div className="py-2 animate-in fade-in duration-300">
              <span className="text-5xl block mb-2">🎉</span>
              <h3 className="text-xl font-black text-white mb-1">20초 리듬 드리블 완료!</h3>
              <p className="text-xs text-slate-400 mb-6">
                박자에 맞춰 공을 다루는 감각이 한 단계 더 정교해졌습니다.
              </p>

              {/* 놓친 횟수 기록 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 max-w-sm mx-auto text-left">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  20초 동안 공 통제를 놓친 횟수는?
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: '0', label: '0회 (완벽 통제!)' },
                    { val: '1~2', label: '1~2회 (안정적)' },
                    { val: '3+', label: '3회 이상 (도전 중)' },
                  ].map(opt => (
                    <button
                      key={opt.val}
                      onClick={() => setMissCount(opt.val)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                        missCount === opt.val
                          ? 'bg-orange-950 border-orange-500 text-orange-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-emerald-300 font-medium mb-6 leading-relaxed">
                ✨ &ldquo;공을 놓쳐도 괜찮아요! 박자에 집중하며 손과 발의 신경을 깨우는 것이 가장 중요한 배움입니다.&rdquo;
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setFinished20s(false); setActivityTimer(20); }}
                  className="flex-1 py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" /> 다른 박자로 재도전
                </button>
                <button
                  onClick={() => onComplete(`${bpm} BPM ${dribbleMode === 'hand' ? '손' : '발'} 드리블 20초 완주 (놓친 횟수: ${missCount}회)`)}
                  className="flex-1 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" /> 결과 저장하기
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
