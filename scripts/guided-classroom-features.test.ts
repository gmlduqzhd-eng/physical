import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../src/domain/gamesData';
import { lessonPresets } from '../src/domain/lessonPresets';
import type { GameRoom, MissionTemplate } from '../src/domain/types';

const game = GAMES[0];
const template = { id: 'template-1', name: game.name, buttons: [{ id: 'mission-1', title: `${game.name} 활동 완료`, desc: '', amount: 10, cooldown: 0, iconName: 'Flag', color: '', bg: '', requires_approval: true, gameType: game.type }] } as MissionTemplate;
const room = (id: string, overrides: Partial<GameRoom> = {}) => ({ id, template_id: template.id, name: game.name, status: 'finished', global_time_modifier: 2100, setup_minutes: 30, goal_percent: 75, ...overrides }) as GameRoom;

test('lesson reuse keeps the latest guided setup and ignores unrelated rooms', () => {
  const rooms = [room('latest'), room('duplicate', { goal_percent: 50 }), room('legacy', { template_id: 'non-guided' })];
  const groups = [...Array.from({ length: 6 }, () => ({ room_id: 'latest' })), ...Array.from({ length: 6 }, () => ({ room_id: 'duplicate' }))];
  const result = lessonPresets(rooms, [template, { ...template, id: 'non-guided', buttons: [{ ...template.buttons[0], requires_approval: false }] }], groups);
  assert.equal(result.length, 1);
  assert.deepEqual({ id: result[0].roomId, groups: result[0].groups, minutes: result[0].minutes }, { id: 'latest', groups: 6, minutes: 30 });
});

test('legacy lessons never claim a duration that was not saved', () => {
  const result = lessonPresets([room('old', { setup_minutes: null, status: 'finished', global_time_modifier: 90 })], [template], [{ room_id: 'old' }]);
  assert.equal(result[0].minutes, null);
});
