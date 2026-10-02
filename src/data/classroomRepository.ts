import { supabase } from './supabase';
import type { GameRoom } from '../domain/types';

export const classroomError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export async function findRoomByPin(pin: string): Promise<GameRoom> {
  if (!/^\d{4}$/.test(pin.trim())) throw new Error('4자리 숫자 PIN을 입력해주세요.');
  const { data, error } = await supabase.from('game_rooms').select('*').eq('pin_code', pin.trim()).maybeSingle();
  if (error) throw new Error('방 정보를 확인할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
  if (!data) throw new Error('존재하지 않거나 종료된 방 번호입니다.');
  return data as GameRoom;
}

// A second device may create the same group between lookup and insert.
export async function joinClassroomGroup(roomId: string, groupName: string): Promise<string> {
  const findGroup = () => supabase.from('room_groups').select('id').eq('room_id', roomId).eq('group_name', groupName).maybeSingle();
  const existing = await findGroup();
  if (existing.error) throw new Error('모둠 정보를 확인할 수 없습니다. 다시 시도해주세요.');
  if (existing.data) return existing.data.id;
  const inserted = await supabase.from('room_groups').insert({ room_id: roomId, group_name: groupName, avatar: 'Smile' }).select('id').single();
  if (!inserted.error && inserted.data) return inserted.data.id;
  if (inserted.error?.code === '23505') {
    const joined = await findGroup();
    if (!joined.error && joined.data) return joined.data.id;
  }
  throw new Error('모둠 접속에 실패했습니다. 다시 시도해주세요.');
}

export async function createClassroom(name: string, templateId: string | null, groupNames: string[]): Promise<GameRoom> {
  let room: GameRoom | null = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const { data, error } = await supabase.from('game_rooms').insert({ pin_code: pin, name: name.trim(), template_id: templateId }).select('*').single();
    if (!error && data) { room = data as GameRoom; break; }
    if (error?.code !== '23505') throw new Error('방 생성에 실패했습니다. 연결 상태와 접근 권한을 확인해주세요.');
  }
  if (!room) throw new Error('사용 가능한 PIN을 찾지 못했습니다. 다시 시도해주세요.');
  if (groupNames.length) {
    const { error } = await supabase.from('room_groups').insert(groupNames.map(group_name => ({ room_id: room.id, group_name, avatar: 'Smile' })));
    if (error) {
      const cleanup = await supabase.from('game_rooms').delete().eq('id', room.id);
      throw new Error(cleanup.error ? `모둠 준비에 실패했습니다. 관리 화면에서 PIN ${room.pin_code} 방을 확인해주세요.` : '모둠 준비에 실패했습니다. 다시 시도해주세요.');
    }
  }
  return room;
}
