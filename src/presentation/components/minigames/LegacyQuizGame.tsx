import { readStorage, writeStorage } from '../../../application/browserStorage';
import { GameIcons as LucideIcons } from '../../icons';
import { useRef, useState } from 'react';

interface QuizPayload {
  type?: string;
  run_id?: string;
  question: string;
  options: string[];
  answer: number;
  reward: number;
}

interface Props {
  quiz: QuizPayload;
  gameRoomId: string;
  groupId: string;
  enqueueAction: (action: {
    id: string;
    type: 'INCREMENT_SCORE';
    payload: { id: string; amount: number };
    timestamp: number;
  }) => void;
  playVictory: () => void;
}

export const LegacyQuizGame = ({ quiz, gameRoomId, groupId, enqueueAction, playVictory }: Props) => {
  const quizKey = `physical_quiz_done_${gameRoomId}_${groupId}_${quiz.run_id || quiz.question}`;
  const alreadyDone = readStorage(quizKey, 'session') === '1';
  const lockedRef = useRef(alreadyDone);
  const [locked, setLocked] = useState(alreadyDone);
  const [feedback, setFeedback] = useState(alreadyDone ? '이 퀴즈에 이미 참여했습니다.' : '');

  const submitAnswer = (index: number) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    writeStorage(quizKey, '1', 'session');
    if (index !== quiz.answer) {
      setFeedback('❌ 오답입니다. 다음 퀴즈에 다시 도전해 보세요!');
      return;
    }
    enqueueAction({
      id: crypto.randomUUID(),
      type: 'INCREMENT_SCORE',
      payload: { id: groupId, amount: quiz.reward },
      timestamp: Date.now(),
    });
    playVictory();
    setFeedback(`🎉 정답입니다! 우리 모둠 +${quiz.reward}점 획득!`);
  };

  return (
    <div className="min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-indigo-600/20 animate-pulse mix-blend-screen"></div>
      <LucideIcons.Gamepad2 className="w-24 h-24 text-blue-300 mb-6 animate-bounce relative z-10" />
      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">돌발 체육 퀴즈!</h1>
      <p className="text-blue-200 font-bold mb-8 text-center relative z-10">정답을 맞히면 우리 모둠이 {quiz.reward}점을 획득합니다!</p>
      
      <div className="bg-white/10 backdrop-blur border border-white/20 p-6 rounded-2xl w-full max-w-md relative z-10 mb-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center leading-relaxed">{quiz.question}</h2>
        <div className="flex flex-col gap-3">
          {quiz.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => submitAnswer(idx)}
              disabled={locked}
              className="w-full p-4 bg-white/5 hover:bg-white/20 disabled:opacity-50 border border-white/20 rounded-xl text-white font-bold text-lg text-left transition-colors"
            >
              {idx + 1}. {opt}
            </button>
          ))}
        </div>
        {feedback && <p role="status" className="mt-4 text-center font-bold text-blue-200">{feedback}</p>}
      </div>
    </div>
  );
};
