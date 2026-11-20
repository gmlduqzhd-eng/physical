import {LEGACY_GAME_NAMES} from './legacyGameNames';
// 학생 폰 화면도 이 파일을 쓰므로 큰 gamesData 대신 종류·이름만 담은 목록을 쓴다.
import { GAME_INDEX } from './gameIndex.generated';
const GAMES = GAME_INDEX.map(([type, name]) => ({ type, name }));
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

/** A lesson room can run several activities in a row. Each is one guided mission; the last one is current. */
export const MAX_LESSON_ACTIVITIES = 8;
export interface GuidedEntry { mission: MissionButton; gameType: string; order: number }

export function guidedEntries(roomName: string | undefined, templateName: string | undefined, buttons: MissionButton[] | undefined | null): GuidedEntry[] {
  if (!Array.isArray(buttons)) return [];
  return buttons.flatMap(mission => {
    const gameType = resolveGuidedGameType(roomName, templateName, buttons, mission.id);
    return gameType ? [{ mission, gameType }] : [];
  }).map((entry, index) => ({ ...entry, order: index + 1 }));
}
export const currentGuidedEntry = (roomName: string | undefined, templateName: string | undefined, buttons: MissionButton[] | undefined | null) =>
  guidedEntries(roomName, templateName, buttons).at(-1);

/**
 * Mission list after the teacher moves the class to another activity. Earlier missions are kept so their
 * completion records stay readable. Returns a reason instead of a list when the change is not allowed.
 */
export function withNextActivity(
  roomName: string | undefined, templateName: string | undefined, buttons: MissionButton[] | undefined | null,
  next: { type: string; name: string }, newId: string,
): { buttons: MissionButton[] } | { error: string } {
  const entries = guidedEntries(roomName, templateName, buttons);
  if (!Array.isArray(buttons) || !entries.length) return { error: '안내형 수업방에서만 활동을 바꿀 수 있어요.' };
  if (!GAMES.some(game => game.type === next.type)) return { error: '목록에 없는 활동이에요.' };
  if (entries.at(-1)!.gameType === next.type) return { error: '지금 하고 있는 활동이에요. 다른 활동을 골라 주세요.' };
  if (entries.length >= MAX_LESSON_ACTIVITIES) return { error: `한 수업방에서는 활동을 ${MAX_LESSON_ACTIVITIES}개까지 이어갈 수 있어요.` };
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(newId) || buttons.some(button => button.id === newId)) return { error: '활동을 준비하지 못했어요. 다시 시도해 주세요.' };
  // Older rooms recognised their single mission by name. Store its game explicitly before a second mission is added.
  const kept = buttons.map(button => { const found = entries.find(entry => entry.mission.id === button.id); return found && !button.gameType ? { ...button, gameType: found.gameType } : button; });
  return { buttons: [...kept, {
    id: newId, title: `${next.name} 활동 완료`, desc: '게임을 끝내면 완료로 기록돼요.',
    amount: 10, cooldown: 0, iconName: 'Flag', color: 'text-cyan-600', bg: 'bg-cyan-50', requires_approval: true, gameType: next.type,
  }] };
}
