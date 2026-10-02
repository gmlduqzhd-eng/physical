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

  async incrementScore(id: string, amount: number, actionId?: string): Promise<boolean> {
    return (await ScoreRepository.saveScoreAction(id, amount, actionId)) === 'saved';
  },

  async saveScoreAction(id: string, amount: number, actionId?: string): Promise<'saved' | 'obsolete' | 'retry'> {
    // 오로지 RPC 호출에만 의존하여 동시성(Race Condition)을 방지합니다.
    const { error } = await supabase.rpc('increment_classroom_score', {
      row_id: id,
      amount,
      action_id: actionId || crypto.randomUUID(),
    });
    
    if (error) {
      console.error('Score save failed:', error.code);
      return error.code === '23503' ? 'obsolete' : 'retry';
    }
    
    return 'saved';
  }
};
