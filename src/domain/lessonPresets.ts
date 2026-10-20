import { GAMES, type GameDef } from './gamesData';
import { resolveGuidedGameType } from './guidedMission';
import type { GameRoom, MissionTemplate } from './types';

export type LessonPreset = { roomId: string; game: GameDef; groups: number; minutes: number; goalPercent: 50 | 75 | 100 };

export function lessonPresets(rooms: GameRoom[], templates: Pick<MissionTemplate, 'id' | 'name' | 'buttons'>[], groups: { room_id: string }[]): LessonPreset[] {
  const byTemplate = new Map(templates.map(template => [template.id, template]));
  const counts = new Map<string, number>();
  for (const group of groups) counts.set(group.room_id, (counts.get(group.room_id) || 0) + 1);
  const seen = new Set<string>();
  return rooms.flatMap(room => {
    const template = byTemplate.get(room.template_id || '');
    if (!template || !Array.isArray(template.buttons) || template.buttons.length !== 1) return [];
    const gameType = resolveGuidedGameType(room.name, template.name, template.buttons, template.buttons[0].id);
    const game = GAMES.find(item => item.type === gameType);
    const groupCount = counts.get(room.id) || 0;
    if (!game || groupCount < 1 || groupCount > 8) return [];
    const minutes = room.setup_minutes ?? (room.status === 'waiting' ? Math.round((room.global_time_modifier + 300) / 60) : 40);
    const safeMinutes = minutes >= 5 && minutes <= 90 ? minutes : 40;
    const goalPercent: 50 | 75 | 100 = room.goal_percent === 50 || room.goal_percent === 100 ? room.goal_percent : 75;
    const key = `${game.type}:${groupCount}:${safeMinutes}:${goalPercent}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ roomId: room.id, game, groups: groupCount, minutes: safeMinutes, goalPercent }];
  }).slice(0, 5);
}
