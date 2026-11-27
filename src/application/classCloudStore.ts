import {readStorage} from './browserStorage';
import {applyBackup,exportBackupText,readBackupText} from './classBackupStore';
import {noteBackedUp} from './backupMarkStore';

/**
 * 선생님 계정에 반 기록 보관(올리기·가져오기). 로그인한 선생님만 쓴다.
 * 선생님이 누를 때 올리고 가져온다. 로그인해 있으면 cloudAutoSync가 기록이 바뀔 때 자동으로도 올린다
 * (다른 기기에서 더 최근에 올린 기록은 말없이 덮어쓰지 않고 먼저 묻는다).
 * 서버에는 보관 파일과 같은 내용(반 이름, 반별 활동 반응·도장)만 간다. 학생 정보는 없다.
 */
export type CloudState=
 |{status:'signed-out'}                       // 선생님 로그인이 없다
 |{status:'unavailable'}                      // 서버에 이 기능이 아직 없다(또는 연결 실패)
 |{status:'ready';savedAt:string|null};       // 쓸 수 있다(savedAt: 계정에 마지막으로 올린 때)

/** 서버가 받는 크기(1MB)보다 여유 있게. */
export const MAX_CLOUD_BYTES=900*1024;
interface RecordsReply {payload:unknown;updatedAt:string|null}
const isReply=(v:unknown):v is RecordsReply=>!!v&&typeof v==='object'&&'payload' in v;

// Supabase(약 50KB)는 로그인 정보가 있을 때만 받는다.
async function teacherClient(){
 if(!readStorage('physical_supabase_auth','session')&&!readStorage('physical_supabase_auth'))return null;
 const {supabase}=await import('../data/supabase');
 const session=(await supabase.auth.getSession()).data.session;
 return session&&!session.user.is_anonymous?supabase:null;
}
async function call(args:{next_payload?:unknown;remove?:boolean}={}):Promise<RecordsReply|'signed-out'|'unavailable'>{
 try{
  const client=await teacherClient();if(!client)return 'signed-out';
  const {data,error}=await client.rpc('teacher_class_records',args);
  if(error)return error.code==='42501'?'signed-out':'unavailable';
  return isReply(data)?data:'unavailable';
 }catch{return 'unavailable';}
}
/** 계정에 있는 기록과 저장 시각을 그대로 읽는다(자동 보관이 비교할 때 쓴다). */
export const readAccount=()=>call();
const toState=(r:Awaited<ReturnType<typeof call>>):CloudState=>typeof r==='string'?{status:r}:{status:'ready',savedAt:r.updatedAt};

export async function cloudState():Promise<CloudState>{return toState(await call());}
/** 이 기기의 모든 반 기록을 계정에 올린다(계정에 있던 것은 덮어쓴다). */
export async function saveToAccount():Promise<CloudState|{status:'too-big'}>{
 const text=exportBackupText();
 if(text.length>MAX_CLOUD_BYTES)return {status:'too-big'};
 const state=toState(await call({next_payload:JSON.parse(text)}));
 if(state.status==='ready')noteBackedUp(true);
 return state;
}
/** 계정에 올려 둔 기록을 읽는다(가져오기 전에 내용을 보여 주려고 적용은 따로 한다). */
export async function loadFromAccount():Promise<{status:'empty'|'signed-out'|'unavailable'}|{status:'found';parsed:NonNullable<ReturnType<typeof readBackupText>>;savedAt:string|null}>{
 const r=await call();
 if(typeof r==='string')return {status:r};
 if(r.payload===null||r.payload===undefined)return {status:'empty'};
 const parsed=readBackupText(JSON.stringify(r.payload));
 return parsed?{status:'found',parsed,savedAt:r.updatedAt}:{status:'empty'};
}
export async function removeFromAccount():Promise<CloudState>{return toState(await call({remove:true}));}
export {applyBackup};
