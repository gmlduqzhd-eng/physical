import { useState, useEffect, useRef } from 'react';
import { Flame, Heart } from 'lucide-react';
import { sfxWhoosh, sfxSuccess, sfxPop } from '../../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

type BreathPhase = 'inhale' | 'hold' | 'exhale';

export const CampfireBreath = ({ groupId, enqueueAction }: Props) => {
  const [phase, setPhase] = useState<BreathPhase>('inhale');
  const [phaseTime, setPhaseTime] = useState(4); // 4 seconds per phase
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [flameLevel, setFlameLevel] = useState(60); // 0 to 100%
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const phaseRef = useRef<BreathPhase>('inhale');

  useEffect(() => {
    const breathTimer = setInterval(() => {
      setPhaseTime(prev => {
        if (prev <= 1) {
          // 페이즈 전환
          if (phaseRef.current === 'inhale') {
            phaseRef.current = 'hold';
            setPhase('hold');
            sfxPop();
            return 4;
          } else if (phaseRef.current === 'hold') {
            phaseRef.current = 'exhale';
            setPhase('exhale');
            sfxWhoosh();
            return 4;
          } else {
            // 사이클 1회 완료
            phaseRef.current = 'inhale';
            setPhase('inhale');
            setCyclesCompleted(c => {
              const next = c + 1;
              if (next >= 3) {
                // 3사이클 완료 시 종료
                finishGame(next * 50);
              }
              return next;
            });
            return 4;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(breathTimer);
  }, []);

  const finishGame = (earned: number) => {
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: earned + score },
      timestamp: Date.now(),
    });
  };

  const handleBreatheTap = () => {
    if (finished) return;
    if (phase === 'exhale') {
      sfxWhoosh();
      setFlameLevel(f => Math.min(100, f + 15));
      setScore(s => s + 20);
    } else {
      sfxPop();
      setFlameLevel(f => Math.min(100, f + 5));
    }
  };

  const phaseText = {
    inhale: '들이마시기 (코로 깊게 숨을 들이쉬세요)',
    hold: '숨 참기 (편안하게 가슴을 펴고 멈추세요)',
    exhale: '내쉬기 (입으로 천천히 따뜻한 숨을 불어주세요)',
  };

  return (
    <div className="flex flex-col items-center justify-between p-4 min-h-[580px] w-full max-w-md mx-auto select-none font-sans">
      <div className="w-full flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-orange-400 animate-pulse" />
          <span className="text-white font-bold text-lg">생태 모닥불 호흡 릴랙스</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">주기 {cyclesCompleted}/3</span>
          <span className="text-orange-400 font-mono font-bold text-lg">{score}점</span>
        </div>
      </div>

      <div className="text-center my-2">
        <div className="text-xs text-orange-300/80 font-medium">자연 속 심신 회복 및 호흡 조절</div>
        <div className="text-lg font-black text-white">{phaseText[phase]}</div>
      </div>

      {/* 팽창/수축 호흡 가이드 원형 애니메이션 */}
      <div className="relative w-64 h-64 flex items-center justify-center my-4">
        {/* 외부 펄스 링 */}
        <div
          className={`absolute rounded-full border-4 border-orange-400/40 transition-all duration-1000 ease-in-out ${phase === 'inhale' ? 'w-64 h-64 bg-orange-500/10' : phase === 'hold' ? 'w-64 h-64 bg-amber-500/20' : 'w-28 h-28 bg-transparent'}`}
        />

        {/* 중앙 모닥불 엠블럼 */}
        <div
          onClick={handleBreatheTap}
          className="relative z-10 w-28 h-28 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6)] flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
        >
          <div className="text-4xl animate-bounce">🔥</div>
          <span className="text-xs text-amber-100 font-bold mt-1 font-mono">{phaseTime}초</span>
        </div>
      </div>

      {/* 모닥불 화력 게이지 */}
      <div className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 my-2">
        <div className="flex justify-between text-xs text-slate-300 mb-1">
          <span>모닥불 온기</span>
          <span className="text-orange-400 font-bold">{flameLevel}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-amber-500 to-rose-500 h-full transition-all duration-300"
            style={{ width: `${flameLevel}%` }}
          />
        </div>
      </div>

      {/* 호흡 리듬 터치 버튼 */}
      <button
        onClick={handleBreatheTap}
        disabled={finished}
        className="w-full py-5 bg-gradient-to-r from-orange-600 to-amber-600 hover:brightness-110 active:scale-95 text-white font-black text-lg rounded-2xl shadow-xl border border-orange-400/40 flex items-center justify-center gap-2"
      >
        <Heart className="w-6 h-6 text-rose-300 animate-pulse" />
        <span>호흡 맞추어 온기 불어넣기 (탭)</span>
      </button>

      <p className="text-xs text-slate-400 text-center mt-2">
        💡 원이 커질 때 숨을 들이마시고, 작아질 때 모닥불에 온기를 불어넣으며 탭하세요!
      </p>
    </div>
  );
};
