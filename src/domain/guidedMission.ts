import {LEGACY_GAME_NAMES} from './legacyGameNames';
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
  const matches=GAMES.filter(item=>item.name===roomName||LEGACY_GAME_NAMES[item.type]===roomName);
  return matches.length===1&&mission.title===`${roomName} 활동 완료`?matches[0].type:null;
}
