/** 주소마다 브라우저 탭·기록에 보일 이름. 놀이 화면(/play/…)은 놀이 이름을 따로 받아 넣는다. */
export const SITE_NAME='땀방울 원정대';
const TITLES:readonly (readonly [RegExp,string])[]=[
 [/^\/(start)?$/,''],
 [/^\/hub\/tools/,'놀이 모음'],
 [/^\/(hub|games)/,'활동 고르기'],
 [/^\/solo$/,'혼자 하는 놀이'],
 [/^\/today/,'오늘 수업'],
 [/^\/tools/,'수업 도구'],
 [/^\/sports/,'종목 교실'],
 [/^\/class-progress/,'우리 반 반응'],
 [/^\/guide/,'1분 안내'],
 [/^\/manual/,'이용 안내'],
 [/^\/print/,'인쇄'],
 [/^\/fun-remote/,'휴대폰 리모컨'],
 [/^\/(lobby|join)/,'수업 참여'],
 [/^\/teacher-ai/,'수업 준비 도우미'],
 [/^\/teacher/,'선생님'],
 [/^\/safety/,'안전 교실'],
 [/^\/expeditions/,'원정 모음'],
 [/^\/lessons/,'수업 묶음'],
 [/^\/records/,'내 기록'],
 [/^\/privacy/,'개인정보 안내'],
 [/^\/about/,'소개'],
];
export const playIdOf=(pathname:string)=>pathname.match(/^\/(?:solo\/)?play\/([^/]+)/)?.[1]??null;
export function routeTitle(pathname:string,gameName?:string|null){
 const page=playIdOf(pathname)?(gameName||'놀이'):TITLES.find(([pattern])=>pattern.test(pathname))?.[1]??'';
 return page?`${page} · ${SITE_NAME}`:SITE_NAME;
}
