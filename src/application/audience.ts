/**
 * 지금 화면을 누가 보는지. 학생 화면에서는 머리말 도구(화면·소리, 공유·설치 등)를 숨기고 배경음악도 틀지 않는다.
 * 머리말(HeaderToolbar의 studentMode 기본값)과 배경음악 허용 여부가 이 함수 하나로 판단한다.
 *
 * 학생 화면: 학생 입장(/lobby, /join), 모둠 기기(/mobile/…), 수업 중 학생이 여는 활동
 * (/play/…?guided=1 또는 수업방 정보 room+group이 붙은 /play/…), 모둠 화면에서 넘어온 기록(/records?returnTo=/mobile/…).
 */
export function isStudentRoute(pathname: string, search = ''): boolean {
  if (/^\/(lobby|join)(\/|$)/.test(pathname) || /^\/mobile\//.test(pathname)) return true;
  const params = new URLSearchParams(search);
  if (/^\/play\//.test(pathname)) return params.get('guided') === '1' || (!!params.get('room') && !!params.get('group'));
  if (/^\/records(\/|$)/.test(pathname)) return /^\/mobile\//.test(params.get('returnTo') ?? '');
  return false;
}
