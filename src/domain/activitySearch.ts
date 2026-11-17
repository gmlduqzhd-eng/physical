import type {GameDef} from './gamesData';
import {ALL_PHONE_PLAYS,PHONE_PLAY_BY_ID} from './phonePlayCatalog';
import {variantsFor,getRemovedGame,RETIRED_REPLACEMENTS} from './gameLifecycle';
import {LEGACY_GAME_NAMES} from './legacyGameNames';
import {PREVIOUS_GAME_NAMES} from './previousGameNames';
import {mergedMovementMeta} from './mergedMovementVariants';
import {activityFit,lessonMeta,minutesQueryBucket,timeBucket} from './activityFit';
import {SPORT_EVENTS} from './sportsClassroom';
import {activityGroup} from './activityGroups';
import {placeLabels} from './glossary';

/** 예전 이름과, 정리되어 이 활동으로 이어지는 활동의 이름. 옛 이름으로 찾아도 지금 활동이 나온다. */
const OLD_NAMES=new Map<string,string[]>();
const addOld=(id:string,name:string)=>{if(name)OLD_NAMES.set(id,[...(OLD_NAMES.get(id)??[]),name]);};
for(const [id,name] of Object.entries(LEGACY_GAME_NAMES))addOld(id,name);
for(const [id,name] of Object.entries(PREVIOUS_GAME_NAMES))addOld(id,name);
for(const [id,target] of Object.entries(RETIRED_REPLACEMENTS))addOld(target,getRemovedGame(id)?.name??LEGACY_GAME_NAMES[id]??'');
// 이름을 쉽게 바꾼 준비물 없는 놀이는 옛 이름으로도 찾는다.
for(const p of ALL_PHONE_PLAYS)if(p.oldName)addOld(p.id,p.oldName);
const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
export function matchesActivitySearch(game:GameDef,query:string):boolean {
 const words=normalize(query).split(' ').filter(Boolean);
 const phone=PHONE_PLAY_BY_ID.get(game.type);
 // 장소 낱말은 '어디서' 조건과 같은 자료(활동의 공간, 없으면 수업 자료의 공간)에서 읽어 검색과 조건이 서로 다르게 답하지 않게 한다.
 const fit=activityFit(game),spaces=game.spaces??lessonMeta(game.type)?.space??[];
 const text=normalize([game.name,game.type,game.desc,game.subCategory,game.achievement.code,game.achievement.title,
  // 장소(교실·체육관·강당·운동장), 종목 유형, 활동 분류, 인원 방식, 시간, 준비물로도 찾는다.
  game.domain,game.sportType??'',activityGroup(game).label,...spaces,...placeLabels(spaces),...fit.spaces,...fit.people,timeBucket(fit.minutes),...(game.equipment??[]),...(phone?['준비물 없이 준비물 없음 스마트폰만 폰 놀이',phone.players,phone.space,phone.intensity,...phone.rules]:[]),...variantsFor(game.type).flatMap(v=>[v.name,v.id,mergedMovementMeta(v.id)?.name||'']),...(OLD_NAMES.get(game.type)??[])].join(' '));
 // '10분'처럼 분만 적으면 그 분이 든 시간 구간으로 찾는다('몇 분' 조건과 같은 답).
 return words.every(word=>{const bucket=minutesQueryBucket(word);return bucket?timeBucket(fit.minutes)===bucket:text.includes(word);});
}

/** 검색 결과가 없을 때 대신 보여 줄 비슷한 활동을 찾는 낱말. 예: 피구 → 던지기·표적·굴리기·패스 */
const RELATED:readonly [RegExp,string[],string][]=[
 [/피구|도지/,['던지','표적','굴림','굴려','패스'],'피구는 없지만, 공·콩주머니를 던지고 굴리는 활동이 있어요.'],
 [/달리|뛰기|육상|이어달리기|계주/,['왕복','릴레이','걷기','허들'],'안전하게 걷기·왕복으로 바꾼 활동이 있어요.'],
 [/술래|잡기/,['술래','얼음'],'술래 놀이가 있어요.'],
 [/공놀이|^공$/,['드리블','패스','던지','굴림'],'공을 쓰는 활동이 있어요.'],
 [/줄넘기/,['줄','점프'],'줄 없이 하는 줄넘기 활동이 있어요.'],
 [/춤|댄스/,['춤','리듬','표현'],'몸으로 표현하는 활동이 있어요.'],
];
export interface SearchSuggestions {games:GameDef[];sports:{id:string;name:string}[];reason:string;length:number}
/** 검색어로 찾은 활동이 없을 때: 비슷한 낱말의 활동과, 같은 이름의 종목 교실을 추천한다. */
export function similarSuggestions(query:string,pool:readonly GameDef[],limit=4):SearchSuggestions{
 const q=normalize(query);if(!q)return {games:[],sports:[],reason:'',length:0};
 const sports=SPORT_EVENTS.filter(e=>normalize(`${e.name} ${e.sub}`).includes(q)||q.includes(normalize(e.name))).slice(0,3).map(e=>({id:e.id,name:`종목 교실 · ${e.name}`}));
 const rule=RELATED.find(([re])=>re.test(q));
 const games=rule?pool.filter(g=>rule[1].some(w=>matchesActivitySearch(g,w))).slice(0,limit):[];
 const reason=rule?rule[2]:sports.length?'종목 교실에서 찾아보세요.':'다른 낱말로 찾아보세요. 예: 걷기, 던지기, 표현, 교실, 5분';
 return {games,sports,reason,length:games.length+sports.length};
}
