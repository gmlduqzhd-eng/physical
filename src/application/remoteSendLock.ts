/**
 * 휴대폰 리모컨에서 '다음'·'마지막 승부로'·'끝내기'처럼 단계를 바꾸는 명령을 한 번만 보내게 하는 잠금(순수 함수).
 *
 * 보지 않고 누르다 두 번 탭하면 두 번째 명령이 다음 단계까지 건너뛴다(시범 → 본게임, 연습 판 → 마지막 승부).
 * 보낸 뒤에는 정해진 시간(SEND_LOCK_MS)이 지나거나, TV가 알려 준 단계가 바뀌고 최소 시간(SEND_LOCK_MIN_MS)이
 * 지날 때까지 같은 종류의 버튼을 누를 수 없다. TV가 아주 빨리 답해도 두 번째 탭(보통 0.1~0.3초 뒤)은 막힌다.
 */
export const SEND_LOCK_MS = 1200;
/** 단계가 바뀌었어도 이 시간까지는 잠근다(두 번 탭 간격보다 길게). */
export const SEND_LOCK_MIN_MS = 700;

export interface SendLock {
  /** 보낼 때 TV가 알려 준 단계(모르면 null). */
  phase: string | null;
  /** 이 시각(ms)까지는 단계가 바뀌어도 잠근다. */
  minUntil: number;
  /** 이 시각(ms)까지 잠근다. */
  until: number;
}

export function lockAfterSend(phase: string | null | undefined, now: number, ms = SEND_LOCK_MS, minMs = SEND_LOCK_MIN_MS): SendLock {
  return { phase: phase ?? null, minUntil: now + Math.min(minMs, ms), until: now + ms };
}

/** 아직 잠겨 있는지: 최소 시간 안이면 늘 잠김. 그 뒤에는 TV 단계가 보낼 때와 같고 시간이 남았을 때만 잠김. */
export function isSendLocked(lock: SendLock | null, phase: string | null | undefined, now: number): boolean {
  if (!lock) return false;
  if (now >= lock.until) return false;
  if (now < lock.minUntil) return true;
  if (lock.phase !== null && phase != null && phase !== lock.phase) return false;
  return true;
}
