import { supabase } from './supabase';
import type { RoomGroup } from '../domain/types';

export const ScoreRepository = {
  // 특정 방의 점수 보드 가져오기
  async getScoresByRoomId(roomId: string): Promise<RoomGroup[]> {
    const { data, error } = await supabase
      .from('room_groups')
      .select('*')
      .eq('room_id', roomId)
      .order('score', { ascending: false });
    
    if (error) {
      console.error('Error fetching scores:', error);
      return [];
    }
    return data || [];
  },

  // [핵심] 원자적 점수 증가 (RPC 호출) - Race Condition 완벽 차단
  async incrementScore(id: string, amount: number): Promise<boolean> {
    const { error } = await supabase.rpc('increment_score', {
      row_id: id,
      amount: amount
    });
    
    if (error) {
      console.error('Error incrementing score via RPC:', error);
      return false;
    }
    return true;
  }
};
