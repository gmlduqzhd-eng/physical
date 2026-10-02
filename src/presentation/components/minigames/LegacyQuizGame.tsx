import { supabase } from '../../../data/supabase';
import { GameIcons as LucideIcons } from '../../icons';
import { useRef, useState } from 'react';

interface Props {
  quiz: any;
  gameRoomId: string;
  groupId: string;
  enqueueAction: (action: any) => void;
  playVictory: () => void;
}

export const LegacyQuizGame = ({ quiz, gameRoomId, groupId, enqueueAction, playVictory }: Props) => {
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState(false);
  const [feedback, setFeedback] = useState('');
  const submitAnswer = async (index: number) => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setLocked(true);
    if (index !== quiz.answer) { setFeedback('❌ 오답입니다. 다른 조의 답변을 기다려 주세요.'); return; }
    try {
      // Only the first answer for this exact quiz can claim the room row.
      const { data, error } = await supabase.from('game_rooms')
        .update({ active_minigame: null })
        .eq('id', gameRoomId)
        .eq('active_minigame', JSON.stringify(quiz))
        .select('id');
      if (error) throw error;
      if (!data?.length) { setFeedback('다른 조가 먼저 정답을 맞혔습니다.'); return; }
      enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: quiz.reward }, timestamp: Date.now() });
      playVictory();
      setFeedback(`🎉 정답입니다! ${quiz.reward}점 획득!`);
    } catch {
      lockedRef.current = false;
      setLocked(false);
      setFeedback('답변을 전송하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.');
    }
  };
  return (
    <div className="min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-indigo-600/20 animate-pulse mix-blend-screen"></div>
      <LucideIcons.Gamepad2 className="w-24 h-24 text-blue-300 mb-6 animate-bounce relative z-10" />
      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">돌발 체육 퀴즈!</h1>
      <p className="text-blue-200 font-bold mb-8 text-center relative z-10">가장 먼저 맞추는 조가 {quiz.reward}점을 차지합니다!</p>
      
      <div className="bg-white/10 backdrop-blur border border-white/20 p-6 rounded-2xl w-full max-w-md relative z-10 mb-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center leading-relaxed">{quiz.question}</h2>
        <div className="flex flex-col gap-3">
          {quiz.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={() => submitAnswer(idx)}
              disabled={locked}
              className="w-full p-4 bg-white/5 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-lg text-left transition-colors"
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
