import type {GameDef} from './gamesData';
import {PHONE_PLAY_BY_ID} from './phonePlayCatalog';
import {variantsFor,getRemovedGame,RETIRED_REPLACEMENTS} from './gameLifecycle';
import {LEGACY_GAME_NAMES} from './legacyGameNames';
import {mergedMovementMeta} from './mergedMovementVariants';

/** 예전 이름과, 정리되어 이 활동으로 이어지는 활동의 이름. 옛 이름으로 찾아도 지금 활동이 나온다. */
const OLD_NAMES=new Map<string,string[]>();
const addOld=(id:string,name:string)=>{if(name)OLD_NAMES.set(id,[...(OLD_NAMES.get(id)??[]),name]);};
for(const [id,name] of Object.entries(LEGACY_GAME_NAMES))addOld(id,name);
for(const [id,target] of Object.entries(RETIRED_REPLACEMENTS))addOld(target,getRemovedGame(id)?.name??LEGACY_GAME_NAMES[id]??'');
const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
export function matchesActivitySearch(game:GameDef,query:string):boolean {
 const words=normalize(query).split(' ').filter(Boolean);
 const phone=PHONE_PLAY_BY_ID.get(game.type);
 const text=normalize([game.name,game.type,game.desc,game.subCategory,game.achievement.code,game.achievement.title,...(phone?['준비물 없이 준비물 없음 스마트폰만 폰 놀이',phone.players,phone.space,phone.intensity,...phone.rules]:[]),...variantsFor(game.type).flatMap(v=>[v.name,v.id,mergedMovementMeta(v.id)?.name||'']),...(OLD_NAMES.get(game.type)??[])].join(' '));
 return words.every(word=>text.includes(word));
}
