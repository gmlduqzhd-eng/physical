import { useState, useEffect, useRef } from 'react';
import { PhysicalActivityLayout } from './common/PhysicalActivityLayout';
import { Sparkles, Music, Users, Star, Play, RotateCcw, Volume2, CheckCircle2 } from 'lucide-react';
import { sfxSuccess, sfxCoin } from '../../../application/soundEffects';

interface MovementCard {
  beat: number;
  bodyPart: string;
  space: string;
  effort: string;
  relationship: string;
  icon: string;
  desc: string;
}

const DEFAULT_CARDS: MovementCard[] = [
  { beat: 1, bodyPart: '팔과 손', space: '높은 공간 (머리 위)', effort: '가볍고 부드럽게 (바람)', relationship: '모둠원 전원 동시', icon: '🍃', desc: '머리 위로 바람이 불듯 부드럽게 흔들기' },
  { beat: 2, bodyPart: '가슴과 어깨', space: '중간 공간 (수평)', effort: '강하고 절도 있게 (번개)', relationship: '좌우 짝과 마주보기', icon: '⚡', desc: '절도 있게 쿵-짝 어깨 튕기기' },
  { beat: 3, bodyPart: '발과 무릎', space: '낮은 공간 (바닥)', effort: '무겁고 단단하게 (거인)', relationship: '차례대로 순서 릴레이', icon: '🪨', desc: '바닥을 쿵쿵 울리며 묵직한 스텝' },
  { beat: 4, bodyPart: '전신', space: '온몸 펼치기', effort: '순간 정지 (동상)', relationship: '등 맞대고 정지', icon: '🗿', desc: '마지막 비트에 모두 함께 멋진 포즈로 얼음!' },
];

interface Props {
  groupId?: string;
  enqueueAction?: (a: any) => void;
  onExit?: () => void;
}

export const BodyRhythmOrchestrator = ({ groupId = 'group-1', enqueueAction, onExit }: Props) => {
  // setup (카드 확인 및 동작 설계) -> practice (메트로놈과 합 맞추기) -> showtime (상대 모둠 발표) -> peer_review (동료 평가) -> finished
  const [phase, setPhase] = useState<'setup' | 'practice' | 'showtime' | 'peer_review' | 'finished'>('setup');
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [isPlayingBeat, setIsPlayingBeat] = useState<boolean>(false);
  const [cards, setCards] = useState<MovementCard[]>(DEFAULT_CARDS);

  // 동료 평가 점수 (별점 1~5)
  const [ratingCreativity, setRatingCreativity] = useState<number>(5);
  const [ratingRhythm, setRatingRhythm] = useState<number>(5);
  const [ratingTeamwork, setRatingTeamwork] = useState<number>(5);
  const [feedbackTag, setFeedbackTag] = useState<string>('칼군무 완벽!');

  const beatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 메트로놈 / 비트 재생 (BPM 90 = 667ms 간격)
  useEffect(() => {
    if (!isPlayingBeat) {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
      return;
    }

    beatTimerRef.current = setInterval(() => {
      setCurrentBeat(b => (b % 4) + 1);
    }, 800);

    return () => {
      if (beatTimerRef.current) clearInterval(beatTimerRef.current);
    };
  }, [isPlayingBeat]);

  const randomizeCards = () => {
    sfxCoin();
    const bodyParts = ['머리와 목', '팔과 손목', '골반과 허리', '발목과 무릎'];
    const spaces = ['높은 공간', '중간 공간', '낮은 바닥 공간', '지그재그 공간'];
    const efforts = ['바람처럼 부드럽게', '번개처럼 강렬하게', '거인처럼 무겁게', '깃털처럼 사뿐사뿐'];
    const relationships = ['모둠원 전원 일치', '1번부터 릴레이', '짝과 손바닥 마주치며', '서로 다른 방향 보며'];

    setCards(prev =>
      prev.map((c, idx) => ({
        ...c,
        bodyPart: bodyParts[idx % bodyParts.length],
        space: spaces[(idx + 1) % spaces.length],
        effort: efforts[(idx + 2) % efforts.length],
        relationship: relationships[(idx + 3) % relationships.length],
        desc: `${bodyParts[idx % bodyParts.length]}을(를) 활용해 ${efforts[(idx + 2) % efforts.length]} 표현`,
      }))
    );
  };

  const handleFinishReview = () => {
    sfxSuccess();
    setPhase('finished');
    const totalScore = (ratingCreativity + ratingRhythm + ratingTeamwork) * 20; // 최대 300점
    if (enqueueAction) {
      enqueueAction({
        type: 'SCORE_GAME',
        payload: {
          groupId,
          gameId: 'body-rhythm-orchestrator',
          score: totalScore,
          amount: totalScore,
        },
      });
    }
  };

  return (
    <PhysicalActivityLayout
      title="바디 모션 심포니 (리듬 표현)"
      emoji="🎶"
      domain="표현"
      achievementCode="[4체03-02]"
      achievementTitle="움직임 요소(신체·공간·노력·관계)와 리듬 표현"
      activityType="모둠"
      expectedMinutes={15}
      equipment={['넓은 활동 공간 (매트 또는 체육관)']}
      instructions={[
        '라반의 움직임 4요소(신체·공간·노력·관계)가 적힌 4마디 리듬 카드를 확인합니다.',
        '모둠원 4명이 각 마디를 하나씩 맡거나, 전원이 함께 동작을 맞춰 연습합니다.',
        '비트에 맞춰 1마디 → 2마디 → 3마디 → 4마디를 춤추듯 연속 표현합니다.',
        '발표 후 상대 모둠이 태블릿으로 창의성·박자감·협동심 별점을 매겨 피드백을 전달합니다.',
      ]}
      onExit={onExit}
    >
      {({ onComplete }) => (
        <div className="w-full max-w-lg mx-auto flex flex-col gap-5 p-4 text-white">
          {phase === 'setup' && (
            <div className="flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-cyan-400">
                  <Music className="w-6 h-6" />
                  <h3 className="text-xl font-bold">4마디 리듬 시퀀스 카드</h3>
                </div>
                <button
                  onClick={randomizeCards}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 새 동작 조합
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {cards.map(c => (
                  <div key={c.beat} className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center font-black text-cyan-400 shrink-0">
                      {c.beat}박
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{c.icon}</span>
                        <span className="font-bold text-sm text-slate-200">{c.bodyPart} × {c.space}</span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">
                        {c.effort} / {c.relationship}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setPhase('practice');
                  setIsPlayingBeat(true);
                  sfxCoin();
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-bold text-lg hover:from-cyan-400 hover:to-blue-500 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" /> 비트 틀고 연습 시작!
              </button>
            </div>
          )}

          {(phase === 'practice' || phase === 'showtime') && (
            <div className="flex flex-col gap-4">
              {/* 상단 비트 인디케이터 메트로놈 */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col items-center gap-3 shadow-xl">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                  {phase === 'practice' ? '모둠 합 맞추기 연습 중' : '🎉 쇼타임! 발표 진행 중'}
                </div>

                <div className="grid grid-cols-4 gap-2 w-full my-2">
                  {[1, 2, 3, 4].map(b => (
                    <div
                      key={b}
                      className={`py-3 rounded-xl border text-center transition-all duration-150 ${
                        currentBeat === b
                          ? 'bg-cyan-500 text-slate-950 font-black border-cyan-300 scale-105 shadow-lg shadow-cyan-500/40'
                          : 'bg-slate-950 text-slate-500 font-bold border-slate-800'
                      }`}
                    >
                      <div className="text-lg">{b}마디</div>
                    </div>
                  ))}
                </div>

                {/* 현재 마디의 동작 지령 대형 표시 */}
                <div className="w-full bg-slate-950/80 border border-cyan-500/30 rounded-xl p-4 text-center">
                  <div className="text-2xl mb-1">{cards[currentBeat - 1].icon}</div>
                  <div className="text-base font-extrabold text-cyan-300">
                    {cards[currentBeat - 1].bodyPart} : {cards[currentBeat - 1].space}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    {cards[currentBeat - 1].effort} ({cards[currentBeat - 1].relationship})
                  </div>
                </div>
              </div>

              {phase === 'practice' && (
                <button
                  onClick={() => {
                    setPhase('showtime');
                    sfxSuccess();
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 font-bold text-lg text-white shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" /> 연습 완료! 발표(쇼타임) 모드로 전환
                </button>
              )}

              {phase === 'showtime' && (
                <button
                  onClick={() => {
                    setIsPlayingBeat(false);
                    setPhase('peer_review');
                    sfxCoin();
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-lg text-white shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> 발표 종료! 상대 모둠 상호 평가하기
                </button>
              )}
            </div>
          )}

          {phase === 'peer_review' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 text-center">
              <div className="flex items-center justify-center gap-2 text-cyan-400">
                <Users className="w-6 h-6" />
                <h4 className="text-xl font-bold text-white">상대 모둠 상호 감상 평가</h4>
              </div>
              <p className="text-xs text-slate-300">
                발표를 지켜본 상대 모둠 학생들이 직접 별점과 피드백을 전달해 주세요!
              </p>

              {/* 평가 항목 1: 창의성 */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300">💡 독창적 표현력</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRatingCreativity(star)}
                      className={`p-1 ${ratingCreativity >= star ? 'text-amber-400' : 'text-slate-700'}`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 평가 항목 2: 리듬 일치도 */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300">🎵 비트와 박자감</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRatingRhythm(star)}
                      className={`p-1 ${ratingRhythm >= star ? 'text-amber-400' : 'text-slate-700'}`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 평가 항목 3: 모둠 협동심 */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300">🤝 모둠 협동·조화</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => setRatingTeamwork(star)}
                      className={`p-1 ${ratingTeamwork >= star ? 'text-amber-400' : 'text-slate-700'}`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                </div>
              </div>

              {/* 한 줄 격려 태그 선택 */}
              <div className="text-left text-xs text-slate-400 mt-1">한 줄 격려 스티커:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {['칼군무 완벽! ⭐', '아이디어가 돋보였어요 💡', '리듬감이 최고 🎵', '열정이 넘쳤어요 🔥'].map(tag => (
                  <button
                    key={tag}
                    onClick={() => setFeedbackTag(tag)}
                    className={`py-2 px-3 rounded-lg border text-left transition-all ${
                      feedbackTag === tag
                        ? 'border-cyan-400 bg-cyan-950/80 text-cyan-200 font-bold'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                onClick={handleFinishReview}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-lg text-white shadow-lg active:scale-95 mt-2"
              >
                평가 제출 및 점수 확정
              </button>
            </div>
          )}

          {phase === 'finished' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center gap-5 text-center">
              <Sparkles className="w-16 h-16 text-cyan-400 animate-bounce" />
              <div>
                <h4 className="text-2xl font-black text-white">리듬 표현 활동 완수!</h4>
                <p className="text-sm text-slate-400 mt-1">움직임 언어와 리듬 표현 성취기준 달성</p>
              </div>

              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2 text-left">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">동료 평가 점수</span>
                  <span className="text-xl font-black text-cyan-400">
                    {(ratingCreativity + ratingRhythm + ratingTeamwork) * 20}점
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">친구들의 한 줄 격려</span>
                  <span className="font-bold text-amber-300">{feedbackTag}</span>
                </div>
              </div>

              <button
                onClick={() => onComplete(`바디 심포니 완료! 점수: ${(ratingCreativity + ratingRhythm + ratingTeamwork) * 20}점`)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 font-bold text-lg text-white shadow-lg active:scale-95"
              >
                활동 완료 및 점수 기록
              </button>
            </div>
          )}
        </div>
      )}
    </PhysicalActivityLayout>
  );
};
