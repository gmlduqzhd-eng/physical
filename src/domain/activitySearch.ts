import type {GameDef} from './gamesData';
import {variantsFor} from './gameLifecycle';
import {mergedMovementMeta} from './mergedMovementVariants';

const normalize=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ').trim();
export function matchesActivitySearch(game:GameDef,query:string):boolean {
 const words=normalize(query).split(' ').filter(Boolean);
 const text=normalize([game.name,game.type,game.desc,game.subCategory,game.achievement.code,game.achievement.title,...variantsFor(game.type).flatMap(v=>[v.name,v.id,mergedMovementMeta(v.id)?.name||''])].join(' '));
 return words.every(word=>text.includes(word));
}
