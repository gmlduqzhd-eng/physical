import type {GameDef} from './gamesData';
import {PHONE_PLAY_BY_ID} from './phonePlayCatalog';
import {variantsFor} from './gameLifecycle';
import {mergedMovementMeta} from './mergedMovementVariants';

const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
export function matchesActivitySearch(game:GameDef,query:string):boolean {
 const words=normalize(query).split(' ').filter(Boolean);
 const phone=PHONE_PLAY_BY_ID.get(game.type);
 const text=normalize([game.name,game.type,game.desc,game.subCategory,game.achievement.code,game.achievement.title,...(phone?['준비물 없이 준비물 없음 스마트폰만 폰 놀이',phone.players,phone.space,phone.intensity,...phone.rules]:[]),...variantsFor(game.type).flatMap(v=>[v.name,v.id,mergedMovementMeta(v.id)?.name||''])].join(' '));
 return words.every(word=>text.includes(word));
}
