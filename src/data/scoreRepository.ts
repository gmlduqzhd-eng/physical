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
    // 1차 시도: RPC 호출 (가장 안전함)
    const { error } = await supabase.rpc('increment_score', {
      row_id: id,
      amount: amount
    });
    
    if (!error) return true;

    // 만약 RPC가 없는 경우 (사용자가 SQL 갱신을 안 한 경우), 수동 업데이트로 폴백(Fallback)
    console.warn('RPC increment_score failed, falling back to manual update. Error:', error.message);
    try {
      const { data, error: selectError } = await supabase
        .from('room_groups')
        .select('score')
        .eq('id', id)
        .single();
        
      if (selectError || !data) return false;
      
      const { error: updateError } = await supabase
        .from('room_groups')
        .update({ score: data.score + amount, updated_at: new Date().toISOString() })
        .eq('id', id);
        
      if (updateError) return false;
      return true;
    } catch (e) {
      console.error('Fallback increment failed:', e);
      return false;
    }
  }
};
