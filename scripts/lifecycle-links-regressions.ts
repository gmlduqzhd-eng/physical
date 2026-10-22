import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {GAMES,AVAILABLE_GAMES} from '../src/domain/gamesData';
import {MERGED_GAMES,REMOVED_GAMES,LIFECYCLE_STAGE} from '../src/domain/gameLifecycle';
import {normalizePlayerProfile} from '../src/application/usePlayerProfile';
const base=process.argv[2]||'http://127.0.0.1:4173',out=path.resolve(process.env.TEST_OUTPUT_DIR||'test-results/lifecycle-links');mkdirSync(out,{recursive:true});
const report:{base:string;stage:number;cases:unknown[];errors:string[];writes:string[]}={base,stage:LIFECYCLE_STAGE,cases:[],errors:[],writes:[]};
const active=MERGED_GAMES.filter(g=>g.stage<=LIFECYCLE_STAGE);
const seed=JSON.parse(JSON.stringify(normalizePlayerProfile({nickname:'기존 기록 검사',totalScore:1200,totalPlays:99,createdAt:1,highScores:Object.fromEntries(GAMES.map(g=>[g.type,9999])),playCounts:Object.fromEntries(GAMES.map(g=>[g.type,3])),recentGames:[{gameType:'fate_card',gameName:'예전 운명의 카드',score:-300,playedAt:1,rpe:4,details:{metrics:{'보존':'원본'}}},...MERGED_GAMES.slice(0,10).map((g,i)=>({gameType:g.id,gameName:g.name,score:i+20,playedAt:i+2,rpe:3}))]})));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{for(const solo of [true,false]){
 const context=await browser.newContext({viewport:{width:solo?390:1024,height:844}}),page=await context.newPage();
 page.on('pageerror',e=>report.errors.push(e.message));
 await page.route('**/*',route=>{const r=route.request(),u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')||u.pathname.startsWith('/api/'))&&!['GET','HEAD','OPTIONS'].includes(r.method())){report.writes.push(u.pathname);return route.abort();}return route.continue();});
 await page.goto(base+'/solo');await page.evaluate(({seed,ids})=>{sessionStorage.setItem('physical_player_profile',JSON.stringify(seed));for(const id of ids)localStorage.setItem('physical_best_'+id,'9999');localStorage.setItem('physical_favorites',JSON.stringify(ids));},{seed,ids:GAMES.map(g=>g.type)});
 const prefix=solo?'/solo/play/':'/play/';
 for(const g of active){
  const response=await page.goto(base+prefix+g.id+'?room=keep-room&group=keep-group&mission=keep-mission&guided=1#keep-hash');assert.equal(response?.status(),200);
  await page.waitForURL(u=>u.pathname===prefix+g.target&&u.searchParams.get('variant')===g.id);
  const u=new URL(page.url());for(const [key,val]of [['room','keep-room'],['group','keep-group'],['mission','keep-mission'],['guided','1']])assert.equal(u.searchParams.get(key),val);assert.equal(u.hash,'#keep-hash');
  await page.getByRole('button',{name:'활동 시작',exact:true}).click();await page.locator(`[data-consolidated="${g.target}"][data-variant="${g.id}"]`).waitFor();
  const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!));assert.deepEqual(saved,seed,'opening an old link cannot rewrite history');
  report.cases.push({id:g.id,solo,status:'pass'});
 }
 if(LIFECYCLE_STAGE>=3)for(const g of REMOVED_GAMES){await page.goto(base+prefix+g.id+'?room=keep-room&group=keep-group&mission=keep-mission&guided=1#keep-hash');await page.locator(`[data-retired="${g.id}"]`).waitFor();assert.equal(await page.getByRole('button',{name:'활동 시작',exact:true}).count(),0);assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('physical_player_profile')!)),seed);report.cases.push({id:g.id,solo,status:'pass'});}
 await page.goto(base+'/solo');await page.locator('[data-game-card]').first().waitFor();assert.equal(await page.locator('[data-game-card]').count(),AVAILABLE_GAMES.length);
 for(const id of [...active,...(LIFECYCLE_STAGE>=3?REMOVED_GAMES:[])].map(g=>g.id))assert.equal(await page.locator(`[data-game-card="${id}"]`).count(),0);
 await page.getByRole('searchbox').fill(active[0].name);assert(await page.locator(`[data-game-card="${active[0].target}"]`).count());
 const oldBests=await page.evaluate(ids=>ids.every(id=>localStorage.getItem('physical_best_'+id)==='9999'),GAMES.map(g=>g.type));assert(oldBests);
 await context.close();console.log('PASS old links and history',solo?'solo':'classroom',active.length);
 }assert.deepEqual(report.errors,[]);assert.deepEqual(report.writes,[]);writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.cases.length}));}finally{await browser.close();}
