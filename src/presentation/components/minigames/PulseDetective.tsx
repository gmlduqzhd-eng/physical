import { useState, useEffect } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Heart, Activity, Play, Check } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

export const PulseDetective = () => {
  // 1: 안정 시 측정, 2: 안정 시 입력, 3: 30초 운동, 4: 운동 직후 측정, 5: 직후 입력, 6: 45초 회복, 7: 회복 후 측정, 8: 회복 후 입력, 9: 결과 그래프
  const [subStep, setSubStep] = useState<number>(1);
  const [timer, setTimer] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const [restPulse, setRestPulse] = useState<string>('');
  const [exercisePulse, setExercisePulse] = useState<string>('');
  const [recoveryPulse, setRecoveryPulse] = useState<string>('');
  const [inputError, setInputError] = useState<string>('');

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          sfxCoin();
          setSubStep(s => {
            if (s === 1) return 2;
            if (s === 3) {
              setTimer(15);
              return 4;
            }
            if (s === 4) return 5;
            if (s === 6) {
              setTimer(15);
              return 7;
            }
            if (s === 7) return 8;
            return s;
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const startMeasurement = (seconds: number) => {
    setTimer(seconds);
    setIsTimerRunning(true);
  };

  const handleInputSubmit = (val: string, type: 'rest' | 'exercise' | 'recovery') => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num < 5 || num > 60) {
      setInputError('15초 동안 센 맥박수(보통 12~35회)를 숫자로 바르게 입력해 주세요.');
      return;
    }
    setInputError('');
    sfxCoin();
    if (type === 'rest') {
      setRestPulse(val);
      setSubStep(3);
    } else if (type === 'exercise') {
      setExercisePulse(val);
      setSubStep(6);
    } else if (type === 'recovery') {
      setRecoveryPulse(val);
      setSubStep(9);
      sfxSuccess();
    }
  };

  return (
    <PhysicalActivityLayout
      title="심박 탐정단"
      emoji="🔍"
      domain="운동"
      achievementCode="[6체01-01]"
      achievementTitle="운동 전후 신체 변화와 심폐지구력 탐색"
      activityType="개인"
      expectedMinutes={4}
      instructions={[
        '편안하게 앉아 목 옆이나 손목에 두 손가락을 대고 맥박을 찾아보세요.',
        '15초 동안 뛰는 맥박 수를 세어 화면에 기록합니다.',
        '화면의 안내에 따라 30초 동안 제자리에서 힘차게 움직입니다.',
        '운동 직후와 1분 휴식 후 맥박을 다시 측정해 변화를 관찰합니다.',
      ]}
      colorTheme="cyan"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          {/* 단계 인디케이터 */}
          <div className="flex justify-between items-center mb-6 px-2">
            {[
              { num: 1, label: '안정 시' },
              { num: 2, label: '운동 (30초)' },
              { num: 3, label: '운동 직후' },
              { num: 4, label: '회복 후' },
              { num: 5, label: '변화 분석' },
            ].map((st, idx) => {
              const activeIdx = subStep <= 2 ? 0 : subStep === 3 ? 1 : subStep <= 5 ? 2 : subStep <= 8 ? 3 : 4;
              return (
                <div key={st.num} className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx === activeIdx ? 'bg-cyan-500 text-slate-950 ring-2 ring-cyan-300' :
                    idx < activeIdx ? 'bg-slate-700 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {idx < activeIdx ? '✓' : st.num}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium hidden sm:inline">{st.label}</span>
                </div>
              );
            })}
          </div>

          {/* SubStep 1: 안정 시 15초 맥박 측정 */}
          {subStep === 1 && (
            <div className="text-center py-4">
              <Heart className="w-12 h-12 text-rose-500 mx-auto mb-3 animate-pulse" />
              <h3 className="text-lg font-black text-white mb-1">1단계: 안정 시 맥박 측정</h3>
              <p className="text-xs text-slate-300 mb-6">
                목 옆이나 손목에 손가락을 대고 15초 동안 맥박이 몇 번 뛰는지 세어보세요.
              </p>

              {isTimerRunning ? (
                <div className="my-6">
                  <div className="text-6xl font-black text-cyan-400 font-mono mb-2">{timer}초</div>
                  <p className="text-xs text-slate-400 animate-pulse">콩닥콩닥... 맥박 수를 마음속으로 셉니다</p>
                </div>
              ) : (
                <button
                  onClick={() => startMeasurement(15)}
                  className="px-6 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> 15초 측정 타이머 시작
                </button>
              )}
            </div>
          )}

          {/* SubStep 2: 안정 시 맥박 입력 */}
          {subStep === 2 && (
            <div className="text-center py-4 max-w-xs mx-auto">
              <h3 className="text-lg font-black text-white mb-2">안정 시 15초 맥박 입력</h3>
              <p className="text-xs text-slate-400 mb-4">방금 15초 동안 센 맥박 수를 입력해 주세요.</p>
              <input
                type="number"
                min="5"
                max="60"
                value={restPulse}
                onChange={e => setRestPulse(e.target.value)}
                placeholder="예: 18"
                className="w-full text-center py-3 bg-slate-950 border border-slate-700 rounded-xl text-2xl font-black font-mono text-cyan-400 focus:outline-none focus:border-cyan-500 mb-2"
              />
              {inputError && <p className="text-[11px] text-amber-400 mb-3">{inputError}</p>}
              <button
                onClick={() => handleInputSubmit(restPulse, 'rest')}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl"
              >
                입력 완료
              </button>
            </div>
          )}

          {/* SubStep 3: 30초 제자리 신체활동 */}
          {subStep === 3 && (
            <div className="text-center py-4">
              <Activity className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-bounce" />
              <h3 className="text-lg font-black text-white mb-1">2단계: 30초 제자리 걷기·뛰기</h3>
              <p className="text-xs text-slate-300 mb-6">
                안전한 자리에서 무릎을 높이 올리며 30초 동안 활기차게 제자리 뛰기를 수행합니다!
              </p>

              {isTimerRunning ? (
                <div className="my-6">
                  <div className="text-6xl font-black text-emerald-400 font-mono mb-2">{timer}초</div>
                  <p className="text-xs text-emerald-300 animate-pulse font-bold">팔다리를 힘차게 흔들며 움직이세요!</p>
                </div>
              ) : (
                <button
                  onClick={() => startMeasurement(30)}
                  className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> 30초 운동 시작
                </button>
              )}
            </div>
          )}

          {/* SubStep 4: 운동 직후 15초 맥박 측정 */}
          {subStep === 4 && (
            <div className="text-center py-4">
              <Heart className="w-12 h-12 text-rose-500 mx-auto mb-3 animate-ping" />
              <h3 className="text-lg font-black text-white mb-1">3단계: 운동 직후 맥박 측정</h3>
              <p className="text-xs text-slate-300 mb-6">
                운동이 끝나자마자 바로 목이나 손목에 손가락을 대고 15초 맥박을 셉니다!
              </p>

              {isTimerRunning ? (
                <div className="my-6">
                  <div className="text-6xl font-black text-rose-400 font-mono mb-2">{timer}초</div>
                  <p className="text-xs text-rose-300 animate-pulse">심장이 빠르게 뛰는 것이 느껴지나요?</p>
                </div>
              ) : (
                <button
                  onClick={() => startMeasurement(15)}
                  className="px-6 py-3.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> 직후 맥박 측정 시작
                </button>
              )}
            </div>
          )}

          {/* SubStep 5: 운동 직후 맥박 입력 */}
          {subStep === 5 && (
            <div className="text-center py-4 max-w-xs mx-auto">
              <h3 className="text-lg font-black text-white mb-2">운동 직후 15초 맥박 입력</h3>
              <p className="text-xs text-slate-400 mb-4">방금 15초 동안 센 맥박 수를 입력해 주세요.</p>
              <input
                type="number"
                min="5"
                max="60"
                value={exercisePulse}
                onChange={e => setExercisePulse(e.target.value)}
                placeholder="예: 30"
                className="w-full text-center py-3 bg-slate-950 border border-slate-700 rounded-xl text-2xl font-black font-mono text-rose-400 focus:outline-none focus:border-rose-500 mb-2"
              />
              {inputError && <p className="text-[11px] text-amber-400 mb-3">{inputError}</p>}
              <button
                onClick={() => handleInputSubmit(exercisePulse, 'exercise')}
                className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm rounded-xl"
              >
                입력 완료
              </button>
            </div>
          )}

          {/* SubStep 6: 회복 휴식 (45초) */}
          {subStep === 6 && (
            <div className="text-center py-4">
              <span className="text-5xl block mb-3">🧘‍♂️</span>
              <h3 className="text-lg font-black text-white mb-1">4단계: 심호흡과 휴식</h3>
              <p className="text-xs text-slate-300 mb-6">
                천천히 걸으며 숨을 깊게 들이마시고 내쉬며 심장을 쉬게 해줍니다.
              </p>

              {isTimerRunning ? (
                <div className="my-6">
                  <div className="text-6xl font-black text-teal-400 font-mono mb-2">{timer}초</div>
                  <p className="text-xs text-teal-300 animate-pulse">들이마시고... 내쉬고... 천천히 걷기</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={() => startMeasurement(45)}
                    className="px-6 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" /> 45초 휴식 시작
                  </button>
                  <div>
                    <button
                      onClick={() => { setSubStep(7); setTimer(15); }}
                      className="text-xs text-slate-500 hover:text-slate-400 underline"
                    >
                      (이미 충분히 쉬었다면 바로 회복 측정하기)
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubStep 7: 회복 후 맥박 측정 */}
          {subStep === 7 && (
            <div className="text-center py-4">
              <Heart className="w-12 h-12 text-teal-400 mx-auto mb-3" />
              <h3 className="text-lg font-black text-white mb-1">회복 후 맥박 측정</h3>
              <p className="text-xs text-slate-300 mb-6">
                휴식 후 맥박이 얼마나 차분해졌는지 15초 동안 세어보세요.
              </p>

              {isTimerRunning ? (
                <div className="my-6">
                  <div className="text-6xl font-black text-teal-400 font-mono mb-2">{timer}초</div>
                  <p className="text-xs text-slate-400">맥박 수를 셉니다</p>
                </div>
              ) : (
                <button
                  onClick={() => startMeasurement(15)}
                  className="px-6 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Play className="w-4 h-4" /> 15초 측정 시작
                </button>
              )}
            </div>
          )}

          {/* SubStep 8: 회복 후 맥박 입력 */}
          {subStep === 8 && (
            <div className="text-center py-4 max-w-xs mx-auto">
              <h3 className="text-lg font-black text-white mb-2">회복 후 15초 맥박 입력</h3>
              <p className="text-xs text-slate-400 mb-4">15초 동안 센 맥박 수를 입력해 주세요.</p>
              <input
                type="number"
                min="5"
                max="60"
                value={recoveryPulse}
                onChange={e => setRecoveryPulse(e.target.value)}
                placeholder="예: 20"
                className="w-full text-center py-3 bg-slate-950 border border-slate-700 rounded-xl text-2xl font-black font-mono text-teal-400 focus:outline-none focus:border-teal-500 mb-2"
              />
              {inputError && <p className="text-[11px] text-amber-400 mb-3">{inputError}</p>}
              <button
                onClick={() => handleInputSubmit(recoveryPulse, 'recovery')}
                className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm rounded-xl"
              >
                결과 분석 보기
              </button>
            </div>
          )}

          {/* SubStep 9: 결과 그래프 및 비의료적 교육 요약 */}
          {subStep === 9 && (
            <div className="py-2 animate-in fade-in duration-300">
              <h3 className="text-lg font-black text-white text-center mb-1">📊 나의 심박수 변화 그래프</h3>
              <p className="text-xs text-slate-400 text-center mb-6">
                (15초 맥박수에 4를 곱한 1분 기준 환산 심박수 추이)
              </p>

              {(() => {
                const r = parseInt(restPulse, 10) * 4 || 72;
                const e = parseInt(exercisePulse, 10) * 4 || 120;
                const rec = parseInt(recoveryPulse, 10) * 4 || 84;
                const maxVal = Math.max(r, e, rec, 160);

                return (
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 mb-6">
                    <div className="flex justify-around items-end h-40 pt-4 px-2 border-b border-slate-800">
                      {/* 안정 시 */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-400">{r}회/분</span>
                        <div
                          className="w-12 bg-cyan-500 rounded-t-xl transition-all duration-700"
                          style={{ height: `${(r / maxVal) * 120}px` }}
                        />
                        <span className="text-[11px] font-bold text-slate-400">안정 시</span>
                      </div>

                      {/* 운동 직후 */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-mono font-bold text-rose-400">{e}회/분</span>
                        <div
                          className="w-12 bg-rose-500 rounded-t-xl transition-all duration-700"
                          style={{ height: `${(e / maxVal) * 120}px` }}
                        />
                        <span className="text-[11px] font-bold text-slate-400">운동 직후</span>
                      </div>

                      {/* 회복 후 */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-xs font-mono font-bold text-teal-400">{rec}회/분</span>
                        <div
                          className="w-12 bg-teal-500 rounded-t-xl transition-all duration-700"
                          style={{ height: `${(rec / maxVal) * 120}px` }}
                        />
                        <span className="text-[11px] font-bold text-slate-400">회복 후</span>
                      </div>
                    </div>

                    <div className="mt-4 p-3.5 bg-slate-900 rounded-xl text-xs space-y-1.5 leading-relaxed">
                      <p className="text-cyan-300 font-bold">
                        💡 심장의 변화 관찰 배움노트
                      </p>
                      <p className="text-slate-300">
                        • 운동을 시작하면 온몸에 산소와 혈액을 보내기 위해 <strong>심장이 더 빠르게 뜁니다</strong>.
                      </p>
                      <p className="text-slate-300">
                        • 운동을 마치고 심호흡하며 쉬어주면 심박수가 <strong>안정 시 수준으로 서서히 회복</strong>됩니다.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        ※ 이 기록은 건강 판정용이 아니며, 신체활동 전후 몸의 반응을 이해하기 위한 학습용 관찰 기록입니다.
                      </p>
                    </div>
                  </div>
                );
              })()}

              <button
                onClick={() => onComplete(`안정 시 ${parseInt(restPulse,10)*4}회 → 운동 직후 ${parseInt(exercisePulse,10)*4}회 → 회복 후 ${parseInt(recoveryPulse,10)*4}회의 심박 변화 관찰 완료!`)}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" /> 탐정단 활동 완료하기
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
