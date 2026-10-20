import type { RoomGroup } from './types';

export function guidedGoal(groups: Pick<RoomGroup, 'id' | 'completed_missions'>[], missionIds: string[], percent: number) {
  const ids = new Set(missionIds);
  const total = groups.length;
  const completed = groups.filter(group => group.completed_missions?.some(id => ids.has(id))).length;
  const safePercent = percent === 50 || percent === 100 ? percent : 75;
  const target = Math.ceil(total * safePercent / 100);
  return { total, completed, target, percent: safePercent, progress: target ? Math.min(100, Math.round(completed / target * 100)) : 0, achieved: target > 0 && completed >= target };
}
