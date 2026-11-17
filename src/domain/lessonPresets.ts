import {getRemovedGame,isCleanedGame,liveActivityId} from './gameLifecycle';
import { AVAILABLE_GAMES, type GameDef } from './gamesData';
import { resolveGuidedGameType } from './guidedMission';
import { isSignatureId } from './signatureGames';
import type { GameRoom, MissionTemplate } from './types';

export type LessonPreset = { roomId: string; game: GameDef; groups: number; minutes: number | null };

export function lessonPresets(rooms: GameRoom[], templates: Pick<MissionTemplate, 'id' | 'name' | 'buttons'>[], groups: { room_id: string }[]): LessonPreset[] {
  const byTemplate = new Map(templates.map(template => [template.id, template]));
  const counts = new Map<string, number>();
  for (const group of groups) counts.set(group.room_id, (counts.get(group.room_id) || 0) + 1);
  const seen = new Set<string>();
  return rooms.flatMap(room => {
    const template = byTemplate.get(room.template_id || '');
    if (!template || !Array.isArray(template.buttons) || template.buttons.length !== 1) return [];
    const gameType = resolveGuidedGameType(room.name, template.name, template.buttons, template.buttons[0].id);
    // 합쳐지거나 정리된 활동으로 만든 지난 수업은 지금 쓰는 활동으로 바꿔 보여 준다.
    // 운영을 마친 예전 게임(정리로 합친 것이 아닌 것)은 선생님이 쓴 적 없는 대체 활동이 뜨지 않게 뺀다.
    const liveType = !gameType || (getRemovedGame(gameType) && !isCleanedGame(gameType)) ? '' : liveActivityId(gameType);
    const game = AVAILABLE_GAMES.find(item=>item.type===liveType);
    const groupCount = counts.get(room.id) || 0;
    // 대표 게임(sig-*)은 TV 한 대로 하는 게임이라 학생 기기 수업방 설정으로 다시 쓰지 않는다.
    if (!game || isSignatureId(game.type) || groupCount < 1 || groupCount > 8) return [];
    // Older rooms did not store the original duration. Their remaining-time
    // modifier may have changed during the lesson, so ask the teacher instead.
    const minutes = room.setup_minutes;
    const safeMinutes = typeof minutes === 'number' && minutes >= 5 && minutes <= 90 ? minutes : null;
    const key = `${game.type}:${groupCount}:${safeMinutes}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ roomId: room.id, game, groups: groupCount, minutes: safeMinutes }];
  }).slice(0, 5);
}
