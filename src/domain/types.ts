export interface MissionButton {
  id: string;
  amount: number;
  cooldown: number;
  title: string;
  desc: string;
  iconName: string;
  color: string;
  bg: string;
  requires_approval?: boolean;
  isHidden?: boolean;
  prerequisiteMissionId?: string;
  isVaccine?: boolean;
}

export interface MissionTemplate {
  id: string;
  name: string;
  buttons: MissionButton[];
  created_at: string;
}

export interface GameRoom {
  id: string;
  pin_code: string;
  name: string;
  template_id: string | null;
  status: 'waiting' | 'playing' | 'paused' | 'locked' | 'tsunami' | 'finished' | 'boss_raid' | 'mafia' | 'time_attack' | 'defense' | 'zombie';
  global_time_modifier: number;
  started_at: string | null;
  announcement: string | null;
  active_minigame: any;
  flash_sale?: boolean;
  boss_hp?: number;
  boss_max_hp?: number;
  created_at: string;
}

export interface RoomGroup {
  id: string;
  room_id: string;
  group_name: string;
  avatar: string;
  score: number;
  is_defused: boolean;
  is_hacked: boolean;
  item_buff_until: string | null;
  is_blinded_until: string | null;
  spy_device_id: string | null;
  completed_missions: string[];
  pending_missions?: string[];
  badges: string[];
  stats: Record<string, number>;
  updated_at: string;
}
