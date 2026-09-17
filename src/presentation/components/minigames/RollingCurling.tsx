import { useState } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { CheckCircle2 } from 'lucide-react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';

interface Attempt {
  round: number;
  zone: 'center' | 'middle' | 'outer' | 'miss';
  score: number;
}

export const RollingCurling = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [forceReflection, setForceReflection] = useState<string>('');
  const [showSummary, setShowSummary] = useState<boolean>(false);

  const currentRound = attempts.length + 1;

  const handleRecordAttempt = (zone: 'center' | 'middle' | 'outer' | 'miss') => {
    if (attempts.length >= 5) return;
    sfxCoin();
    const scores = { center: 3, middle: 2, outer: 1, miss: 0 };
    const newAttempt: Attempt = {
      round: currentRound,
      zone,
      score: scores[zone],
    };
    const nextAttempts = [...attempts, newAttempt];
    setAttempts(nextAttempts);

    if (nextAttempts.length === 5) {
      setShowSummary(true);
      sfxSuccess();
    }
  };

  const totalScore = attempts.reduce((sum, a) => sum + a.score, 0);
  const earlyScore = attempts.slice(0, 2).reduce((sum, a) => sum + a.score, 0);
  const lateScore = attempts.slice(3, 5).reduce((sum, a) => sum + a.score, 0);
  const isImproved = lateScore >= earlyScore;

  return (
    <PhysicalActivityLayout
      title="공 굴림 컬링 원정"
      emoji="🥌"
      domain="스포츠"
      sportType="기술형"
      achievementCode="[4체02-05]"
      achievementTitle="기술형 표적 활동에서 힘을 조절하여 표적에 공 굴리기"
      activityType="개인"
      expectedMinutes={5}
      equipment={['공 1개 (테니스공, 고무공 등)', '바닥 표적 (테이프, 콘, 줄넘기 등)']}
      safetyItems={[
        { id: 'roll_only', text: '공을 공중에 던지지 않고 바닥으로 부드럽게 굴릴 준비가 되었나요?' },
        { id: 'zone_clear', text: '공이 굴러가는 경로에 깨지기 쉬운 물건이나 장애물이 없나요?' },
        { id: 'distance', text: '앞에서 공을 주워주는 친구와 충분한 안전거리를 유지했나요?' },
        { id: 'floor', text: '바닥이 미끄럽지 않아 공을 굴릴 때 균형을 잃지 않나요?' },
        { id: 'ready', text: '신체에 무리 없이 침착하게 힘을 조절할 준비가 되었나요?' },
      ]}
      instructions={[
        '바닥에 3개의 동심원(중앙 3점, 중간 2점, 바깥 1점) 또는 거리선을 만듭니다.',
        '출발선 뒤에 서서 공을 낮게 잡고 표적을 향해 부드럽게 굴립니다.',
        '공이 멈춘 위치를 확인하고 화면에서 해당 구역을 터치해 기록합니다 (총 5회).',
        '매 시도마다 힘의 세기를 미세하게 조절하며 중앙에 가깝게 보내보세요.',
      ]}
      colorTheme="amber"
    >
      {({ onComplete }) => (
        <div className="w-full bg-slate-900/90 rounded-3xl border border-slate-800 p-6 shadow-xl">
          {!showSummary ? (
            <div>
              {/* 상단 라운드 및 점수 */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-amber-400">
                  시도: <strong className="text-base text-white">{currentRound}</strong> / 5회
                </span>
                <span className="text-xs font-bold text-slate-400">
                  현재 누적: <strong className="text-amber-300 font-mono text-base">{totalScore}점</strong>
                </span>
              </div>

              {/* 표적 시각화 그래픽 */}
              <div className="relative w-64 h-64 mx-auto my-2 rounded-full border-4 border-slate-800 flex items-center justify-center bg-slate-950 overflow-hidden shadow-inner">
                {/* 1점 바깥 영역 */}
                <div className="absolute inset-2 rounded-full bg-amber-950/40 border border-amber-800/40 flex items-start justify-center pt-2">
                  <span className="text-[10px] font-bold text-amber-600">1점 구역</span>
                </div>
                {/* 2점 중간 영역 */}
                <div className="absolute inset-10 rounded-full bg-amber-900/50 border border-amber-600/50 flex items-start justify-center pt-2">
                  <span className="text-[10px] font-bold text-amber-400">2점 구역</span>
                </div>
                {/* 3점 정중앙 버튼 */}
                <div className="absolute inset-20 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg">
                  <span className="text-xs font-black text-slate-950">3점 중앙</span>
                </div>

                {/* 누적 마킹 표시 */}
                {attempts.map((att, i) => {
                  const offsets: Record<string, { top: string; left: string }> = {
                    center: { top: '50%', left: '50%' },
                    middle: { top: '35%', left: '40%' },
                    outer: { top: '20%', left: '60%' },
                    miss: { top: '5%', left: '10%' },
                  };
                  const pos = offsets[att.zone];
                  return (
                    <div
                      key={i}
                      className="absolute w-5 h-5 rounded-full bg-white text-slate-950 text-[10px] font-black flex items-center justify-center shadow-md -translate-x-1/2 -translate-y-1/2 z-10 border border-slate-900 animate-in zoom-in"
                      style={{ top: pos.top, left: pos.left }}
                    >
                      {att.round}
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-slate-300 text-center mb-4 mt-2">
                실제 공이 멈춘 위치를 아래 버튼에서 선택하세요.
              </p>

              {/* 멈춘 구역 선택 버튼들 */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => handleRecordAttempt('center')}
                  className="py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 shadow-md active:scale-95 transition-all"
                >
                  <span className="text-sm">🎯 중앙 표적 (3점)</span>
                  <span className="text-[10px] text-amber-200">정확히 안착!</span>
                </button>
                <button
                  onClick={() => handleRecordAttempt('middle')}
                  className="py-3 bg-amber-700/80 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 shadow-md active:scale-95 transition-all"
                >
                  <span className="text-sm">🟡 중간 구역 (2점)</span>
                  <span className="text-[10px] text-amber-200">표적 근처 접근</span>
                </button>
                <button
                  onClick={() => handleRecordAttempt('outer')}
                  className="py-3 bg-amber-800/60 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 shadow-md active:scale-95 transition-all"
                >
                  <span className="text-sm">⚪ 바깥 구역 (1점)</span>
                  <span className="text-[10px] text-amber-300">원 안에 들어옴</span>
                </button>
                <button
                  onClick={() => handleRecordAttempt('miss')}
                  className="py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs flex flex-col items-center gap-0.5 shadow-md active:scale-95 transition-all"
                >
                  <span className="text-sm">💨 표적 이탈 (0점)</span>
                  <span className="text-[10px] text-slate-400">힘 조절 다시 도전</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="py-2 animate-in fade-in duration-300">
              <div className="text-center mb-4">
                <span className="text-5xl block mb-2">🏆</span>
                <h3 className="text-xl font-black text-white">5회 시도 완료!</h3>
                <p className="text-xs text-amber-400 font-bold mt-1">
                  총 획득 점수: {totalScore}점 / 15점 만점
                </p>
              </div>

              {/* 향상도 비교 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>초반 (1~2회 시도 합계)</span>
                  <span className="font-mono font-bold text-white">{earlyScore}점</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>후반 (4~5회 시도 합계)</span>
                  <span className="font-mono font-bold text-amber-400">{lateScore}점</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-center font-bold text-emerald-400">
                  {isImproved
                    ? '✨ 후반으로 갈수록 힘을 조절해 표적에 더 가까워졌어요!'
                    : '🌱 반복 연습하며 나만의 공 굴리기 감각을 찾아가는 중이에요!'}
                </div>
              </div>

              {/* 힘 조절 성찰 질문 */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-5">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  마지막으로, 힘을 어떻게 조절했나요?
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {['너무 세게 굴림', '적당하게 조절함', '너무 약하게 굴림'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setForceReflection(opt)}
                      className={`p-2.5 rounded-xl border text-center font-bold transition-all ${
                        forceReflection === opt
                          ? 'bg-amber-950 border-amber-500 text-amber-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => onComplete(`공 굴림 컬링 5회 시도 (${totalScore}점), 힘 조절 성찰: "${forceReflection || '적당하게 조절함'}" 기록 완료!`)}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 rounded-2xl font-black text-sm shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> 컬링 원정 결과 저장하기
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
