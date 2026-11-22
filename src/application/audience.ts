/**
 * 지금 화면을 누가 보는지. 학생 화면에서는 머리말 도구(공유·설치·TV 모드 등)를 줄인다.
 * 머리말·학생 화면 모두 이 함수 하나로 판단한다.
 *
 * 학생 화면: 학생 입장(/lobby, /join), 모둠 기기(/mobile/…), 수업 중 학생이 여는 활동(/play/…?guided=1).
 */
export function isStudentRoute(pathname: string, search = ''): boolean {
  if (/^\/(lobby|join)(\/|$)/.test(pathname) || /^\/mobile\//.test(pathname)) return true;
  return /^\/play\//.test(pathname) && new URLSearchParams(search).get('guided') === '1';
}
