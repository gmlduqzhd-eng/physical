import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxPop } from '../../../application/soundEffects';

interface Props {
  groupId: string;
  enqueueAction: (action: any) => void;
}

function generateProblem() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * 50) + 1;
      b = Math.floor(Math.random() * 50) + 1;
      answer = a + b;
      break;
    case '-':
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * a) + 1;
      answer = a - b;
      break;
    case '×':
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      answer = a * b;
      break;
    default:
      a = 1; b = 1; answer = 2;
  }

  // 4지선다 생성
  const choices = new Set<number>();
  choices.add(answer);
  while (choices.size < 4) {
    const fake = answer + (Math.floor(Math.random() * 20) - 10);
    if (fake !== answer && fake >= 0) choices.add(fake);
  }
  const shuffled = Array.from(choices).sort(() => Math.random() - 0.5);

  return { text: `${a} ${op} ${b} = ?`, answer, choices: shuffled };
}

export const MathSprint = ({ groupId, enqueueAction }: Props) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [finished, setFinished] = useState(false);
  const [problem, setProblem] = useState(generateProblem);
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

  const handleAnswer = (choice: number) => {
    if (finished) return;
    if (choice === problem.answer) {
      setScore(s => s + 1);
      scoreRef.current += 1;
      sfxCoin();
      setFlash('correct');
    } else {
      sfxPop();
      setFlash('wrong');
    }
    setTimeout(() => setFlash(null), 150);
    setProblem(generateProblem());
  };

  return (
    <div className={`min-h-[100dvh] bg-teal-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none transition-colors duration-75 ${flash === 'correct' ? '!bg-emerald-950' : flash === 'wrong' ? '!bg-red-950' : ''}`}>
      <div className="flex justify-between w-full max-w-sm mb-6 relative z-10">
        <div><span className="text-sky-300 text-sm font-bold">정답 수</span><div className="text-white text-3xl font-black">{score}</div></div>
        <div className="text-right"><span className="text-sky-300 text-sm font-bold">남은 시간</span><div className={`text-3xl font-black ${timeLeft <= 5 ? 'text-red-500' : 'text-white'}`}>{timeLeft}초</div></div>
      </div>

      <h1 className="text-2xl font-black text-white mb-2 text-center relative z-10">⚡ 계산왕 스프린트</h1>
      <p className="text-sky-200 font-bold mb-8 text-center relative z-10 text-sm">정답을 빠르게 터치하세요!</p>

      <div className="w-full max-w-sm h-28 bg-slate-900 rounded-2xl border-2 border-white/20 flex items-center justify-center mb-8 relative z-10 shadow-lg">
        <span className="text-5xl font-black text-white">{problem.text}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm relative z-10">
        {problem.choices.map((c, i) => (
          <button key={`${c}-${i}`} onClick={() => handleAnswer(c)} className="py-6 rounded-2xl font-black text-3xl text-white bg-slate-800/90 border-2 border-white/20 active:scale-95 hover:bg-slate-700 hover:border-white/40 transition-all shadow-md">
            {c}
          </button>
        ))}
      </div>

      {finished && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
          <div className="text-6xl font-black text-sky-300 mb-4">{score}문제 정답!</div>
          <p className="text-xl text-white font-bold">+{score * 50}점 획득!</p>
        </div>
      )}
    </div>
  );
};
