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

  async incrementScore(id: string, amount: number): Promise<boolean> {
    // 오로지 RPC 호출에만 의존하여 동시성(Race Condition)을 방지합니다.
    const { error } = await supabase.rpc('increment_score', {
      row_id: id,
      amount: amount
    });
    
    if (error) {
      console.error('RPC increment_score failed:', error.message);
      return false;
    }
    
    return true;
  }
};
