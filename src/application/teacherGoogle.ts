import type { SupabaseClient } from '@supabase/supabase-js';
type Endpoint='teacher'|'studio';
const clients:Partial<Record<Endpoint,()=>Promise<SupabaseClient>>>={};
const callbacks:Partial<Record<Endpoint,Promise<void>>>={};
export function setMainTeacherGoogleClient(client:SupabaseClient){clients.teacher=async()=>client;}
export function setStudioTeacherGoogleClient(factory:()=>Promise<SupabaseClient>){clients.studio=factory;}
export async function teacherGoogleClient(endpoint:Endpoint){
 const factory=clients[endpoint];if(!factory)throw Error('교사 로그인 화면을 다시 열어 주세요.');return factory();
}
export async function beginTeacherGoogle(endpoint:Endpoint){
 const r=await fetch(`/api/${endpoint}?action=oauth-config`,{cache:'no-store'});const config=await r.json();
 if(!r.ok||!config.enabled)throw Error('Google 로그인 연결을 준비 중입니다. 관리자는 Supabase의 Google 제공자 설정을 확인해 주세요.');
 sessionStorage.setItem('physical_google_teacher_confirmed',String(Date.now()+10*60*1000));
 delete callbacks[endpoint];
 const client=await teacherGoogleClient(endpoint);
 const redirectTo=location.origin+(endpoint==='teacher'?'/teacher/google-callback':'/google-callback');
 const {data,error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo,skipBrowserRedirect:true,scopes:'openid email',queryParams:{prompt:'select_account'}}});
 if(error||!data.url)throw Error('Google 로그인 창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.');
 window.dispatchEvent(new Event('physical-teacher-oauth-start'));
 location.assign(data.url);
}
export function finishTeacherGoogle(endpoint:Endpoint):Promise<void>{
 if(callbacks[endpoint])return callbacks[endpoint]!;
 callbacks[endpoint]=(async()=>{
  const code=new URLSearchParams(location.search).get('code');
  history.replaceState(null,'',location.pathname);
  const expires=Number(sessionStorage.getItem('physical_google_teacher_confirmed'));
  if(!code||!Number.isFinite(expires)||expires<Date.now()||expires>Date.now()+10*60*1000)throw Error('Google 로그인 시작 화면에서 다시 진행해 주세요.');
  sessionStorage.removeItem('physical_google_teacher_confirmed');
  const client=await teacherGoogleClient(endpoint);
  const {data,error}=await client.auth.exchangeCodeForSession(code);
  if(error||!data.session)throw Error('Google 로그인 확인이 만료되었습니다. 다시 로그인해 주세요.');
  const result=await fetch(`/api/${endpoint}?action=google-login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accessToken:data.session.access_token,adultTeacher:true})});
  const response=await result.json();
  if(!result.ok){if(endpoint==='teacher')await client.auth.signOut({scope:'local'});throw Error(response.error??'Google 로그인을 완료하지 못했습니다.');}
 })();
 return callbacks[endpoint]!;
}
