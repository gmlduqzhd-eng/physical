import { createHmac, randomBytes } from 'node:crypto';
import { z } from 'zod';

export class TeacherAccountError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
function settings() {
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.STUDIO_LIMIT_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.STUDIO_LIMIT_KEY;
  if (!url || !key) throw new TeacherAccountError(503, '교사 계정 서버 설정을 확인해 주세요.');
  if (new URL(url).protocol !== 'https:') throw new TeacherAccountError(503, '교사 계정 서버 설정을 확인해 주세요.');
  return { url, key };
}
async function authFetch(path: string, body: unknown, token?: string) {
  const { url, key } = settings();
  try {
    return await fetch(new URL(path, url), {
      method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(12000),
    });
  } catch { throw new TeacherAccountError(503, '교사 계정 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.'); }
}
export async function googleOAuthConfiguration(){
  const {url,key}=settings();
  try{const r=await fetch(new URL('/auth/v1/settings',url),{headers:{apikey:key},signal:AbortSignal.timeout(5000)});if(!r.ok)throw Error();const data=await r.json();return {url,publishableKey:key,enabled:data.external?.google===true};}
  catch{throw new TeacherAccountError(503,'Google 로그인 설정을 확인하지 못했습니다.');}
}
export async function googleTeacherLogin(body:unknown){
  const checked=z.object({accessToken:z.string().min(20).max(8192),adultTeacher:z.literal(true)}).strict().safeParse(body);
  if(!checked.success)throw new TeacherAccountError(422,'Google 로그인과 교사 이용 확인이 필요합니다.');
  const {url,key}=settings();
  let response:Response;
  try{response=await fetch(new URL('/auth/v1/user',url),{headers:{apikey:key,Authorization:'Bearer '+checked.data.accessToken},signal:AbortSignal.timeout(12000)});}catch{throw new TeacherAccountError(503,'Google 인증 서버에 연결하지 못했습니다.');}
  if(!response.ok)throw new TeacherAccountError(401,'Google 로그인을 다시 진행해 주세요.');
  const identity=z.object({id:z.uuid(),email_confirmed_at:z.string(),is_anonymous:z.literal(false),identities:z.array(z.object({provider:z.string()}))}).safeParse(await response.json());
  if(!identity.success||!identity.data.identities.some(v=>v.provider==='google'))throw new TeacherAccountError(401,'확인된 Google 계정으로 로그인해 주세요.');
  const approval=await authFetch('/rest/v1/rpc/teacher_account',{},checked.data.accessToken);
  if(!approval.ok)throw new TeacherAccountError(503,'Google 회원 정보를 확인하지 못했습니다.');
  const account=z.object({id:z.uuid(),enabled:z.boolean(),version:z.number().int().positive(),role:z.enum(['teacher','admin'])}).parse(await approval.json());
  if(account.id!==identity.data.id)throw new TeacherAccountError(401,'Google 계정 확인 정보가 일치하지 않습니다.');
  if(!account.enabled)throw new TeacherAccountError(403,'관리자에 의해 이 계정의 사용이 제한되었습니다.');
  return {nonce:`acct:${account.id}:${account.version}:${randomBytes(18).toString('hex')}`,role:account.role};
}

export function teacherAccountId(nonce: string) { return /^acct:([a-f0-9-]{36}):\d+:[a-f0-9]{36}$/.exec(nonce)?.[1] ?? null; }
export async function legacyTeacherEnabled(){
  const secret=process.env.CLASSROOM_TEACHER_BOOTSTRAP??process.env.STUDIO_LIMIT_SECRET;
  if(process.env.NODE_ENV!=='production'&&!secret)return true;
  if(!secret)throw new TeacherAccountError(503,'교사 인증 서버 설정을 확인해 주세요.');
  const response=await authFetch('/rest/v1/rpc/check_shared_teacher_access',{server_secret:secret});
  if(!response.ok)throw new TeacherAccountError(503,'교사 인증 정책을 확인하지 못했습니다.');
  return (await response.json())===true;
}
export async function sharedTeacherLoginAttempt(address:string){
  const secret=process.env.CLASSROOM_TEACHER_BOOTSTRAP;
  if(!secret)throw new TeacherAccountError(503,'교사 로그인 제한 서버 설정을 확인해 주세요.');
  const response=await authFetch('/rest/v1/rpc/teacher_login_attempt',{server_secret:secret,actor_hash:createHmac('sha256',secret).update(address).digest('hex')});
  if(!response.ok)throw new TeacherAccountError(503,'교사 로그인 제한 서버에 연결하지 못했습니다.');
  const result=z.object({allowed:z.boolean(),retrySeconds:z.number().int().min(0).max(900)}).parse(await response.json());
  return result;
}
export async function activeTeacherSession(nonce: string | null): Promise<boolean> {
  if (!nonce) return false;
  if (!nonce.startsWith('acct:')) return legacyTeacherEnabled();
  const match = /^acct:([a-f0-9-]{36}):(\d+):[a-f0-9]{36}$/.exec(nonce);
  if (!match) return false;
  const serverSecret = process.env.CLASSROOM_TEACHER_BOOTSTRAP ?? process.env.STUDIO_LIMIT_SECRET;
  if (!serverSecret) return false;
  const response = await authFetch('/rest/v1/rpc/check_teacher_account', { server_secret: serverSecret, teacher_uuid: match[1], session_version: Number(match[2]) });
  if (!response.ok) throw new TeacherAccountError(503, '교사 계정 권한을 확인하지 못했습니다.');
  return (await response.json()).enabled === true;
}
