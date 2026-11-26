#!/usr/bin/env node
// 소개 영상용 앱 화면 녹화. 로컬 빌드(가짜 Supabase)를 띄우고 Playwright로 장면을 녹화해
// video/out/rec/<이름>.mp4 (H.264 · yuv420p · 30fps)와 manifest.json, thumbs/<이름>.jpg 를 만든다.
//   node video/record-app.mjs                 # 전부(빌드 포함)
//   node video/record-app.mjs boss-main today-plan   # 일부만
//   node video/record-app.mjs --no-build ...  # 이미 만든 video/out/dist 재사용
//   node video/record-app.mjs --list          # 장면 이름 보기
// TV: 뷰포트 1920x1080(배율 1). 휴대폰(-phone): 뷰포트 480x1040(배율 1, 휴대폰 화면 배치 그대로)을 녹화해 498x1080으로 맞춤.
// (Playwright 영상은 deviceScaleFactor 2를 반영하지 않고 CSS 픽셀 크기로만 찍혀서 2배 녹화는 쓰지 않는다.)
import {createRequire} from 'node:module';
import {spawn,spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {fileURLToPath} from 'node:url';
import {installBlank,makeClassroom,installClassroom,broker} from './record-fixtures.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require('/opt/node22/lib/node_modules/playwright');

const HERE=path.dirname(fileURLToPath(import.meta.url));
const ROOT=path.resolve(HERE,'..');
const DIST=path.join(HERE,'out/dist');
const OUT=path.join(HERE,'out/rec');
const RAW=path.join(OUT,'raw');
const THUMBS=path.join(OUT,'thumbs');
const PORT=5200,BASE=`http://127.0.0.1:${PORT}`;
const TV={viewport:{width:1920,height:1080},dsf:1,video:{width:1920,height:1080},out:null};
const PHONE={viewport:{width:480,height:1040},dsf:1,video:{width:480,height:1040},out:{w:498,h:1080}};

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const READ=1200; // 바뀐 화면을 읽을 시간

// ───────── 화면 커서(흰 원 + 진한 테두리, 누르면 물결) ─────────
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
    // 모달(top layer) 위에도 보이게 주기적으로 맨 뒤로 옮긴다
    setInterval(()=>{if(document.documentElement.lastElementChild!==c&&!document.querySelector('.__rec_ripple'))document.documentElement.appendChild(c);},500);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
}

// 화면에 보이는 로컬 주소(127.0.0.1:5200)를 실제 서비스 주소 글자로만 바꿔 보여 준다(QR 내용은 그대로).
function hostLabelScript(){
  const fix=n=>{const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT);let t;while((t=w.nextNode()))if(t.nodeValue.includes('127.0.0.1:5200'))t.nodeValue=t.nodeValue.split('127.0.0.1:5200').join('physical-pi.vercel.app');};
  const start=()=>{fix(document.body);new MutationObserver(ms=>{for(const m of ms){if(m.type==='characterData')fix(m.target.parentNode||document.body);for(const a of m.addedNodes)fix(a.nodeType===3?a.parentNode:a);}}).observe(document.body,{subtree:true,childList:true,characterData:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
}

function storageScript(extra){
  try{
    const base={physical_teacher_guide_seen_v1:'1',physical_teacher_room_guide_seen_v1:'1',physical_theme_v1:'light',physical_text_scale_v1:'normal',physical_tv_voice_v1:JSON.stringify({on:false,rate:'normal',volume:'normal'})};
    const all={...base,...extra};
    if(!sessionStorage.getItem('__rec_seeded')){for(const [k,v] of Object.entries(all)){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}sessionStorage.setItem('__rec_seeded','1');}
  }catch{}
}

// ───────── 마우스 ─────────
const POS=new WeakMap();
const OPEN=[];
async function glide(page,x,y,ms){
  const from=POS.get(page)||{x:page.viewportSize().width/2,y:page.viewportSize().height*0.7};
  const d=Math.hypot(x-from.x,y-from.y);const dur=ms??Math.min(1100,Math.max(350,d*0.9));const n=Math.max(2,Math.round(dur/16));
  for(let i=1;i<=n;i++){const t=i/n,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;await page.mouse.move(from.x+(x-from.x)*e,from.y+(y-from.y)*e);await sleep(16);}
  POS.set(page,{x,y});
}
async function center(loc){await loc.waitFor({state:'visible',timeout:15000});await loc.scrollIntoViewIfNeeded().catch(()=>{});const b=await loc.boundingBox();if(!b)throw new Error('no box');return {x:b.x+b.width/2,y:b.y+b.height/2};}
// 커서가 글자를 오래 가리지 않게: 짚은 뒤 잠깐 있다가 상자 오른쪽 아래 바깥으로 비켜선다.
async function boxOf(loc){await loc.waitFor({state:'visible',timeout:15000});await loc.scrollIntoViewIfNeeded().catch(()=>{});const b=await loc.boundingBox();if(!b)throw new Error('no box');return b;}
async function stepAside(page,b){await glide(page,Math.min(b.x+b.width+34,1880),Math.min(b.y+b.height+26,1040),320);}
async function hover(page,loc,hold=READ){const b=await boxOf(loc);await glide(page,b.x+b.width/2,b.y+b.height/2);await sleep(Math.min(500,hold));await stepAside(page,b);await sleep(Math.max(0,hold-500));}
async function click(page,loc,hold=READ){const b=await boxOf(loc);await glide(page,b.x+b.width/2,b.y+b.height/2);await sleep(220);await page.mouse.down();await sleep(90);await page.mouse.up();await sleep(120);await stepAside(page,b);await sleep(Math.max(0,hold-440));}
async function showCursor(page,x,y){await page.mouse.move(x,y);POS.set(page,{x,y});}
const plusBtns=p=>p.locator('button:visible').filter({hasText:/^\s*\+1\s*$/});
const btn=(p,name,opts={})=>p.getByRole('button',{name,...opts}).first();

// ───────── 녹화 틀 ─────────
class Rec{
  constructor(){this.segs=[];this.open=null;}
  begin(){if(this.open===null)this.open=Date.now();}
  end(){if(this.open!==null){this.segs.push([this.open,Date.now()]);this.open=null;}}
}

async function openPage(browser,dev,{init={},setup}={}){
  fs.mkdirSync(RAW,{recursive:true});
  const ctx=await browser.newContext({viewport:dev.viewport,deviceScaleFactor:dev.dsf,serviceWorkers:'block',colorScheme:'light',locale:'ko-KR',timezoneId:'Asia/Seoul',reducedMotion:'no-preference',hasTouch:dev===PHONE,isMobile:dev===PHONE,recordVideo:{dir:RAW,size:dev.video}});
  await ctx.addInitScript(storageScript,init);
  await ctx.addInitScript(cursorScript);
  if(setup)await setup(ctx);else await installBlank(ctx);
  const t0=Date.now();const page=await ctx.newPage();
  const errs=[];page.on('pageerror',e=>errs.push(e.message));
  const o={ctx,page,t0,dev,errs};OPEN.push(o);return o;
}
async function go(page,url){await page.goto(BASE+url);await page.waitForLoadState('networkidle').catch(()=>{});await sleep(600);}

// ───────── 장면 ─────────
// 각 장면: run({browser,rec}) → {이름: openPage 결과}. rec.begin()/end() 사이만 영상에 남는다(여러 번이면 이어 붙임).
const TVMODE={physical_tv_mode_v1:'on'};
const S={};

S['home-logo']=async({browser,rec})=>{const t=await openPage(browser,TV);await go(t.page,'/');await sleep(400);rec.begin();await sleep(2500);await glide(t.page,960,700,1500);await sleep(6000);rec.end();return {'home-logo':t};};

S['home-entries']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/');await showCursor(p,960,900);rec.begin();await sleep(1000);
  for(const h of ['수업 시작','학생 참여','활동·도구 찾기']){await hover(p,p.getByRole('heading',{name:h,exact:true}),300);const c=POS.get(p);await glide(p,c.x+60,c.y+60,700);await sleep(1500);}
  await sleep(1200);rec.end();return {'home-entries':t};};

S['home-start-hover']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/');await showCursor(p,1300,850);rec.begin();await sleep(1500);
  await hover(p,p.getByRole('link',{name:'수업 시작하기'}),1200);await sleep(6000);rec.end();return {'home-start-hover':t};};

S['start-method']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:{physical_lesson_method_v1:null}});const p=t.page;await go(p,'/');await showCursor(p,1200,850);rec.begin();await sleep(1000);
  await click(p,p.getByRole('link',{name:'수업 시작하기'}),300);await p.waitForURL('**/start-lesson');await p.waitForLoadState('networkidle').catch(()=>{});await sleep(1800);
  await hover(p,p.getByRole('heading',{name:'TV 한 대로 해요'}),1600);
  await click(p,p.getByRole('link',{name:'오늘 수업 열기'}),300);await p.waitForURL('**/today');await sleep(3000);rec.end();return {'start-method':t};};

S['today-plan']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/today');await showCursor(p,1500,800);rec.begin();await sleep(1500);
  await click(p,btn(p,'1~2학년'),1800);await click(p,btn(p,'체육관·강당'),1600);await click(p,btn(p,'교실',{exact:true}),1800);
  await glide(p,1300,560,1200);await sleep(2500);rec.end();return {'today-plan':t};};

S['today-shuffle']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/today');await showCursor(p,1500,800);rec.begin();await sleep(1500);
  await click(p,btn(p,/다른 활동으로/),2500);await glide(p,1250,560,1200);await sleep(3500);rec.end();return {'today-shuffle':t};};

S['today-start']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/today');await showCursor(p,1500,800);rec.begin();await sleep(1200);
  await click(p,btn(p,/오늘 수업 시작/),300);const go1=p.locator('button:visible').filter({hasText:/시작/}).filter({hasText:'반 전체'}).first();await go1.waitFor({timeout:15000});await sleep(1800);
  await click(p,go1,300);await sleep(5500);rec.end();return {'today-start':t};};

// 종목 교실(아시안게임 28개 종목): 목록을 훑고 한 종목을 열어 수업 단계를 보여 준다.
S['sports-classroom']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/sports?filter=all');await showCursor(p,1300,900);rec.begin();await sleep(1500);
  const cards=p.locator('a.sports-card:visible');for(let i=0;i<3;i++){await hover(p,cards.nth(i),900);}
  await p.mouse.wheel(0,380);await sleep(1200);await hover(p,cards.nth(5),700);
  await click(p,cards.nth(1),300);await p.waitForURL(/\/sports\/[^/]+$/);await p.waitForLoadState('networkidle').catch(()=>{});await sleep(2200);
  await p.mouse.wheel(0,420);await sleep(2600);rec.end();return {'sports-classroom':t};};

// 엽쌤의 다른 수업 앱 모음: 카드만 차례로 짚는다(누르면 새 창이 열리므로 누르지 않음).
S['more-apps']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/more');await showCursor(p,1300,900);rec.begin();await sleep(1500);
  const cards=p.locator('a.sports-card:visible');const n=Math.min(await cards.count(),6);for(let i=0;i<n;i++){await hover(p,cards.nth(i),800);}
  await sleep(1500);rec.end();return {'more-apps':t};};

async function bossTo(p,phase){ // TV 모드 보스전을 원하는 단계까지(녹화 밖에서)
  await go(p,'/play/sig-boss-raid');if(phase==='intro')return;
  await btn(p,/시범 건너뛰고/).click();await sleep(800);
  if(phase==='practice'){await btn(p,/연습 판 시작/).waitFor({timeout:8000}).catch(()=>{});return;}
  if(await btn(p,/연습 판 시작/).count())await btn(p,/연습 판 시작/).click();
  await btn(p,/본게임 시작/).waitFor({timeout:15000});await btn(p,/본게임 시작/).click();await sleep(4200);
}

S['boss-intro']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:TVMODE});const p=t.page;await bossTo(p,'intro');await showCursor(p,1500,950);rec.begin();await sleep(1500);
  for(const row of ['무엇을','어떻게','언제 끝']){const l=p.getByText(row,{exact:true}).first();if(await l.count())await hover(p,l,1400);}
  await hover(p,btn(p,/시작 · 시범/),2500);rec.end();return {'boss-intro':t};};

S['boss-practice']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:TVMODE});const p=t.page;await go(p,'/play/sig-boss-raid');await showCursor(p,1500,950);rec.begin();await sleep(800);
  await click(p,btn(p,/시범 건너뛰고/),300);await sleep(4200);
  const plus=plusBtns(p);if(await plus.count()){await click(p,plus.nth(0),1500);await click(p,plus.nth(1),1500);}
  await sleep(2500);rec.end();return {'boss-practice':t};};

S['boss-main']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:TVMODE});const p=t.page;await bossTo(p,'main');await showCursor(p,1300,700);rec.begin();await sleep(2500);
  const plus=plusBtns(p);
  await click(p,plus.nth(0),1600);await click(p,plus.nth(1),1600);await click(p,plus.nth(0),1400);await click(p,plus.nth(1),2000);await sleep(1500);rec.end();return {'boss-main':t};};

S['boss-defeat']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:TVMODE});const p=t.page;await bossTo(p,'main');const plus=plusBtns(p);
  for(let i=0;i<7;i++){await plus.nth(i%2).click();await sleep(150);}await sleep(800);await showCursor(p,1300,700);rec.begin();await sleep(1200);
  for(let i=0;i<4;i++)await click(p,plus.nth(i%2),i===3?300:700);
  await sleep(5500);rec.end();return {'boss-defeat':t};};

S['boss-seated']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:TVMODE});const p=t.page;await bossTo(p,'intro');await showCursor(p,1300,950);rec.begin();await sleep(1500);
  const cb=p.getByRole('checkbox').first();await hover(p,p.getByText(/^앉아서 하기/).first(),800);await click(p,cb,2500);
  await click(p,btn(p,/시범 건너뛰고/),6000);rec.end();return {'boss-seated':t};};

S['games-montage']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:TVMODE});const p=t.page;
  for(const g of ['sig-signal-captain','sig-move-bingo','sig-mirror-pair']){
    await go(p,'/play/'+g);await btn(p,/시범 건너뛰고/).click().catch(()=>{});await sleep(800);
    const main=btn(p,/본게임 시작/);await main.waitFor({timeout:12000}).catch(()=>{});if(await main.count()){await main.click();}await sleep(4300);
    await showCursor(p,1500,800);rec.begin();
    if(g==='sig-move-bingo'){const cell=p.locator('button:visible:enabled').filter({hasText:/번|걸음|오기|지식/}).first();if(await cell.count())await click(p,cell,900);else await sleep(900);
      const ok=p.locator('button:visible:enabled').filter({hasText:/성공/}).first();if(await ok.count())await click(p,ok,1400);else await sleep(1400);}
    else{const plus=plusBtns(p);if(await plus.count())await click(p,plus.first(),1500);else await sleep(1500);}
    await sleep(2000);rec.end();await sleep(700);
  }
  return {'games-montage':t};};

// 휴대폰 리모컨: TV와 폰을 같은 시계로 녹화한다(두 영상 길이·시작이 같다).
async function remotePair(browser){
  const br=broker();
  const tv=await openPage(browser,TV,{init:TVMODE,setup:async c=>{await installBlank(c);await br(c);}});
  const ph=await openPage(browser,PHONE,{setup:async c=>{await installBlank(c);await br(c);}});
  return {tv,ph};
}
S['remote-pair']=async({browser,rec})=>{const {tv,ph}=await remotePair(browser);const p=tv.page,m=ph.page;
  await go(p,'/play/sig-boss-raid');await btn(p,/시작 · 시범/).click();await sleep(1200);await go(m,'/');
  await showCursor(p,1700,300);await showCursor(m,240,700);rec.begin();await sleep(1200);
  await click(p,btn(p,/휴대폰 리모컨/),2200);
  const href=await p.locator('.fun-remote-panel a[href*="fun-remote"]').first().getAttribute('href');
  await m.goto(new URL(href,BASE).href);await m.waitForLoadState('networkidle').catch(()=>{});await sleep(2500);
  const allow=p.locator('.fun-remote-panel button').filter({hasText:/허용/}).first();await allow.waitFor({timeout:10000});await hover(p,allow,600);await click(p,allow,2500);
  await sleep(1500);rec.end();return {'remote-pair-tv':tv,'remote-pair-phone':ph};};

S['remote-next']=async({browser,rec})=>{const {tv,ph}=await remotePair(browser);const p=tv.page,m=ph.page;
  await go(p,'/play/sig-boss-raid');await btn(p,/시범 건너뛰고/).click();await sleep(1000);
  await btn(p,/휴대폰 리모컨/).click();await sleep(1500);
  const href=await p.locator('.fun-remote-panel a[href*="fun-remote"]').first().getAttribute('href');
  await m.goto(new URL(href,BASE).href);await m.waitForLoadState('networkidle').catch(()=>{});await sleep(2000);
  const allow=p.locator('.fun-remote-panel button').filter({hasText:/허용/}).first();await allow.waitFor({timeout:10000});await allow.click();await sleep(1500);
  const close=btn(p,/닫기 · 게임으로/);if(await close.count())await close.click();await sleep(1500);
  await showCursor(m,240,560);await p.mouse.move(1910,1070);rec.begin();await sleep(1500);
  const next=m.getByRole('button',{name:/본게임 시작|다음/}).first();await click(m,next,2800);
  const plus=plusBtns(m);if(await plus.count())await click(m,plus.first(),2200);
  await sleep(1500);rec.end();return {'remote-next-tv':tv,'remote-next-phone':ph};};

S['room-create-qr']=async({browser,rec})=>{const st=makeClassroom({status:'waiting',groups:4});
  const t=await openPage(browser,TV,{setup:async c=>{await installClassroom(c,st,{auth:true});await c.addInitScript(hostLabelScript);}});const p=t.page;
  await go(p,'/teacher/setup');await sleep(800);await showCursor(p,1400,700);rec.begin();await sleep(1000);
  const search=p.getByRole('searchbox');if(await search.count()){await click(p,search,200);await p.keyboard.type('갈림길',{delay:140});await sleep(900);}
  await click(p,p.locator('[data-game-card="zigzag"]').getByRole('button',{name:'이 활동 선택',exact:true}),1500);
  const sel=p.getByLabel(/^모둠 수/);await hover(p,sel,300);await sel.selectOption('4');await sleep(1200);
  await click(p,btn(p,'참여 안내 준비',{exact:true}),1500);
  await click(p,p.getByRole('checkbox',{name:/참여 의사를 확인했습니다/}),600);
  await click(p,btn(p,'수업방 만들고 참여 QR 보기',{exact:true}),300);
  await p.getByText('2468').first().waitFor({timeout:15000});await sleep(1500);
  const full=btn(p,'전체화면으로 보여주기');if(await full.count())await click(p,full,4500);
  else{await glide(p,1200,920,1200);await sleep(4500);}rec.end();
  if(st.unhandled.length)console.log('  unhandled',st.unhandled);return {'room-create-qr':t};};

S['student-join-phone']=async({browser,rec})=>{const st=makeClassroom({status:'playing',groups:4});
  const t=await openPage(browser,PHONE,{setup:c=>installClassroom(c,st,{auth:false})});const p=t.page;
  await go(p,'/lobby');await showCursor(p,240,700);rec.begin();await sleep(1200);
  const code=btn(p,/코드로 참여해요/);if(await code.count())await click(p,code,900);
  const inp=p.locator('input:visible').first();await click(p,inp,300);await p.keyboard.type('2468',{delay:260});await sleep(1300);
  await click(p,p.getByRole('button',{name:'7번',exact:true}),1300);
  await click(p,btn(p,'우리 모둠으로 입장'),300);await p.waitForURL('**/mobile/**',{timeout:10000}).catch(()=>console.log('  no /mobile'));await sleep(3500);rec.end();
  if(st.unhandled.length)console.log('  unhandled',st.unhandled);return {'student-join-phone':t};};

S['student-mission-phone']=async({browser,rec})=>{const st=makeClassroom({status:'playing',groups:4});
  const t=await openPage(browser,PHONE,{setup:c=>installClassroom(c,st,{auth:false})});const p=t.page;
  await p.clock.install();
  await go(p,'/lobby');const code=btn(p,/코드로 참여해요/);if(await code.count())await code.click();
  await p.locator('input:visible').first().fill('2468');await p.getByRole('button',{name:'7번',exact:true}).click();await btn(p,'우리 모둠으로 입장').click();
  await p.waitForURL('**/mobile/**',{timeout:10000});await sleep(2000);
  await showCursor(p,240,760);rec.begin();await sleep(1200);
  await click(p,btn(p,/게임 시작/),1500);
  await click(p,btn(p,/^(시작 · 작전 고르기|작전 고르고 시작)$/),1500);
  for(let r=0;r<3;r++){
    await click(p,btn(p,'작전 시작 · 기기 내려놓기'),300);
    if(r===0){await sleep(3600);await sleep(2000);}else await p.clock.fastForward(3500);
    rec.end();await sleep(700);await p.clock.fastForward(60000);await p.locator('[data-phase="record"]').waitFor({timeout:10000});await sleep(500);rec.begin();await sleep(600);
    await click(p,p.getByRole('button',{name:/^달성했어요/}).first(),r<2?900:300);
  }
  await p.locator('.game-result-overlay').waitFor({timeout:10000}).catch(()=>{});await sleep(1500);
  const msg=p.locator('.student-result-message');if(await msg.count())await hover(p,msg,3500);else await sleep(3500);
  rec.end();if(st.unhandled.length)console.log('  unhandled',st.unhandled);return {'student-mission-phone':t};};

S['board-scores']=async({browser,rec})=>{const st=makeClassroom({status:'playing',groups:4});
  const t=await openPage(browser,TV,{setup:c=>installClassroom(c,st,{auth:false})});const p=t.page;
  await go(p,'/board/'+st.roomId);await sleep(1500);await p.mouse.move(1915,1075);rec.begin();await sleep(1500);
  const plan=[[0,10],[2,10],[1,20],[3,10],[0,10],[2,20],[1,10],[3,20],[2,10],[0,20]];
  for(const [g,a] of plan){st.groups[g].score+=a;await p.evaluate(()=>window.dispatchEvent(new Event('online')));await sleep(1300);}
  await sleep(2000);rec.end();if(st.unhandled.length)console.log('  unhandled',st.unhandled);return {'board-scores':t};};

S['boss-result']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:TVMODE});const p=t.page;await bossTo(p,'main');
  const plus=plusBtns(p);
  for(let i=0;i<40;i++){const v=p.locator('.fun-victory');if(await v.count()){await sleep(600);continue;}
    const sp=btn(p,/한 방 공격/);if(await sp.count()&&await sp.isEnabled().catch(()=>false)){await sp.click().catch(()=>{});await sleep(400);continue;}
    if(await plus.count())await plus.nth(i%2).click({timeout:2000}).catch(()=>{});await sleep(150);
    if(await p.getByText(/결과 발표|보스를 모두 물리쳤어요/).count())break;}
  await sleep(1500);
  const end=btn(p,/끝내기/);if(await end.count()){await end.click().catch(()=>{});await sleep(500);const again=btn(p,/한 번 더 누르면/);if(await again.count())await again.click().catch(()=>{});}
  await sleep(2500);await showCursor(p,1500,900);rec.begin();await sleep(9000);rec.end();return {'boss-result':t};};

// 혼자 해보기: 활동 찾기(/hub) 맨 아래 '혼자 해보기' → 혼자 할 활동 목록 → 한 활동을 짧게 연습(점수 없음).
S['solo-demo']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/hub');
  const entry=p.locator('[data-hub-more-link="solo"]');await entry.evaluate(e=>e.scrollIntoView({block:'center'}));await sleep(900);
  await showCursor(p,1300,850);rec.begin();await sleep(800);
  await hover(p,entry,700);await click(p,entry,300);await p.waitForURL('**/solo');await p.waitForLoadState('networkidle').catch(()=>{});await sleep(900);
  await click(p,p.getByRole('link',{name:'체험하기'}).first(),300);await p.waitForURL('**/solo/play/**');await sleep(1100);
  await click(p,btn(p,'놀이 방법 익히기'),1100);
  await click(p,btn(p,'짧게 연습하기'),300);await p.getByText(/초 남음/).first().waitFor({timeout:10000}).catch(()=>{});await glide(p,1500,760,900);await sleep(2200);rec.end();
  return {'solo-demo':t};};

// 학생 폰 오프라인: 마지막 기록을 인터넷 없이 마치면 '인터넷이 돌아오면 보낼게요' → 다시 연결되면 '선생님께 보냈어요'.
S['offline-sync-phone']=async({browser,rec})=>{const st=makeClassroom({status:'playing',groups:4});
  const t=await openPage(browser,PHONE,{setup:c=>installClassroom(c,st,{auth:false})});const p=t.page;
  await p.clock.install();
  await go(p,'/lobby');const code=btn(p,/코드로 참여해요/);if(await code.count())await code.click();
  await p.locator('input:visible').first().fill('2468');await p.getByRole('button',{name:'7번',exact:true}).click();await btn(p,'우리 모둠으로 입장').click();
  await p.waitForURL('**/mobile/**',{timeout:10000});await sleep(2000);
  await btn(p,/게임 시작/).click();await sleep(1200);await btn(p,/^(시작 · 작전 고르기|작전 고르고 시작)$/).click();await sleep(1200);
  for(let r=0;r<3;r++){
    await btn(p,'작전 시작 · 기기 내려놓기').click();await sleep(300);await p.clock.fastForward(3500);await sleep(500);await p.clock.fastForward(60000);
    await p.locator('[data-phase="record"]').waitFor({timeout:10000});await sleep(500);
    if(r<2){await p.getByRole('button',{name:/^달성했어요/}).first().click();await sleep(1200);}
  }
  await t.ctx.setOffline(true);await sleep(1200);
  await showCursor(p,240,760);rec.begin();await sleep(1000);
  await click(p,p.getByRole('button',{name:/^달성했어요/}).first(),300);
  await p.locator('.game-result-overlay').waitFor({timeout:10000}).catch(()=>{});await sleep(500);
  const msg=p.locator('.student-result-message');await glide(p,450,1010,700);await sleep(2300);   // 커서는 문구·점수에서 비켜 화면 아래 구석으로
  console.log('  offline msg:',await msg.textContent().catch(()=>null));
  await t.ctx.setOffline(false);await p.evaluate(()=>window.dispatchEvent(new Event('online')));
  await p.getByText('선생님께 보냈어요').first().waitFor({timeout:10000}).catch(()=>console.log('  보냄 문구 없음'));
  await sleep(500);await glide(p,420,1020,500);await sleep(2500);
  console.log('  online msg:',await msg.textContent().catch(()=>null),'score',st.groups[0].score);
  rec.end();if(st.unhandled.length)console.log('  unhandled',st.unhandled);return {'offline-sync-phone':t};};

// 선생님 로그인: 로그인 카드(교사 확인 체크 · Google 버튼에 올리기만, 실제 로그인 안 함) → 로그인된 수업 준비 화면.
S['teacher-login']=async({browser,rec})=>{const st=makeClassroom({status:'waiting',groups:4});let authed=false;
  const t=await openPage(browser,TV,{init:{physical_teacher_confirmed_v1:null},setup:async c=>{await installClassroom(c,st,{auth:true});
    await c.route('**/api/teacher**',r=>authed?r.fallback():r.fulfill({json:{authenticated:false,configured:true}}));
    await c.route('**/fake-supa.invalid/auth/**',r=>authed||r.request().method()==='OPTIONS'?r.fallback():r.fulfill({status:401,json:{},headers:{'access-control-allow-origin':'*'}}));
    await c.route(/accounts\.google\.com|oauth2|googleapis/,r=>r.abort());}});const p=t.page;
  await go(p,'/teacher/manage');await sleep(600);await showCursor(p,1350,780);rec.begin();await sleep(1000);
  await hover(p,p.getByText('이 기기에서 30일 동안 로그인 유지').first(),900);
  await click(p,p.getByRole('checkbox',{name:/교사이며 학생에게/}),1000);
  await hover(p,p.getByRole('button',{name:/Google로 계속하기/}),1800);rec.end();
  authed=true;await go(p,'/teacher/setup');await sleep(800);await showCursor(p,1300,700);rec.begin();await sleep(800);
  await hover(p,p.getByText(/10분 꾸러미/).first(),600);await hover(p,p.getByText(/40분 꾸러미/).first(),1300);rec.end();
  if(st.unhandled.length)console.log('  unhandled',st.unhandled);return {'teacher-login':t};};

// 수업 도구: 카드를 훑고 '모둠 나누기'로 번호를 섞어 나눈 뒤 주사위를 굴린다.
S['class-tools']=async({browser,rec})=>{const t=await openPage(browser,TV);const p=t.page;await go(p,'/tools');await showCursor(p,1100,700);rec.begin();await sleep(800);
  for(const id of ['timer','draw'])await hover(p,p.locator(`a.sports-card[data-tool="${id}"]`),450);
  await click(p,p.locator('a.sports-card[data-tool="groups"]'),1000);
  const panel=p.locator('[data-tool-panel="groups"]');
  await click(p,panel.getByRole('button',{name:'모둠 나누기',exact:true}),1600);
  await click(p,panel.getByRole('button',{name:'다시 섞기',exact:true}),1300);
  await click(p,p.locator('.tools-tabs button').filter({hasText:'주사위'}),800);
  await click(p,p.locator('[data-tool-panel="dice"]').getByRole('button',{name:'주사위 굴리기'}),2200);rec.end();return {'class-tools':t};};

// 우리 반 원정 지도: 도장 7개(첫 섬 도착 · 둘째 섬 3개)에서 도장 하나를 더 찍어 '협동의 섬'에 도착한다.
const JOURNEY_SEED=JSON.stringify(['play','sports','safety','play','expedition','play','sports'].map((kind,i)=>({kind,date:`2026-${String(9+Math.floor(i/3)).padStart(2,'0')}-${String(3+i*4).padStart(2,'0')}`})));
S['journey']=async({browser,rec})=>{const t=await openPage(browser,TV,{init:{physical_class_journey_v1:JOURNEY_SEED}});const p=t.page;await go(p,'/journey');await showCursor(p,900,520);rec.begin();await sleep(800);
  await hover(p,p.locator('[data-island]').nth(1),1000);
  await click(p,btn(p,/협동 원정/),600);
  await click(p,p.locator('button.journey-go'),300);await p.evaluate(()=>window.scrollTo({top:0,behavior:'smooth'}));await sleep(1200);
  const arr=p.locator('.journey-arrival');if(await arr.count()){await hover(p,arr.locator('h2'),1300);await hover(p,p.locator('[data-island]').nth(2),1400);}else await sleep(3000);
  rec.end();return {'journey':t};};

const NAMES={'remote-pair':['remote-pair-tv','remote-pair-phone'],'remote-next':['remote-next-tv','remote-next-phone']};
const outNames=k=>NAMES[k]||[k];

// ───────── 변환 ─────────
function ffprobe(file){const r=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=width,height,codec_name,pix_fmt,r_frame_rate:format=duration','-of','json',file],{encoding:'utf8'});return JSON.parse(r.stdout);}
function convert(raw,dest,segs,t0,dev){
  const parts=segs.map(([a,b])=>[Math.max(0,(a-t0)/1000),Math.max(0,(b-t0)/1000)]);
  const scale=dev.out?`,scale=${dev.out.w}:${dev.out.h}:flags=lanczos`:'';
  const chains=parts.map(([a,b],i)=>`[0:v]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS[s${i}]`);
  const fc=chains.join(';')+';'+parts.map((_,i)=>`[s${i}]`).join('')+`concat=n=${parts.length}:v=1:a=0,fps=30${scale},format=yuv420p[v]`;
  const r=spawnSync('ffmpeg',['-y','-v','error','-i',raw,'-filter_complex',fc,'-map','[v]','-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-r','30','-movflags','+faststart',dest],{encoding:'utf8'});
  if(r.status!==0)throw new Error('ffmpeg: '+r.stderr);
  const info=ffprobe(dest),s=info.streams[0];const sec=+(+info.format.duration).toFixed(2);
  fs.mkdirSync(THUMBS,{recursive:true});
  spawnSync('ffmpeg',['-y','-v','error','-ss',String(sec/2),'-i',dest,'-frames:v','1','-q:v','3',path.join(THUMBS,path.basename(dest,'.mp4')+'.jpg')]);
  return {sec,w:s.width,h:s.height,codec:s.codec_name,pix:s.pix_fmt,fps:s.r_frame_rate};
}

// ───────── 서버 ─────────
function portOpen(){return new Promise(r=>{const s=net.connect(PORT,'127.0.0.1');s.on('connect',()=>{s.destroy();r(true)});s.on('error',()=>r(false));});}
async function startServer(){
  if(await portOpen()){console.log(`포트 ${PORT}에 이미 서버가 있어 그대로 씁니다.`);return null;}
  const srv=spawn('npx',['vite','preview','--outDir','video/out/dist','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{cwd:ROOT,stdio:'ignore',detached:true});
  for(let i=0;i<60;i++){if(await portOpen())return srv;await sleep(500);}
  throw new Error('preview 서버가 뜨지 않았어요');
}

// ───────── main ─────────
const args=process.argv.slice(2);
if(args.includes('--list')){console.log(Object.keys(S).flatMap(outNames).join('\n'));process.exit(0);}
const wanted=args.filter(a=>!a.startsWith('--'));
const keys=Object.keys(S).filter(k=>!wanted.length||wanted.includes(k)||outNames(k).some(n=>wanted.includes(n)));
if(!args.includes('--no-build')||!fs.existsSync(path.join(DIST,'index.html'))){
  console.log('빌드 중…');
  const r=spawnSync('npx',['vite','build','--outDir','video/out/dist'],{cwd:ROOT,stdio:'inherit',env:{...process.env,VITE_SUPABASE_URL:'https://fake-supa.invalid',VITE_SUPABASE_ANON_KEY:'x'}});
  if(r.status!==0)process.exit(1);
}
fs.mkdirSync(OUT,{recursive:true});
const manifestPath=path.join(OUT,'manifest.json');
const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
const srv=await startServer();
const browser=await chromium.launch();
const failed=[];
try{
  for(const k of keys){
    const rec=new Rec();console.log('▶',k);
    let pages;
    try{pages=await S[k]({browser,rec});}catch(e){console.log('  실패:',e.message.split('\n')[0]);failed.push(k);pages=null;
      fs.mkdirSync(THUMBS,{recursive:true});for(const [i,o] of OPEN.entries())await o.page.screenshot({path:path.join(THUMBS,`FAILED-${k}-${i}.png`)}).catch(()=>{});}
    if(!pages){for(const o of OPEN.splice(0))await o.ctx.close().catch(()=>{});continue;}
    OPEN.length=0;
    rec.end();
    for(const [name,o] of Object.entries(pages)){
      const video=o.page.video();await o.ctx.close();const raw=await video.path();
      if(o.errs.length)console.log('  pageerror',name,o.errs.slice(0,3));
      if(!rec.segs.length){console.log('  구간 없음',name);continue;}
      const meta=convert(raw,path.join(OUT,name+'.mp4'),rec.segs,o.t0,o.dev);fs.rmSync(raw,{force:true});
      manifest[name]={sec:meta.sec,w:meta.w,h:meta.h};console.log(`  ${name}.mp4 ${meta.sec}s ${meta.w}x${meta.h} ${meta.codec}/${meta.pix} ${meta.fps}`);
    }
    fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
  }
}finally{
  await browser.close();
  if(srv){try{process.kill(-srv.pid)}catch{}}
  fs.rmSync(RAW,{recursive:true,force:true});
}
if(failed.length){console.log('실패한 장면:',failed.join(', '));process.exitCode=1;}
