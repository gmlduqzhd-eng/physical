import {getMergedGame} from './gameLifecycle';
import type { ExpeditionRound } from './expeditionRules';

export const REVAMPED_EXPEDITION_IDS = ['exp-phone-03','exp-phone-05','exp-phone-06','exp-phone-07','exp-phone-12','exp-phone-24','exp-phone-30','exp-phone-31','exp-phone-33','exp-phone-35','exp-phone-36','exp-phone-37','exp-phone-38','exp-phone-39','exp-tablet-01','exp-tablet-03','exp-tablet-06','exp-tablet-07','exp-tablet-09','exp-tablet-21','exp-tablet-24','exp-tablet-26','exp-tablet-32','exp-tablet-34','exp-tablet-35','exp-tablet-36','exp-tablet-37','exp-tablet-39','exp-tablet-42'] as const;
export const isRevampedExpedition = (id: string) => (REVAMPED_EXPEDITION_IDS as readonly string[]).includes(id)||!!getMergedGame(id);

// Timed comparison challenges retain their target and clock. Other activities
// provide more time without changing routes, answers, roles or scoring goals.
export function paceExpedition(plans: ExpeditionRound[], gentle: boolean): ExpeditionRound[] {
  return plans.map(plan => ({...plan, steps: plan.steps.map(step => ({...step, seconds: gentle && !plan.timing ? Math.ceil(step.seconds * 1.3) : step.seconds}))}));
}

export function expeditionRehearsal(plan: ExpeditionRound): ExpeditionRound {
  return {...plan, title: '점수 없는 연습 · '+plan.title, timing: undefined, steps: [{...plan.steps[0], seconds: 8}]};
}
