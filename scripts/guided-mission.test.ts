import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGuidedGameType } from '../src/domain/guidedMission';
import type { MissionButton } from '../src/domain/types';

const makeMission = (changes: Partial<MissionButton> = {}): MissionButton => ({
  id: 'mission-1', title: '심박 탐정단 활동 완료', desc: '', amount: 10,
  cooldown: 0, iconName: 'Flag', color: '', bg: '', requires_approval: true,
  ...changes,
});

test('new guided mission resolves its explicit game', () => {
  assert.equal(resolveGuidedGameType('심박 탐정단', '심박 탐정단', [makeMission({ gameType: 'pulse-detective' })], 'mission-1'), 'pulse-detective');
});

test('older single-mission guided classroom uses the same game result flow', () => {
  assert.equal(resolveGuidedGameType('심박 탐정단', '심박 탐정단', [makeMission()], 'mission-1'), 'pulse-detective');
});

test('unrelated and unapproved missions cannot be mistaken for guided games', () => {
  assert.equal(resolveGuidedGameType('심박 탐정단', '심박 탐정단', [makeMission({ id: 'other' })], 'mission-1'), null);
  assert.equal(resolveGuidedGameType('심박 탐정단', '심박 탐정단', [makeMission({ requires_approval: false })], 'mission-1'), null);
  assert.equal(resolveGuidedGameType('심박 탐정단', '다른 템플릿', [makeMission()], 'mission-1'), null);
  assert.equal(resolveGuidedGameType('심박 탐정단', '심박 탐정단', [makeMission(), makeMission({ id: 'mission-2' })], 'mission-1'), null);
});
