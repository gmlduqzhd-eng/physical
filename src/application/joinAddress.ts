/** 학생이 비밀번호(PIN)로 들어오는 짧은 주소(예: physical-pi.vercel.app/lobby). QR을 못 찍는 학생에게 TV로 보여 준다. */
export function joinAddress(origin: string): string {
  try { const url = new URL('/lobby', origin); return url.host + url.pathname; } catch { return '/lobby'; }
}
