import type {GameDef} from './gamesData';
import {LESSON_GAME_CATALOG,type LessonGameMeta} from '../data/lessonGameCatalog';
import {PHONE_PLAY_BY_ID} from './phonePlayCatalog';
import {TERMS} from './glossary';

/**
 * 교사가 "어디서 · 몇 명 · 몇 분"으로 활동을 고를 때 쓰는 공통 기준.
 * 활동 자료의 공간(space)·활동 형태(activityModes)·추천 인원(recommendedPlayers)·시간(durationMinutes)을 한 곳에서 읽는다.
 * 활동 목록(/hub), 기록·즐겨찾기(/hub/tools), 종목 교실이 같은 이름과 같은 기준을 쓴다.
 */
export const FIT_SPACES=[TERMS.classroom,TERMS.gym,TERMS.field] as const;
export type FitSpace=typeof FIT_SPACES[number];
export const FIT_PEOPLE=['혼자','짝','모둠','반 전체'] as const;
export type FitPeople=typeof FIT_PEOPLE[number];
export const FIT_TIMES=['5분 이하','6~10분','11분 이상'] as const;
export type FitTime=typeof FIT_TIMES[number];
export interface FitFilter {space?:FitSpace|'전체';people?:FitPeople|'전체';time?:FitTime|'전체'}

/** 활동 자료의 공간 낱말을 교사가 고르는 세 곳으로 묶는다. */
const SPACE_GROUP:Record<string,FitSpace>={교실:TERMS.classroom,'좁은 실내 공간':TERMS.classroom,체육관:TERMS.gym,다목적실:TERMS.gym,강당:TERMS.gym,운동장:TERMS.field};
const LESSON_BY_ID=new Map<string,LessonGameMeta>(LESSON_GAME_CATALOG.map(l=>[l.id,l]));
export const lessonMeta=(id:string)=>LESSON_BY_ID.get(id);

/**
 * 주소(?where=·?who=·?minutes=)에 들어온 값을 조건 값으로 바꾼다. 고를 수 없는 값은 '전체'로 둔다
 * (예전 북마크나 직접 고친 주소 때문에 결과가 0개인데 조건은 '전체'로 보이는 일이 없게).
 */
const SPACE_ALIAS:Record<string,FitSpace>={...SPACE_GROUP,[TERMS.gym]:TERMS.gym,gym:TERMS.gym,classroom:TERMS.classroom,field:TERMS.field,'운동장(야외)':TERMS.field,야외:TERMS.field};
export const parseFitSpace=(raw:string|null):FitSpace|'전체'=>raw?SPACE_ALIAS[raw.trim()]??'전체':'전체';
export const parseFitPeople=(raw:string|null,allowed:readonly FitPeople[]=FIT_PEOPLE):FitPeople|'전체'=>{const v=raw?.trim()==='반전체'?'반 전체':raw?.trim();return allowed.find(p=>p===v)??'전체';};
export const parseFitTime=(raw:string|null):FitTime|'전체'=>{const v=raw?.trim()??'';const n=/^(\d+)\s*분?$/.exec(v)?.[1];if(n)return timeBucket(Number(n));return FIT_TIMES.find(t=>t===v)??'전체';};
/** 검색어가 '10분'처럼 분만 적혀 있으면 그 분이 든 시간 구간(6~10분)을 돌려준다. */
export const minutesQueryBucket=(word:string):FitTime|undefined=>{const n=/^(\d{1,3})분$/.exec(word)?.[1];return n?timeBucket(Number(n)):undefined;};

export interface ActivityFit {spaces:FitSpace[];people:FitPeople[];minutes:number;wholeClass:boolean}
const CACHE=new Map<string,ActivityFit>();
export function activityFit(game:Pick<GameDef,'type'|'spaces'|'activityType'|'durationMinutes'>):ActivityFit{
 const cached=CACHE.get(game.type);if(cached)return cached;
 const lesson=LESSON_BY_ID.get(game.type),phone=PHONE_PLAY_BY_ID.get(game.type);
 const rawSpaces=game.spaces??lesson?.space??[];
 const spaces=FIT_SPACES.filter(s=>rawSpaces.some(r=>SPACE_GROUP[r]===s));
 const modes=lesson?.activityModes??[];
 const people=new Set<FitPeople>();
 for(const mode of modes){if(mode==='개인')people.add('혼자');else if(mode==='짝')people.add('짝');else if(mode==='모둠'||mode==='팀 대항')people.add('모둠');else if(mode==='학급 전체')people.add('반 전체');}
 if(!modes.length&&game.activityType)people.add(game.activityType==='개인'?'혼자':game.activityType);
 // 준비물 없는 놀이는 TV 한 대로 반 전체가 함께 할 수 있고, 추천 인원이 큰 활동도 반 전체로 할 수 있다.
 const wholeClass=!!phone||(lesson?.recommendedPlayers.max??0)>=20||modes.includes('학급 전체');
 if(wholeClass)people.add('반 전체');
 const fit={spaces:spaces.length?spaces:[...FIT_SPACES],people:FIT_PEOPLE.filter(p=>people.has(p)),minutes:game.durationMinutes??phone?.minutes??5,wholeClass};
 CACHE.set(game.type,fit);return fit;
}
export const timeBucket=(minutes:number):FitTime=>minutes<=5?'5분 이하':minutes<=10?'6~10분':'11분 이상';
export function matchesFit(game:Parameters<typeof activityFit>[0],filter:FitFilter):boolean{
 const fit=activityFit(game);
 if(filter.space&&filter.space!=='전체'&&!fit.spaces.includes(filter.space))return false;
 if(filter.people&&filter.people!=='전체'&&!fit.people.includes(filter.people))return false;
 if(filter.time&&filter.time!=='전체'&&timeBucket(fit.minutes)!==filter.time)return false;
 return true;
}

const SPACE_ICON:Record<FitSpace,string>={[TERMS.classroom]:'🏫',[TERMS.gym]:'🏟️',[TERMS.field]:'🌳'};
/** 카드 맨 위 상황 배지: 🏫교실 · 📺반 전체 · ⏱4분. 공간은 가장 좁은 곳 하나만 보여 준다(교실에서 되면 어디서든 된다). */
export function situationBadges(game:Parameters<typeof activityFit>[0],filter:FitFilter={}):string[]{
 const fit=activityFit(game);
 // '어디서' 조건을 골랐으면 그 장소를 보여 준다(운동장 결과에 '교실부터'가 붙지 않게).
 const chosen=filter.space&&filter.space!=='전체'&&fit.spaces.includes(filter.space)?filter.space:undefined,space=chosen??fit.spaces[0];
 const who=fit.wholeClass?'📺 반 전체':`👥 ${fit.people.filter(p=>p!=='반 전체').join('·')||'모둠'}`;
 return [`${SPACE_ICON[space]} ${space}${!chosen&&fit.spaces.length>1&&space===TERMS.classroom?' 외 '+(fit.spaces.length-1)+'곳':''}`,who,`⏱ ${fit.minutes}분`];
}

