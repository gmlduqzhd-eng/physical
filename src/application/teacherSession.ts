export async function teacherStatus() {
  const res = await fetch('/api/teacher?action=status', { credentials: 'same-origin', cache: 'no-store' });
  if (!res.ok) throw new Error('교사 인증 서버를 실행해 주세요.');
  return res.json() as Promise<{ authenticated: boolean; configured: boolean; aiReady: boolean; localSetup: boolean }>;
}
