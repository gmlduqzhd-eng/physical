import { useState } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { CheckCircle2 } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

const ARM_CARDS = [
  { id: 'gear', name: '톱니바퀴 회전', emoji: '⚙️', desc: '양팔을 90도로 꺾고 째깍째깍 톱니바퀴처럼 돌리기' },
  { id: 'laser', name: '하늘 레이저 빔', emoji: '⚡', desc: '두 팔을 하늘 높이 힘차게 발사하듯 번갈아 뻗기' },
  { id: 'wave', name: '안테나 파동', emoji: '📡', desc: '손가락 끝부터 어깨까지 부드러운 물결 파동 보내기' },
];

const LEG_CARDS = [
  { id: 'stamp', name: '강철 스탬프 걷기', emoji: '🥾', desc: '무릎을 직각으로 높이 올려 쿵쿵 절도 있게 전진' },
  { id: 'spring', name: '용수철 바운스', emoji: '🦿', desc: '제자리에서 무릎 반동을 이용해 가볍게 콩콩 뛰기' },
  { id: 'slide', name: '호버크래프트 미끄러짐', emoji: '🛹', desc: '발을 바닥에 스치며 좌우로 부드럽게 미끄러지기' },
];

const BODY_CARDS = [
  { id: 'twist', name: '지그재그 트위스트', emoji: '🔄', desc: '상체와 하체를 반대 방향으로 절도 있게 비틀기' },
  { id: 'charge', name: '배터리 충전 숨쉬기', emoji: '🔋', desc: '몸을 웅크렸다가 가슴을 활짝 펴며 에너지 채우기' },
  { id: 'balance', name: '자이로 센서 균형', emoji: '⚖️', desc: '한 발로 중심을 잡으며 상체를 좌우로 기울이기' },
];

export const PartnerRobotLab = () => {
  // 1: 1라운드 설계, 2: 1라운드 로봇 표현, 3: 역할 교대 안내, 4: 2라운드 설계, 5: 2라운드 표현, 6: 최종 창의 칭찬
  const [labStep, setLabStep] = useState<number>(1);

  // 1라운드 (학생 A 설계, 학생 B 로봇)
  const [arm1, setArm1] = useState(ARM_CARDS[0]);
  const [leg1, setLeg1] = useState(LEG_CARDS[0]);
  const [body1, setBody1] = useState(BODY_CARDS[0]);

  // 2라운드 (학생 B 설계, 학생 A 로봇)
  const [arm2, setArm2] = useState(ARM_CARDS[1]);
  const [leg2, setLeg2] = useState(LEG_CARDS[1]);
  const [body2, setBody2] = useState(BODY_CARDS[1]);

  const [praise1, setPraise1] = useState<string>('');
  const [praise2, setPraise2] = useState<string>('');

  return (
    <PhysicalActivityLayout
      title="파트너 로봇 연구소"
      emoji="🤖"
      domain="표현"
      achievementCode="[4체03-02]"
      achievementTitle="신체 각 부위의 움직임 요소를 탐색하고 짝과 협력하여 창의적 로봇 동작 구성"
      activityType="짝"
      expectedMinutes={4}
      safetyItems={[
        { id: 'no_grab', text: '친구의 팔이나 다리를 강제로 잡아당기지 않고, 오직 말과 시범으로만 안내하나요?' },
        { id: 'no_overbend', text: '관절을 무리하게 꺾거나 위험한 동작은 제외하고 안전하게 움직이나요?' },
        { id: 'space', text: '두 사람이 팔다리를 뻗어도 주변 벽이나 다른 모둠과 부딪히지 않는 공간이 있나요?' },
        { id: 'respect', text: '친구의 신체 조건과 표현 방식을 존중하며 즐겁게 참여할 준비가 되었나요?' },
        { id: 'ready', text: '몸에 불편함이 생기면 언제든 즉시 멈추고 신호를 보낼 수 있나요?' },
      ]}
      instructions={[
        '두 친구가 [연구원(설계자)]과 [로봇] 역할을 나눕니다.',
        '연구원은 팔, 다리, 몸통 카드를 골라 3단 로봇 콤보 동작을 프로그래밍합니다.',
        '연구원이 말과 시범을 보이면 로봇 친구가 신체로 멋지게 재현합니다 (직접 접촉 금지!).',
        '자동으로 역할을 바꾸어 2라운드를 진행하고 서로의 창의성을 칭찬합니다.',
      ]}
      colorTheme="purple"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          {/* Step 1: 1라운드 설계 */}
          {labStep === 1 && (
            <div className="py-2">
              <div className="flex justify-between items-center mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  1라운드: 친구 A 설계 → 친구 B 표현
                </span>
                <span className="text-xs text-slate-400 font-bold">1단계: 동작 선택</span>
              </div>
              <h3 className="text-lg font-black text-white text-center mb-1">로봇 동작 3종 카드 선택</h3>
              <p className="text-xs text-slate-400 text-center mb-4">
                연구원 친구가 3개 부위의 움직임 카드를 각각 하나씩 선택하세요.
              </p>

              {/* 팔 동작 */}
              <div className="mb-3">
                <span className="text-[11px] font-bold text-cyan-400 block mb-1.5">🦾 1. 팔 동작</span>
                <div className="grid grid-cols-3 gap-2">
                  {ARM_CARDS.map(card => (
                    <button
                      key={card.id}
                      onClick={() => { setArm1(card); sfxCoin(); }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        arm1.id === card.id ? 'bg-cyan-950 border-cyan-500 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{card.emoji}</span>
                      <div className="text-[11px] text-white truncate">{card.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 다리 동작 */}
              <div className="mb-3">
                <span className="text-[11px] font-bold text-emerald-400 block mb-1.5">🦿 2. 다리 동작</span>
                <div className="grid grid-cols-3 gap-2">
                  {LEG_CARDS.map(card => (
                    <button
                      key={card.id}
                      onClick={() => { setLeg1(card); sfxCoin(); }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        leg1.id === card.id ? 'bg-emerald-950 border-emerald-500 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{card.emoji}</span>
                      <div className="text-[11px] text-white truncate">{card.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 몸통 동작 */}
              <div className="mb-5">
                <span className="text-[11px] font-bold text-purple-400 block mb-1.5">🔄 3. 몸통 동작</span>
                <div className="grid grid-cols-3 gap-2">
                  {BODY_CARDS.map(card => (
                    <button
                      key={card.id}
                      onClick={() => { setBody1(card); sfxCoin(); }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        body1.id === card.id ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{card.emoji}</span>
                      <div className="text-[11px] text-white truncate">{card.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setLabStep(2)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded-2xl font-black text-sm shadow-lg"
              >
                동작 시퀀스 완성! 로봇 친구에게 지시하기
              </button>
            </div>
          )}

          {/* Step 2: 1라운드 시연 및 로봇 표현 */}
          {labStep === 2 && (
            <div className="py-2 animate-in fade-in duration-200">
              <div className="text-center mb-4">
                <span className="text-5xl block mb-2">🤖📢</span>
                <h3 className="text-xl font-black text-white">로봇 작동 시퀀스 가동!</h3>
                <p className="text-xs text-amber-300 font-bold mt-1">
                  ⚠️ 손을 대지 말고, 말과 시범으로만 전달하세요!
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 space-y-3">
                <div className="flex items-start gap-3 p-2 bg-slate-900 rounded-xl">
                  <span className="text-2xl">{arm1.emoji}</span>
                  <div className="text-xs">
                    <strong className="text-cyan-400 block mb-0.5">1단계 팔: {arm1.name}</strong>
                    <span className="text-slate-300">{arm1.desc}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 bg-slate-900 rounded-xl">
                  <span className="text-2xl">{leg1.emoji}</span>
                  <div className="text-xs">
                    <strong className="text-emerald-400 block mb-0.5">2단계 다리: {leg1.name}</strong>
                    <span className="text-slate-300">{leg1.desc}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 bg-slate-900 rounded-xl">
                  <span className="text-2xl">{body1.emoji}</span>
                  <div className="text-xs">
                    <strong className="text-purple-400 block mb-0.5">3단계 몸통: {body1.name}</strong>
                    <span className="text-slate-300">{body1.desc}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setLabStep(3); sfxSuccess(); }}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 1라운드 표현 완료! 역할 교대하기
              </button>
            </div>
          )}

          {/* Step 3: 역할 교대 전환 화면 */}
          {labStep === 3 && (
            <div className="py-8 text-center animate-in zoom-in-95 duration-200">
              <span className="text-6xl block mb-3 animate-spin">🔄</span>
              <h3 className="text-2xl font-black text-white mb-2">역할 교대!</h3>
              <p className="text-sm text-cyan-300 font-bold mb-6">
                이제 친구 B가 [연구원(설계자)]이 되고, 친구 A가 [로봇]이 됩니다!
              </p>
              <button
                onClick={() => setLabStep(4)}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-black text-sm shadow-lg"
              >
                2라운드 프로그래밍 시작
              </button>
            </div>
          )}

          {/* Step 4: 2라운드 설계 */}
          {labStep === 4 && (
            <div className="py-2">
              <div className="flex justify-between items-center mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  2라운드: 친구 B 설계 → 친구 A 표현
                </span>
                <span className="text-xs text-slate-400 font-bold">2단계: 새 동작 선택</span>
              </div>
              <h3 className="text-lg font-black text-white text-center mb-1">새로운 로봇 동작 조합</h3>
              <p className="text-xs text-slate-400 text-center mb-4">
                친구 B가 1라운드와 다른 새로운 조합을 만들어보세요!
              </p>

              {/* 팔 동작 */}
              <div className="mb-3">
                <span className="text-[11px] font-bold text-cyan-400 block mb-1.5">🦾 1. 팔 동작</span>
                <div className="grid grid-cols-3 gap-2">
                  {ARM_CARDS.map(card => (
                    <button
                      key={card.id}
                      onClick={() => { setArm2(card); sfxCoin(); }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        arm2.id === card.id ? 'bg-cyan-950 border-cyan-500 text-cyan-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{card.emoji}</span>
                      <div className="text-[11px] text-white truncate">{card.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 다리 동작 */}
              <div className="mb-3">
                <span className="text-[11px] font-bold text-emerald-400 block mb-1.5">🦿 2. 다리 동작</span>
                <div className="grid grid-cols-3 gap-2">
                  {LEG_CARDS.map(card => (
                    <button
                      key={card.id}
                      onClick={() => { setLeg2(card); sfxCoin(); }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        leg2.id === card.id ? 'bg-emerald-950 border-emerald-500 text-emerald-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{card.emoji}</span>
                      <div className="text-[11px] text-white truncate">{card.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 몸통 동작 */}
              <div className="mb-5">
                <span className="text-[11px] font-bold text-purple-400 block mb-1.5">🔄 3. 몸통 동작</span>
                <div className="grid grid-cols-3 gap-2">
                  {BODY_CARDS.map(card => (
                    <button
                      key={card.id}
                      onClick={() => { setBody2(card); sfxCoin(); }}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                        body2.id === card.id ? 'bg-purple-950 border-purple-500 text-purple-200' : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{card.emoji}</span>
                      <div className="text-[11px] text-white truncate">{card.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setLabStep(5)}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white rounded-2xl font-black text-sm shadow-lg"
              >
                2라운드 시퀀스 확정! 시연하기
              </button>
            </div>
          )}

          {/* Step 5: 2라운드 시연 */}
          {labStep === 5 && (
            <div className="py-2 animate-in fade-in duration-200">
              <div className="text-center mb-4">
                <span className="text-5xl block mb-2">🤖📢</span>
                <h3 className="text-xl font-black text-white">2라운드 로봇 작동!</h3>
                <p className="text-xs text-amber-300 font-bold mt-1">
                  친구 B가 설명하고 친구 A가 동작을 표현합니다.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-6 space-y-3">
                <div className="flex items-start gap-3 p-2 bg-slate-900 rounded-xl">
                  <span className="text-2xl">{arm2.emoji}</span>
                  <div className="text-xs">
                    <strong className="text-cyan-400 block mb-0.5">1단계 팔: {arm2.name}</strong>
                    <span className="text-slate-300">{arm2.desc}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 bg-slate-900 rounded-xl">
                  <span className="text-2xl">{leg2.emoji}</span>
                  <div className="text-xs">
                    <strong className="text-emerald-400 block mb-0.5">2단계 다리: {leg2.name}</strong>
                    <span className="text-slate-300">{leg2.desc}</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-2 bg-slate-900 rounded-xl">
                  <span className="text-2xl">{body2.emoji}</span>
                  <div className="text-xs">
                    <strong className="text-purple-400 block mb-0.5">3단계 몸통: {body2.name}</strong>
                    <span className="text-slate-300">{body2.desc}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setLabStep(6); sfxSuccess(); }}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 2라운드 표현 완료! 칭찬 나누기
              </button>
            </div>
          )}

          {/* Step 6: 상호 칭찬 및 리포트 */}
          {labStep === 6 && (
            <div className="py-2 animate-in fade-in duration-300 text-center">
              <span className="text-5xl block mb-2">⭐🤝</span>
              <h3 className="text-xl font-black text-white mb-1">연구소 최종 협력 완료!</h3>
              <p className="text-xs text-slate-400 mb-5">
                서로의 창의적인 움직임을 칭찬하는 한마디를 선물하세요.
              </p>

              <div className="space-y-3 mb-6">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left">
                  <span className="text-xs font-bold text-cyan-300 block mb-2">
                    친구 A가 친구 B에게 보내는 칭찬:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['로봇처럼 절도 있는 표현!', '설명을 찰떡같이 알아들음', '부드러운 관절 파동 최고'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setPraise1(opt)}
                        className={`p-2 rounded-xl border text-left font-bold ${
                          praise1 === opt ? 'bg-cyan-950 border-cyan-500 text-cyan-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        ✓ {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left">
                  <span className="text-xs font-bold text-purple-300 block mb-2">
                    친구 B가 친구 A에게 보내는 칭찬:
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['창의적인 동작 프로그래밍!', '시범을 친절하게 보여줌', '재치 넘치는 깜짝 애드리브'].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setPraise2(opt)}
                        className={`p-2 rounded-xl border text-left font-bold ${
                          praise2 === opt ? 'bg-purple-950 border-purple-500 text-purple-300' : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        ✓ {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onComplete(`파트너 로봇 2라운드 상호 설계·표현 완료! 칭찬 교환: "${praise1 || '절도 있는 표현'}" / "${praise2 || '창의적 프로그래밍'}"`)}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 로봇 연구소 활동 완료
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
