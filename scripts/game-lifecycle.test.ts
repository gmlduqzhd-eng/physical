import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MERGED_GAMES,REMOVED_GAMES,LIFECYCLE_STAGE,getMergedGame,getRemovedGame,isAvailableGame,mergedGameUrl,variantsFor,variantBestKey} from '../src/domain/gameLifecycle';
import {GAMES,AVAILABLE_GAMES} from '../src/domain/gamesData';
import {LESSON_GAME_CATALOG,ALL_LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {normalizePlayerProfile} from '../src/application/usePlayerProfile';
import {resolveGuidedGameType} from '../src/domain/guidedMission';
test('all 117 decisions have a direct live destination or a tombstone, with no chains or lost metadata',()=>{
 const a=JSON.parse(readFileSync('docs/game-review-225-2026-10-22.json','utf8'));
 assert.equal(MERGED_GAMES.length,111);assert.equal(REMOVED_GAMES.length,6);
 assert.deepEqual(new Set(MERGED_GAMES.map(g=>g.id)),new Set(a.rows.filter((r:{decision:string})=>r.decision==='통합').map((r:{id:string})=>r.id)));
 for(const m of MERGED_GAMES){assert.equal(a.rows.find((r:{id:string})=>r.id===m.id).target,m.target);assert(GAMES.some(g=>g.type===m.target));assert(!MERGED_GAMES.some(g=>g.id===m.target));assert(!REMOVED_GAMES.some(g=>g.id===m.target));}
 assert.equal(GAMES.length,225);assert.equal(new Set(GAMES.map(g=>g.type)).size,225);
 assert.equal(AVAILABLE_GAMES.length,225-MERGED_GAMES.filter(g=>g.stage<=LIFECYCLE_STAGE).length-(LIFECYCLE_STAGE>=3?6:0));
 for(const g of GAMES){assert.equal(AVAILABLE_GAMES.some(x=>x.type===g.type),isAvailableGame(g.type));if(!isAvailableGame(g.type))assert(!LESSON_GAME_CATALOG.some(x=>x.id===g.type));}
 assert(ALL_LESSON_GAME_CATALOG.length>LESSON_GAME_CATALOG.length);
});
test('old solo and classroom links keep query, duplicate parameters and participation hash',()=>{
 for(const m of MERGED_GAMES.filter(g=>g.stage<=LIFECYCLE_STAGE))for(const prefix of ['/play/','/solo/play/']){
  const next=mergedGameUrl(prefix+m.id,m.id,'?room=r&group=g&guided=1&mission=m&extra=a&extra=b','#participation=old')!;
  const u=new URL(next,'https://physical-pi.vercel.app');assert.equal(u.pathname,prefix+m.target);assert.equal(u.searchParams.get('variant'),m.id);
  assert.equal(u.searchParams.get('room'),'r');assert.equal(u.searchParams.get('group'),'g');assert.equal(u.searchParams.get('mission'),'m');assert.equal(u.searchParams.get('guided'),'1');assert.deepEqual(u.searchParams.getAll('extra'),['a','b']);assert.equal(u.hash,'#participation=old');
  assert(variantsFor(m.target).some(v=>v.id===m.id));assert.equal(getMergedGame(m.id)?.target,m.target);
 }
 for(const r of REMOVED_GAMES)assert.equal(!!getRemovedGame(r.id),LIFECYCLE_STAGE>=3);
});
test('old record names, scores, counts, RPE and negative fate-card history survive normalization unchanged',()=>{
 const highScores=Object.fromEntries(GAMES.map((g,i)=>[g.type,i+1000])),playCounts=Object.fromEntries(GAMES.map(g=>[g.type,4]));
 const recentGames=[{gameType:'fate_card',gameName:'예전 운명의 카드',score:-300,playedAt:1,rpe:4,details:{metrics:{'예전 항목':'그대로'}}},...MERGED_GAMES.slice(0,10).map((m,i)=>({gameType:m.id,gameName:m.name,score:i+1,playedAt:i+2,rpe:3}))];
 const old={nickname:'기록 보존',totalScore:9000,totalPlays:900,highScores,playCounts,recentGames,createdAt:1};const normalized=normalizePlayerProfile(old)!;
 assert.deepEqual(normalized.highScores,highScores);assert.deepEqual(normalized.playCounts,playCounts);assert.equal(normalized.totalScore,9000);assert.equal(normalized.totalPlays,900);
 assert.deepEqual(normalized.recentGames.map(r=>[r.gameType,r.gameName,r.score,r.rpe]),recentGames.map(r=>[r.gameType,r.gameName,r.score,r.rpe]));
 for(const m of MERGED_GAMES)assert.notEqual(variantBestKey(m.target,m.id),`physical_best_${m.id}`);
 for(const id of [...MERGED_GAMES,...REMOVED_GAMES].map(g=>g.id))assert.equal(resolveGuidedGameType('old','old',[{id:'m',requires_approval:true,gameType:id} as never],'m'),id);
});
