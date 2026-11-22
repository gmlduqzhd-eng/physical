import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderHomeIndex, peopleLabel } from './gen-game-index';
import { AVAILABLE_GAMES, GAMES } from '../src/domain/gamesData';
import { PHONE_PLAYS } from '../src/domain/phonePlayCatalog';
import { FEATURED_GAMES } from '../src/domain/featuredGames';
import { MERGED_GAMES, getMergedGame } from '../src/domain/gameLifecycle';
import { QUICK_SITUATIONS, quickPicks, situationPool } from '../src/domain/quickPicks';
import { activityFit } from '../src/domain/activityFit';
import { HOME_FEATURED_GAMES, HOME_GAME_COUNT, HOME_PHONE_PLAY_COUNT, homeDomainCount, homeGame, homeQuickPicks, homeSituationPool, isKnownGameId, mergedTargetId } from '../src/domain/homeCatalog';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('첫 화면용 목록이 큰 자료와 같다(다르면 npm run gen:game-index)', () => {
  assert.equal(read('src/domain/homeIndex.generated.ts'), renderHomeIndex());
  assert.equal(HOME_GAME_COUNT, AVAILABLE_GAMES.length);
  assert.equal(HOME_PHONE_PLAY_COUNT, PHONE_PLAYS.length);
  for (const name of ['운동', '스포츠', '표현']) assert.equal(homeDomainCount(name), AVAILABLE_GAMES.filter(game => game.domain === name).length);
  for (const game of GAMES) {
    assert.ok(isKnownGameId(game.type));
    const available = AVAILABLE_GAMES.find(g => g.type === game.type);
    assert.deepEqual(homeGame(game.type), available ? { type: available.type, name: available.name, emoji: available.emoji } : undefined);
  }
  assert.equal(isKnownGameId('no-such-game'), false);
  for (const { id } of MERGED_GAMES) assert.equal(mergedTargetId(id), getMergedGame(id)?.target);
  assert.equal(mergedTargetId('sig-boss-raid'), undefined);
  assert.equal(mergedTargetId('constructor'), undefined);
});

test('첫 화면의 추천 활동·빠른 추천이 원래 계산과 같다', () => {
  assert.deepEqual(HOME_FEATURED_GAMES.map(g => g.type), FEATURED_GAMES.map(g => g.type));
  for (const game of FEATURED_GAMES) {
    const light = HOME_FEATURED_GAMES.find(g => g.type === game.type)!;
    assert.equal(light.minutes, activityFit(game).minutes);
    assert.equal(light.people, peopleLabel(game));
    assert.equal(light.name, game.name);
    assert.equal(light.emoji, game.emoji);
  }
  for (const s of QUICK_SITUATIONS) {
    assert.deepEqual(homeSituationPool(s.id).map(g => g.type), situationPool(s.id).map(g => g.type));
    for (let round = 0; round < 30; round++) assert.deepEqual(homeQuickPicks(s.id, round).map(g => g.type), quickPicks(s.id, round).map(g => g.type));
  }
});

test('첫 화면은 큰 활동 자료와 zod를 직접 가져오지 않는다', () => {
  const heavy = /from '[^']*(gamesData|phonePlayCatalog|featuredGames|activityFit|lessonGameCatalog|gameLifecycle|playRecipes|quickPicks)(\.js)?'/;
  for (const file of ['src/presentation/UnifiedHomePage.tsx', 'src/presentation/components/QuickPicks.tsx', 'src/presentation/components/FeaturedExperiences.tsx', 'src/application/recentActivities.ts', 'src/application/useActivityFavorites.ts', 'src/domain/homeCatalog.ts', 'src/domain/quickSituations.ts'])
    assert.doesNotMatch(read(file), heavy, file);
  assert.doesNotMatch(read('src/domain/primaryExperiences.ts'), /from 'zod'|playRecipes\.js|expeditionWorkshop/);
});
