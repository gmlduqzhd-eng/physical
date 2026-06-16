export interface BombDefusalScore {
  id: string;
  class_name: string;
  group_name: string;
  score: number;
  mission_stats: Record<string, boolean | number>;
  is_defused: boolean;
  updated_at: string;
}

export interface GameControl {
  id: number;
  status: 'playing' | 'paused' | 'locked';
  global_time_modifier: number;
  started_at: string | null;
}
