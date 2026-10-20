import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../src/domain/gamesData';
import { guidedGoal } from '../src/domain/guidedGoal';
import { lessonPresets } from '../src/domain/lessonPresets';
import type { GameRoom, MissionTemplate, RoomGroup } from '../src/domain/types';

const game = GAMES[0];
const template = { id: 'template-1', name: game.name, buttons: [{ id: 'mission-1', title: `${game.name} 활동 완료`, desc: '', amount: 10, cooldown: 0, iconName: 'Flag', color: '', bg: '', requires_approval: true, gameType: game.type }] } as MissionTemplate;
const room = (id: string, overrides: Partial<GameRoom> = {}) => ({ id, template_id: template.id, name: game.name, status: 'finished', global_time_modifier: 2100, setup_minutes: 30, goal_percent: 75, ...overrides }) as GameRoom;

test('lesson reuse keeps the latest guided setup and ignores unrelated rooms', () => {
  const rooms = [room('latest'), room('duplicate'), room('legacy', { template_id: 'non-guided' })];
  const groups = [...Array.from({ length: 6 }, () => ({ room_id: 'latest' })), ...Array.from({ length: 6 }, () => ({ room_id: 'duplicate' }))];
  const result = lessonPresets(rooms, [template, { ...template, id: 'non-guided', buttons: [{ ...template.buttons[0], requires_approval: false }] }], groups);
  assert.equal(result.length, 1);
  assert.deepEqual({ id: result[0].roomId, groups: result[0].groups, minutes: result[0].minutes, goal: result[0].goalPercent }, { id: 'latest', groups: 6, minutes: 30, goal: 75 });
});

test('legacy lessons never claim a duration that was not saved', () => {
  const result = lessonPresets([room('old', { setup_minutes: null, status: 'finished', global_time_modifier: 90 })], [template], [{ room_id: 'old' }]);
  assert.equal(result[0].minutes, null);
});

test('collective goal counts approved groups, caps progress, and never succeeds with zero groups', () => {
  const groups = [
    { id: 'a', completed_missions: ['mission-1'] },
    { id: 'b', completed_missions: ['other'] },
    { id: 'c', completed_missions: ['mission-1'] },
    { id: 'd', completed_missions: ['mission-1'] },
  ] as RoomGroup[];
  assert.deepEqual(guidedGoal(groups, ['mission-1'], 75), { total: 4, completed: 3, target: 3, percent: 75, progress: 100, achieved: true });
  assert.equal(guidedGoal(groups, ['mission-1'], 50).progress, 100);
  assert.equal(guidedGoal([], ['mission-1'], 75).achieved, false);
});
