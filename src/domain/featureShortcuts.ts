import {CLASS_TOOLS} from './classTools';
import {SPORT_SERIES,seriesLessonPath} from './sportSeries';

/**
 * 활동 검색에 함께 보여 줄 바로가기: 활동 목록에 없는 수업 도구·안전 수업·연속 차시.
 * 예: '줄넘기' → 모둠 이어 넘기, '수영' → 수영장 가기 전, '배드민턴' → 배드민턴 3차시.
 */
export interface FeatureShortcut {id:string;to:string;icon:string;title:string;summary:string;keywords:readonly string[]}

const TOOL_KEYWORDS:Record<string,readonly string[]>={
 'rope-relay':['줄넘기','줄','이어 넘기','이어넘기','모둠 줄넘기','급수'],
 'role-swap':['역할','교대','순서','차례','대기','술래','공수 전환'],
 'beat-moves':['박자','8박','리듬','표현','안무','동작 만들기','음악'],
 league:['리그','대진표','토너먼트','경기 순서'],timer:['타이머','카운트다운','시간','초시계'],race:['레이스','달리기','계주','기록'],
 ladder:['사다리','순서 정하기'],draw:['뽑기','번호','발표자'],groups:['모둠','팀 나누기','모둠 나누기'],dice:['주사위'],'quiz-bingo':['빙고','퀴즈','지식'],
};
export const FEATURE_SHORTCUTS:readonly FeatureShortcut[]=[
 ...CLASS_TOOLS.map(t=>({id:`tool-${t.id}`,to:`/tools?tool=${t.id}`,icon:t.icon,title:t.label,summary:t.summary,keywords:[t.label,...(TOOL_KEYWORDS[t.id]??[])]})),
 ...SPORT_SERIES.map(s=>({id:`series-${s.id}`,to:seriesLessonPath(s,1),icon:s.icon,title:s.name,summary:`종목 연속 차시 · ${s.summary}`,keywords:[s.name,s.name.replace(/\s*3차시$/,''),'연속 차시','차시']})),
 {id:'pool-prep',to:'/safety/pool',icon:'🏊',title:'수영장 가기 전',summary:'생존수영 사전 안내 · TV 확인 질문 · 참관 과제 인쇄',keywords:['수영','생존수영','수영장','물놀이','참관']},
 {id:'rain',to:'/today',icon:'☔',title:'비 오는 날 실내로 바꾸기',summary:'오늘 수업 진행 중 본게임을 체육관·교실용으로 바꿔요',keywords:['비','우천','실내','교실 체육','교실체육','비 오는 날']},
 {id:'week',to:'/week',icon:'📅',title:'여러 차시 계획',summary:'반응을 보고 여러 차시를 한 번에 짜요 · 종목 연속 차시',keywords:['계획','여러 차시','주간','차시']},
];
const norm=(s:string)=>s.toLowerCase().replace(/\s+/g,'');
/** 검색어에 맞는 바로가기(최대 limit개). 낱말이 키워드에 들어 있거나 키워드가 검색어에 들어 있으면 맞는 것으로 본다. */
export function matchShortcuts(query:string,limit=4):FeatureShortcut[]{
 const q=norm(query);
 if(!q)return [];
 // 한 글자 검색은 정확히 같은 키워드만(예: '비' → 비 오는 날, '줄' → 이어 넘기).
 const hit=(k:string)=>{const n=norm(k);return q.length<2?n===q:n.includes(q)||q.includes(n);};
 return FEATURE_SHORTCUTS.filter(s=>s.keywords.some(hit)).slice(0,limit);
}
