import type { GameDef } from './gamesData';
import { LESSON_GAME_CATALOG } from '../data/lessonGameCatalog';
export async function activityFingerprint(game:GameDef){
 const source=JSON.stringify({game,lesson:LESSON_GAME_CATALOG.find(l=>l.id===game.type)??null});
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(source));
 return Array.from(new Uint8Array(hash),v=>v.toString(16).padStart(2,'0')).join('');
}
export type ActivityReview={activityId:string;sourceHash:string;safety:boolean;grade:boolean;curriculum:boolean;reviewedAt:string};
