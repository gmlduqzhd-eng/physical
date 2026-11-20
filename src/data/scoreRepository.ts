import { supabase, ensureClassroomUser } from './supabase';

export const ScoreRepository = {
  /** 같은 점수 제출을 다시 보낼 때는 같은 actionId를 넘겨야 서버가 한 번만 반영한다. */
  async saveScoreAction(id: string, amount: number, actionId?: string, activityId = 'classroom-extra'): Promise<'saved' | 'pending' | 'obsolete' | 'retry'> {
    await ensureClassroomUser().catch(() => {});
    // 오로지 RPC 호출에만 의존하여 동시성(Race Condition)을 방지합니다.
    const { data, error } = await supabase.rpc('submit_classroom_score', {
      row_id: id,
      amount,
      action_id: actionId || crypto.randomUUID(),
      activity_id: activityId,
    });
    
    if (error) {
      console.error('Score save failed:', error.code);
      return error.code === '23503' || error.code === '42501' || error.code === '22023' ? 'obsolete' : 'retry';
    }
    
    return data?.state === 'pending' ? 'pending' : 'saved';
  }
};
