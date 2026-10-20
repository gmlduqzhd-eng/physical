import { GAMES } from './gamesData';
import type { MissionButton } from './types';

/** Recognize guided lessons created before gameType was stored in the template. */
export function resolveGuidedGameType(
  roomName: string | undefined,
  templateName: string | undefined,
  buttons: MissionButton[],
  missionId: string,
): string | null {
  const mission = buttons.find(button => button.id === missionId);
  if (!mission?.requires_approval) return null;
  if (mission.gameType) return GAMES.some(game => game.type === mission.gameType) ? mission.gameType : null;
  if (buttons.length !== 1 || !roomName || roomName !== templateName) return null;
  const game = GAMES.find(item => item.name === roomName);
  return game && mission.title === `${game.name} 활동 완료` ? game.type : null;
}
