#!/usr/bin/env node
// 소개 영상용 "엽쌤의 다른 앱" 실제 플레이 녹화. 공개 GitHub Pages 앱 4개를 Playwright로 열어
// 제목 화면을 잠깐 보여 준 뒤 실제로 조작(클릭·키 입력)하는 모습을 녹화해
// video/out/rec/ext-<이름>.mp4 (1920x1080 · H.264 · yuv420p · 30fps), manifest.json,
// thumbs/ext-<이름>-{a,b,c}.jpg(처음·가운데·끝)를 만든다.
//   node video/record-ext.mjs [name...]      # name: asian oldgame worms odyssey (생략하면 전부)
//   node video/record-ext.mjs --list
// 네트워크: 앱 주소(gmlduqzhd123-lab.github.io)와 앱이 쓰는 글꼴·CDN·썸네일만 허용하고 나머지 요청은 막는다.
// 개인정보 입력·계정 생성 없음. 외부 링크는 누르지 않는다.
import {createRequire} from 'node:module';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const require=createRequire(import.meta.url);
const {chromium}=require('/opt/node22/lib/node_modules/playwright');

const HERE=path.dirname(fileURLToPath(import.meta.url));
const OUT=path.join(HERE,'out/rec');
const RAW=path.join(OUT,'raw-ext');
const THUMBS=path.join(OUT,'thumbs');
const SITE='https://gmlduqzhd123-lab.github.io';
const ALLOW=new Set(['gmlduqzhd123-lab.github.io','fonts.googleapis.com','fonts.gstatic.com','cdn.jsdelivr.net','i.ytimg.com']);

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const READ=1000; // 바뀐 화면을 읽을 시간

// ───────── 화면 커서(record-app.mjs와 같은 흰 원 + 진한 테두리, 누르면 물결) ─────────
function cursorScript(){
  const install=()=>{
    if(document.getElementById('__rec_cursor'))return;
    const st=document.createElement('style');
    st.textContent=`#__rec_cursor{position:fixed;left:0;top:0;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;background:rgba(255,255,255,.92);border:3px solid #1f2937;box-shadow:0 2px 8px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transition:width .12s,height .12s,margin .12s,opacity .3s;box-sizing:border-box}
#__rec_cursor.down{width:22px;height:22px;margin:-11px 0 0 -11px}
.__rec_ripple{position:fixed;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:4px solid rgba(31,41,55,.75);background:rgba(255,255,255,.35);z-index:2147483646;pointer-events:none;box-sizing:border-box;animation:__rec_rip .6s ease-out forwards}
@keyframes __rec_rip{to{width:76px;height:76px;margin:-38px 0 0 -38px;opacity:0}}`;
    document.documentElement.appendChild(st);
    const c=document.createElement('div');c.id='__rec_cursor';document.documentElement.appendChild(c);
    let p=null;try{p=JSON.parse(sessionStorage.getItem('__rec_cursor_pos')||'null')}catch{}
    const put=(x,y)=>{c.style.transform=`translate(${x}px,${y}px)`;};
    if(p){put(p.x,p.y)}else{c.style.opacity='0'}
    addEventListener('mousemove',e=>{c.style.opacity='1';put(e.clientX,e.clientY);try{sessionStorage.setItem('__rec_cursor_pos',JSON.stringify({x:e.clientX,y:e.clientY}))}catch{}},true);
    addEventListener('mousedown',e=>{c.classList.add('down');const r=document.createElement('div');r.className='__rec_ripple';r.style.left=e.clientX+'px';r.style.top=e.clientY+'px';document.documentElement.appendChild(r);setTimeout(()=>r.remove(),700);},true);
    addEventListener('mouseup',()=>c.classList.remove('down'),true);
    setInterval(()=>{if(document.documentElement.lastElementChild!==c&&!document.querySelector('.__rec_ripple'))document.documentElement.appendChild(c);},500);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
}
// 커서를 숨긴다(키보드로만 하는 장면에서 화면 가운데 원이 남지 않게).
const hideCursor=p=>p.evaluate(()=>{const c=document.getElementById('__rec_cursor');if(c)c.style.opacity='0';}).catch(()=>{});

// Phaser 게임 인스턴스를 window.__game 으로 잡아 둔다(오디세이 런 자동 점프 판단용, 게임 동작은 바꾸지 않음).
function phaserHookScript(){
  let P;Object.defineProperty(window,'Phaser',{configurable:true,get(){return P},set(v){P=v;try{const ob=v.Game.prototype.boot;v.Game.prototype.boot=function(){window.__game=this;return ob.apply(this,arguments)}}catch{}}});
}

// ───────── 마우스 ─────────
const POS=new WeakMap();
async function glide(page,x,y,ms){
  const from=POS.get(page)||{x:960,y:760};
  const d=Math.hypot(x-from.x,y-from.y);const dur=ms??Math.min(800,Math.max(280,d*0.7));
  // 시간 기준으로 움직인다(무거운 페이지에서 mouse.move가 느려도 이동 시간이 늘어나지 않게)
  const s=Date.now();
  for(;;){const t=Math.min(1,(Date.now()-s)/dur),e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;await page.mouse.move(from.x+(x-from.x)*e,from.y+(y-from.y)*e);if(t>=1)break;await sleep(12);}
  POS.set(page,{x,y});
}
async function center(loc){await loc.waitFor({state:'visible',timeout:15000});await loc.scrollIntoViewIfNeeded().catch(()=>{});const b=await loc.boundingBox();if(!b)throw new Error('no box');return {x:b.x+b.width/2,y:b.y+b.height/2};}
async function hover(page,loc,hold=READ){const c=await center(loc);await glide(page,c.x,c.y);await sleep(hold);}
async function clickAt(page,x,y,hold=READ){await glide(page,x,y);await sleep(180);await page.mouse.down();await sleep(80);await page.mouse.up();await sleep(hold);}
async function click(page,loc,hold=READ){const c=await center(loc);await clickAt(page,c.x,c.y,hold);}
async function showCursor(page,x,y){await page.mouse.move(x,y);POS.set(page,{x,y});}

class Rec{
  constructor(){this.segs=[];this.open=null;}
  begin(){if(this.open===null)this.open=Date.now();}
  end(){if(this.open!==null){this.segs.push([this.open,Date.now()]);this.open=null;}}
}

const blocked=new Set();
async function openPage(browser,{phaser=false}={}){
  fs.mkdirSync(RAW,{recursive:true});
  const ctx=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,serviceWorkers:'block',colorScheme:'light',locale:'ko-KR',timezoneId:'Asia/Seoul',reducedMotion:'no-preference',recordVideo:{dir:RAW,size:{width:1920,height:1080}}});
  await ctx.route('**/*',r=>{let h='';try{h=new URL(r.request().url()).hostname}catch{}
    if(r.request().url().startsWith('data:')||r.request().url().startsWith('blob:')||ALLOW.has(h))return r.continue();blocked.add(h);return r.abort();});
  await ctx.addInitScript(cursorScript);
  if(phaser)await ctx.addInitScript(phaserHookScript);
  const t0=Date.now();const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  return {ctx,page,t0,errs};
}
async function go(page,url){await page.goto(url,{waitUntil:'load'});await page.waitForLoadState('networkidle',{timeout:15000}).catch(()=>{});await sleep(1200);}

// ───────── 장면 ─────────
const S={};

// 1) 아시안게임 체육 수업: 표지 → 수업 시작 → 종목(양궁) → 경기 점수판에서 점수 올리기 · 타이머
S.asian=async({browser,rec})=>{const t=await openPage(browser);const p=t.page;
  await go(p,SITE+'/Asian-Game/');await showCursor(p,1300,900);rec.begin();await sleep(1500);
  await click(p,p.getByRole('button',{name:/수업 시작하기/}),300);
  const card=p.locator('button.group').filter({hasText:'양궁'}).first();await card.waitFor({timeout:10000});await sleep(500);
  await click(p,card,200);
  await p.locator('#btn-game').waitFor({timeout:10000});await sleep(1000);
  await click(p,p.locator('#btn-game'),700);
  const sb=p.locator('.score-btn:visible');
  await click(p,sb.nth(2),500);   // 청팀 +3
  await click(p,sb.nth(4),500);   // 홍팀 +2
  await click(p,sb.nth(0),500);   // 청팀 +1
  await click(p,sb.nth(5),600);   // 홍팀 +3
  await click(p,p.getByRole('button',{name:/30초/}).first(),1600);
  rec.end();return t;};

// 2) 쉬는시간 오락실 100: 표지 → 게임 목록 → 벽돌깨기 → 실제 플레이(마우스로 패들 조작)
S.oldgame=async({browser,rec})=>{const t=await openPage(browser);const p=t.page;
  await go(p,SITE+'/old-game/');await showCursor(p,1300,900);rec.begin();await sleep(1500);
  await click(p,p.locator('#ix-start'),900);
  const cards=p.locator('.game-card');await hover(p,cards.nth(2),350);await hover(p,cards.nth(3),350);
  await click(p,cards.nth(4),900); // 5. 벽돌깨기
  await click(p,p.locator('#btn-start-game'),500);
  const cv=p.locator('#cv');const box=await cv.boundingBox();
  const padY=box.y+box.height*0.93;
  await clickAt(p,box.x+box.width*0.45,padY,200); // 캔버스를 눌러 공 발사
  // 공 추적: 캔버스 픽셀에서 공(#6a5ae0)을 찾아 마우스로 패들을 공 아래로 옮긴다.
  const ballPos=()=>p.evaluate(()=>{const cv=document.getElementById('cv');const c=cv.getContext('2d');const W=cv.width,H=cv.height;const d=c.getImageData(0,0,W,H).data;let best=null,sx=0,n=0;
    for(let y=H-1;y>=0;y-=2){for(let x=0;x<W;x+=2){const i=(y*W+x)*4;if(Math.abs(d[i]-106)<14&&Math.abs(d[i+1]-90)<14&&Math.abs(d[i+2]-224)<14){if(best===null)best=y;if(y>best-10*W/480){sx+=x;n++}}}if(best!==null&&y<best-12*W/480)break;}
    if(!n)return null;const r=cv.getBoundingClientRect();return {x:r.left+sx/n*r.width/W,y:r.top+best*r.height/H};});
  let prev=null,cur=POS.get(p).x;const tEnd=Date.now()+6500;let k=0;
  while(Date.now()<tEnd){const b=await ballPos();
    if(b){let tx=b.x;if(prev){const vx=b.x-prev.x;tx=b.x+vx*2;}prev=b;
      tx+=Math.sin(k/9)*28; // 공이 패들 여러 곳에 맞도록 조금씩 흔든다
      tx=Math.max(box.x+10,Math.min(box.x+box.width-10,tx));cur+= (tx-cur)*0.8;await p.mouse.move(cur,padY);POS.set(p,{x:cur,y:padY});}
    k++;await sleep(16);}
  await sleep(300);rec.end();return t;};

// 3) 조준! 각도왕: 표지 → 전투 시작 → 탄도 전체 보기 → 각도 바꾸기(↑/↓) → Space로 힘 모아 발사 → 명중
const WORM_PLAN=()=>{const w=current();if(!w||isCPU())return null;
  const all=teams.flatMap(t=>t.worms).filter(o=>o.alive);
  const one=(el,pw,face)=>{const end=simulateShot(w,'bazooka',pw,-el,face);if(end.event!=='worm')return null;
    const hit=all.reduce((m,o)=>dist(end.x,end.y,o.x,o.y)<dist(end.x,end.y,m.x,m.y)?o:m,all[0]);if(hit.team===w.team)return null; // 우리 편은 맞히지 않게
    return {hit,miss:dist(end.x,end.y,hit.x,hit.y)};};
  const score=(el,pw,face,dx,robust)=>{const r=one(el,pw,face);if(!r)return null;
    if(robust)for(const d of [-.012,.012]){const q=one(el,pw+d,face);if(!q||q.hit!==r.hit)return null;} // 힘이 조금 달라도 맞는 샷만
    const miss=r.miss;return {sc:miss*3+Math.abs(el-45)*.3+(pw<.5?25:0)+dx*.004,el,pw:+pw.toFixed(2),face,dx:Math.round(dx),miss:Math.round(miss)};};
  const cands=[];
  for(const e of living(1-w.team)){const face=e.x>=w.x?1:-1,dx=Math.abs(e.x-w.x);
    for(let el=22;el<=70;el+=2)for(let pw=.35;pw<=.96;pw+=.02){const r=score(el,pw,face,dx,false);if(r)cands.push(r);}}
  cands.sort((a,b)=>a.sc-b.sc);let best=null;
  for(const c of cands.slice(0,8)){for(let el=c.el-3;el<=c.el+3;el++)for(let pw=c.pw-.04;pw<=c.pw+.04;pw+=.01)if(pw>=.3&&pw<=.98){const r=score(el,pw,c.face,c.dx,true);if(r&&(!best||r.sc<best.sc))best=r;}}
  return best&&{...best,facing,aim:Math.round(-aim)};};
S.worms=async({browser,rec})=>{const t=await openPage(browser);const p=t.page;
  await go(p,SITE+'/Worms/');
  await p.evaluate(()=>{document.getElementById('mapSize').value='2.5';});
  await showCursor(p,1500,950);rec.begin();await sleep(1500);
  let plan=null;
  for(let attempt=0;attempt<8&&!plan;attempt++){
    if(attempt===0)await click(p,p.locator('#start'),700);else{await p.evaluate(()=>returnToStart());await sleep(500);await p.locator('#start').click();await sleep(900);}
    const sk=p.locator('#skipIntro');if(await sk.isVisible().catch(()=>false)){if(attempt===0)await click(p,sk,150);else await sk.click();}
    rec.end(); // 계산·재시작은 녹화하지 않는다
    await p.waitForFunction(()=>started&&!wormIntro&&current()&&!turnLocked,null,{timeout:10000}).catch(()=>{});await sleep(300);
    plan=await p.evaluate(WORM_PLAN);
    if(plan&&plan.face!==plan.facing){ // 표적 쪽을 바라보게 한 걸음
      const k=plan.face>0?'d':'a';await p.keyboard.down(k);await sleep(70);await p.keyboard.up(k);await sleep(600);plan=await p.evaluate(WORM_PLAN);}
    if(!plan)console.log('  맞힐 표적이 없어 다시 시작');
  }
  if(!plan)throw new Error('worms: no hitting shot');
  rec.begin();
  console.log('  plan',JSON.stringify(plan));
  await sleep(1000);
  await click(p,p.locator('#previewFitBtn'),900); // 탄도 전체: 내 봇과 예상 탄도가 한 화면에
  // 각도: ↑/↓를 누르고 있다가 목표 각도에서 멈춘다(안전장치로 목표에서 키를 놓음)
  // 일부러 목표보다 10° 더 갔다가 되돌아와 각도와 예상 탄도가 바뀌는 모습이 잘 보이게
  const over=plan.el+10<=80?plan.el+10:plan.el-10;
  const turnTo=async(target)=>{const now=await p.evaluate(()=>Math.round(-aim));if(now===target)return;const dir=target>now?'ArrowUp':'ArrowDown';
    await p.evaluate(([t,dir])=>{const f=()=>{if(Math.round(-aim)===t){keys[dir]=false;return}requestAnimationFrame(f)};requestAnimationFrame(f)},[target,dir]);
    await p.keyboard.down(dir);await sleep(Math.abs(target-now)*17+250);await p.keyboard.up(dir);};
  await turnTo(over);await sleep(600);await turnTo(plan.el);
  await p.evaluate(t=>setAimElevation(t),plan.el);await sleep(900);
  // 발사: Space를 누르고 있으면 힘이 차고, 목표 힘에서 정확히 발사되게 한다
  await p.evaluate(t=>{const f=()=>{if(charging&&(gameNow-chargeAt)/1600>=t-.02){chargeAt=gameNow-t*1600;fireEnd();return}requestAnimationFrame(f)};requestAnimationFrame(f)},plan.pw);
  await p.keyboard.down(' ');await sleep(plan.pw*1600+120);await p.keyboard.up(' ');
  await p.waitForFunction(()=>projectiles.length===0&&walkers.length===0,null,{timeout:12000,polling:100}).catch(()=>{});
  await sleep(2200);
  console.log('  hp',await p.evaluate(()=>teams.map(t=>t.worms.map(w=>Math.round(w.hp)).join(',')).join(' | ')));
  rec.end();return t;};

// 4) 오디세이 런: 표지 → 항해 시작 → 섬 고르기 → 달리기(Space로 점프 · 상자/나뭇가지 발판 넘기)
S.odyssey=async({browser,rec})=>{const t=await openPage(browser,{phaser:true});const p=t.page;
  await go(p,SITE+'/Odyssey-Run/');await showCursor(p,620,900);rec.begin();await sleep(1500);
  await click(p,p.getByRole('button',{name:/항해 시작/}),150);
  rec.end(); // 섬 그림이 다 뜰 때까지는 빼고
  const isl=p.locator('.island-card').first();await isl.waitFor({timeout:15000});
  await p.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});await sleep(800);
  rec.begin();await sleep(700);
  await click(p,isl,150);
  rec.end(); // "섬 준비 중" 로딩도 빼고
  const runBtn=p.getByRole('button',{name:/이 섬 달리기/});await runBtn.waitFor({timeout:15000});
  await p.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});await runBtn.scrollIntoViewIfNeeded();await sleep(800);
  rec.begin();await sleep(600);
  await click(p,runBtn,0);
  rec.end();
  await hideCursor(p);
  // 카운트다운(3·2·1) 동안 기다렸다가 달리기가 시작되면 다시 녹화
  const W=()=>p.evaluate(()=>{const s=window.__game?.scene?.getScene('World');if(!s||!s.obstacles?.[0])return null;return s.obstacles[0].x;});
  const x0=await (async()=>{for(let i=0;i<100;i++){const v=await W();if(v!==null)return v;await sleep(100);}return null;})();
  for(let i=0;i<100;i++){const v=await W();if(v!==null&&v<x0-2)break;await sleep(30);}
  await sleep(600);rec.begin();
  // 자동 점프: 다가오는 상자·기둥·발판·몬스터 앞에서 Space
  const state=()=>p.evaluate(()=>{const s=window.__game.scene.getScene('World');const h=s.hero;const list=[];
    for(const o of s.obstacles)if(o.visible)list.push({x:o.x,w:o.displayWidth,kind:'obs'});
    for(const o of s.platforms)if(o.visible)list.push({x:o.x,w:o.displayWidth,kind:'plat'});
    for(const o of s.monsters)if(o.visible)list.push({x:o.x-o.displayWidth*o.originX,w:o.displayWidth,kind:'mon'});
    return {hx:h.x,hy:h.y,vy:h.body?.velocity?.y||0,list,ref:s.obstacles[0].x};});
  const done=new Set();let lastJump=0;
  const play=async(ms,extra)=>{const end=Date.now()+ms;
    while(Date.now()<end){const s=await state();
      for(const o of s.list){const dx=o.x-s.hx;const id=o.kind+Math.round(o.x-s.ref);
        if(dx>60&&dx<125&&!done.has(id)&&Date.now()-lastJump>500){done.add(id);lastJump=Date.now();await p.keyboard.press('Space');}}
      if(extra)await extra(s);
      await sleep(25);}};
  // 처음 몇 초는 별을 따라 점프·2단 점프를 보여 준다
  const t1=Date.now();let j=0;
  await play(3600,async()=>{const el=Date.now()-t1;
    if(j===0&&el>900){j++;await p.keyboard.press('Space');}
    if(j===1&&el>2300){j++;await p.keyboard.press('Space');await sleep(260);await p.keyboard.press('Space');}});
  rec.end();
  // 첫 상자 바로 앞까지는 녹화하지 않고 달린다(컷)
  for(let i=0;i<400;i++){const s=await state();const crate=s.list.find(o=>o.kind==='obs');if(crate&&crate.x-s.hx<900)break;await play(60);}
  rec.begin();
  const t2=Date.now();let jj=0;
  await play(5400,async(s)=>{ // 나뭇가지 발판 위에서 별 따기 점프
    const onPlat=s.list.some(o=>o.kind==='plat'&&o.x<s.hx&&o.x+o.w>s.hx+120)&&Math.abs(s.vy)<1&&s.hy<420;
    if(onPlat&&jj<2&&Date.now()-lastJump>700){jj++;lastJump=Date.now();await p.keyboard.press('Space');}});
  rec.end();return t;};

// ───────── 변환 ─────────
function ffprobe(file){const r=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,codec_name,pix_fmt,r_frame_rate:format=duration','-of','json',file],{encoding:'utf8'});return JSON.parse(r.stdout);}
function convert(raw,dest,segs,t0){
  const parts=segs.map(([a,b])=>[Math.max(0,(a-t0)/1000),Math.max(0,(b-t0)/1000)]);
  const chains=parts.map(([a,b],i)=>`[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS[s${i}]`);
  const fc=chains.join(';')+';'+parts.map((_,i)=>`[s${i}]`).join('')+`concat=n=${parts.length}:v=1:a=0,fps=30,scale=1920:1080:flags=lanczos,format=yuv420p[v]`;
  const r=spawnSync('ffmpeg',['-y','-v','error','-i',raw,'-filter_complex',fc,'-map','[v]','-an','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',dest],{encoding:'utf8'});
  if(r.status!==0)throw new Error('ffmpeg: '+r.stderr);
  const info=ffprobe(dest),s=info.streams[0];const sec=+(+info.format.duration).toFixed(2);
  fs.mkdirSync(THUMBS,{recursive:true});
  const base=path.basename(dest,'.mp4');
  for(const [tag,at] of [['a',0.3],['b',sec/2],['c',Math.max(0,sec-0.3)]])
    spawnSync('ffmpeg',['-y','-v','error','-ss',at.toFixed(2),'-i',dest,'-frames:v','1','-q:v','3',path.join(THUMBS,`${base}-${tag}.jpg`)]);
  return {sec,w:s.width,h:s.height,codec:s.codec_name,pix:s.pix_fmt,fps:s.r_frame_rate,parts};
}

// ───────── main ─────────
const args=process.argv.slice(2);
if(args.includes('--list')){console.log(Object.keys(S).join('\n'));process.exit(0);}
const wanted=args.filter(a=>!a.startsWith('--')).map(a=>a.replace(/^ext-/,''));
const bad=wanted.filter(w=>!S[w]);if(bad.length){console.log('모르는 이름:',bad.join(', '),'\n사용법: node video/record-ext.mjs [asian|oldgame|worms|odyssey ...]');process.exit(2);}
const keys=Object.keys(S).filter(k=>!wanted.length||wanted.includes(k));
fs.mkdirSync(OUT,{recursive:true});
const manifestPath=path.join(OUT,'manifest.json');
const browser=await chromium.launch({args:['--mute-audio','--autoplay-policy=no-user-gesture-required']});
const failed=[];
try{
  for(const k of keys){
    const name='ext-'+k;const rec=new Rec();console.log('▶',name);
    let o=null;
    try{o=await S[k]({browser,rec});}catch(e){console.log('  실패:',e.message.split('\n')[0]);failed.push(k);}
    rec.end();
    if(!o){continue;}
    const video=o.page.video();await o.ctx.close();const raw=await video.path();
    if(o.errs.length)console.log('  pageerror',o.errs.slice(0,3));
    if(!rec.segs.length){console.log('  구간 없음');continue;}
    const meta=convert(raw,path.join(OUT,name+'.mp4'),rec.segs,o.t0);fs.rmSync(raw,{force:true});
    const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
    manifest[name]={sec:meta.sec,w:meta.w,h:meta.h};fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
    console.log(`  ${name}.mp4 ${meta.sec}s ${meta.w}x${meta.h} ${meta.codec}/${meta.pix} ${meta.fps} 구간 ${meta.parts.map(([a,b])=>(b-a).toFixed(1)).join('+')}s`);
  }
}finally{
  await browser.close();
  fs.rmSync(RAW,{recursive:true,force:true});
}
if(blocked.size)console.log('막은 외부 요청 호스트:',[...blocked].join(', '));
if(failed.length){console.log('실패한 장면:',failed.join(', '));process.exitCode=1;}
