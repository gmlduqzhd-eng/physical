import test from 'node:test';
import assert from 'node:assert/strict';
import {REMOVED_GAMES,RETIRED_REPLACEMENTS,MERGED_GAMES,isAvailableGame,isCleanedGame,replacementUrl,getMergedGame} from '../src/domain/gameLifecycle';
import {AVAILABLE_GAMES,GAMES} from '../src/domain/gamesData';
import {READY_SIGNATURE_IDS} from '../src/domain/signatureGames';
import {PHONE_PLAYS,ALL_PHONE_PLAYS,PHONE_PLAY_BY_ID} from '../src/domain/phonePlayCatalog';
import {LESSON_GAME_CATALOG} from '../src/data/lessonGameCatalog';
import {CORE_ACTIVITY_IDS,SIMILAR_TO,UNDERSTANDING_IDS} from '../src/domain/activityShelves';
import {PRIMARY_EXPERIENCES,STARTER_RECIPES} from '../src/domain/playRecipes';
import {withParticle} from '../src/domain/koreanParticle';

const cleaned=REMOVED_GAMES.filter(g=>g.target);
test('the 2026-11 cleanup retires 62 activities and 8 courses attached to them, each leading to an activity that is still offered',()=>{
 assert.equal(cleaned.length,70);assert.equal(new Set(cleaned.map(g=>g.id)).size,70);
 for(const g of cleaned){
  assert(GAMES.some(x=>x.type===g.id),`${g.id} still has its old definition for records`);
  assert(!isAvailableGame(g.id)&&isCleanedGame(g.id),g.id);
  assert(isAvailableGame(g.target!),`${g.id} → ${g.target} must be available`);
  assert.equal(RETIRED_REPLACEMENTS[g.id],g.target);
  assert(g.reason.length>10&&g.name.length>1,g.id);
  const url=replacementUrl('/play/'+g.id,g.id,'room=r1&group=g1&mission=m1&guided=1&lang=ko','')!;
  assert(url.startsWith('/play/'+g.target+'?')&&url.includes('replacementFor='+g.id)&&url.includes('lang=ko'),url);
  assert(!/[?&](room|group|mission|guided)=/.test(url),'the replacement opens as practice, not inside a room that is not running it: '+url);
 }
 assert(replacementUrl('/solo/play/run','run','','')!.startsWith('/solo/play/shuttle-run-beep'));
});
test('retired activities disappear from every list a teacher picks from',()=>{
 const gone=new Set(cleaned.map(g=>g.id));
 assert.equal(AVAILABLE_GAMES.length,158+READY_SIGNATURE_IDS.length);assert(!AVAILABLE_GAMES.some(g=>gone.has(g.type)));
 assert(!LESSON_GAME_CATALOG.some(g=>gone.has(g.id)));
 assert.equal(ALL_PHONE_PLAYS.length,106);assert.equal(PHONE_PLAYS.length,65);assert(!PHONE_PLAYS.some(p=>gone.has(p.id)));
 assert(PHONE_PLAY_BY_ID.has('phone-play-002'),'old plays still resolve for records');
 for(const id of [...CORE_ACTIVITY_IDS,...UNDERSTANDING_IDS,...SIMILAR_TO.keys(),...SIMILAR_TO.values()])assert(!gone.has(id),id);
 for(const r of [...PRIMARY_EXPERIENCES,...STARTER_RECIPES])assert(isAvailableGame(r.game),r.game);
});
test('no remaining course hangs off a retired activity',()=>{
 for(const m of MERGED_GAMES)assert(isAvailableGame(m.target)||!!getMergedGame(m.target),`${m.id} → ${m.target}`);
 for(const m of MERGED_GAMES)assert(!cleaned.some(c=>c.id===m.target),`${m.id} still points at retired ${m.target}`);
});
test('Korean particles follow the final consonant',()=>{
 assert.equal(withParticle('갈림길 보급 작전','으로'),'갈림길 보급 작전으로');
 assert.equal(withParticle('표적 보급 실험실','으로'),'표적 보급 실험실로');
 assert.equal(withParticle('비밀지도','으로'),'비밀지도로');
 assert.equal(withParticle('반대말 기상대','은는'),'반대말 기상대는');
 assert.equal(withParticle('빈 섬 탐사대','이가'),'빈 섬 탐사대가');
 assert.equal(withParticle('징검섬','을를'),'징검섬을');
 assert.equal(withParticle('K-POP','으로'),'K-POP(으)로');
});
