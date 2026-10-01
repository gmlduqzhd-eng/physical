import React, { useState } from 'react';
import { Eye, CheckCircle2, Sparkles } from 'lucide-react';
import { sfxTap, sfxSuccess, hapticHeavy } from '../../application/soundEffects';

interface ObserverRefereeModeProps {
  onAwardBonus: (amount: number, reason: string) => void;
  groupName: string;
  isBuffActive?: boolean;
}

const QUIZ_LIST = [
  { q: '운동 전 스트레칭을 하는 가장 주된 이유는?', a: '관절 가동 범위 확대와 부상 예방', options: ['칼로리 소모 극대화', '관절 가동 범위 확대와 부상 예방', '빠른 체중 감량'] },
  { q: '운동 중 땀이 많이 날 때 가장 올바른 수분 섭취 방법은?', a: '조금씩 자주 나누어 마시기', options: ['한 번에 1리터 마시기', '조금씩 자주 나누어 마시기', '끝날 때까지 참기'] },
  { q: '심폐지구력 향상에 가장 효과적인 운동은?', a: '지속적인 달리기 및 줄넘기', options: ['팔씨름', '지속적인 달리기 및 줄넘기', '무거운 덤벨 들기'] },
  { q: '순발력을 기르는 대표적인 운동 종목은?', a: '단거리 달리기와 제자리 점프', options: ['장시간 명상', '단거리 달리기와 제자리 점프', '정적 스트레칭'] },
];

export const ObserverRefereeMode: React.FC<ObserverRefereeModeProps> = ({ onAwardBonus, groupName }) => {
  const [activeTab, setActiveTab] = useState<'referee' | 'cheer' | 'quiz'>('referee');
  const [formChecklist, setFormChecklist] = useState<Record<string, boolean>>({
    posture: false,
    pace: false,
    sportsmanship: false,
    teamwork: false,
  });
  const [cheerGauge, setCheerGauge] = useState<number>(0);
  const [currentQuizIdx, setCurrentQuizIdx] = useState<number>(0);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCheck = (key: string) => {
    sfxTap();
    setFormChecklist(prev => {
      const next = { ...prev, [key]: !prev[key] };
      // 4가지 모두 체크되면 보너스 부여
      if (Object.values(next).every(Boolean)) {
        onAwardBonus(50, '참관학생의 모둠 정밀 자세 피드백 완료!');
        sfxSuccess();
        hapticHeavy();
        setFeedback('🌟 모둠원 전원에게 정밀 피드백 보너스 +50점 지급!');
        setTimeout(() => setFeedback(null), 3000);
      }
      return next;
    });
  };

  const handleCheerTap = () => {
    sfxTap();
    setCheerGauge(prev => {
      const next = prev + 10;
      if (next >= 100) {
        onAwardBonus(30, '참관학생의 폭풍 응원 버프!');
        sfxSuccess();
        hapticHeavy();
        setFeedback('🔥 폭풍 응원 게이지 100% 달성! +30점!');
        setTimeout(() => setFeedback(null), 2500);
        return 0;
      }
      return next;
    });
  };

  const handleQuizAnswer = (option: string) => {
    const curr = QUIZ_LIST[currentQuizIdx];
    if (option === curr.a) {
      sfxSuccess();
      hapticHeavy();
      onAwardBonus(40, '체육 상식 퀴즈 정답!');
      setQuizScore(s => s + 1);
      setFeedback('🎉 정답입니다! 우리 모둠에 +40점 획득!');
    } else {
      sfxTap();
      setFeedback('😅 아쉬워요! 다음 문제에 도전해 보세요.');
    }
    setTimeout(() => {
      setFeedback(null);
      setCurrentQuizIdx((idx) => (idx + 1) % QUIZ_LIST.length);
    }, 1800);
  };

  return (
    <div className="bg-slate-900/90 border border-amber-500/40 rounded-3xl p-5 text-white backdrop-blur-md shadow-xl my-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                견학생 전용
              </span>
              <h3 className="font-black text-base text-white">공인 심판 & 기록관 모드</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{groupName} 모둠의 전술 코치로 활동합니다</p>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/40 rounded-xl text-center text-sm font-bold text-amber-300 animate-bounce">
          {feedback}
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950/60 p-1 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('referee')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'referee' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          📋 자세 심판
        </button>
        <button
          onClick={() => setActiveTab('cheer')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'cheer' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          📣 열혈 응원
        </button>
        <button
          onClick={() => setActiveTab('quiz')}
          className={`py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'quiz' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          💡 체육 퀴즈
        </button>
      </div>

      {/* 1. 자세 심판 탭 */}
      {activeTab === 'referee' && (
        <div className="space-y-2.5">
          <p className="text-xs text-slate-300 font-medium mb-1">
            운동 중인 친구들의 자세를 관찰하고 공정하게 체크해 주세요:
          </p>
          {[
            { key: 'posture', label: '허리와 척추를 곧게 펴고 운동하고 있는가?' },
            { key: 'pace', label: '무리하지 않고 일정한 호흡 템포를 유지하는가?' },
            { key: 'sportsmanship', label: '상대 모둠을 배려하며 규칙을 준수하는가?' },
            { key: 'teamwork', label: '지친 친구에게 파이팅을 외치며 격려하는가?' },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => handleCheck(item.key)}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                formChecklist[item.key]
                  ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                  : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="text-xs font-medium leading-relaxed">{item.label}</span>
              <CheckCircle2 className={`w-5 h-5 flex-shrink-0 ml-2 ${formChecklist[item.key] ? 'text-amber-400 fill-amber-400/20' : 'text-slate-600'}`} />
            </button>
          ))}
        </div>
      )}

      {/* 2. 열혈 응원 탭 */}
      {activeTab === 'cheer' && (
        <div className="flex flex-col items-center py-2 text-center">
          <p className="text-xs text-slate-300 mb-3">
            응원 버튼을 연타하여 에너지를 모으세요! 게이지가 차면 팀 점수가 올라갑니다.
          </p>
          <div className="w-full bg-slate-800 rounded-full h-4 mb-4 overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-150"
              style={{ width: `${cheerGauge}%` }}
            />
          </div>
          <button
            onClick={handleCheerTap}
            className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 active:scale-95 shadow-lg shadow-amber-500/30 flex flex-col items-center justify-center gap-1 font-black text-slate-950 transition-transform"
          >
            <Sparkles className="w-7 h-7" />
            <span className="text-xs">응원 연타!</span>
          </button>
        </div>
      )}

      {/* 3. 체육 퀴즈 탭 */}
      {activeTab === 'quiz' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-amber-400 font-bold">문제 {currentQuizIdx + 1} / {QUIZ_LIST.length}</span>
            <span className="text-xs text-slate-400">맞힌 개수: {quizScore}개</span>
          </div>
          <p className="text-sm font-bold text-white mb-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            {QUIZ_LIST[currentQuizIdx].q}
          </p>
          <div className="space-y-2">
            {QUIZ_LIST[currentQuizIdx].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleQuizAnswer(opt)}
                className="w-full p-2.5 rounded-xl bg-slate-800 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-500/40 text-left text-xs text-slate-200 transition-all font-medium"
              >
                {i + 1}. {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
