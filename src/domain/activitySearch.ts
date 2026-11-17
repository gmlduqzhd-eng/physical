import type {GameDef} from './gamesData';
import {ALL_PHONE_PLAYS,PHONE_PLAY_BY_ID} from './phonePlayCatalog';
import {variantsFor,getRemovedGame,RETIRED_REPLACEMENTS} from './gameLifecycle';
import {LEGACY_GAME_NAMES} from './legacyGameNames';
import {PREVIOUS_GAME_NAMES} from './previousGameNames';
import {mergedMovementMeta} from './mergedMovementVariants';
import {activityFit,lessonMeta} from './activityFit';
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
  game.domain,game.sportType??'',activityGroup(game).label,...spaces,...placeLabels(spaces),...fit.spaces,...fit.people,`${fit.minutes}분`,...(game.equipment??[]),...(phone?['준비물 없이 준비물 없음 스마트폰만 폰 놀이',phone.players,phone.space,phone.intensity,...phone.rules]:[]),...variantsFor(game.type).flatMap(v=>[v.name,v.id,mergedMovementMeta(v.id)?.name||'']),...(OLD_NAMES.get(game.type)??[])].join(' '));
 return words.every(word=>text.includes(word));
}
