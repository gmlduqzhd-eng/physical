export interface MissionButton {
  id: string;
  amount: number;
  cooldown: number;
  title: string;
  desc: string;
  iconName: string;
  color: string;
  bg: string;
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
  status: 'waiting' | 'playing' | 'paused' | 'locked' | 'tsunami';
  global_time_modifier: number;
  started_at: string | null;
  created_at: string;
}

export interface RoomGroup {
  id: string;
  room_id: string;
  group_name: string;
  score: number;
  is_defused: boolean;
  is_hacked: boolean;
  item_buff_until: string | null;
  updated_at: string;
}
