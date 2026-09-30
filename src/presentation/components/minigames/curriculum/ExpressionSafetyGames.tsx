import React, { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess, sfxPop, sfxTap, hapticTap } from '../../../../application/soundEffects';
import { GameResultOverlay } from './GameResultOverlay';

interface GameProps {
  groupId: string;
  enqueueAction: (a: any) => void;
  onExit?: () => void;
}

/* =========================================================================
   21. 🚨 cpr-compression-110 (골든타임 CPR 100~120 BPM 압박)
   ========================================================================= */
export const CprCompression110: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [compressions, setCompressions] = useState(0);
  const [bpm, setBpm] = useState(110);
  const [heartHealth, setHeartHealth] = useState(20);
  const [finished, setFinished] = useState(false);
  const pressHistory = useRef<number[]>([]);
  const TARGET_COUNT = 30;

  const handleRestart = () => {
    pressHistory.current = [];
    setCompressions(0);
    setBpm(110);
    setHeartHealth(20);
    setFinished(false);
  };

  const handleCompress = () => {
    if (finished) return;
    sfxTap();
    hapticTap();
    const now = Date.now();
    pressHistory.current.push(now);
    if (pressHistory.current.length > 5) pressHistory.current.shift();

    if (pressHistory.current.length >= 2) {
      const diff = now - pressHistory.current[pressHistory.current.length - 2];
      const curBpm = Math.min(180, Math.max(60, Math.round(60000 / diff)));
      setBpm(curBpm);
    }

    const nextCount = compressions + 1;
    setCompressions(nextCount);
    setHeartHealth(h => Math.min(100, h + 3));

    if (nextCount >= TARGET_COUNT) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: 500 },
        timestamp: Date.now()
      });
    }
  };

  const isBpmGood = bpm >= 100 && bpm <= 120;

  return (
    <div className="min-h-[100dvh] bg-red-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-red-300 text-xs font-bold">압박 횟수</span><div className="text-2xl font-black">{compressions} / {TARGET_COUNT}회</div></div>
        <div className="text-right"><span className="text-red-300 text-xs font-bold">압박 템포</span><div className={`text-2xl font-black font-mono ${isBpmGood ? 'text-emerald-400' : 'text-amber-400'}`}>{bpm} BPM</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🚨 골든타임 CPR 100~120 BPM</h1>
      <p className="text-xs text-red-200 mb-6 text-center max-w-xs">
        가슴뼈 아래 1/2 지점을 깍지 낀 손으로 분당 100~120회의 일정한 박자로 압박하세요!
      </p>

      <div className="relative w-64 h-64 rounded-full bg-slate-900 border-4 border-red-700 flex flex-col items-center justify-center mb-6 shadow-2xl overflow-hidden">
        <div style={{ height: `${heartHealth}%` }} className="absolute bottom-0 w-full bg-red-600/30 transition-all duration-200" />

        <div className={`text-6xl mb-2 transition-transform duration-100 ${isBpmGood ? 'scale-110' : 'scale-95'}`}>
          ❤️‍🩹
        </div>
        <span className="text-xs font-bold text-red-200">흉골 하부 1/2</span>
        <span className="text-xs font-mono font-black text-amber-300 mt-1">권장: 100~120 BPM</span>
      </div>

      <button
        onClick={handleCompress}
        className="w-full max-w-xs py-6 bg-gradient-to-r from-red-600 to-rose-600 active:from-red-700 active:to-rose-700 text-white font-black text-2xl rounded-3xl shadow-2xl active:scale-95 transition-transform"
      >
        👐 깍지 끼고 강하게 압박!
      </button>

      {finished && (
        <GameResultOverlay
          title="🎉 골든타임 생명 구조 성공!"
          subtitle="가슴 압박 30회를 100~120 BPM 템포로 완수하여 소중한 생명을 살렸습니다."
          score={500}
          badge="골든타임 CPR 구조대원"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   22. ⚡ aed-defibrillator-pad (자동심장충격기 AED 패드 부착)
   ========================================================================= */
export const AedDefibrillatorPad: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [pad1Attached, setPad1Attached] = useState(false);
  const [pad2Attached, setPad2Attached] = useState(false);
  const [shockReady, setShockReady] = useState(false);
  const [finished, setFinished] = useState(false);

  const handleRestart = () => {
    setPad1Attached(false);
    setPad2Attached(false);
    setShockReady(false);
    setFinished(false);
  };

  useEffect(() => {
    if (pad1Attached && pad2Attached && !shockReady) {
      sfxCoin();
      const timer = setTimeout(() => setShockReady(true), 800);
      return () => clearTimeout(timer);
    }
  }, [pad1Attached, pad2Attached, shockReady]);

  const handleShock = () => {
    if (!shockReady || finished) return;
    sfxSuccess();
    hapticTap();
    setFinished(true);
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: 500 },
      timestamp: Date.now()
    });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">⚡ 자동심장충격기(AED) 실전</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        패드 1은 오른쪽 쇄골 아래, 패드 2는 왼쪽 젖꼭지 아래에 정확히 부착하세요!
      </p>

      <div className="relative w-64 h-72 bg-slate-900 border-4 border-amber-600 rounded-3xl p-4 flex flex-col items-center justify-between mb-6 shadow-2xl">
        <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 -mt-2" />

        <button
          onClick={() => { setPad1Attached(true); sfxTap(); }}
          className={`absolute top-16 left-8 w-20 h-16 rounded-2xl border-2 font-bold text-xs flex flex-col items-center justify-center transition-all ${
            pad1Attached ? 'bg-amber-400 text-amber-950 border-white shadow-lg' : 'bg-slate-800/80 border-dashed border-amber-400 text-amber-300 animate-pulse'
          }`}
        >
          {pad1Attached ? '✅ 패드 1 부착' : '패드 1 (우측 쇄골)'}
        </button>

        <button
          onClick={() => { setPad2Attached(true); sfxTap(); }}
          className={`absolute bottom-16 right-8 w-20 h-16 rounded-2xl border-2 font-bold text-xs flex flex-col items-center justify-center transition-all ${
            pad2Attached ? 'bg-amber-400 text-amber-950 border-white shadow-lg' : 'bg-slate-800/80 border-dashed border-amber-400 text-amber-300 animate-pulse'
          }`}
        >
          {pad2Attached ? '✅ 패드 2 부착' : '패드 2 (좌측 옆구리)'}
        </button>
      </div>

      {shockReady ? (
        <button
          onClick={handleShock}
          className="w-full max-w-xs py-5 bg-gradient-to-r from-amber-500 to-red-500 text-white font-black text-xl rounded-2xl shadow-2xl active:scale-95 transition-transform animate-bounce"
        >
          ⚡ "모두 물러나세요!" 제세동 버튼 누르기!
        </button>
      ) : (
        <div className="text-xs text-amber-400 font-bold">
          {(!pad1Attached || !pad2Attached) ? '두 개의 전극 패드를 모두 터치하여 부착하세요!' : '심장 리듬 분석 중... 잠시 대기'}
        </div>
      )}

      {finished && (
        <GameResultOverlay
          title="⚡ 제세동 정상 충격 완료!"
          subtitle="전극 패드 2곳의 정확한 위치 부착 및 안전 수칙을 완벽히 이행했습니다."
          score={500}
          badge="AED 심장 지킴이"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   23. 🛟 water-rescue-throw (물놀이 안전 익수자 구명환 투척)
   ========================================================================= */
export const WaterRescueThrow: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [distance, setDistance] = useState(50);
  const [isThrowing, setIsThrowing] = useState(false);
  const [finished, setFinished] = useState(false);
  const TARGET_LOC = 70;

  const handleRestart = () => {
    setIsThrowing(false);
    setDistance(50);
    setFinished(false);
  };

  const handleThrow = () => {
    if (isThrowing || finished) return;
    setIsThrowing(true);
    sfxTap();
    hapticTap();

    const isAccurate = Math.abs(distance - TARGET_LOC) <= 8;

    setTimeout(() => {
      if (isAccurate) {
        sfxSuccess();
      } else {
        sfxPop();
      }
      setFinished(true);
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: isAccurate ? 500 : 250 },
        timestamp: Date.now()
      });
    }, 900);
  };

  return (
    <div className="min-h-[100dvh] bg-sky-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🛟 익수자 구명환 투척</h1>
      <p className="text-xs text-sky-200 mb-6 text-center max-w-xs">
        직접 뛰어들지 말고, 물에 빠진 친구의 바로 앞 위치로 튜브를 던지세요!
      </p>

      <div className="relative w-72 h-64 bg-blue-900 border-4 border-sky-600 rounded-3xl p-4 flex flex-col justify-between mb-6 overflow-hidden shadow-2xl">
        <span className="text-[10px] text-sky-300">물결 유속 🌊</span>

        <div style={{ left: `${TARGET_LOC}%` }} className="absolute top-1/2 -translate-y-1/2 text-3xl animate-bounce">
          🏊 (도와줘요!)
        </div>

        <div
          style={{ left: isThrowing ? `${distance}%` : '10%' }}
          className="absolute bottom-6 text-4xl transition-all duration-700"
        >
          🛟
        </div>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-2 mb-6">
        <div className="flex justify-between text-xs font-bold text-sky-300">
          <span>가까이 던지기</span>
          <span>익수자 조준</span>
          <span>멀리 던지기</span>
        </div>
        <input
          type="range"
          min="20"
          max="95"
          value={distance}
          onChange={e => setDistance(Number(e.target.value))}
          disabled={isThrowing}
          className="w-full accent-orange-500"
        />
      </div>

      <button
        onClick={handleThrow}
        disabled={isThrowing}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform disabled:opacity-50"
      >
        🛟 구명환 투척!
      </button>

      {finished && (
        <GameResultOverlay
          title={Math.abs(distance - TARGET_LOC) <= 8 ? "🛟 구조 튜브 투척 성공!" : "🛟 투척 거리 빗나감 (재도전)"}
          subtitle={
            Math.abs(distance - TARGET_LOC) <= 8
              ? "물놀이 익수 사고 시 직접 뛰어들지 않고 구명환을 활용하는 안전 원칙을 완벽히 지켰습니다."
              : "구명환이 익수자의 손에 닿지 않았습니다. 거리를 침착하게 조절해 다시 던져보세요."
          }
          score={Math.abs(distance - TARGET_LOC) <= 8 ? 500 : 250}
          badge="수상 안전 라이프가드"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   24. ☀️ heatwave-pm25-shield (폭염·미세먼지 체육 안전 디시전)
   ========================================================================= */
export const HeatwavePm25Shield: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [scenarioIdx, setScenarioIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const scoreRef = useRef(0);

  const SCENARIOS = [
    {
      condition: '🚨 초미세먼지 98㎍/㎥ [매우 나쁨 경보]',
      correct: '실내 체육관 공기청정기 가동 수업',
      choices: ['운동장 전원 축구 시합', '실내 체육관 공기청정기 가동 수업', '선크림 바르고 뜀뛰기', '창문 활짝 열고 배구']
    },
    {
      condition: '🔥 낮 최고기온 36℃ [폭염 경보 발령]',
      correct: '충분한 수분 섭취와 그늘 휴식 및 강당 이동',
      choices: ['체력 단련 30분 전력달리기', '충분한 수분 섭취와 그늘 휴식 및 강당 이동', '땀복 입고 운동장 줄넘기', '음료수 안 마시고 버티기']
    },
    {
      condition: '❄️ 체감온도 -18℃ [한파 및 강풍 주의보]',
      correct: '실내 준비운동 충분히 후 실내 스트레칭',
      choices: ['맨손으로 철봉 오래 매달리기', '실내 준비운동 충분히 후 실내 스트레칭', '반바지 입고 제자리뛰기', '얼음 위에서 썰매 달리기']
    }
  ];

  const handleRestart = () => {
    scoreRef.current = 0;
    setScenarioIdx(0);
    setScore(0);
    setFinished(false);
  };

  const current = SCENARIOS[scenarioIdx];

  const handleChoice = (choice: string) => {
    if (finished) return;
    if (choice === current.correct) {
      sfxCoin();
      hapticTap();
      const next = score + 1;
      setScore(next);
      scoreRef.current += 170;
    } else {
      sfxPop();
    }

    if (scenarioIdx + 1 >= SCENARIOS.length) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: 500 },
        timestamp: Date.now()
      });
    } else {
      setScenarioIdx(s => s + 1);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-amber-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">☀️ 폭염·미세먼지 체육 안전</h1>
      <p className="text-xs text-amber-200 mb-6 text-center max-w-xs">
        가상 기상 특보를 보고 건강을 지키는 올바른 체육 활동 대처법을 선택하세요!
      </p>

      <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500 rounded-3xl p-5 mb-6 text-center shadow-2xl">
        <span className="text-xs font-bold text-amber-400">기상 경보 상황</span>
        <div className="text-lg font-black text-white mt-1 mb-2">{current.condition}</div>
        <p className="text-xs text-slate-300">이 상황에서 가장 바람직한 체육 수업 방법은?</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-2.5 mb-6">
        {current.choices.map((c, i) => (
          <button
            key={i}
            onClick={() => handleChoice(c)}
            className="w-full py-4 px-4 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-2xl font-black text-xs text-left transition-all border border-slate-700"
          >
            {i + 1}. {c}
          </button>
        ))}
      </div>

      {finished && (
        <GameResultOverlay
          title="☀️ 환경 안전 디시전 완벽 통과!"
          subtitle="폭염, 한파, 미세먼지 등 기후 변화에 맞는 현명한 체육 대처법을 선택했습니다."
          score={500}
          badge="환경 기상 안전 박사"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   25. 🩹 rice-treatment-firstaid (발목 염좌 RICE 4단계 응급처치)
   ========================================================================= */
export const RiceTreatmentFirstaid: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);

  const RICE_STEPS = [
    { key: 'R', name: 'Rest (안식/휴식)', desc: '다친 발목을 무리하게 걷지 않고 편안히 안정시키기', icon: '🛑' },
    { key: 'I', name: 'Ice (얼음 찜질)', desc: '붓기와 통증을 줄이기 위해 수건에 싼 얼음팩 대기', icon: '🧊' },
    { key: 'C', name: 'Compression (압박)', desc: '부종을 방지하기 위해 탄력 붕대로 적절히 감기', icon: '🩹' },
    { key: 'E', name: 'Elevation (올림)', desc: '심장보다 높게 다리를 올려 피가 몰리는 것 방지하기', icon: '⬆️' },
  ];

  const handleRestart = () => {
    setStep(0);
    setFinished(false);
  };

  const current = RICE_STEPS[step];

  const handleStepComplete = () => {
    if (finished) return;
    sfxCoin();
    hapticTap();
    if (step + 1 >= RICE_STEPS.length) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: 500 },
        timestamp: Date.now()
      });
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-teal-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-teal-300 text-xs font-bold">R.I.C.E 순서</span><div className="text-2xl font-black">{step + 1} / 4 단계</div></div>
        <div className="text-right"><span className="text-teal-300 text-xs font-bold">적용 단계</span><div className="text-2xl font-black text-amber-400">{current.key}</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🩹 발목 염좌 RICE 응급처치</h1>
      <p className="text-xs text-teal-200 mb-6 text-center max-w-xs">
        체육 수업 중 발목을 삐었을 때 R-I-C-E 원칙에 따라 순서대로 처치하세요!
      </p>

      <div className="w-full max-w-sm bg-slate-900 border-2 border-teal-500 rounded-3xl p-6 flex flex-col items-center text-center mb-6 shadow-2xl">
        <div className="text-6xl mb-3 animate-bounce">{current.icon}</div>
        <h2 className="text-xl font-black text-teal-300 mb-2">{current.name}</h2>
        <p className="text-xs text-slate-300">{current.desc}</p>
      </div>

      <button
        onClick={handleStepComplete}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
      >
        ✅ {current.key} 처치 실시하기!
      </button>

      {finished && (
        <GameResultOverlay
          title="🩹 R.I.C.E 처치 완성!"
          subtitle="Rest-Ice-Compression-Elevation 4단계 응급처치 원칙을 완벽히 마스터했습니다."
          score={500}
          badge="응급처치 안전 요원"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   26. 🕺 step-mania-4lane (4레인 댄스 스텝 콤보 시퀀서)
   ========================================================================= */
export const StepMania4Lane: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [combo, setCombo] = useState(0);
  const [activeLane, setActiveLane] = useState<number>(0);
  const [finished, setFinished] = useState(false);
  const TARGET_COMBO = 12;

  const LANES = ['◀ 좌측', '▲ 전방', '▼ 후방', '▶ 우측'];

  const nextStep = () => {
    setActiveLane(Math.floor(Math.random() * 4));
  };

  const handleRestart = () => {
    setCombo(0);
    setFinished(false);
    nextStep();
  };

  useEffect(() => {
    nextStep();
  }, []);

  const handleStepTap = (laneIdx: number) => {
    if (finished) return;
    if (laneIdx === activeLane) {
      sfxCoin();
      hapticTap();
      const next = combo + 1;
      setCombo(next);

      if (next >= TARGET_COMBO) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
      } else {
        nextStep();
      }
    } else {
      sfxPop();
      setCombo(0);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-fuchsia-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <div className="flex justify-between w-full max-w-sm mb-4">
        <div><span className="text-pink-300 text-xs font-bold">리듬 콤보</span><div className="text-3xl font-black text-amber-400">{combo} COMBO</div></div>
        <div className="text-right"><span className="text-pink-300 text-xs font-bold">목표</span><div className="text-xl font-black">{TARGET_COMBO} 콤보</div></div>
      </div>

      <h1 className="text-2xl font-black mb-1">🕺 4레인 댄스 스텝 시퀀서</h1>
      <p className="text-xs text-pink-200 mb-6 text-center max-w-xs">
        빛나는 방향 레인의 스텝 발판을 박자에 맞추어 콤보로 밟으세요!
      </p>

      <div className="grid grid-cols-4 gap-2 w-full max-w-sm h-64 bg-slate-900 border-4 border-fuchsia-700 rounded-3xl p-3 mb-6 shadow-2xl">
        {LANES.map((label, idx) => (
          <button
            key={idx}
            onClick={() => handleStepTap(idx)}
            className={`rounded-2xl flex flex-col items-center justify-end pb-4 font-black transition-all active:scale-95 ${
              activeLane === idx
                ? 'bg-gradient-to-t from-fuchsia-500 to-pink-500 text-white shadow-[0_0_20px_rgba(236,72,153,0.8)] animate-pulse'
                : 'bg-slate-800 text-slate-500'
            }`}
          >
            <span className="text-2xl mb-2">{idx === 0 ? '⬅️' : idx === 1 ? '⬆️' : idx === 2 ? '⬇️' : '➡️'}</span>
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </div>

      {finished && (
        <GameResultOverlay
          title="🔥 12 COMBO 피버 클리어!"
          subtitle="박자에 맞는 완벽한 방향 전환과 스텝 협응력을 보여주었습니다."
          score={500}
          badge="리듬 스텝 댄서"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   27. 👥 shadow-pose-sculpture (신체 실루엣 섀도우 조형 매칭)
   ========================================================================= */
export const ShadowPoseSculpture: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [armAngle, setArmAngle] = useState(45);
  const [legAngle, setLegAngle] = useState(60);
  const [finished, setFinished] = useState(false);

  const isMatched = Math.abs(armAngle - 90) <= 12 && Math.abs(legAngle - 40) <= 12;

  const handleRestart = () => {
    setArmAngle(45);
    setLegAngle(60);
    setFinished(false);
  };

  const handleMatch = () => {
    if (!isMatched || finished) return;
    setFinished(true);
    sfxSuccess();
    enqueueAction({
      id: Math.random().toString(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: 500 },
      timestamp: Date.now()
    });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">👥 신체 실루엣 섀도우 조형</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        배경의 황금빛 무용수 실루엣과 동일한 신체 선이 되도록 관절 각도를 맞추세요!
      </p>

      <div className="relative w-64 h-64 bg-slate-900 border-4 border-amber-500/60 rounded-3xl flex items-center justify-center mb-6 shadow-2xl overflow-hidden">
        <div className="text-8xl opacity-30 text-amber-300 pointer-events-none">
          🤸
        </div>

        <svg viewBox="0 0 100 100" className="absolute w-44 h-44">
          <circle cx="50" cy="25" r="9" fill="#38BDF8" />
          <line x1="50" y1="34" x2="50" y2="65" stroke="#38BDF8" strokeWidth="8" strokeLinecap="round" />
          <line x1="50" y1="42" x2={50 + Math.cos(armAngle * Math.PI / 180) * 35} y2={42 - Math.sin(armAngle * Math.PI / 180) * 35} stroke="#F43F5E" strokeWidth="7" strokeLinecap="round" />
          <line x1="50" y1="65" x2={50 + Math.cos(legAngle * Math.PI / 180) * 35} y2={65 + Math.sin(legAngle * Math.PI / 180) * 35} stroke="#34D399" strokeWidth="7" strokeLinecap="round" />
        </svg>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3 mb-6">
        <div>
          <span className="text-xs font-bold text-rose-400">팔 선 각도 조절</span>
          <input type="range" min="0" max="180" value={armAngle} onChange={e => setArmAngle(Number(e.target.value))} className="w-full accent-rose-500" />
        </div>
        <div>
          <span className="text-xs font-bold text-emerald-400">다리 선 각도 조절</span>
          <input type="range" min="10" max="90" value={legAngle} onChange={e => setLegAngle(Number(e.target.value))} className="w-full accent-emerald-500" />
        </div>
      </div>

      <button
        onClick={handleMatch}
        disabled={!isMatched}
        className={`w-full max-w-xs py-5 rounded-2xl font-black text-xl transition-all ${
          isMatched ? 'bg-amber-400 text-amber-950 shadow-2xl animate-bounce' : 'bg-slate-800 text-slate-500'
        }`}
      >
        {isMatched ? '✨ 실루엣 95% 일치! 완성!' : '실루엣과 일치하도록 맞추세요'}
      </button>

      {finished && (
        <GameResultOverlay
          title="🎭 조형 예술 포즈 완성!"
          subtitle="공간과 신체 선의 심미적 조화를 이루어 예술적 포즈를 완성했습니다."
          score={500}
          badge="신체 조형 예술가"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   28. 🌊 ribbon-wave-stream (리듬체조 리본 나선형 궤적)
   ========================================================================= */
export const RibbonWaveStream: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [trailCount, setTrailCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const isTracing = useRef(false);
  const TARGET_TRAIL = 20;

  const handleRestart = () => {
    setTrailCount(0);
    setFinished(false);
  };

  const handlePointerMove = () => {
    if (!isTracing.current || finished) return;
    setTrailCount(c => {
      const next = c + 1;
      if (next >= TARGET_TRAIL) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
      }
      return next;
    });
  };

  return (
    <div className="min-h-[100dvh] bg-purple-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🌊 리듬체조 리본 나선 궤적</h1>
      <p className="text-xs text-purple-200 mb-6 text-center max-w-xs">
        손가락을 멈추지 않고 연속으로 둥글게 나선형을 그리며 리본 파동을 만드세요!
      </p>

      <div
        onPointerDown={() => { isTracing.current = true; sfxTap(); }}
        onPointerUp={() => { isTracing.current = false; }}
        onPointerMove={handlePointerMove}
        className="w-72 h-72 rounded-3xl bg-purple-900/60 border-4 border-dashed border-pink-400 flex flex-col items-center justify-center touch-none mb-6 shadow-2xl cursor-pointer"
      >
        <span className="text-6xl mb-2 animate-spin-slow">🎀</span>
        <span className="text-xs font-bold text-pink-300">손가락으로 둥글게 원을 계속 회전하세요!</span>
        <span className="text-2xl font-black text-amber-300 font-mono mt-2">{trailCount} / {TARGET_TRAIL} 파동</span>
      </div>

      {finished && (
        <GameResultOverlay
          title="🎀 우아한 리본 체조 완성!"
          subtitle="도구와 신체의 흐름을 끊김 없이 연결하여 나선 궤적을 연출했습니다."
          score={500}
          badge="리듬체조 리본 요정"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   29. 🎭 emotion-freeze-mime (희로애락 감정 마임 정지 포즈)
   ========================================================================= */
export const EmotionFreezeMime: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [themeIdx, setThemeIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  const THEMES = [
    { name: '기쁨(喜)', emoji: '😄', desc: '온몸으로 환호하며 두 팔을 하늘로 벌리기!' },
    { name: '놀람(驚)', emoji: '😲', desc: '두 눈을 크게 뜨고 입을 틀어막는 정지 포즈!' },
    { name: '슬픔(哀)', emoji: '😢', desc: '고개를 푹 숙이고 어깨를 움츠리는 쓸쓸한 포즈!' },
    { name: '당당함(勇)', emoji: '🦁', desc: '가슴을 내밀고 허리에 두 손을 얹은 영웅 포즈!' },
  ];

  const handleRestart = () => {
    setThemeIdx(0);
    setFinished(false);
  };

  const current = THEMES[themeIdx];

  const handlePerform = () => {
    if (finished) return;
    sfxCoin();
    hapticTap();

    if (themeIdx + 1 >= THEMES.length) {
      setFinished(true);
      sfxSuccess();
      enqueueAction({
        id: Math.random().toString(),
        type: 'INCREMENT_SCORE',
        payload: { id: groupId, amount: 500 },
        timestamp: Date.now()
      });
    } else {
      setThemeIdx(t => t + 1);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-indigo-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🎭 희로애락 감정 마임</h1>
      <p className="text-xs text-indigo-200 mb-6 text-center max-w-xs">
        제시된 감정 테마를 신체 전체로 표현하고 3초간 정지 포즈를 취하세요!
      </p>

      <div className="w-full max-w-sm bg-slate-900 border-4 border-indigo-600 rounded-3xl p-6 flex flex-col items-center text-center mb-6 shadow-2xl">
        <div className="text-7xl mb-3 animate-bounce">{current.emoji}</div>
        <h2 className="text-2xl font-black text-amber-300 mb-1">{current.name}</h2>
        <p className="text-xs text-slate-300">{current.desc}</p>
      </div>

      <button
        onClick={handlePerform}
        className="w-full max-w-xs py-5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-xl rounded-2xl shadow-xl active:scale-95 transition-transform"
      >
        🎭 신체 감정 표현 완료! ({themeIdx + 1} / 4)
      </button>

      {finished && (
        <GameResultOverlay
          title="🎭 감정 신체 극장 완성!"
          subtitle="희로애락의 감정을 몸짓과 정지 포즈로 극대화하여 풍부하게 표현했습니다."
          score={500}
          badge="신체 마임 예술가"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};

/* =========================================================================
   30. 🪞 partner-mirror-duet (거울 짝 듀엣 무용 타이밍 매칭)
   ========================================================================= */
export const PartnerMirrorDuet: React.FC<GameProps> = ({ groupId, enqueueAction, onExit }) => {
  const [partnerMotion, setPartnerMotion] = useState<'wave' | 'spin' | 'bow'>('wave');
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const MOTIONS = [
    { id: 'wave', name: '물결 파도 동작', emoji: '🌊' },
    { id: 'spin', name: '우아한 한 바퀴 턴', emoji: '💫' },
    { id: 'bow', name: '정중한 인사 피날레', emoji: '🙇' },
  ];

  const nextMotion = () => {
    const list: ('wave' | 'spin' | 'bow')[] = ['wave', 'spin', 'bow'];
    setPartnerMotion(list[Math.floor(Math.random() * list.length)]);
  };

  const handleRestart = () => {
    setScore(0);
    setFinished(false);
    nextMotion();
  };

  useEffect(() => {
    nextMotion();
  }, []);

  const handleMatch = (selected: 'wave' | 'spin' | 'bow') => {
    if (finished) return;
    if (selected === partnerMotion) {
      sfxCoin();
      hapticTap();
      const next = score + 1;
      setScore(next);
      if (next >= 4) {
        setFinished(true);
        sfxSuccess();
        enqueueAction({
          id: Math.random().toString(),
          type: 'INCREMENT_SCORE',
          payload: { id: groupId, amount: 500 },
          timestamp: Date.now()
        });
      } else {
        nextMotion();
      }
    } else {
      sfxPop();
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col items-center justify-center p-6 pt-16 relative select-none">
      <h1 className="text-2xl font-black mb-1">🪞 거울 짝 듀엣 무용</h1>
      <p className="text-xs text-slate-400 mb-6 text-center max-w-xs">
        거울 속 파트너 무용수의 동작과 100% 호흡을 맞추어 동일한 동작을 선택하세요!
      </p>

      <div className="w-full max-w-sm bg-slate-900 border-4 border-cyan-500 rounded-3xl p-6 flex flex-col items-center text-center mb-6 shadow-2xl">
        <span className="text-xs font-bold text-cyan-300 mb-2">거울 속 파트너 무용수</span>
        <div className="text-6xl mb-2 animate-pulse">
          {partnerMotion === 'wave' ? '🌊' : partnerMotion === 'spin' ? '💫' : '🙇'}
        </div>
        <span className="text-sm font-black text-white">
          {partnerMotion === 'wave' ? '물결 파도 댄스!' : partnerMotion === 'spin' ? '발레리나 스핀!' : '엔딩 인사 포즈!'}
        </span>
      </div>

      <div className="flex gap-2 w-full max-w-sm">
        {MOTIONS.map(m => (
          <button
            key={m.id}
            onClick={() => handleMatch(m.id as any)}
            className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 active:scale-95 rounded-2xl font-black text-xs flex flex-col items-center gap-1 transition-all border border-slate-700"
          >
            <span className="text-2xl">{m.emoji}</span>
            <span>{m.name}</span>
          </button>
        ))}
      </div>

      {finished && (
        <GameResultOverlay
          title="✨ 환상의 듀엣 무용 성공!"
          subtitle="파트너와 호흡을 맞추어 일체감 있는 무용 동작을 조화롭게 이끌어냈습니다."
          score={500}
          badge="듀엣 무용 호흡왕"
          onRestart={handleRestart}
          onExit={onExit}
        />
      )}
    </div>
  );
};
