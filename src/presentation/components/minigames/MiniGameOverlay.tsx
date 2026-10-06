import { useState } from 'react';
import type { GameRoom } from '../../../domain/types';
import { VolcanoGame } from './VolcanoGame';
import { TelepathyGame } from './TelepathyGame';
import { TugOfWarGame } from './TugOfWarGame';
import { ShakeGame } from './ShakeGame';
import { MemoryGame } from './MemoryGame';
import { StopwatchGame } from './StopwatchGame';
import { NumberGridGame } from './NumberGridGame';
import { FateCardGame } from './FateCardGame';
import { WhackAMoleGame } from './WhackAMoleGame';
import { ScreamGame } from './ScreamGame';
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
    switch (minigame.type) {
      case 'volcano':
        return <VolcanoGame key={sessionKey} gameRoom={gameRoom} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'telepathy':
        return <TelepathyGame key={sessionKey} gameRoom={gameRoom} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'tug_of_war':
        return <TugOfWarGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'shake':
        return <ShakeGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'memory':
        return <MemoryGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'stopwatch':
        return <StopwatchGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'number_grid':
        return <NumberGridGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'fate_card':
        return <FateCardGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'whack_a_mole':
        return <WhackAMoleGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'scream':
        return <ScreamGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />;
      case 'bomb':
        return <LegacyBombGame key={sessionKey} bomb={minigame} groupId={groupId} template={template} handleMissionComplete={handleMissionComplete} setShowScanner={setShowScanner} />;
      case 'quiz':
        return <LegacyQuizGame key={sessionKey} quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
      case 'team_battle':
        return minigame.subType === 'tug_of_war'
          ? <TugOfWarGame key={sessionKey} groupId={groupId} enqueueAction={enqueueAction} />
          : <VolcanoGame key={sessionKey} gameRoom={gameRoom} groupId={groupId} enqueueAction={enqueueAction} />;
      default:
        // Fallback for quiz if type is undefined (legacy compatibility)
        if (minigame.question) {
          return <LegacyQuizGame key={sessionKey} quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
        }
        return null;
    }
  };

  return (
    <div className="relative z-[9999]">
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
