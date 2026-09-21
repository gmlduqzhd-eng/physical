import { useState, useEffect } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Play, CheckCircle2 } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

const EMOTIONS = [
  { key: 'joy', name: '기쁨', emoji: '😄', desc: '세상을 다 가진 듯 벅차오르는 행복' },
  { key: 'nervous', name: '긴장', emoji: '😬', desc: '중요한 순간을 앞두고 두근거리는 떨림' },
  { key: 'surprise', name: '놀람', emoji: '😲', desc: '예상치 못한 순간을 마주한 짜릿함' },
  { key: 'confidence', name: '자신감', emoji: '🦁', desc: '어떤 도전도 해낼 수 있는 당당한 용기' },
  { key: 'calm', name: '차분함', emoji: '🍃', desc: '잔잔한 호수처럼 평화롭고 고요한 숨결' },
];

export const EmotionThermometer = () => {
  // 1: 감정 & 온도 선택, 2: 15초 신체 표현 타이머, 3: 짝 감상 선택, 4: 감상 공유 리포트
  const [phase, setPhase] = useState<number>(1);
  const [selectedEmotion, setSelectedEmotion] = useState<typeof EMOTIONS[0]>(EMOTIONS[0]);
  const [temperature, setTemperature] = useState<number>(3); // 1~5 단계

  const [peerGuessEmotion, setPeerGuessEmotion] = useState<string>('');
  const [peerGuessTemp, setPeerGuessTemp] = useState<number>(3);

  const [expressTimer, setExpressTimer] = useState<number>(15);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setExpressTimer(t => {
        if (t <= 1) {
          clearInterval(interval);
          setIsTimerRunning(false);
          setPhase(3);
          sfxSuccess();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleStartExpress = () => {
    setExpressTimer(15);
    setIsTimerRunning(true);
    sfxCoin();
  };

  return (
    <PhysicalActivityLayout
      title="감정 온도계"
      emoji="🌡️"
      domain="표현"
      achievementCode="[4체03-04]"
      achievementTitle="느낌과 생각을 움직임으로 창의적으로 표현하고 서로의 심미성 감상"
      activityType="짝"
      expectedMinutes={4}
      instructions={[
        '오늘 몸으로 표현해보고 싶은 감정과 감정의 온도(강도 1~5단계)를 고릅니다.',
        '15초 동안 카메라나 사진 없이 온몸의 움직임으로 그 감정을 펼쳐보입니다.',
        '짝꿍은 친구의 몸짓을 바라보며 어떤 감정과 온도가 느껴졌는지 선택합니다.',
        '서로의 생각이 같거나 달라도 좋습니다! 느낌의 다양성을 나누어 보세요.',
      ]}
      colorTheme="purple"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          {/* Phase 1: 표현자가 감정과 온도(강도) 선택 */}
          {phase === 1 && (
            <div className="py-2">
              <h3 className="text-lg font-black text-white text-center mb-1">
                1단계: 표현할 감정과 온도를 정하세요
              </h3>
              <p className="text-xs text-slate-400 text-center mb-5">
                (짝꿍에게는 비밀로 하고 나만의 감정을 설정해 보세요!)
              </p>

              {/* 감정 카드 선택 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {EMOTIONS.map(emo => (
                  <button
                    key={emo.key}
                    onClick={() => setSelectedEmotion(emo)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedEmotion.key === emo.key
                        ? 'bg-purple-950 border-purple-500 text-purple-200 scale-102 shadow-lg shadow-purple-500/20'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-3xl block mb-1">{emo.emoji}</span>
                    <span className="font-black text-xs block text-white">{emo.name}</span>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{emo.desc}</span>
                  </button>
                ))}
              </div>

              {/* 감정 온도계 (1단계~5단계) */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-purple-300">
                    🌡️ 감정의 온도 (표현 강도)
                  </span>
                  <span className="text-sm font-black text-white font-mono">{temperature}단계</span>
                </div>

                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setTemperature(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        temperature === lvl
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {lvl}단계
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 px-1">
                  <span>은은하고 잔잔한 움직임</span>
                  <span>온몸으로 폭발하는 움직임</span>
                </div>
              </div>

              <button
                onClick={() => setPhase(2)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-500/20"
              >
                감정 설정 완료! 15초 신체 표현 시작
              </button>
            </div>
          )}

          {/* Phase 2: 15초 동안 실제 몸 전체로 감정 표현 */}
          {phase === 2 && (
            <div className="py-6 text-center">
              <span className="text-6xl block mb-2 animate-bounce">{selectedEmotion.emoji}</span>
              <div className="inline-block px-3 py-1 rounded-full bg-purple-950 border border-purple-800 text-xs font-bold text-purple-300 mb-2">
                선택한 감정: {selectedEmotion.name} ({temperature}단계 강도)
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                온몸으로 감정을 마음껏 펼쳐보세요!
              </h3>
              <p className="text-xs text-slate-400 mb-6 max-w-sm mx-auto">
                카메라는 작동하지 않습니다. 짝꿍이 감상할 수 있도록 몸짓, 걸음걸이, 호흡으로 표현하세요.
              </p>

              {isTimerRunning ? (
                <div className="my-6">
                  <div className="text-7xl font-black text-purple-400 font-mono mb-2">{expressTimer}초</div>
                  <p className="text-xs text-purple-300 animate-pulse font-bold">
                    &ldquo;손끝과 발끝까지 나의 감정 온도를 전해요!&rdquo;
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleStartExpress}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded-2xl font-black text-base shadow-lg active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Play className="w-5 h-5" /> 15초 표현 타이머 출발
                </button>
              )}
            </div>
          )}

          {/* Phase 3: 짝꿍이 감상한 감정과 강도 선택 */}
          {phase === 3 && (
            <div className="py-2 animate-in fade-in duration-200">
              <div className="text-center mb-4">
                <span className="text-4xl block mb-1">👀👥</span>
                <h3 className="text-lg font-black text-white">2단계: 짝꿍의 감상 선택</h3>
                <p className="text-xs text-slate-400">
                  친구의 움직임을 보며 느낀 감정과 온도를 골라보세요.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4">
                <span className="text-xs font-bold text-slate-300 block mb-2.5">
                  어떤 감정이 느껴졌나요?
                </span>
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  {EMOTIONS.map(emo => (
                    <button
                      key={emo.key}
                      onClick={() => setPeerGuessEmotion(emo.name)}
                      className={`py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        peerGuessEmotion === emo.name
                          ? 'bg-pink-950 border-pink-500 text-rose-200 shadow-md'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-xl block mb-0.5">{emo.emoji}</span>
                      <span>{emo.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6">
                <span className="text-xs font-bold text-slate-300 block mb-2.5">
                  감정의 온도는 몇 단계로 느껴졌나요?
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(lvl => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setPeerGuessTemp(lvl)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${
                        peerGuessTemp === lvl
                          ? 'bg-pink-600 text-white'
                          : 'bg-slate-900 border border-slate-800 text-slate-500'
                      }`}
                    >
                      {lvl}단계
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setPhase(4)}
                disabled={!peerGuessEmotion}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded-2xl font-black text-sm shadow-lg disabled:opacity-50"
              >
                서로의 감정온도 비교하기
              </button>
            </div>
          )}

          {/* Phase 4: 감상 공유 리포트 (정답/오답 판정 없이 다양성 존중) */}
          {phase === 4 && (
            <div className="py-2 animate-in fade-in duration-300 text-center">
              <span className="text-5xl block mb-2">🎭✨</span>
              <h3 className="text-xl font-black text-white mb-1">감정 온도계 공유 리포트</h3>
              <p className="text-xs text-slate-400 mb-5">
                정답이나 오답이 아닌, 서로의 느낌이 얼마나 풍성하게 오갔는지 확인하세요.
              </p>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-5 rounded-2xl border border-slate-800 mb-5 text-left">
                <div className="border-r border-slate-800 pr-3">
                  <span className="text-[10px] font-bold text-purple-400 block mb-1">
                    👤 표현자의 원래 의도
                  </span>
                  <div className="text-lg font-black text-white mb-1">
                    {selectedEmotion.emoji} {selectedEmotion.name}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    온도: <strong>{temperature}단계</strong>
                  </span>
                </div>

                <div className="pl-2">
                  <span className="text-[10px] font-bold text-rose-300 block mb-1">
                    👥 짝꿍이 느낀 감정
                  </span>
                  <div className="text-lg font-black text-white mb-1">
                    {peerGuessEmotion}
                  </div>
                  <span className="text-xs text-slate-400 font-mono">
                    온도: <strong>{peerGuessTemp}단계</strong>
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-950/80 rounded-2xl border border-purple-500/20 text-xs text-slate-300 leading-relaxed mb-6 text-left">
                <p className="text-purple-300 font-bold mb-1">💡 감상 배움 이야기:</p>
                <p>
                  {selectedEmotion.name === peerGuessEmotion
                    ? '서로의 마음이 잘 통했네요! 온몸으로 전한 감정이 친구의 마음에 정확히 가닿았습니다.'
                    : '표현과 느낌이 서로 달라도 괜찮아요! 같은 움직임도 사람마다 저마다의 감정으로 다채롭게 해석될 수 있습니다.'}
                </p>
              </div>

              <button
                onClick={() => onComplete(`감정 [${selectedEmotion.name} ${temperature}도] 신체 표현 완료! 짝꿍 감상: [${peerGuessEmotion} ${peerGuessTemp}도]`)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 감정 표현 완료하기
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
