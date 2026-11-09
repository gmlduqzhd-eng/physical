export const CLASSROOM_STORAGE_TTL = 8 * 60 * 60 * 1000;
export function isFreshClassroomRecord(timestamp: unknown, now = Date.now()): timestamp is number {
  return typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp <= now + 60_000 && timestamp > now - CLASSROOM_STORAGE_TTL;
}

// Remove historical persistent receipts; never migrate a previous pupil's work.
export function cleanClassroomStorage() {
  for (const kind of ['localStorage', 'sessionStorage'] as const) {
    try {
      const storage = window[kind];
      for (let i = storage.length - 1; i >= 0; i--) {
        const key = storage.key(i);
        if (!key || !/^(physical_sync_action_|physical_guided_receipt_|bomb_defusal_sync_queue$)/.test(key)) continue;
        let fresh = false;
        if (kind === 'sessionStorage') {
          try {
            const value = JSON.parse(storage.getItem(key) ?? 'null');
            fresh = value && isFreshClassroomRecord(value.timestamp ?? value.updatedAt);
          } catch { /* Invalid app-owned records are removed. */ }
        }
        if (!fresh) storage.removeItem(key);
      }
    } catch { /* School browsers may deny either storage independently. */ }
  }
}
