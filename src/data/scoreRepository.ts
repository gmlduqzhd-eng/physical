import { supabase } from './supabase';
import { BombDefusalScore } from '../domain/types';

export const ScoreRepository = {
  // 전체 점수 보드 가져오기
  async getAllScores(): Promise<BombDefusalScore[]> {
    const { data, error } = await supabase
      .from('bomb_defusal_scores')
      .select('*')
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
  },

  // 미션 상태 업데이트 (일반)
  async updateMissionStats(id: string, newStats: Record<string, boolean | number>): Promise<boolean> {
    const { error } = await supabase
      .from('bomb_defusal_scores')
      .update({ mission_stats: newStats, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error updating mission stats:', error);
      return false;
    }
    return true;
  }
};
