import { supabase } from '../../../data/supabase';
import * as LucideIcons from 'lucide-react';

interface Props {
  quiz: any;
  gameRoomId: string;
  groupId: string;
  enqueueAction: (action: any) => void;
  playVictory: () => void;
}

export const LegacyQuizGame = ({ quiz, gameRoomId, groupId, enqueueAction, playVictory }: Props) => {
  return (
    <div className="min-h-[100dvh] bg-indigo-950 flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none">
      <div className="absolute inset-0 bg-indigo-600/20 animate-pulse mix-blend-screen"></div>
      <LucideIcons.Gamepad2 className="w-24 h-24 text-indigo-400 mb-6 animate-bounce relative z-10" />
      <h1 className="text-4xl font-black text-white mb-2 text-center relative z-10">돌발 체육 퀴즈!</h1>
      <p className="text-indigo-300 font-bold mb-8 text-center relative z-10">가장 먼저 맞추는 조가 {quiz.reward}점을 차지합니다!</p>
      
      <div className="bg-white/10 backdrop-blur border border-white/20 p-6 rounded-2xl w-full max-w-md relative z-10 mb-6 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center leading-relaxed">{quiz.question}</h2>
        <div className="flex flex-col gap-3">
          {quiz.options.map((opt: string, idx: number) => (
            <button 
              key={idx}
              onClick={async () => {
                if (idx === quiz.answer) {
                  enqueueAction({ id: Math.random().toString(), type: 'INCREMENT_SCORE', payload: { id: groupId, amount: quiz.reward }, timestamp: Date.now() });
                  await supabase.from('game_rooms').update({ active_minigame: null }).eq('id', gameRoomId);
                  playVictory();
                  alert(`🎉 정답입니다! ${quiz.reward}점 획득!`);
                } else {
                  alert('❌ 오답입니다! 다른 조에게 기회가 넘어갑니다.');
                }
              }}
              className="w-full p-4 bg-white/5 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-lg text-left transition-colors"
            >
              {idx + 1}. {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
