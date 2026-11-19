/**
 * 빠른 추천: "5분 남았어요"처럼 지금 상황을 누르면 추천 활동 가운데 딱 3개를 골라 준다.
 * 순수 함수라 같은 상황·같은 차례(round)면 늘 같은 3개가 나온다. '다른 3개'는 round를 올린다.
 */
import type { GameDef } from './gamesData';
import { FEATURED_GAMES } from './featuredGames';
import { FIT_SPACES, activityFit } from './activityFit';
import { PHONE_PLAY_BY_ID } from './phonePlayCatalog';

export type QuickSituationId = 'five' | 'classroom' | 'noprep' | 'big';
export interface QuickSituation { id: QuickSituationId; label: string; emoji: string; note: string; hub: string }

const [CLASSROOM, GYM, FIELD] = FIT_SPACES;

export const QUICK_SITUATIONS: readonly QuickSituation[] = [
  { id: 'five', label: '5분 남았어요', emoji: '⏱', note: '5분 안에 끝나는 활동이에요.', hub: '/hub?minutes=5' },
  { id: 'classroom', label: '교실에서', emoji: '🏫', note: '교실에서 할 수 있는 활동이에요.', hub: `/hub?where=${encodeURIComponent(CLASSROOM)}` },
  { id: 'noprep', label: '준비물 없이', emoji: '🙌', note: '준비물 없이 바로 하는 활동이에요.', hub: '/hub?collection=phone' },
  { id: 'big', label: '강당·운동장에서', emoji: '🏟', note: '넓은 곳에서 하는 활동이에요.', hub: `/hub?where=${encodeURIComponent(GYM)}` },
];

export const QUICK_PICK_COUNT = 3;

export function fitsSituation(game: GameDef, id: QuickSituationId): boolean {
  const fit = activityFit(game);
  if (id === 'five') return fit.minutes <= 5;
  if (id === 'classroom') return fit.spaces.includes(CLASSROOM);
  if (id === 'noprep') return PHONE_PLAY_BY_ID.has(game.type) || (game.equipment?.length ?? 0) === 0;
  return fit.spaces.includes(GYM) || fit.spaces.includes(FIELD);
}

/** 상황에 맞는 추천 활동 전체(추천 순서 그대로). */
export function situationPool(id: QuickSituationId, games: readonly GameDef[] = FEATURED_GAMES): GameDef[] {
  return games.filter(game => fitsSituation(game, id));
}

/**
 * 딱 3개를 고른다. round가 오를 때마다 다음 3개로 넘어가고, 끝에 닿으면 처음으로 돌아온다.
 * 맞는 활동이 3개보다 적으면 있는 만큼만 준다.
 */
export function quickPicks(id: QuickSituationId, round = 0, games: readonly GameDef[] = FEATURED_GAMES): GameDef[] {
  const pool = situationPool(id, games);
  if (pool.length <= QUICK_PICK_COUNT) return pool;
  const start = ((Math.max(0, Math.floor(round)) * QUICK_PICK_COUNT) % pool.length + pool.length) % pool.length;
  return Array.from({ length: QUICK_PICK_COUNT }, (_, i) => pool[(start + i) % pool.length]);
}
