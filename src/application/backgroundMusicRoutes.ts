import { isStudentRoute } from './audience';
const musicPages = new Set([
  '/', '/start', '/hub', '/games', '/hub/tools', '/about', '/manual',
  '/teacher', '/teacher/setup', '/solo', '/records',
]);

// Game routes manage their own sound. Keep browsing/classroom controls audible
// without playing the background track over a game's signals or instructions.
// 학생 화면(입장·모둠 폰·수업방 놀이)에는 소리 설정 단추가 없으니 배경음악을 틀지 않는다.
export function allowsBackgroundMusic(pathname: string, search = ''): boolean {
  if (isStudentRoute(pathname, search)) return false;
  const path = pathname.replace(/\/+$/, '') || '/';
  return musicPages.has(path) || /^\/teacher\/room\/[^/]+$/.test(path);
}
