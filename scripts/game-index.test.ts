import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderGameIndex } from './gen-game-index';
import { GAME_INDEX } from '../src/domain/gameIndex.generated';
import { GAMES } from '../src/domain/gamesData';

test('가벼운 활동 목록이 gamesData와 같다(다르면 npm run gen:game-index)', () => {
  assert.equal(readFileSync(new URL('../src/domain/gameIndex.generated.ts', import.meta.url), 'utf8'), renderGameIndex());
  assert.deepEqual(GAME_INDEX.map(([type, name]) => ({ type, name })), GAMES.map(({ type, name }) => ({ type, name })));
});

test('학생 폰 화면 경로는 gamesData를 직접 가져오지 않는다', () => {
  const guided = readFileSync(new URL('../src/domain/guidedMission.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(guided, /from '\.\/gamesData'/);
  const overlay = readFileSync(new URL('../src/presentation/components/minigames/MiniGameOverlay.tsx', import.meta.url), 'utf8');
  assert.match(overlay, /lazy/i);
});
