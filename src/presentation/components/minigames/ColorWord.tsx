import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxPop } from '../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

const COLORS = [
  { name: '빨강', className: 'text-red-500' },
  { name: '파랑', className: 'text-blue-500' },
  { name: '초록', className: 'text-emerald-500' },
  { name: '노랑', className: 'text-yellow-400' },
];

function generateQuestion() {
  const wordIdx = Math.floor(Math.random() * COLORS.length);
  let colorIdx = Math.floor(Math.random() * COLORS.length);
  // 50% 확률로 불일치하게
  if (Math.random() > 0.5) {
    while (colorIdx === wordIdx) colorIdx = Math.floor(Math.random() * COLORS.length);
  }
  return { word: COLORS[wordIdx].name, colorClass: COLORS[colorIdx].className, correctIdx: colorIdx };
}

export const ColorWord = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [question, setQuestion] = useState(generateQuestion);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const scoreRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setFinished(true);
          enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: scoreRef.current * 50 }, timestamp: Date.now() });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswer = (idx: number) => {
    if (finished) return;
    if (idx === question.correctIdx) {
      setScore(s => s + 1);
      scoreRef.current += 1;
      sfxCoin();
      setFlash('correct');
    } else {
      sfxPop();
      setFlash('wrong');
    }
    setTimeout(() => setFlash(null), 150);
    setQuestion(generateQuestion());
  };

  return (
    <div className={`min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors duration-75 ${flash === 'correct' ? '!bg-emerald-950' : flash === 'wrong' ? '!bg-red-950' : ''}`}>
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-slate-400 text-sm font-bold">맞힌 수</span><div className="text-white text-3xl font-black">{score}</div></div>
        <div className="text-right"><span className="text-slate-400 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>

      <h1 className="text-2xl font-black text-white mb-2 text-center relative z-10">색깔 읽기 챌린지</h1>
      <p className="text-slate-400 font-bold mb-8 text-center relative z-10 text-sm">
        글자의 <span className="text-yellow-400">뜻</span>이 아니라 글자의 <span className="text-cyan-400">색깔</span>을 터치하세요!
      </p>

      {/* 문제 표시 */}
      <div className="w-full max-w-sm h-32 bg-slate-900 rounded-2xl border-2 border-slate-700 flex items-center justify-center mb-8 relative z-10">
        <span className={`text-6xl font-black ${question.colorClass}`}>{question.word}</span>
      </div>

      {/* 색깔 선택 버튼 */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm relative z-10">
        {COLORS.map((c, i) => (
          <button key={i} onClick={() => handleAnswer(i)} className="py-5 rounded-2xl font-black text-xl text-white bg-slate-800 border-2 border-slate-700 active:scale-95 transition-transform hover:bg-slate-700">
            <span className={c.className}>●</span> {c.name}
          </button>
        ))}
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-6xl font-black text-purple-400 mb-4">{score}문제 정답!</div>
          <p className="text-xl text-white font-bold">+{score * 50}점 획득!</p>
        </div>
      )}
    </div>
  );
};
