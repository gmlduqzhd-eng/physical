/**
 * 빠른 추천: "5분 남았어요"처럼 지금 상황을 누르면 추천 활동 가운데 딱 3개를 골라 준다.
 * 순수 함수라 같은 상황·같은 차례(round)면 늘 같은 3개가 나온다. '다른 3개'는 round를 올린다.
 */
import type { GameDef } from './gamesData';
import { FEATURED_GAMES } from './featuredGames';
import { FIT_SPACES, activityFit } from './activityFit';

export type QuickSituationId = 'five' | 'classroom' | 'noprep' | 'big';
export interface QuickSituation { id: QuickSituationId; label: string; emoji: string; note: string; hub: string }

const [CLASSROOM, GYM, FIELD] = FIT_SPACES;

export const QUICK_SITUATIONS: readonly QuickSituation[] = [
  { id: 'five', label: '5분 남았어요', emoji: '⏱', note: '준비물 없이 5분 안에 끝나는 활동이에요.', hub: '/hub?minutes=5' },
  { id: 'classroom', label: '교실에서', emoji: '🏫', note: '교실에서 할 수 있는 활동이에요.', hub: `/hub?where=${encodeURIComponent(CLASSROOM)}` },
  { id: 'noprep', label: '준비물 없이', emoji: '🙌', note: '준비물 없이 바로 하는 활동이에요.', hub: '/hub?collection=phone' },
  { id: 'big', label: '강당·운동장에서', emoji: '🏟', note: '넓은 곳에서 하는 활동이에요.', hub: `/hub?where=${encodeURIComponent(GYM)}` },
];

export const QUICK_PICK_COUNT = 3;

/** 화면을 띄우는 기기 한 대(교사 화면·휴대폰·태블릿·거치 기기)는 '준비물'로 치지 않는다. */
const DEVICE_PART = /^(교사 화면|스마트폰|휴대폰|태블릿|거치한 기기|모둠별)\s*\d*\s*대?$/;
/** "준비물 없음", "별도 준비물 없음", "별도 도구 없이 표현", "스피커 선택"처럼 따로 챙길 것이 없다는 말. */
const NONE_PART = /(준비물|도구)\s*(없음|없이|필요\s*없)|^스피커\s*선택$|^선택$/;

/** 준비물 칸 한 줄이 '따로 챙길 물건 없음'인지. 괄호 안 설명은 빼고 '·'로 나눈 조각을 모두 본다. */
export function isNoPrepItem(item: string): boolean {
  const parts = item.replace(/\([^)]*\)/g, '').split('·').map(part => part.trim()).filter(Boolean);
  return parts.length > 0 && parts.every(part => DEVICE_PART.test(part) || NONE_PART.test(part));
}

/** 수업 전에 표식·공·카드 같은 물건을 따로 놓지 않아도 되는 활동인지. */
export function needsNoSetup(game: GameDef): boolean {
  const items = game.equipment ?? [];
  if (!items.length) return true;
  return items.every(isNoPrepItem);
}

export function fitsSituation(game: GameDef, id: QuickSituationId): boolean {
  const fit = activityFit(game);
  // '5분 남았어요'는 지금 바로 시작해야 하니, 짧으면서 준비물을 놓을 필요가 없는 활동만 고른다.
  if (id === 'five') return fit.minutes <= 5 && needsNoSetup(game);
  if (id === 'classroom') return fit.spaces.includes(CLASSROOM);
  if (id === 'noprep') return needsNoSetup(game);
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
