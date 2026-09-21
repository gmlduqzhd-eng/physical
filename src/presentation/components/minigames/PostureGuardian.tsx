import { useState, useEffect } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Bot, Wrench, CheckCircle2, Users, UserCheck } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

const POSTURE_MISSIONS = [
  {
    id: 'chair',
    part: '척추 서보 모터',
    title: '의자에 바르게 앉기',
    emoji: '🪑',
    desc: '엉덩이를 의자 깊숙이 넣고 허리를 등받이에 곧게 세우며 발바닥은 바닥에 완전히 붙입니다.',
    checkPoints: ['허리가 등받이에 곧게 닿았나요?', '턱을 가볍게 당겼나요?', '양 발바닥이 바닥에 평평하게 닿았나요?'],
  },
  {
    id: 'device',
    part: '목 관절 센서',
    title: '스마트기기 바르게 보기',
    emoji: '📱',
    desc: '고개를 푹 숙이지 않고 스마트폰을 눈높이까지 들어 올려 목의 부담을 줄입니다.',
    checkPoints: ['화면이 눈높이에 가깝게 들려 있나요?', '목 뒤가 꺾이지 않고 편안한가요?'],
  },
  {
    id: 'lifting',
    part: '무릎 유압 실린더',
    title: '바닥의 물건 안전하게 들기',
    emoji: '📦',
    desc: '허리를 구부리지 않고 무릎을 굽혀 앉은 뒤, 물건을 몸에 바짝 붙이고 다리 힘으로 일어섭니다.',
    checkPoints: ['허리 대신 무릎을 굽혔나요?', '물건을 몸통에 가까이 붙였나요?'],
  },
  {
    id: 'backpack',
    part: '양 어깨 균형 밸브',
    title: '책가방 바르게 메기',
    emoji: '🎒',
    desc: '한쪽 어깨로만 메지 않고 양쪽 어깨 끈을 균형 있게 메어 가방이 등에 밀착되도록 합니다.',
    checkPoints: ['양쪽 어깨 끈을 모두 멨나요?', '가방이 엉덩이 아래로 너무 처지지 않나요?'],
  },
  {
    id: 'stretch',
    part: '전신 가동 코어',
    title: '오래 앉은 뒤 온몸 펴기',
    emoji: '🙆‍♂️',
    desc: '자리에서 일어나 두 팔을 머리 위로 쭉 뻗고 가슴을 활짝 열어주며 기지개를 켭니다.',
    checkPoints: ['두 팔을 하늘 높이 시원하게 뻗었나요?', '가슴과 등을 활짝 젖혀 심호흡했나요?'],
  },
];

export const PostureGuardian = () => {
  const [mode, setMode] = useState<'self' | 'peer'>('self');
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [holdTimer, setHoldTimer] = useState<number>(10);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [repairedParts, setRepairedParts] = useState<Set<string>>(new Set());

  const current = POSTURE_MISSIONS[currentIdx];

  useEffect(() => {
    if (!isHolding) return;
    const interval = setInterval(() => {
      setHoldTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setIsHolding(false);
          sfxCoin();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isHolding]);

  const startHold = () => {
    setHoldTimer(10);
    setIsHolding(true);
  };

  const handleConfirmRepair = (onComplete: (summary?: string) => void) => {
    sfxSuccess();
    const nextSet = new Set(repairedParts);
    nextSet.add(current.id);
    setRepairedParts(nextSet);

    if (currentIdx + 1 < POSTURE_MISSIONS.length) {
      setCurrentIdx(i => i + 1);
      setHoldTimer(10);
      setIsHolding(false);
    } else {
      onComplete(`자세 수호 로봇 5대 부품(척추, 목, 무릎, 어깨, 코어)을 바른 자세로 100% 수리 완료!`);
    }
  };

  return (
    <PhysicalActivityLayout
      title="자세 수호 로봇"
      emoji="🤖"
      domain="운동"
      achievementCode="[4체01-04]"
      achievementTitle="건강한 생활 습관과 안전한 신체 자세 형성"
      activityType="개인"
      expectedMinutes={4}
      equipment={['의자 또는 책가방/가벼운 물건']}
      instructions={[
        '수리가 필요한 로봇의 5가지 신체 부품 미션을 확인합니다.',
        '화면의 바른 자세 설명을 읽고 실제 신체로 10초간 바른 자세를 유지합니다.',
        '카메라 없이 자기 확인 또는 친구(짝) 확인으로 서로의 자세를 점검합니다.',
        '5가지 부품을 모두 고쳐 튼튼한 수호 로봇을 완성해 보세요!',
      ]}
      colorTheme="indigo"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          {/* 모드 선택 (자기 확인 / 짝 확인) */}
          <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>수리 진행도: <strong className="text-cyan-400">{repairedParts.size}/5</strong></span>
            </div>

            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setMode('self')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  mode === 'self' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 inline mr-1" />자기 확인
              </button>
              <button
                type="button"
                onClick={() => setMode('peer')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  mode === 'peer' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5 inline mr-1" />짝 확인
              </button>
            </div>
          </div>

          {/* 현재 수리 부품 카드 */}
          <div className="text-center mb-6">
            <span className="text-5xl block mb-2">{current.emoji}</span>
            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-indigo-950 text-blue-200 border border-indigo-800 inline-block mb-2">
              🛠️ 수리 부품: {current.part} ({currentIdx + 1}/5)
            </span>
            <h3 className="text-xl font-black text-white mb-2">{current.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3.5 rounded-2xl border border-slate-800 max-w-md mx-auto">
              {current.desc}
            </p>
          </div>

          {/* 자세 점검 체크포인트 안내 */}
          <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 mb-6">
            <span className="text-[11px] font-bold text-cyan-400 block mb-2">
              {mode === 'self' ? '🧐 내가 스스로 체크할 포인트:' : '👥 짝꿍이 눈으로 확인해 줄 포인트:'}
            </span>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {current.checkPoints.map((pt, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-cyan-400">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 10초 자세 유지 타이머 */}
          <div className="text-center mb-4">
            {isHolding ? (
              <div className="py-2">
                <div className="text-5xl font-black text-cyan-400 font-mono mb-1">{holdTimer}초</div>
                <p className="text-xs text-cyan-300 animate-pulse font-bold">
                  바른 자세를 유지하며 몸의 균형을 느껴보세요!
                </p>
              </div>
            ) : holdTimer === 0 ? (
              <div className="py-2 animate-in zoom-in-95">
                <div className="text-emerald-400 font-black text-lg mb-2">
                  ✅ 10초 바른 자세 유지 완료!
                </div>
                <button
                  onClick={() => handleConfirmRepair(onComplete)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {mode === 'self' ? '바르게 실천했습니다 (부품 수리)' : '짝꿍이 확인해 주었습니다 (부품 수리)'}
                </button>
              </div>
            ) : (
              <button
                onClick={startHold}
                className="w-full py-4 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white rounded-xl font-black text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Wrench className="w-4 h-4" /> 10초 바른 자세 유지 시작하기
              </button>
            )}
          </div>
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
