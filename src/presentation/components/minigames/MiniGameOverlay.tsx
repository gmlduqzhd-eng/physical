import { Suspense, useState } from 'react';
import '../../GameTheme.css';
import type { GameRoom } from '../../../domain/types';
import { lazyWithRetry } from '../../../application/lazyWithRetry';
import { ActivityLoading } from './lazyActivities';

// 어떤 활동을 띄울지 고르는 부분과 활동 화면은 활동이 시작될 때만 받는다(학생 폰 첫 화면을 가볍게).
const MiniGameContent = lazyWithRetry(() => import('./MiniGameContent'), m => m.MiniGameContent);

interface Props {
  gameRoom: GameRoom;
  groupId: string;
  template: any;
  handleMissionComplete: any;
  setShowScanner: any;
  enqueueAction: any;
  playVictory: any;
}

export const MiniGameOverlay = ({ gameRoom, groupId, template, handleMissionComplete, setShowScanner, enqueueAction: enqueueOriginal, playVictory }: Props) => {
  const [dismissedRunId, setDismissedRunId] = useState<string | null>(null);

  if (!gameRoom.active_minigame) return null;

  const minigame = gameRoom.active_minigame;
  const enqueueAction = (action: {payload: Record<string,unknown>;[key:string]:unknown}) => {
    const details=action.payload.details as {participation?:string}|undefined;
    if(details?.participation==='observed'||details?.participation==='rested')return;
    enqueueOriginal({...action,payload:{...action.payload,activityId:minigame.type??'classroom-extra'}});
  };
  const runId = minigame.run_id || `${minigame.type}_${minigame.end_time || minigame.target_time || minigame.explodesAt || ''}`;
  if (dismissedRunId === runId) return null;

  const sessionKey = `${gameRoom.id}:${groupId}:${JSON.stringify(minigame)}`;

  return (
    <div className="warm-game relative z-[9999]">
      {minigame.type !== 'bomb' && (
        <button
          onClick={() => setDismissedRunId(runId)}
          className="fixed top-4 right-4 z-[10001] px-3.5 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white text-xs font-bold border border-white/20 backdrop-blur-md shadow-lg transition-all"
        >
          ✕ 닫기
        </button>
      )}
      <Suspense fallback={<ActivityLoading/>}><MiniGameContent gameRoom={gameRoom} minigame={minigame} groupId={groupId} template={template} handleMissionComplete={handleMissionComplete} setShowScanner={setShowScanner} playVictory={playVictory} sessionKey={sessionKey} enqueueAction={enqueueAction} onDismiss={() => setDismissedRunId(runId)}/></Suspense>
    </div>
  );
};
