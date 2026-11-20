import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../data/supabase';
import type { RoomGroup, GameRoom, MissionTemplate } from '../domain/types';

// 실시간 연결이 살아 있으면 바뀐 내용이 바로 오므로, 다시 읽기는 가끔만 한다(학교 여러 곳이 동시에 써도 서버가 버티게).
// 연결이 끊기거나 아직 안 됐으면 15초마다 다시 읽는다.
export const CLASSROOM_POLL_MS = 15000;
export const CLASSROOM_POLL_LIVE_MS = 60000;

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
    let refreshTimer: number | null = null;
    let cachedTemplate: MissionTemplate | null = null;
    let templateInvalidated = true;
    let channelLive = false;
    // 미션 묶음(템플릿)은 이 방이 쓰는 것 하나만 지켜본다. 예전에는 모든 반의 템플릿 변경을 받아 전부 다시 읽었다.
    let templateChannel: ReturnType<typeof supabase.channel> | null = null;
    let watchedTemplate: string | null = null;
    const watchTemplate = (templateId: string | null) => {
      if (!active || templateId === watchedTemplate) return;
      if (templateChannel) void supabase.removeChannel(templateChannel);
      templateChannel = null; watchedTemplate = templateId;
      if (!templateId) return;
      templateChannel = supabase.channel(`classroom-template:${templateId}:${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'mission_templates', filter: `id=eq.${templateId}` }, () => { templateInvalidated = true; scheduleRefresh(); })
        .subscribe();
    };
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
          watchTemplate(room.data.template_id ?? null);
          let nextTemplate: MissionTemplate | null = null;
          if (room.data.template_id) {
            if (templateInvalidated || cachedTemplate?.id !== room.data.template_id) {
              templateInvalidated = false;
              const result = await supabase.from('mission_templates').select('*').eq('id', room.data.template_id).maybeSingle();
              if (result.error) { templateInvalidated = true; throw new Error('미션 정보를 불러오지 못했습니다. 다시 시도해주세요.'); }
              cachedTemplate = result.data;
            }
            nextTemplate = cachedTemplate;
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
    // One classroom event is received by every device. Batch bursts without
    // postponing indefinitely when scores keep arriving during an activity.
    const scheduleRefresh = () => {
      if (!active || refreshTimer !== null) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void fetchData();
      }, 300);
    };
    // 다시 읽기는 놓친 알림을 메우는 안전망이다. 템플릿은 실시간 연결이 끊겼을 때만 다시 읽는다.
    let poll: number | null = null;
    const schedulePoll = () => {
      if (!active) return;
      poll = window.setTimeout(() => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
          if (!channelLive) templateInvalidated = true;
          void fetchData();
        }
        schedulePoll();
      }, channelLive ? CLASSROOM_POLL_LIVE_MS : CLASSROOM_POLL_MS);
    };
    const restartPoll = () => { if (poll !== null) window.clearTimeout(poll); schedulePoll(); };
    refreshRef.current = fetchData;
    const subscription = supabase.channel(`classroom:${roomId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_groups', filter: `room_id=eq.${roomId}` }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, payload => {
        // Pause/start commands should not wait for the batched score refresh.
        if (active && payload.eventType === 'UPDATE' && payload.new.id === roomId) {
          setGameRoom(previous => previous ? { ...previous, ...payload.new } : previous);
        }
        scheduleRefresh();
      })
      .subscribe(status => {
        // 연결 상태가 바뀌면 다시 읽는 간격도 바로 맞춘다(끊기면 15초, 살아 있으면 60초).
        const live = status === 'SUBSCRIBED';
        if (live !== channelLive) { channelLive = live; restartPoll(); }
        if (status === 'SUBSCRIBED') void fetchData();
        if (active && (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT')) setError('실시간 연결을 복구하고 있습니다.');
      });
    void fetchData();
    schedulePoll();
    const recover = () => { if (document.visibilityState === 'visible') { templateInvalidated = true; void fetchData(); } };
    window.addEventListener('online', recover);
    document.addEventListener('visibilitychange', recover);

    return () => {
      active = false;
      refreshRef.current = null;
      if (poll !== null) window.clearTimeout(poll);
      if (templateChannel) void supabase.removeChannel(templateChannel);
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.removeEventListener('online', recover);
      document.removeEventListener('visibilitychange', recover);
      void supabase.removeChannel(subscription);
    };
  }, [roomId]);

  return { scores, gameRoom, template, loading, error, refresh };
};
