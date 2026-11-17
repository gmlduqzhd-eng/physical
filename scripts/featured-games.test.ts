import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {FEATURED_GAME_IDS,FEATURED_GAMES,MERGED_INTO,featuredFirst,hubPool,includesArchive,isFeatured,mergedInto} from '../src/domain/featuredGames';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {SIMILAR_TO} from '../src/domain/activityShelves';

const live=new Set(AVAILABLE_GAMES.map(g=>g.type));
const picks=FEATURED_GAME_IDS.filter(id=>!id.startsWith('sig-'));

test('featured ids are live games or signature games, without duplicates',()=>{
 assert.equal(new Set(FEATURED_GAME_IDS).size,FEATURED_GAME_IDS.length);
 for(const id of FEATURED_GAME_IDS)assert.ok(id.startsWith('sig-')||live.has(id),id);
 assert.ok(FEATURED_GAME_IDS.slice(0,6).every(id=>id.startsWith('sig-')),'signature games come first');
 assert.ok(picks.length>=30&&picks.length<=40,`${picks.length} picks`);
});

test('isFeatured ignores signature ids that are not available yet',()=>{
 for(const id of FEATURED_GAME_IDS){if(!live.has(id))assert.equal(isFeatured(id),false,id);}
 assert.equal(FEATURED_GAMES.length,FEATURED_GAME_IDS.filter(id=>live.has(id)).length);
 assert.ok(FEATURED_GAMES.every(g=>isFeatured(g.type)));
});

test('picks avoid near-duplicates and games merged into a signature game',()=>{
 for(const id of picks){assert.ok(!SIMILAR_TO.has(id),`${id} is a near-duplicate`);assert.ok(!MERGED_INTO[id],`${id} is merged`);}
 for(const [old,target] of Object.entries(MERGED_INTO)){assert.ok(live.has(old),old);assert.ok(target.startsWith('sig-'),target);assert.equal(mergedInto(old)?.type,live.has(target)?target:undefined);}
});

test('the hub shows only featured games by default and every live game with view=all',()=>{
 const base={viewAll:false,query:'',phoneOnly:false};
 assert.deepEqual(hubPool(base).map(g=>g.type),FEATURED_GAMES.map(g=>g.type));
 assert.equal(hubPool({...base,viewAll:true}).length,AVAILABLE_GAMES.length);
 assert.ok(AVAILABLE_GAMES.length>=158);
 assert.equal(includesArchive({...base,query:'  '}),false,'blank search keeps the featured view');
 assert.equal(includesArchive({...base,query:'공'}),true,'search covers the archive');
 assert.equal(includesArchive({...base,phoneOnly:true}),true);
});

test('search covers the archive and ranks featured games first',()=>{
 for(const q of ['공','걷기','기억','표현']){
  const found=featuredFirst(hubPool({viewAll:false,query:q,phoneOnly:false}).filter(g=>matchesActivitySearch(g,q)));
  assert.ok(found.length>0,q);
  const firstArchive=found.findIndex(g=>!isFeatured(g.type)),lastFeatured=found.map(g=>isFeatured(g.type)).lastIndexOf(true);
  if(firstArchive>=0&&lastFeatured>=0)assert.ok(lastFeatured<firstArchive,`${q}: featured after archive`);
 }
 assert.ok(featuredFirst(AVAILABLE_GAMES.filter(g=>matchesActivitySearch(g,'기억'))).some(g=>!isFeatured(g.type)),'archived games are still found');
 assert.deepEqual(featuredFirst([...FEATURED_GAMES].reverse()).map(g=>g.type),FEATURED_GAMES.map(g=>g.type));
});

test('the hub wires the view toggle, archive badge and merged link, and home/hub picks use featured games',()=>{
 const src=readFileSync('src/presentation/ActivityLibrary.tsx','utf8');
 assert.match(src,/params\.get\('view'\)==='all'/);
 assert.match(src,/next\.set\('view','all'\)/);
 assert.match(src,/data-archive/);
 assert.match(src,/data-merged-into/);
 assert.match(src,/보관함까지 모두 보기/);
 assert.match(readFileSync('src/presentation/UnifiedHomePage.tsx','utf8'),/FEATURED_GAMES/);
 assert.match(readFileSync('src/presentation/GameHub.tsx','utf8'),/FEATURED_GAMES/);
});

test('MERGED_INTO matches the mergedFrom list of every ready signature game',async()=>{
 const {SIGNATURE_GAMES}=await import('../src/domain/signatureGames');
 const {MERGED_INTO}=await import('../src/domain/featuredGames');
 for(const g of SIGNATURE_GAMES.filter(g=>g.ready)){
  const planned=Object.entries(MERGED_INTO).filter(([,v])=>v===g.id).map(([k])=>k).sort();
  assert.deepEqual([...(g.mergedFrom??[])].sort(),planned,g.id);
 }
});
