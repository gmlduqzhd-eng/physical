/**
 * 지난번에 한 활동(최근에 연 활동). 이 기기에만 저장하고 서버로 보내지 않는다.
 * 활동 번호만 적고 학생 정보는 담지 않는다. 혼자 하기(/solo)에서 연 활동은 적지 않는다.
 */
import { readJsonStorage, writeStorage } from './browserStorage';
import { mergedTargetId } from '../domain/homeCatalog';

export const RECENT_ACTIVITIES_KEY = 'physical_recent_activities_v1';
export const RECENT_ACTIVITIES_MAX = 8;

/** 저장 값을 안전하게 읽는다: 문자열 번호만, 겹치지 않게, 최근 것이 앞. */
export function parseRecentActivities(saved: unknown): string[] {
  if (!Array.isArray(saved)) return [];
  const out: string[] = [];
  for (const value of saved) {
    if (typeof value !== 'string' || !/^[\w-]{1,80}$/.test(value)) continue;
    const id = mergedTargetId(value) || value;
    if (!out.includes(id)) out.push(id);
    if (out.length >= RECENT_ACTIVITIES_MAX) break;
  }
  return out;
}

/** 방금 연 활동을 맨 앞에 둔 새 목록. */
export function withRecentActivity(list: readonly string[], id: string): string[] {
  return parseRecentActivities([id, ...list]);
}

export function readRecentActivities(): string[] {
  return parseRecentActivities(readJsonStorage(RECENT_ACTIVITIES_KEY));
}

export function recordRecentActivity(id: string | undefined): void {
  if (!id) return;
  writeStorage(RECENT_ACTIVITIES_KEY, JSON.stringify(withRecentActivity(readRecentActivities(), id)));
}
