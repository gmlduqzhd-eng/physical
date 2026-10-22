import { supabase, ensureClassroomUser, ensureClassroomTeacher } from './supabase';
import type { GameRoom } from '../domain/types';
import type { StudentIdentity } from '../application/studentIdentity';

export const classroomError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export interface StudentClassroomEntry { room_id:string; group_id:string; group_name:string }
export interface MyClassroomProfile { group_id:string; student_number:number|null; nickname:string|null }
const studentJoinErrors: Record<string,string> = {
  invalid_profile:'학생 번호(1~99)와 별명(2~12자)을 확인해주세요.',
  invalid_pin:'PIN이 맞지 않거나 종료된 수업입니다. 선생님에게 확인해주세요.',
  invalid_invite:'QR 참여 코드가 맞지 않거나 만료되었습니다. 선생님에게 새 QR을 요청하세요.',
  number_taken:'이 수업에서 이미 사용 중인 학생 번호입니다. 번호를 확인하거나 선생님에게 기존 번호 해제를 요청하세요.',
  group_locked:'이미 다른 모둠에 참여 중입니다. 선생님에게 문의하세요.',
  room_closed:'종료된 수업입니다. 선생님에게 확인해주세요.',
  rate_limited:'이 기기에서 잘못된 참여 코드를 여러 번 입력했어요. 이미 참여한 수업은 ‘이전 수업 이어가기’를 이용하고, 새 입장은 15분 후 다시 시도해주세요.',
};
function studentJoinResult(data: unknown, error: unknown): StudentClassroomEntry {
  if (error || !data || typeof data !== 'object') throw new Error('입장 정보를 확인할 수 없습니다. 연결 상태를 확인해주세요.');
  const result=data as StudentClassroomEntry & {error?:string};
  if (result.error) throw new Error(studentJoinErrors[result.error] || '입장할 수 없습니다. 선생님에게 확인해주세요.');
  if (!result.room_id || !result.group_id || !result.group_name) throw new Error('입장 정보가 올바르지 않습니다.');
  return result;
}

export async function joinStudentByPin(pin:string, identity:StudentIdentity):Promise<StudentClassroomEntry> {
  if (!/^\d{4}$/.test(pin)) throw new Error('4자리 모둠 PIN을 입력해주세요.');
  await ensureClassroomUser();
  const {data,error}=await supabase.rpc('join_classroom_short_pin_profile',{entry_pin:pin,student_number:identity.number,nickname:identity.nickname});
  return studentJoinResult(data,error);
}

export async function joinStudentByQr(roomId:string, groupName:string, code:string, identity:StudentIdentity):Promise<StudentClassroomEntry> {
  await ensureClassroomUser();
  const {data,error}=await supabase.rpc('join_classroom_invite_profile',{room_uuid:roomId,group_name:groupName,invite_code:code.trim().toLowerCase(),student_number:identity.number,nickname:identity.nickname});
  return studentJoinResult(data,error);
}

export async function getMyClassroomProfile(roomId:string):Promise<MyClassroomProfile|null> {
  await ensureClassroomUser();
  const {data,error}=await supabase.rpc('get_my_classroom_profile',{room_uuid:roomId});
  if(error) throw new Error('이전 수업 정보를 확인할 수 없습니다. 연결 상태를 확인해주세요.');
  return data as MyClassroomProfile|null;
}

export async function completeStudentProfile(roomId:string, groupId:string, identity:StudentIdentity):Promise<void> {
  await ensureClassroomUser();
  const {data,error}=await supabase.rpc('complete_classroom_profile',{room_uuid:roomId,group_uuid:groupId,student_number:identity.number,nickname:identity.nickname});
  studentJoinResult({...data,group_name:'기존 모둠'},error);
}

export async function joinClassroomWithShortPin(pin: string): Promise<{room_id:string;group_id:string;group_name:string}> {
  if (!/^\d{4}$/.test(pin.trim())) throw new Error('4자리 모둠 PIN을 입력해주세요.');
  await ensureClassroomUser();
  const {data,error} = await supabase.rpc('join_classroom_with_short_pin',{entry_pin:pin.trim()});
  if (error) throw new Error('입장 정보를 확인할 수 없습니다. 잠시 후 다시 시도해주세요.');
  if (!data) throw new Error('PIN이 맞지 않거나 종료된 수업입니다. 선생님에게 확인해주세요.');
  if (data.error) throw new Error(data.error);
  return data;
}

export async function findRoomByPin(pin: string): Promise<GameRoom> {
  if (!/^\d{8}$/.test(pin.trim())) throw new Error('8자리 수업 PIN을 입력해주세요.');
  await ensureClassroomUser();
  const { data, error } = await supabase.rpc('lookup_classroom', {pin:pin.trim()});
  if (error) throw new Error('방 정보를 확인할 수 없습니다. 인터넷 연결을 확인하고 다시 시도해주세요.');
  if (!data) throw new Error('존재하지 않거나 종료된 방 번호입니다.');
  if (data.error) throw new Error(data.error);
  return data as GameRoom;
}

// A second device may create the same group between lookup and insert.
export async function joinClassroomGroup(roomId: string, groupName: string, inviteCode = ''): Promise<string> {
  await ensureClassroomUser();
  const {data,error} = await supabase.rpc('join_secure_classroom',{room_uuid:roomId,group_name:groupName,invite_code:inviteCode.trim().toLowerCase()});
  if (error || !data) throw new Error('모둠 참여 코드가 맞지 않거나 참여 권한이 만료되었습니다. 교사에게 새 QR 또는 코드를 요청하세요.');
  return data;
}

export async function createClassroom(name: string, templateId: string | null, groupNames: string[]): Promise<GameRoom> {
  await ensureClassroomTeacher();
  const {data,error}=await supabase.rpc('create_secure_classroom',{room_name:name.trim(),template_uuid:templateId,group_names:groupNames});
  if(error || !data) throw new Error('방 생성에 실패했습니다. 교사 인증과 수업방 보안 설정을 확인하세요.');
  return data as GameRoom;
}
export async function joinClassroomBoard(roomId: string, code: string) {
  await ensureClassroomUser();
  const result = await supabase.rpc('join_classroom_board',{room_uuid:roomId,board_code:code.trim()});
  if(result.error || !result.data) throw new Error('전광판 코드가 맞지 않거나 만료되었습니다. 교사에게 새 코드를 요청하세요.');
}
export async function openClassroomBoard(roomId: string) {
  const display=window.open('about:blank','_blank');
  if(!display) { alert('전광판을 열려면 이 사이트의 새 창을 허용해 주세요.');return; }
  try {
    const result=await supabase.rpc('get_classroom_device_codes',{room_uuid:roomId});
    if(result.error || !result.data?.board_code) throw new Error('전광판 코드를 발급받지 못했습니다. 교사 소유권을 확인하세요.');
    display.opener=null; display.location.href='/board/'+roomId+'#code='+encodeURIComponent(result.data.board_code);
  } catch(cause) { display.close(); alert(classroomError(cause,'전광판 열기 실패')); }
}
