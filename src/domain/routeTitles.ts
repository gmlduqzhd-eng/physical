import {CLASS_TOOLS} from './classTools';
import {SCREEN} from './glossary';

/** 주소마다 브라우저 탭·기록에 보일 이름. 놀이 화면(/play/…)은 놀이 이름을 따로 받아 넣는다. */
export const SITE_NAME='땀방울 원정대';
const TITLES:readonly (readonly [RegExp,string])[]=[
 [/^\/(start)?$/,''],
 [/^\/hub\/tools/,'놀이 모음'],
 [/^\/(hub|games)/,SCREEN.hub],
 [/^\/solo$/,'혼자 하는 놀이'],
 [/^\/today/,SCREEN.today],
 [/^\/tools/,SCREEN.tools],
 [/^\/sports/,'종목 교실'],
 [/^\/class-progress/,'우리 반 반응'],
 [/^\/guide/,'1분 안내'],
 [/^\/sound-check/,'소리 미리듣기'],
 [/^\/display-check/,'뒤에서 보여요? 화면 확인'],
 [/^\/manual/,SCREEN.manual],
 [/^\/print\/signature-cards/,'대표 게임 규칙 카드 인쇄'],
 [/^\/print/,'인쇄 자료'],
 [/^\/fun-remote/,SCREEN.funRemote],
 [/^\/(lobby|join)/,SCREEN.join],
 [/^\/teacher-ai/,SCREEN.teacherAi],
 [/^\/teacher/,SCREEN.teacher],
 [/^\/safety/,'안전 교실'],
 [/^\/expeditions/,'원정 모음'],
 [/^\/lessons/,SCREEN.lessons],
 [/^\/records/,'내 기록'],
 [/^\/privacy/,'개인정보 안내'],
 [/^\/about/,'소개'],
 [/^\/try/,'놀이 체험'],
 [/^\/together/,'함께 보는 화면 수업'],
 [/^\/journey/,'우리 반 원정 지도'],
 [/^\/more/,'다른 앱'],
 [/^\/lab\/angle/,'각도 실험실'],
 [/^\/demo/,'체험 수업'],
 [/^\/device-check/,'기기 확인'],
 [/^\/board/,SCREEN.board],
 [/^\/remote/,SCREEN.remote],
 [/^\/mobile/,SCREEN.mobile],
 [/^\/kiosk/,SCREEN.kiosk],
 [/^\/admin/,SCREEN.admin],
];
export const playIdOf=(pathname:string)=>pathname.match(/^\/(?:solo\/)?play\/([^/]+)/)?.[1]??null;
/** gameName: 놀이 화면이면 그 놀이 이름. 목록에 없는 놀이 주소면 null을 넘겨 '찾을 수 없는 놀이'로 보인다(undefined면 아직 모름). */
/** search: 주소의 ?뒤(예: '?tool=race'). 수업 도구는 고른 도구 이름을 앞에 붙인다(레이스 시계 · 수업 도구). */
export function routeTitle(pathname:string,gameName?:string|null,search=''){
 const tool=/^\/tools\/?$/.test(pathname)?CLASS_TOOLS.find(t=>t.id===new URLSearchParams(search).get('tool'))?.label:undefined;
 const page=playIdOf(pathname)?(gameName||(gameName===null?'찾을 수 없는 놀이':'놀이')):tool?`${tool} · 수업 도구`:TITLES.find(([pattern])=>pattern.test(pathname))?.[1]??'';
 return page?`${page} · ${SITE_NAME}`:SITE_NAME;
}
