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
  if (!gameRoom.active_minigame) return null;

  const minigame = gameRoom.active_minigame;
  const sessionKey = `${gameRoom.id}:${groupId}:${JSON.stringify(minigame)}`;

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
    default:
      // Fallback for quiz if type is undefined (legacy compatibility)
      if (minigame.question) {
        return <LegacyQuizGame key={sessionKey} quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
      }
      return null;
  }
};
