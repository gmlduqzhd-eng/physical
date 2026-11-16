import {AVAILABLE_GAMES,type GameDef} from './gamesData.js';
import {liveActivityId} from './gameLifecycle.js';

// Catalog shelves from the 2026-11-15 lesson audit (docs/catalog-shelves-stage5-2026-11-15.md).
// The shelves decide what a teacher sees first. Activities retired in the 2026-11 cleanup are in gameLifecycle.ts
// (REMOVED_GAMES with a target) and no longer appear here; their old links lead to the activity that replaced them.
const phone=(numbers:number[])=>numbers.map(n=>`phone-play-${String(n).padStart(3,'0')}`);

/** Shown first: activities judged usable in a lesson as they are. */
export const CORE_ACTIVITY_IDS:readonly string[]=[
 // 반 전체·준비물 없음
 ...phone([1,6,11,14,16,18,20,29,31,34,35,36,42,44,53,56,65,66,67,69,93,99]),
 'red_green','shuttle-run-beep','one_leg','fitness','exp-phone-10','exp-tablet-02','exp-tablet-13','exp-phone-41','exp-phone-43',
 // 모둠 정거장·공과 콩주머니
 'target','pass-gate-rescue','relay-mission-runner','sound-goalball','exp-phone-36','exp-phone-37','exp-phone-35','dribble-rhythm',
 // 협동·표현
 'exp-tablet-31','exp-tablet-42','exp-tablet-12','exp-phone-50',
 'seed_sprout','weather_dance','magic_scarf','shadow_puppeteer','space_traveler','element_forces','ribbon_gymnast','story_drama_relay',
 // 대표 원정 가운데 기기 부담이 가장 작은 둘
 'expedition-loop','expedition-map',
];

/** Near-duplicates: hidden from the default list and pointed at the activity that represents them. */
const SIMILAR_GROUPS:Record<string,string[]>={
 'phone-play-053':phone([60]),'phone-play-014':phone([15,19]),'phone-play-018':phone([27]),'phone-play-029':phone([32]),'phone-play-065':phone([70]),
 target:['exp-phone-31'],'shuttle-run-beep':['exp-phone-30'],memory:['exp-phone-05'],
 'pass-gate-rescue':['exp-tablet-21'],'sound-goalball':['exp-phone-33'],
 'exp-phone-36':['exp-tablet-26'],'exp-phone-07':['exp-tablet-35'],red_green:['exp-tablet-06'],
 'exp-phone-45':['exp-phone-42'],'exp-tablet-13':['exp-tablet-15'],'exp-phone-41':['exp-tablet-16'],
 musical_freeze:['musical_scene_maker'],'cpr-compression-110':['aed-defibrillator-pad'],
};
export const SIMILAR_TO:ReadonlyMap<string,string>=new Map(Object.entries(SIMILAR_GROUPS).flatMap(([representative,ids])=>ids.map(id=>[id,representative] as const)));

/** Talking, observing, judging or reading: useful in a lesson, but not movement time. */
export const UNDERSTANDING_IDS:readonly string[]=[
 ...phone([45,78,80,81]),
 'stopwatch','pulse-detective','posture-guardian','base-running-decide',
 'cpr-compression-110','aed-defibrillator-pad','water-rescue-throw','heatwave-pm25-shield','rice-treatment-firstaid',
];
/** 응급·의학 내용이 들어 있어 AI 수업 초안 자료로 쓰지 않는 안전 학습 활동. 이름이 바뀌어도 번호로 거른다. */
export const AI_EXCLUDED_SAFETY_IDS:readonly string[]=['cpr-compression-110','aed-defibrillator-pad','water-rescue-throw','heatwave-pm25-shield','rice-treatment-firstaid'];
const CORE=new Set(CORE_ACTIVITY_IDS),UNDERSTANDING=new Set(UNDERSTANDING_IDS);

export type ActivityShelf='core'|'more'|'similar'|'understanding';
export function activityShelf(id:string):ActivityShelf{return UNDERSTANDING.has(id)?'understanding':SIMILAR_TO.has(id)?'similar':CORE.has(id)?'core':'more';}
export const isUnderstandingActivity=(id:string)=>UNDERSTANDING.has(id);
/** Counts as movement time for a lesson: flagged physical and not on the understanding shelf. */
export const isMovementActivity=(game:Pick<GameDef,'type'|'physicalActivity'>)=>game.physicalActivity===true&&!UNDERSTANDING.has(game.type);
export function similarRepresentative(id:string):GameDef|undefined{const target=SIMILAR_TO.get(id);return target?AVAILABLE_GAMES.find(game=>game.type===target):undefined;}
export const CORE_ACTIVITIES:GameDef[]=CORE_ACTIVITY_IDS.map(id=>{const game=AVAILABLE_GAMES.find(item=>item.type===id);if(!game)throw new Error(`핵심 활동이 목록에 없습니다: ${id}`);return game;});
export const shelfLabel=(id:string)=>{const shelf=activityShelf(id);return shelf==='understanding'?'이해·정리 활동 · 움직이는 시간은 짧아요':shelf==='similar'?`비슷한 활동: ${similarRepresentative(id)?.name??''}`:'';};
/** "혼자 해보기" lists only activities one person can really do alone: no partner, group or second device. */
export const isSoloActivity=(game:Pick<GameDef,'activityType'>)=>game.activityType==='개인';
export const SOLO_ACTIVITIES:GameDef[]=AVAILABLE_GAMES.filter(isSoloActivity);

/** 추천 목록을 지금 쓰는 활동과 지금 이름으로 바꾸고, 겹치는 것은 하나만 남긴다. */
export function liveRecommendations(list:readonly {name:string;type:string}[]):{name:string;type:string}[]{
 const out=new Map<string,{name:string;type:string}>();
 for(const item of list){const type=liveActivityId(item.type),game=AVAILABLE_GAMES.find(g=>g.type===type);if(game&&!out.has(type))out.set(type,{name:game.name,type});}
 return [...out.values()];
}
