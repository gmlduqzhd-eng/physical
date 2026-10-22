import {RetiredGameNotice} from './common/RetiredGameNotice';
import {EXPEDITION_BY_ID} from '../../../domain/expeditionGames';
import {ExpeditionActivity} from './expedition/ExpeditionActivity';
import {getMergedGame,getRemovedGame} from '../../../domain/gameLifecycle';
import {ConsolidatedActivity} from './common/ConsolidatedActivity';
import {isSafetyLessonId} from '../../../domain/safetyLessons';
import {SafetyLesson} from './common/SafetyLesson';
import { useState } from 'react';
import { isQuestId } from '../../../domain/movementQuests';
import { MovementQuest } from './common/MovementQuest';
import '../../GameTheme.css';
import type { GameRoom } from '../../../domain/types';
import { TelepathyGame } from './TelepathyGame';
import { ShakeGame } from './ShakeGame';
import { MemoryGame } from './MemoryGame';
import { StopwatchGame } from './StopwatchGame';
import { NumberGridGame } from './NumberGridGame';
import { WhackAMoleGame } from './WhackAMoleGame';
import { LegacyBombGame } from './LegacyBombGame';
import { LegacyQuizGame } from './LegacyQuizGame';

interface Props {
  gameRoom: GameRoom;
  groupId: string;
  template: any;
  handleMissionComplete: any;
  setShowScanner: any;
  enqueueAction: any;
  playVictory: any;
}

export const MiniGameOverlay = ({ gameRoom, groupId, template, handleMissionComplete, setShowScanner, enqueueAction, playVictory }: Props) => {
  const [dismissedRunId, setDismissedRunId] = useState<string | null>(null);

  if (!gameRoom.active_minigame) return null;

  const minigame = gameRoom.active_minigame;
  const runId = minigame.run_id || `${minigame.type}_${minigame.end_time || minigame.target_time || minigame.explodesAt || ''}`;
  if (dismissedRunId === runId) return null;

  const sessionKey = `${gameRoom.id}:${groupId}:${JSON.stringify(minigame)}`;

  const renderContent = () => {
    const eventType=minigame.type==='team_battle'?(minigame.subType||'volcano'):minigame.type;
    if(getRemovedGame(eventType))return <RetiredGameNotice id={eventType} roomId={gameRoom.id} groupId={groupId}/>;
    const complete=(action:{payload:{id:string;amount:number;details?:import('../../../domain/gameResultDetails').GameResultDetails}})=>enqueueAction({id:crypto.randomUUID(),type:'INCREMENT_SCORE',payload:{...action.payload,id:groupId},timestamp:Date.now()});
    const native=EXPEDITION_BY_ID.get(eventType);if(native?.kind==='B'&&!getMergedGame(eventType))return <ExpeditionActivity game={native} groupId={groupId} solo={false} enqueueAction={complete}/>;
    const merged=getMergedGame(eventType);if(merged)return <ConsolidatedActivity key={sessionKey} targetId={merged.target} selected={merged.id} solo={false} groupId={groupId} enqueueAction={complete}>{null}</ConsolidatedActivity>;
    if(isSafetyLessonId(minigame.type))return <SafetyLesson key={sessionKey} gameId={minigame.type} groupId={groupId} enqueueAction={enqueueAction}/>;
    if(isQuestId(minigame.type)) return <MovementQuest key={sessionKey} gameId={minigame.type} groupId={groupId} enqueueAction={enqueueAction}/>;
    switch (minigame.type) {
      case 'telepathy':
        return <TelepathyGame key={sessionKey} gameRoom={gameRoom} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'shake':
        return <ShakeGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'memory':
        return <MemoryGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'stopwatch':
        return <StopwatchGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'number_grid':
        return <NumberGridGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'whack_a_mole':
        return <WhackAMoleGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'bomb':
        return <LegacyBombGame key={sessionKey} bomb={minigame} groupId={groupId} template={template} handleMissionComplete={handleMissionComplete} setShowScanner={setShowScanner} />;
      case 'quiz':
        return <LegacyQuizGame key={sessionKey} quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
      case 'team_battle':
        return <RetiredGameNotice id="volcano" roomId={gameRoom.id} groupId={groupId}/>;
      default:
        // Fallback for quiz if type is undefined (legacy compatibility)
        if (minigame.question) {
          return <LegacyQuizGame key={sessionKey} quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
        }
        return null;
    }
  };

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
      {renderContent()}
    </div>
  );
};
