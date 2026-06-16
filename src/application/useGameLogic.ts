import { useState, useEffect } from 'react';
import { supabase } from '../data/supabase';
import { BombDefusalScore, GameControl } from '../domain/types';

export const useGameLogic = () => {
  const [scores, setScores] = useState<BombDefusalScore[]>([]);
  const [gameControl, setGameControl] = useState<GameControl | null>(null);

  useEffect(() => {
    // 초기 데이터 일괄 로드
    const fetchInitialData = async () => {
      const { data: scoreData } = await supabase
        .from('bomb_defusal_scores')
        .select('*')
        .order('score', { ascending: false });
      if (scoreData) setScores(scoreData);

      const { data: controlData } = await supabase
        .from('game_controls')
        .select('*')
        .eq('id', 1)
        .single();
      if (controlData) setGameControl(controlData);
    };

    fetchInitialData();

    // Supabase Realtime 채널 구독 (점수 현황)
    const scoreSubscription = supabase
      .channel('public:bomb_defusal_scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bomb_defusal_scores' }, payload => {
        setScores(current => {
          const newRecord = payload.new as BombDefusalScore;
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

    // Supabase Realtime 채널 구독 (게임 전체 통제 상태)
    const controlSubscription = supabase
      .channel('public:game_controls')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_controls' }, payload => {
        if (payload.eventType === 'UPDATE') {
           setGameControl(payload.new as GameControl);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(scoreSubscription);
      supabase.removeChannel(controlSubscription);
    };
  }, []);

  return { scores, gameControl };
};
