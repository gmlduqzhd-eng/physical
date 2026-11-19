import { readStorage, removeStorage, writeStorage } from './browserStorage';
import { savedStudentIdentity } from './studentIdentity';

/**
 * 이 창으로 마지막에 들어간 수업·모둠과 그때의 번호·별명.
 * 같은 창에서 다시 들어올 때 '○번 별명으로 이어가기'를 보여 주는 데만 쓴다.
 * 수업 입장은 4시간 동안 이어지므로, 그보다 오래된 기록은 이어가기를 보여 주지 않는다.
 */
export const RESUME_WINDOW_MS = 4 * 60 * 60 * 1000;
const JOINED_AT = 'physical_last_joined_at';

export interface LastStudentEntry { room: string; group: string; groupName: string; number: string; nickname: string }

export function rememberLastEntry(entry: { room_id: string; group_id: string; group_name: string }, now = Date.now()) {
  writeStorage('physical_last_room', entry.room_id);
  writeStorage('physical_last_group', entry.group_id);
  writeStorage('physical_last_group_name', entry.group_name);
  writeStorage(JOINED_AT, String(now), 'session');
}

export function forgetLastEntry() {
  ['physical_last_room', 'physical_last_group', 'physical_last_group_name'].forEach(key => removeStorage(key));
  removeStorage(JOINED_AT, 'session');
}

/** 이어 갈 수 있는 마지막 입장. room을 주면 그 수업(과 모둠 이름)과 같을 때만 돌려준다. */
export function lastEntryFor(room?: string, groupName?: string, now = Date.now()): LastStudentEntry | null {
  const last = {
    room: readStorage('physical_last_room') ?? '',
    group: readStorage('physical_last_group') ?? '',
    groupName: readStorage('physical_last_group_name') ?? '',
  };
  if (!last.room || !last.group) return null;
  if (room !== undefined && last.room !== room) return null;
  if (groupName !== undefined && last.groupName !== groupName) return null;
  const joinedAt = Number(readStorage(JOINED_AT, 'session') ?? 0);
  if (!Number.isFinite(joinedAt) || joinedAt <= 0 || now - joinedAt > RESUME_WINDOW_MS || joinedAt > now + 60_000) return null;
  const who = savedStudentIdentity();
  if (!who.number || !who.nickname) return null;
  return { ...last, ...who };
}

/** '3번 바람으로 이어가기'처럼 누구로 들어가는지 보이는 이름. */
export const resumeLabel = (entry: Pick<LastStudentEntry, 'number' | 'nickname'>) => `${entry.number}번 ${entry.nickname}`;
