import type { GameRoom } from '../../../domain/types';
import { VolcanoGame } from './VolcanoGame';
import { TelepathyGame } from './TelepathyGame';
import { TugOfWarGame } from './TugOfWarGame';
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

  switch (minigame.type) {
    case 'volcano':
      return <VolcanoGame gameRoom={gameRoom} groupId={groupId} enqueueAction={enqueueAction} />;
    case 'telepathy':
      return <TelepathyGame gameRoom={gameRoom} groupId={groupId} enqueueAction={enqueueAction} />;
    case 'tug_of_war':
      return <TugOfWarGame gameRoom={gameRoom} groupId={groupId} enqueueAction={enqueueAction} />;
    case 'bomb':
      return <LegacyBombGame bomb={minigame} groupId={groupId} template={template} handleMissionComplete={handleMissionComplete} setShowScanner={setShowScanner} />;
    case 'quiz':
      return <LegacyQuizGame quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
    default:
      // Fallback for quiz if type is undefined (legacy compatibility)
      if (minigame.question) {
        return <LegacyQuizGame quiz={minigame} gameRoomId={gameRoom.id} groupId={groupId} enqueueAction={enqueueAction} playVictory={playVictory} />;
      }
      return null;
  }
};
