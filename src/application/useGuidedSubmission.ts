import { useCallback, useEffect, useState } from 'react';
import { supabase, ensureClassroomUser } from '../data/supabase';
import { GUIDED_REFLECTIONS, type GuidedReflection } from '../domain/guidedReflection';

type Receipt = { roomId: string; groupId: string; missionId: string; completed: boolean; reflection?: GuidedReflection; saved?: boolean; updatedAt: number };
const PREFIX = 'physical_guided_receipt_';
const EVENT = 'physical-guided-receipt-change';
const volatile = new Map<string, Receipt>();
const inFlight = new Set<string>();
const keyOf = (roomId: string, groupId: string, missionId: string) => `${PREFIX}${roomId}_${groupId}_${encodeURIComponent(missionId)}`;
const valid = (value: unknown): value is Receipt => {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Receipt>;
  return typeof item.roomId === 'string' && typeof item.groupId === 'string' && typeof item.missionId === 'string' && item.missionId.length <= 128 && typeof item.completed === 'boolean' && typeof item.updatedAt === 'number' && Date.now() - item.updatedAt < 7 * 86400000 && (!item.reflection || GUIDED_REFLECTIONS.some(choice => choice.value === item.reflection));
};
function read(key: string): Receipt | null {
  if (volatile.has(key)) return volatile.get(key) ?? null;
  try { const raw = localStorage.getItem(key); if (raw) { const value: unknown = JSON.parse(raw); if (valid(value)) return value; } } catch { /* Storage can be unavailable on school devices. */ }
  return null;
}
function write(key: string, item: Receipt | null): boolean {
  if (item) volatile.set(key, item); else volatile.delete(key);
  try { if (item) localStorage.setItem(key, JSON.stringify(item)); else localStorage.removeItem(key); window.dispatchEvent(new Event(EVENT)); return true; }
  catch { window.dispatchEvent(new Event(EVENT)); return false; }
}
export function useGuidedSubmission(roomId: string | null, groupId: string | null, missionId: string | null) {
  const key = roomId && groupId && missionId ? keyOf(roomId, groupId, missionId) : null;
  const [receipt, setReceipt] = useState<Receipt | null>(() => key ? read(key) : null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => { setReceipt(key ? read(key) : null); setIsOnline(navigator.onLine); };
    const storageRefresh = (event: StorageEvent) => { if (event.key === key && key) volatile.delete(key); refresh(); };
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener('storage', storageRefresh);
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => { window.removeEventListener(EVENT, refresh); window.removeEventListener('storage', storageRefresh); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); };
  }, [key]);

  const enqueueCompletion = useCallback(() => {
    if (!key || !roomId || !groupId || !missionId) return;
    const old = read(key);
    const next: Receipt = { roomId, groupId, missionId, completed: old?.completed ?? false, reflection: old?.reflection, saved: old?.saved, updatedAt: Date.now() };
    setStorageAvailable(write(key, next)); setReceipt(next);
  }, [key, roomId, groupId, missionId]);

  const chooseReflection = useCallback((reflection: GuidedReflection) => {
    if (!key || !roomId || !groupId || !missionId) return;
    const old = read(key);
    const next: Receipt = { roomId, groupId, missionId, completed: old?.completed ?? false, reflection, saved: false, updatedAt: Date.now() };
    setStorageAvailable(write(key, next)); setReceipt(next);
  }, [key, roomId, groupId, missionId]);

  const retry = useCallback(() => { setError(''); setReceipt(key ? read(key) : null); }, [key]);
  useEffect(() => {
    if (!key || !receipt || !isOnline || (receipt.completed && (!receipt.reflection || receipt.saved))) return;
    const run = async () => {
      if (inFlight.has(key)) return;
      inFlight.add(key); setSyncing(true);
      try {
        const latest = read(key);
        if (!latest) return;
        if (!latest.completed) {
          await ensureClassroomUser().catch(() => {});
          const { data: groupRow, error: fetchError } = await supabase
            .from('room_groups')
            .select('completed_missions')
            .eq('id', latest.groupId)
            .maybeSingle();
          if (fetchError) throw fetchError;
          const currentCompleted = Array.isArray(groupRow?.completed_missions) ? groupRow.completed_missions : [];
          if (!currentCompleted.includes(latest.missionId)) {
            const { error: updateError } = await supabase
              .from('room_groups')
              .update({ completed_missions: [...currentCompleted, latest.missionId] })
              .eq('id', latest.groupId);
            if (updateError) {
              const result = await supabase.rpc('submit_classroom_mission', { row_id: latest.groupId, mission_id: latest.missionId });
              if (result.error) throw result.error;
            }
          }
          latest.completed = true;
          write(key, latest);
        }
        const withChoice = read(key);
        if (withChoice?.reflection && !withChoice.saved) {
          const choice = withChoice.reflection;
          const result = await supabase.rpc('save_guided_reflection', { row_id: withChoice.groupId, mission_id: withChoice.missionId, choice });
          if (result.error || result.data !== true) throw result.error || Error('회고 저장 실패');
          const current = read(key);
          if (current?.reflection === choice) write(key, { ...current, saved: true });
        }
        setError('');
      } catch { setError('연결을 확인하고 자동으로 다시 보낼게요.'); }
      finally { inFlight.delete(key); setSyncing(false); setReceipt(read(key)); }
    };
    const timer = window.setTimeout(() => void run(), error ? 5000 : 0);
    return () => window.clearTimeout(timer);
  }, [key, receipt, isOnline, error]);

  return { enqueueCompletion, chooseReflection, retry, receipt, storageAvailable, isOnline, syncing, error };
}
