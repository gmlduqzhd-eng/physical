import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAMES } from '../src/domain/gamesData';
import { EXPRESSION_GAMES } from '../src/presentation/components/minigames/expression/expressionGamesData';
import { getPhysicalActivityPlan, PHYSICAL_ACTIVITY_PLANS } from '../src/domain/physicalActivityPlans';

test('all 133 catalog games have a safe, accessible movement routine', () => {
  assert.equal(GAMES.length, 133);
  const expressionIds = new Set(EXPRESSION_GAMES.map(game => game.id));
  for (const game of GAMES) {
    const plan = getPhysicalActivityPlan(game.type, expressionIds.has(game.type));
    assert.ok(plan.activity && plan.alternative && plan.safety && plan.setup, game.type);
    assert.ok(plan.secondsPerTurn >= 15, game.type);
  }
  assert.deepEqual(PHYSICAL_ACTIVITY_PLANS.map(plan => plan.idea), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('ten proposed approaches reach their intended game families', () => {
  const representatives = ['zone_touch', 'red_green', 'jump', 'relay-mission-runner', 'rolling-curling', 'dance_pose', 'math', 'speed_circle', 'pulse-zone-target', 'stopwatch'];
  representatives.forEach((gameType, index) => assert.equal(getPhysicalActivityPlan(gameType).idea, index + 1));
  for (const game of EXPRESSION_GAMES) assert.equal(getPhysicalActivityPlan(game.id, true).idea, 6);
});
