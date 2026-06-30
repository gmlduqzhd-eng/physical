import * as LucideIcons from 'lucide-react';
import type { MissionButton } from '../../../domain/types';

interface Props {
  bomb: any;
  groupId: string;
  template: any;
  handleMissionComplete: (m: MissionButton, e: any) => void;
  setShowScanner: (s: boolean) => void;
}

export const LegacyBombGame = ({ bomb, groupId, template, handleMissionComplete, setShowScanner }: Props) => {
  const isHolder = bomb.holderId === groupId;
  
  return (
    <div className={`min-h-[100dvh] ${isHolder ? 'bg-red-950 animate-pulse' : 'bg-slate-900'} flex flex-col items-center justify-center p-6 relative overflow-hidden z-[9999] select-none`}>
      {isHolder && <div className="absolute inset-0 bg-red-600/30 mix-blend-multiply animate-[pulse_0.5s_ease-in-out_infinite]"></div>}
      <LucideIcons.Bomb className={`w-32 h-32 ${isHolder ? 'text-red-500 animate-bounce' : 'text-slate-600'} mb-6 relative z-10`} />
      
      <h1 className={`text-4xl font-black mb-4 text-center relative z-10 ${isHolder ? 'text-red-400 glitch-text' : 'text-slate-400'}`}>
        {isHolder ? '당신에게 폭탄이 있습니다!!' : '폭탄 돌리기 진행 중...'}
      </h1>
      
      {isHolder ? (
        <p className="text-xl text-red-200 font-bold mb-8 text-center relative z-10">
          빨리 미션을 하나 완료해서<br/>다른 조에게 폭탄을 넘기세요!
        </p>
      ) : (
        <p className="text-xl text-slate-500 font-bold mb-8 text-center relative z-10">
          다른 조가 폭탄을 들고 있습니다.<br/>언제 넘어올지 모르니 대비하세요!
        </p>
      )}
      
      {isHolder && (
        <button onClick={() => setShowScanner(true)} className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xl shadow-[0_0_20px_rgba(220,38,38,0.6)] border border-red-400 relative z-10 mb-6 flex items-center gap-2">
          <LucideIcons.ScanLine className="w-6 h-6" /> 미션 QR 스캔하기!
        </button>
      )}

      {isHolder && (
        <div className="w-full max-w-md relative z-10 grid grid-cols-2 gap-4">
          {template?.buttons?.filter((m: MissionButton) => !m.isHidden).slice(0, 4).map((m: MissionButton) => (
            <button 
              key={m.id}
              onClick={(e) => handleMissionComplete(m, e)}
              className={`p-4 rounded-xl font-bold flex flex-col items-center gap-2 border-2 ${m.bg} ${m.color}`}
            >
              {m.title}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
