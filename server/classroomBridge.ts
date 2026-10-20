import { createClient } from '@supabase/supabase-js';
export async function authorizeClassroomTeacher(accessToken: unknown) {
  if (typeof accessToken !== 'string' || accessToken.length > 5000) throw new Error('수업방 임시 인증이 필요합니다.');
  const url = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !process.env.CLASSROOM_TEACHER_BOOTSTRAP) throw new Error('수업방 교사 인증 서버 설정이 필요합니다.');
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: 'Bearer ' + accessToken } } });
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) throw new Error('수업방 임시 인증이 만료되었습니다.');
  const result = await client.rpc('authorize_classroom_teacher', { bootstrap: process.env.CLASSROOM_TEACHER_BOOTSTRAP });
  if (result.error) throw new Error('수업방 교사 권한을 부여하지 못했습니다. DB 보안 설정을 확인하세요.');
  return { authorized: true };
}
