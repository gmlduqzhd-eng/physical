import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../data/supabase';
import type { RoomGroup, GameRoom, MissionTemplate } from '../domain/types';

export const useGameLogic = (roomId?: string) => {
  const [scores, setScores] = useState<RoomGroup[]>([]);
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [template, setTemplate] = useState<MissionTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<(() => Promise<void>) | null>(null);
  const refresh = useCallback(() => { void refreshRef.current?.(); }, []);

  useEffect(() => {
    let active = true;
    let fetching = false;
    let refreshPending = false;
    setScores([]); setGameRoom(null); setTemplate(null);
    setLoading(Boolean(roomId));
    setError(roomId ? null : '방 정보가 없습니다.');
    if (!roomId) return;
    const fetchData = async () => {
      if (!active) return;
      if (fetching) { refreshPending = true; return; }
      fetching = true;
      try {
        do {
          refreshPending = false;
          const [groups, room] = await Promise.all([
            supabase.from('room_groups').select('*').eq('room_id', roomId).order('score', { ascending: false }),
            supabase.from('game_rooms').select('*').eq('id', roomId).maybeSingle(),
          ]);
          if (!active) return;
          if (groups.error || room.error) throw new Error('수업 정보를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.');
          if (!room.data) {
            setScores([]); setGameRoom(null); setTemplate(null);
            setError('수업 방이 종료되었거나 삭제되었습니다.');
            break;
          }
          let nextTemplate: MissionTemplate | null = null;
          if (room.data.template_id) {
            const result = await supabase.from('mission_templates').select('*').eq('id', room.data.template_id).maybeSingle();
            if (result.error) throw new Error('미션 정보를 불러오지 못했습니다. 다시 시도해주세요.');
            nextTemplate = result.data;
          }
          if (!active) return;
          if (!refreshPending) {
            setScores(groups.data || []); setGameRoom(room.data); setTemplate(nextTemplate); setError(null);
          }
        } while (active && refreshPending);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : '수업 연결에 실패했습니다.');
      } finally {
        fetching = false;
        if (active) setLoading(false);
      }
    };
    refreshRef.current = fetchData;
    const subscription = supabase.channel(`classroom:${roomId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_groups', filter: `room_id=eq.${roomId}` }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, () => { void fetchData(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_templates' }, () => { void fetchData(); })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') void fetchData();
        if (active && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) setError('실시간 연결을 복구하고 있습니다.');
      });
    void fetchData();
    const recover = () => { if (document.visibilityState === 'visible') void fetchData(); };
    window.addEventListener('online', recover);
    document.addEventListener('visibilitychange', recover);
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine) void fetchData(); }, 15000);

    return () => {
      active = false;
      refreshRef.current = null;
      window.clearInterval(poll);
      window.removeEventListener('online', recover);
      document.removeEventListener('visibilitychange', recover);
      void supabase.removeChannel(subscription);
    };
  }, [roomId]);

  return { scores, gameRoom, template, loading, error, refresh };
};
