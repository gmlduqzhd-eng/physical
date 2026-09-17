import { useState } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Users, CheckCircle2 } from 'lucide-react';
import { sfxCoin } from '../../../application/soundEffects';

export const PassGateRescue = () => {
  // 1: 모둠원 등록, 2: 1라운드 활동, 3: 전략 조정, 4: 2라운드 활동, 5: 협력 결과
  const [phaseStep, setPhaseStep] = useState<number>(1);
  const [members, setMembers] = useState<string[]>(['모둠원 1', '모둠원 2']);
  const [newMemberName, setNewMemberName] = useState<string>('');

  const [round1Success, setRound1Success] = useState<number>(0);
  const [round2Success, setRound2Success] = useState<number>(0);

  // 각 라운드별 참여한 모둠원 체크
  const [r1Participated, setR1Participated] = useState<Record<string, boolean>>({});
  const [r2Participated, setR2Participated] = useState<Record<string, boolean>>({});

  const [strategyChoice, setStrategyChoice] = useState<string>('');

  const addMember = () => {
    if (!newMemberName.trim() || members.length >= 6) return;
    setMembers(prev => [...prev, newMemberName.trim()]);
    setNewMemberName('');
  };

  const removeMember = (idx: number) => {
    if (members.length <= 2) return;
    setMembers(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePassSuccessR1 = () => {
    setRound1Success(s => s + 1);
    sfxCoin();
  };

  const handlePassSuccessR2 = () => {
    setRound2Success(s => s + 1);
    sfxCoin();
  };

  const allR1Participated = members.every(m => r1Participated[m]);
  const allR2Participated = members.every(m => r2Participated[m]);

  return (
    <PhysicalActivityLayout
      title="패스 게이트 구조대"
      emoji="🥅"
      domain="스포츠"
      sportType="전략형"
      achievementCode="[4체02-06]"
      achievementTitle="전략형 스포츠에서 공간을 활용한 협력 패스 기술과 배려 실천"
      activityType="모둠"
      expectedMinutes={5}
      equipment={['공 1개', '콘 또는 물병 4~6개 (게이트용)']}
      instructions={[
        '콘이나 물병을 2개씩 짝지어 2~3개의 통과 게이트(문)를 바닥에 설치합니다.',
        '모둠원 전원이 번갈아가며 게이트 사이로 정확하게 공을 주고받습니다.',
        '게이트를 통과한 패스 성공 횟수를 기록합니다 (공을 놓쳐도 초기화되지 않음).',
        '1라운드 후 전략 회의를 거쳐 게이트 위치를 바꾸고 2라운드에 도전합니다.',
      ]}
      colorTheme="blue"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          {/* Phase 1: 참여 모둠원 등록 */}
          {phaseStep === 1 && (
            <div className="py-2">
              <div className="flex items-center gap-2 mb-2 text-cyan-400">
                <Users className="w-5 h-5" />
                <h3 className="text-base font-black text-white">모둠원 확인 (최소 2명 ~ 6명)</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                모든 모둠원이 한 번 이상 패스에 참여해야 완주할 수 있습니다.
              </p>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newMemberName}
                  onChange={e => setNewMemberName(e.target.value)}
                  placeholder="모둠원 이름/번호"
                  className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={addMember}
                  className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl"
                >
                  추가
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-6">
                {members.map((m, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                    <span className="font-bold text-slate-200">👤 {m}</span>
                    {members.length > 2 && (
                      <button onClick={() => removeMember(i)} className="text-slate-500 hover:text-rose-400 text-[11px]">
                        삭제
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={() => setPhaseStep(2)}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl font-black text-sm shadow-md"
              >
                1라운드 시작하기 (게이트 패스)
              </button>
            </div>
          )}

          {/* Phase 2: 1라운드 활동 기록 */}
          {phaseStep === 2 && (
            <div className="py-2 text-center">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-400 border border-blue-800 mb-2 inline-block">
                1라운드 진행 중
              </span>
              <h3 className="text-xl font-black text-white mb-2">게이트 통과 패스 횟수</h3>

              <div className="text-6xl font-black text-cyan-400 font-mono my-4">
                {round1Success}<span className="text-2xl ml-1 text-slate-400">회</span>
              </div>

              <div className="flex justify-center gap-3 mb-6">
                <button
                  onClick={handlePassSuccessR1}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  ⚽ 패스 통과 성공! (+1)
                </button>
              </div>

              {/* 모둠원 참여 체크 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5 text-left">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  ✅ 공을 한 번 이상 패스받은 모둠원을 체크하세요:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {members.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setR1Participated(p => ({ ...p, [m]: !p[m] }))}
                      className={`p-2 rounded-xl border text-xs font-bold text-left flex items-center justify-between ${
                        r1Participated[m]
                          ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{m}</span>
                      <span>{r1Participated[m] ? '✓ 참여' : '대기'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setPhaseStep(3)}
                disabled={!allR1Participated}
                className={`w-full py-3.5 rounded-xl font-black text-sm transition-all ${
                  allR1Participated
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {allR1Participated ? '1라운드 완료 & 모둠 전략 회의로 이동' : '모든 모둠원이 참여해야 다음 단계로 갈 수 있어요'}
              </button>
            </div>
          )}

          {/* Phase 3: 전략 회의 및 조정 */}
          {phaseStep === 3 && (
            <div className="py-2">
              <h3 className="text-lg font-black text-white mb-2 text-center">🧠 모둠 전략 회의 시간</h3>
              <p className="text-xs text-slate-300 text-center mb-5">
                1라운드에서는 {round1Success}번 성공했습니다! 2라운드를 위해 어떤 전략을 바꿀까요?
              </p>

              <div className="space-y-2 mb-6 text-xs">
                {[
                  '게이트의 폭을 조금 더 넓혀 성공률 높이기',
                  '패스하기 전에 눈빛과 말로 먼저 신호 주고받기',
                  '공을 받는 사람이 더 빠르게 움직여 빈 공간 열어주기',
                  '패스의 세기를 더 부드럽고 정확하게 조절하기',
                ].map(strat => (
                  <button
                    key={strat}
                    onClick={() => setStrategyChoice(strat)}
                    className={`w-full p-3.5 rounded-xl border text-left font-bold transition-all ${
                      strategyChoice === strat
                        ? 'bg-blue-950 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    🎯 {strat}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setPhaseStep(4)}
                disabled={!strategyChoice}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white rounded-xl font-black text-sm shadow-md"
              >
                전략 결정! 2라운드 시작하기
              </button>
            </div>
          )}

          {/* Phase 4: 2라운드 활동 기록 */}
          {phaseStep === 4 && (
            <div className="py-2 text-center">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 mb-2 inline-block">
                2라운드 (전략 적용)
              </span>
              <h3 className="text-xl font-black text-white mb-2">게이트 통과 패스 횟수</h3>

              <div className="text-6xl font-black text-emerald-400 font-mono my-4">
                {round2Success}<span className="text-2xl ml-1 text-slate-400">회</span>
              </div>

              <div className="flex justify-center gap-3 mb-6">
                <button
                  onClick={handlePassSuccessR2}
                  className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white font-black text-base rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                  ⚽ 2라운드 패스 성공! (+1)
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5 text-left">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  ✅ 2라운드 모둠원 참여 확인:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {members.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setR2Participated(p => ({ ...p, [m]: !p[m] }))}
                      className={`p-2 rounded-xl border text-xs font-bold text-left flex items-center justify-between ${
                        r2Participated[m]
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span>{m}</span>
                      <span>{r2Participated[m] ? '✓ 참여' : '대기'}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setPhaseStep(5)}
                disabled={!allR2Participated}
                className={`w-full py-3.5 rounded-xl font-black text-sm transition-all ${
                  allR2Participated
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {allR2Participated ? '2라운드 완료 & 협력 평가 확인' : '모든 모둠원의 참여를 확인해 주세요'}
              </button>
            </div>
          )}

          {/* Phase 5: 협력 평가 및 배지 수여 */}
          {phaseStep === 5 && (
            <div className="py-2 animate-in fade-in duration-300">
              <h3 className="text-xl font-black text-white text-center mb-1">🤝 구조대 협력 리포트</h3>
              <p className="text-xs text-slate-400 text-center mb-5">
                선택 전략: &ldquo;{strategyChoice}&rdquo;
              </p>

              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5 text-center">
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block mb-1">1라운드 성공</span>
                  <span className="text-3xl font-black text-cyan-400 font-mono">{round1Success}회</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 font-bold block mb-1">2라운드 성공</span>
                  <span className="text-3xl font-black text-emerald-400 font-mono">{round2Success}회</span>
                </div>
              </div>

              {/* 3대 핵심 협력 가치 배지 */}
              <div className="space-y-2.5 mb-6">
                <div className="p-3 bg-slate-950 rounded-xl border border-cyan-500/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm">
                    👥
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-cyan-300">모두 참여 실천</h4>
                    <p className="text-[11px] text-slate-400">한 사람도 소외되지 않고 전원이 공을 나누었습니다.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    ⏳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-emerald-300">서로 기다려 주기</h4>
                    <p className="text-[11px] text-slate-400">실수가 나와도 격려하며 다음 패스를 준비했습니다.</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                    🛡️
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-blue-300">안전하게 패스하기</h4>
                    <p className="text-[11px] text-slate-400">친구가 안전하게 잡을 수 있는 알맞은 속도로 패스했습니다.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onComplete(`1R ${round1Success}회 → 2R ${round2Success}회 패스 성공! 모둠원 ${members.length}명 전원 참여 완료`)}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-white rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 구조대 활동 완료하기
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
