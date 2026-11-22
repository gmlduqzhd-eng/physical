/**
 * 첫 화면용 가벼운 활동 자료. gamesData·phonePlayCatalog·lessonGameCatalog 전체를 받지 않고
 * 미리 만들어 둔 목록(homeIndex.generated.ts)만 본다. 결과는 큰 자료로 계산한 것과 같다(scripts/game-index.test.ts가 확인).
 */
import { HOME_COUNTS, HOME_FEATURED, HOME_GAMES, HOME_MERGED } from './homeIndex.generated';
import { QUICK_PICK_COUNT, type QuickSituationId } from './quickSituations';

export interface HomeGame { type: string; name: string; emoji: string }
export interface HomePick extends HomeGame { minutes: number; people: string }

const ALL = new Map(HOME_GAMES.map(([type, name, emoji, available]) => [type, { type, name, emoji, available }] as const));
/** 지금 쓸 수 있는 활동만 찾는다(AVAILABLE_GAMES.find와 같다). */
export function homeGame(id: string): HomeGame | undefined {
  const game = ALL.get(id);
  return game?.available ? { type: game.type, name: game.name, emoji: game.emoji } : undefined;
}
/** 활동 번호가 있는 번호인지(합쳐지거나 정리된 활동도 포함). */
export const isKnownGameId = (id: string) => ALL.has(id);
/** 합쳐진 활동이면 이어지는 활동 번호, 아니면 빈 값. */
export const mergedTargetId = (id: string): string | undefined => Object.hasOwn(HOME_MERGED, id) ? HOME_MERGED[id] : undefined;

export const HOME_GAME_COUNT = HOME_COUNTS.total;
export const HOME_PHONE_PLAY_COUNT = HOME_COUNTS.phone;
export const homeDomainCount = (name: string): number => (HOME_COUNTS.domains as Record<string, number>)[name] ?? 0;

const FEATURED: readonly (HomePick & { situations: readonly string[] })[] = HOME_FEATURED.flatMap(([type, minutes, people, situations]) => {
  const game = homeGame(type);
  return game ? [{ ...game, minutes, people, situations: situations.split(' ') }] : [];
});
/** 추천 활동(추천 순서 그대로). */
export const HOME_FEATURED_GAMES: readonly HomePick[] = FEATURED;

/** 상황에 맞는 추천 활동 전체(추천 순서 그대로). quickPicks.situationPool과 같은 결과다. */
export function homeSituationPool(id: QuickSituationId): HomePick[] {
  return FEATURED.filter(game => game.situations.includes(id));
}
/** 딱 3개를 고른다. quickPicks.quickPicks와 같은 결과다. */
export function homeQuickPicks(id: QuickSituationId, round = 0): HomePick[] {
  const pool = homeSituationPool(id);
  if (pool.length <= QUICK_PICK_COUNT) return pool;
  const start = ((Math.max(0, Math.floor(round)) * QUICK_PICK_COUNT) % pool.length + pool.length) % pool.length;
  return Array.from({ length: QUICK_PICK_COUNT }, (_, i) => pool[(start + i) % pool.length]);
}
