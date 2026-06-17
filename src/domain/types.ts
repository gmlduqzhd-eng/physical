export interface BombDefusalScore {
  id: string;
  class_name: string;
  group_name: string;
  score: number;
  mission_stats: Record<string, boolean | number>;
  is_defused: boolean;
  updated_at: string;
  is_hacked?: boolean;
  item_buff_until?: string | null;
}

export interface GameControl {
  id: number;
  status: 'playing' | 'paused' | 'locked';
  global_time_modifier: number;
  started_at: string | null;
  current_event?: 'none' | 'tsunami';
  last_score_time?: string | null;
  last_score_group?: string | null;
}
