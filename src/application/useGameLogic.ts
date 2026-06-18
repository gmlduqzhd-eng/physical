import { useState, useEffect } from 'react';
import { supabase } from '../data/supabase';
import type { RoomGroup, GameRoom, MissionTemplate } from '../domain/types';

export const useGameLogic = (roomId?: string) => {
  const [scores, setScores] = useState<RoomGroup[]>([]);
  const [gameRoom, setGameRoom] = useState<GameRoom | null>(null);
  const [template, setTemplate] = useState<MissionTemplate | null>(null);

  useEffect(() => {
    if (!roomId) return;

    const fetchInitialData = async () => {
      const { data: scoreData } = await supabase
        .from('room_groups')
        .select('*')
        .eq('room_id', roomId)
        .order('score', { ascending: false });
      if (scoreData) setScores(scoreData);

      const { data: roomData } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (roomData) {
        setGameRoom(roomData);
        if (roomData.template_id) {
          const { data: templateData } = await supabase
            .from('mission_templates')
            .select('*')
            .eq('id', roomData.template_id)
            .single();
          if (templateData) setTemplate(templateData);
        }
      }
    };

    fetchInitialData();

    const scoreSubscription = supabase
      .channel(`public:room_groups:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_groups', filter: `room_id=eq.${roomId}` }, payload => {
        setScores(current => {
          const newRecord = payload.new as RoomGroup;
          if (payload.eventType === 'INSERT') {
            return [...current, newRecord].sort((a, b) => b.score - a.score);
          }
          if (payload.eventType === 'UPDATE') {
            return current.map(s => s.id === newRecord.id ? newRecord : s).sort((a, b) => b.score - a.score);
          }
          if (payload.eventType === 'DELETE') {
            return current.filter(s => s.id !== payload.old.id);
          }
          return current;
        });
      })
      .subscribe();

    const roomSubscription = supabase
      .channel(`public:game_rooms:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${roomId}` }, payload => {
        if (payload.eventType === 'UPDATE') {
           setGameRoom(payload.new as GameRoom);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(scoreSubscription);
      supabase.removeChannel(roomSubscription);
    };
  }, [roomId]);

  return { scores, gameRoom, template };
};
