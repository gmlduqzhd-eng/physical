/* 땀방울 원정대 소개 영상 — 그림 장면 공통 도구
 * 모든 움직임은 render(t) 함수가 시간 t(초)만으로 그린다(결정적).
 * 미리보기: 브라우저에서 바로 열면 실시간 재생.
 * 녹화: ?record 로 열고 window.__seek(t) 를 프레임마다 호출.
 */
(function(){
const NS = 'http://www.w3.org/2000/svg';
const C = {
  bg:'#faf8f2', paper:'#fffefa', tint:'#e9efe3', line:'#d8d6cc', ink:'#303d35', muted:'#5d675f',
  forest:'#566d4d', amber:'#f59e0b', stage:'#171819', stageInk:'#f2f1ec',
  // 토큰에서 파생한 보조 색(같은 색상 계열, 채도 낮게)
  wall:'#f3f1e8', wainscot:'#e9efe3', floor:'#e4dfd1', floorLine:'#d8d2c1',
  forestDark:'#445a3d', forestLight:'#8fa384', sage:'#c3d0b9', sand:'#e6dcc6',
  wood:'#c7ad86', woodDark:'#a8906b', metal:'#9aa199', shoe:'#3a403b',
  sweat:'#9cc3c9'
};
const SKIN = ['#f3d2b3','#e4b48e','#c98e66','#9a6644','#6f4630'];
const HAIR = ['#2b2723','#3e3027','#5b402d','#1f2321','#7a5738'];
const SHIRT = ['#566d4d','#8fa384','#ded3bb','#7e8e9b','#b98d6e','#c3d0b9','#5d675f','#e9c98f'];
const PANTS = ['#3f4a43','#55606a','#5d675f','#6b5d4f','#46524a'];

function el(tag, attrs, parent){
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t);return t*t*(3-2*t)};
const easeOut=t=>{t=clamp(t);return 1-Math.pow(1-t,3)};
const easeInOut=t=>{t=clamp(t);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
const backOut=t=>{t=clamp(t);const c1=1.6,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2)};
const span=(t,a,b)=>clamp((t-a)/(b-a));
const TAU=Math.PI*2;
const wave=(t,period,phase=0)=>Math.sin(TAU*(t/period+phase));
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- 아이(뒷모습) ---------- */
function arm(parent, x, y, o, mirror){
  const k=o.arm||1, L1=72*k, L2=64*k;
  const base = el('g',{transform:`translate(${x} ${y})${mirror?' scale(-1 1)':''}`},parent);
  const sh = el('g',{},base);
  el('line',{x1:0,y1:0,x2:0,y2:L1,stroke:o.skin,'stroke-width':29,'stroke-linecap':'round'},sh);
  el('line',{x1:0,y1:-2,x2:0,y2:30,stroke:o.shirt,'stroke-width':40,'stroke-linecap':'round'},sh);
  const elb = el('g',{transform:`translate(0 ${L1})`},sh);
  const fore = el('g',{},elb);
  el('line',{x1:0,y1:0,x2:0,y2:L2,stroke:o.skin,'stroke-width':26,'stroke-linecap':'round'},fore);
  el('circle',{cx:0,cy:L2+6,r:18,fill:o.skin},fore);
  return {L1,L2:L2+6,set(a,e){sh.setAttribute('transform',`rotate(${a})`);fore.setAttribute('transform',`rotate(${e})`)},
          hand(){return fore}};
}
// 두 마디 팔 역기구학: 어깨→목표 벡터(아이 좌표, 왼팔 기준) → [a,e]
function ik(dx,dy,L1,L2,bendOut=1){
  const D=Math.min(Math.hypot(dx,dy),L1+L2-0.01);
  const base=Math.atan2(-dx,dy)*180/Math.PI;
  const al=Math.acos(clamp((L1*L1+D*D-L2*L2)/(2*L1*D),-1,1))*180/Math.PI;
  const be=180-Math.acos(clamp((L1*L1+L2*L2-D*D)/(2*L1*L2),-1,1))*180/Math.PI;
  return bendOut>0?[base+al,-be]:[base-al,be];
}
function hair(g, o){
  const h=o.hair, st=o.style||'short';
  if (st==='short'||st==='pony'||st==='bun'){
    el('circle',{cx:0,cy:-270,r:62,fill:h},g);
  }
  if (st==='buzz') el('circle',{cx:0,cy:-268,r:61,fill:h},g);
  if (st==='pony'){
    el('path',{d:'M-15 -238 C-30 -200 -22 -168 0 -156 C22 -168 30 -200 15 -238 Z',fill:h},g);
    el('rect',{x:-15,y:-240,width:30,height:12,rx:6,fill:o.tie||C.forestLight},g);
  }
  if (st==='bun'){
    el('circle',{cx:0,cy:-330,r:27,fill:h},g);
    el('rect',{x:-18,y:-312,width:36,height:9,rx:4.5,fill:o.tie||C.amber},g);
  }
  if (st==='bob'){
    el('path',{d:'M-66 -262 A66 70 0 0 1 66 -262 L66 -226 Q66 -198 40 -198 L-40 -198 Q-66 -198 -66 -226 Z',fill:h},g);
  }
  if (st==='long'){
    el('path',{d:'M-64 -262 A64 68 0 0 1 64 -262 L66 -178 Q66 -164 52 -164 L-52 -164 Q-66 -164 -66 -178 Z',fill:h},g);
  }
  if (st==='pigtails'){
    el('circle',{cx:0,cy:-270,r:62,fill:h},g);
    el('ellipse',{cx:-64,cy:-226,rx:15,ry:30,transform:'rotate(18 -64 -226)',fill:h},g);
    el('ellipse',{cx:64,cy:-226,rx:15,ry:30,transform:'rotate(-18 64 -226)',fill:h},g);
    el('circle',{cx:-58,cy:-252,r:7,fill:o.tie||C.forestLight},g);
    el('circle',{cx:58,cy:-252,r:7,fill:o.tie||C.forestLight},g);
  }
  if (st==='curly'){
    const pts=[[0,-322],[-36,-312],[36,-312],[-56,-282],[56,-282],[-58,-248],[58,-248],[-30,-292],[30,-292],[0,-290],[-40,-222],[40,-222],[0,-250]];
    for (const [x,y] of pts) el('circle',{cx:x,cy:y,r:x===0&&y>-300?44:28,fill:h},g);
  }
}
function kidBack(parent, o){
  const root = el('g',{},parent);
  const body = el('g',{},root);
  // 다리와 바지
  const legs = el('g',{},body);
  const legL = el('g',{},legs), legR = el('g',{},legs);
  el('rect',{x:-50,y:0,width:44,height:150,rx:21,fill:o.pants},legL);
  el('ellipse',{cx:-30,cy:158,rx:30,ry:14,fill:C.shoe},legL);
  el('rect',{x:6,y:0,width:44,height:150,rx:21,fill:o.pants},legR);
  el('ellipse',{cx:30,cy:158,rx:30,ry:14,fill:C.shoe},legR);
  el('rect',{x:-56,y:-20,width:112,height:60,rx:24,fill:o.pants},legs);
  // 몸통
  const torso = el('g',{},body);
  el('rect',{x:-68,y:-186,width:136,height:196,rx:50,fill:o.shirt},torso);
  if (o.stripe) el('rect',{x:-68,y:-112,width:136,height:16,fill:o.stripe},torso);
  if (o.number) {
    const t = el('text',{x:0,y:-96,'text-anchor':'middle','font-size':58,'font-weight':760,fill:o.numberInk||C.paper,'font-family':'ForestSans'},torso);
    t.textContent=o.number;
  }
  const armL = arm(body,-56,-150,o,false);
  const armR = arm(body,56,-150,o,true);
  // 머리
  const head = el('g',{},body);
  el('rect',{x:-17,y:-218,width:34,height:44,rx:12,fill:o.skin},head);
  el('ellipse',{cx:-60,cy:-256,rx:12,ry:15,fill:o.skin},head);
  el('ellipse',{cx:60,cy:-256,rx:12,ry:15,fill:o.skin},head);
  el('circle',{cx:0,cy:-262,r:60,fill:o.skin},head);
  hair(head,o);
  const fx = el('g',{},body);  // 땀방울 등 효과
  const k = {root,body,armL,armR,head,legs,legL,legR,fx,o,x:o.x,y:o.y,s:o.s||1,
    set(p){
      p=p||{};
      const sit=p.sit||0, lift=p.lift||0, lean=p.lean||0, sq=p.squash||0;
      const dy = sit*95 - lift;
      root.setAttribute('transform',`translate(${k.x+(p.dx||0)} ${k.y}) scale(${k.s})`);
      body.setAttribute('transform',`translate(0 ${dy}) rotate(${lean} 0 0) scale(${1+sq*0.5} ${1-sq})`);
      legs.setAttribute('opacity', sit>0.98?0:1);
      const lk = p.legKick||0;
      legL.setAttribute('transform',`rotate(${(p.legL||0)} -28 0)`);
      legR.setAttribute('transform',`rotate(${-(p.legR||0)} 28 0)`);
      armL.set(p.la??6, p.le??4);
      armR.set(p.ra??6, p.re??4);
      head.setAttribute('transform',`rotate(${p.tilt||0} 0 -200) translate(${p.hx||0} ${p.hy||0})`);
    }};
  k.set({});
  return k;
}

/* ---------- 의자, 책상 (아이 좌표 기준) ---------- */
function desk(parent,x,y,s){
  const g=el('g',{transform:`translate(${x} ${y}) scale(${s})`},parent);
  el('rect',{x:-118,y:18,width:10,height:140,rx:5,fill:C.metal},g);
  el('rect',{x:108,y:18,width:10,height:140,rx:5,fill:C.metal},g);
  el('rect',{x:-128,y:-14,width:256,height:34,rx:10,fill:C.paper,stroke:C.line,'stroke-width':4},g);
  el('rect',{x:-128,y:10,width:256,height:12,rx:6,fill:C.line},g);
  return g;
}
function chair(parent,x,y,s){
  const g=el('g',{transform:`translate(${x} ${y}) scale(${s})`},parent);
  el('rect',{x:-66,y:56,width:12,height:120,rx:6,fill:C.metal},g);
  el('rect',{x:54,y:56,width:12,height:120,rx:6,fill:C.metal},g);
  el('rect',{x:-82,y:10,width:164,height:58,rx:16,fill:C.wood},g);
  el('rect',{x:-82,y:52,width:164,height:16,rx:8,fill:C.woodDark,opacity:.55},g);
  return g;
}

/* ---------- 선생님(옆모습, 왼쪽을 봄) ---------- */
function teacherSide(parent,o){
  const root=el('g',{},parent);
  const body=el('g',{},root);
  const skin=o.skin, top=o.top||C.forest, pants=o.pants||'#3f4a43', hairC=o.hair||HAIR[1];
  const legB=el('g',{},body), legF=el('g',{},body);
  el('rect',{x:-12,y:-270,width:40,height:262,rx:19,fill:pants},legB);el('rect',{x:-12,y:-270,width:40,height:262,rx:19,fill:'#000',opacity:.14},legB);
  el('path',{d:'M-30 -14 Q-30 -30 -12 -30 L26 -30 Q32 -30 32 -18 L32 0 L-30 0 Z',fill:C.shoe},legB);
  el('rect',{x:-20,y:-270,width:40,height:262,rx:19,fill:pants},legF);
  el('path',{d:'M-42 -14 Q-42 -30 -24 -30 L16 -30 Q22 -30 22 -18 L22 0 L-42 0 Z',fill:C.shoe},legF);
  const armB=el('g',{transform:'translate(4 -452)'},body);
  const armBs=el('g',{},armB);
  el('line',{x1:0,y1:0,x2:0,y2:100,stroke:top,'stroke-width':34,'stroke-linecap':'round',opacity:1,filter:''},armBs);
  el('line',{x1:0,y1:0,x2:0,y2:100,stroke:'#000','stroke-width':34,'stroke-linecap':'round',opacity:.12},armBs);
  const armBf=el('g',{transform:'translate(0 100)'},armBs); const armBff=el('g',{},armBf);
  el('line',{x1:0,y1:0,x2:0,y2:92,stroke:skin,'stroke-width':28,'stroke-linecap':'round'},armBff);
  el('line',{x1:0,y1:0,x2:0,y2:92,stroke:'#000','stroke-width':28,'stroke-linecap':'round',opacity:.08},armBff);
  el('circle',{cx:0,cy:98,r:18,fill:skin},armBff);
  el('rect',{x:-52,y:-488,width:104,height:236,rx:46,fill:top},body);
  el('rect',{x:-52,y:-300,width:104,height:50,rx:20,fill:pants},body);
  el('rect',{x:-52,y:-310,width:104,height:22,fill:top},body);
  const armF=el('g',{transform:'translate(-4 -452)'},body);
  const armFs=el('g',{},armF);
  el('line',{x1:0,y1:0,x2:0,y2:100,stroke:top,'stroke-width':36,'stroke-linecap':'round'},armFs);
  const armFf=el('g',{transform:'translate(0 100)'},armFs); const armFff=el('g',{},armFf);
  el('line',{x1:0,y1:0,x2:0,y2:92,stroke:skin,'stroke-width':29,'stroke-linecap':'round'},armFff);
  el('circle',{cx:0,cy:98,r:19,fill:skin},armFff);
  const prop=el('g',{transform:'translate(0 98)'},armFff);
  // 머리(옆모습: 왼쪽이 얼굴, 이목구비 없음) — 팔을 들어도 얼굴을 가리지 않게 맨 마지막에 그림
  const head=el('g',{},body);
  el('rect',{x:-14,y:-522,width:30,height:44,rx:12,fill:skin},head);
  el('path',{d:'M-4 -606 L54 -590 Q62 -540 52 -506 Q40 -494 20 -500 L-4 -510 Z',fill:hairC},head);
  el('ellipse',{cx:-12,cy:-552,rx:42,ry:48,fill:skin},head);
  el('circle',{cx:-53,cy:-556,r:7,fill:skin},head);
  el('path',{d:'M-56 -566 C-58 -614 2 -630 36 -606 C58 -590 60 -556 50 -530 L22 -530 C20 -556 6 -574 -20 -576 C-36 -577 -48 -572 -56 -566 Z',fill:hairC},head);
  el('ellipse',{cx:14,cy:-548,rx:9,ry:12,fill:skin},head);
  const t={root,body,prop,head,
    set(p){p=p||{};
      root.setAttribute('transform',`translate(${o.x+(p.dx||0)} ${o.y}) scale(${(o.flip?-1:1)*o.s} ${o.s})`);
      body.setAttribute('transform',`translate(0 ${-(p.lift||0)}) rotate(${p.lean||0} 0 -270)`);
      armFs.setAttribute('transform',`rotate(${p.fa??4})`); armFff.setAttribute('transform',`rotate(${p.fe??-8})`);
      armBs.setAttribute('transform',`rotate(${p.ba??-6})`); armBff.setAttribute('transform',`rotate(${p.be??-6})`);
      legF.setAttribute('transform',`rotate(${p.lf||0} 0 -262)`); legB.setAttribute('transform',`rotate(${p.lb||0} 0 -262)`);
      head.setAttribute('transform',`rotate(${p.tilt||0} 0 -500)`);
    }};
  t.set({});
  return t;
}

/* ---------- 교실 ---------- */
const TV = {x:544,y:72,w:832,h:468};   // 합성기가 앱 녹화로 덮는 화면 영역(1920x1080 기준)

function tvScreenPlaceholder(g, x, y, w, h){
  // 앱 첫 화면을 닮은 단순한 자리표시(합성 시 앱 녹화로 덮인다)
  const s=el('g',{},g);
  el('rect',{x,y,width:w,height:h,fill:C.bg},s);
  el('rect',{x:x+w*0.06,y:y+h*0.1,width:w*0.88,height:2,fill:C.line},s);
  dropMark(s, x+w*0.09, y+h*0.055, w*0.035, C.forest);
  el('rect',{x:x+w*0.135,y:y+h*0.058,width:w*0.13,height:h*0.03,rx:h*0.015,fill:C.ink,opacity:.8},s);
  el('rect',{x:x+w*0.06,y:y+h*0.2,width:w*0.42,height:h*0.07,rx:h*0.035,fill:C.ink,opacity:.85},s);
  el('rect',{x:x+w*0.06,y:y+h*0.3,width:w*0.3,height:h*0.07,rx:h*0.035,fill:C.forest},s);
  el('rect',{x:x+w*0.06,y:y+h*0.43,width:w*0.36,height:h*0.03,rx:h*0.015,fill:C.muted,opacity:.5},s);
  for (let i=0;i<3;i++){
    el('rect',{x:x+w*(0.06+i*0.3),y:y+h*0.56,width:w*0.27,height:h*0.34,rx:h*0.04,fill:i===1?C.tint:C.paper,stroke:C.line,'stroke-width':2},s);
    el('circle',{cx:x+w*(0.06+i*0.3)+w*0.05,cy:y+h*0.65,r:h*0.035,fill:C.tint,stroke:C.forest,'stroke-width':2},s);
    el('rect',{x:x+w*(0.06+i*0.3)+w*0.025,y:y+h*0.74,width:w*0.16,height:h*0.03,rx:h*0.015,fill:C.ink,opacity:.75},s);
    el('rect',{x:x+w*(0.06+i*0.3)+w*0.025,y:y+h*0.81,width:w*0.2,height:h*0.02,rx:h*0.01,fill:C.muted,opacity:.4},s);
  }
  return s;
}
// 앱 로고(물방울 두 개, lucide droplets 모양을 채운 형태)
function dropMark(parent,cx,cy,size,color,sw){
  const g=el('g',{transform:`translate(${cx-size} ${cy-size}) scale(${size/12})`},parent);
  el('path',{d:'M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z',fill:'none',stroke:color,'stroke-width':sw||2,'stroke-linecap':'round','stroke-linejoin':'round'},g);
  el('path',{d:'M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97',fill:'none',stroke:color,'stroke-width':sw||2,'stroke-linecap':'round','stroke-linejoin':'round'},g);
  return g;
}

function rainGroup(parent, x, y, w, h, n, seed, opts={}){
  const r=rng(seed), g=el('g',{},parent), drops=[];
  for(let i=0;i<n;i++){
    const len=lerp(opts.minLen||26,opts.maxLen||60,r());
    const k=Math.round(lerp(opts.kMin||10,opts.kMax||16,r()));  // 14초 동안 화면을 k번 지남 → 끊김 없는 반복
    const L=el('line',{x1:0,y1:0,x2:-len*0.12,y2:len,stroke:opts.color||'#ffffff','stroke-width':opts.sw||3,'stroke-linecap':'round',opacity:lerp(opts.oMin||.35,opts.oMax||.8,r())},g);
    drops.push({L,x:x+r()*w,ph:r(),k,len});
  }
  return {g,render(t){
    for(const d of drops){
      const p=((t/14)*d.k+d.ph)%1;
      const yy=y-d.len+p*(h+d.len*2);
      d.L.setAttribute('transform',`translate(${d.x+p*8} ${yy})`);
    }
  }};
}

function classroom(svgRoot, opts={}){
  const g=el('g',{},svgRoot);
  // 벽, 바닥
  el('rect',{x:0,y:0,width:1920,height:1080,fill:C.wall},g);
  el('rect',{x:0,y:600,width:1920,height:110,fill:C.wainscot},g);
  el('rect',{x:0,y:600,width:1920,height:6,fill:C.line},g);
  el('rect',{x:0,y:704,width:1920,height:376,fill:C.floor},g);
  el('rect',{x:0,y:704,width:1920,height:10,fill:C.floorLine},g);
  // 창문(왼쪽)
  const win=el('g',{},g);
  const WX=64, WY=110, WW=380, WH=430;
  el('rect',{x:WX-14,y:WY-14,width:WW+28,height:WH+28,rx:18,fill:C.paper,stroke:C.line,'stroke-width':4},win);
  const clipId='winclip'+Math.round(Math.random()*1e6);
  const cp=el('clipPath',{id:clipId},win); el('rect',{x:WX,y:WY,width:WW,height:WH,rx:8},cp);
  const outside=el('g',{'clip-path':`url(#${clipId})`},win);
  el('rect',{x:WX,y:WY,width:WW,height:WH,fill:opts.rain?'#c9d1cb':'#dfe8de'},outside);
  // 바깥 풍경: 나무와 운동장
  el('rect',{x:WX,y:WY+WH*0.70,width:WW,height:WH*0.3,fill:opts.rain?'#b5bfb3':'#c8d5bf'},outside);
  for (const [tx,ty,tr] of [[WX+60,WY+WH*0.62,58],[WX+150,WY+WH*0.66,44],[WX+300,WY+WH*0.6,66]]){
    el('circle',{cx:tx,cy:ty,r:tr,fill:opts.rain?'#9fad9d':'#9fb391'},outside);
  }
  // 축구 골대
  el('path',{d:`M${WX+200} ${WY+WH*0.86} V${WY+WH*0.74} H${WX+290} V${WY+WH*0.86}`,fill:'none',stroke:'#eef0ea','stroke-width':5,'stroke-linejoin':'round'},outside);
  let rain=null;
  if (opts.rain){ rain=rainGroup(outside,WX,WY,WW,WH,46,7,{color:'#f4f6f2',sw:2.6,minLen:22,maxLen:46,oMin:.45,oMax:.9}); }
  el('rect',{x:WX+WW/2-5,y:WY,width:10,height:WH,fill:C.paper},win);
  el('rect',{x:WX,y:WY+WH*0.45-5,width:WW,height:10,fill:C.paper},win);
  el('rect',{x:WX-30,y:WY+WH+8,width:WW+60,height:22,rx:8,fill:C.paper,stroke:C.line,'stroke-width':4},win);
  // 창틀 화분
  el('path',{d:`M${WX+30} ${WY+WH+8} l6 -44 h44 l6 44 z`,fill:C.woodDark},win);
  for (const [dx,dy,rx,ry,rot] of [[58,-70,14,30,-20],[44,-60,12,26,-50],[72,-62,12,26,30]])
    el('ellipse',{cx:WX+dx,cy:WY+WH+dy,rx,ry,transform:`rotate(${rot} ${WX+dx} ${WY+WH+dy})`,fill:C.forest},win);

  // 게시판(오른쪽)
  const board=el('g',{},g);
  el('rect',{x:1490,y:180,width:360,height:300,rx:18,fill:C.tint,stroke:C.line,'stroke-width':4},board);
  const papers=[[1516,206,96,120,C.paper,-3],[1630,200,100,84,'#f6ecd6',2],[1748,214,80,104,C.paper,4],[1528,346,120,104,C.paper,2],[1666,306,90,124,C.paper,-2],[1770,336,62,96,'#f6ecd6',-4]];
  for(const [px,py,pw,ph,pc,rot] of papers){
    const pg=el('g',{transform:`rotate(${rot} ${px+pw/2} ${py+ph/2})`},board);
    el('rect',{x:px,y:py,width:pw,height:ph,rx:6,fill:pc,stroke:C.line,'stroke-width':2},pg);
    el('rect',{x:px+14,y:py+18,width:pw*0.55,height:7,rx:3.5,fill:C.muted,opacity:.35},pg);
    el('rect',{x:px+14,y:py+34,width:pw*0.7,height:7,rx:3.5,fill:C.muted,opacity:.22},pg);
    el('circle',{cx:px+pw/2,cy:py+6,r:6,fill:C.forest},pg);
  }
  // 시계
  el('circle',{cx:1670,cy:104,r:44,fill:C.paper,stroke:C.line,'stroke-width':6},g);
  el('line',{x1:1670,y1:104,x2:1670,y2:76,stroke:C.ink,'stroke-width':6,'stroke-linecap':'round'},g);
  el('line',{x1:1670,y1:104,x2:1690,y2:114,stroke:C.ink,'stroke-width':6,'stroke-linecap':'round'},g);
  el('circle',{cx:1670,cy:104,r:5,fill:C.amber},g);

  // TV
  const tvg=el('g',{},g);
  const gf=el('filter',{id:'tvglow',x:'-20%',y:'-20%',width:'140%',height:'140%'},tvg); el('feGaussianBlur',{stdDeviation:34},gf);
  const glow=el('rect',{x:TV.x-40,y:TV.y-30,width:TV.w+80,height:TV.h+60,rx:50,fill:'#fff3cf',opacity:0,filter:'url(#tvglow)'},tvg);
  el('rect',{x:TV.x-18,y:TV.y-18,width:TV.w+36,height:TV.h+36,rx:22,fill:'#24272a'},tvg);
  el('rect',{x:TV.x+TV.w/2-60,y:TV.y+TV.h+18,width:120,height:10,rx:5,fill:'#3a3e41'},tvg);
  const screenOff=el('rect',{x:TV.x,y:TV.y,width:TV.w,height:TV.h,fill:C.stage,'data-rect':'tv'},tvg);
  const screenOn=el('g',{opacity:0},tvg);
  tvScreenPlaceholder(screenOn,TV.x,TV.y,TV.w,TV.h);
  const led=el('circle',{cx:TV.x+TV.w+4,cy:TV.y+TV.h+9,r:4,fill:'#c0392b',opacity:.7},tvg);

  const mid=el('g',{},g);    // 선생님(앞 벽 쪽)
  const back=el('g',{},g);   // 뒤쪽 줄
  const front=el('g',{},g);  // 앞쪽 줄
  const top=el('g',{},g);    // 효과
  const room={g,mid,back,front,top,rain,glow,screenOn,screenOff,led,
    setTv(v){ screenOn.setAttribute('opacity',v); glow.setAttribute('opacity',v*0.9); led.setAttribute('fill',v>0.5?'#7fb069':'#c0392b'); }};
  room.setTv(opts.tvOn?1:0);
  return room;
}

// 반 아이들 배치(뒷줄 5, 앞줄 4)
const CAST=[
  // 뒷줄 (작게)
  {x:330, y:812,s:.70, skin:SKIN[1],hair:HAIR[0],style:'pony',  shirt:SHIRT[2],pants:PANTS[1]},
  {x:640, y:812,s:.70, skin:SKIN[3],hair:HAIR[3],style:'short', shirt:SHIRT[3],pants:PANTS[0]},
  {x:960, y:812,s:.70, skin:SKIN[0],hair:HAIR[4],style:'bob',   shirt:SHIRT[7],pants:PANTS[2]},
  {x:1280,y:812,s:.70, skin:SKIN[2],hair:HAIR[1],style:'buzz',  shirt:SHIRT[1],pants:PANTS[3]},
  {x:1590,y:812,s:.70, skin:SKIN[4],hair:HAIR[3],style:'curly', shirt:SHIRT[4],pants:PANTS[0]},
  // 앞줄 (크게)
  {x:480, y:1004,s:1, skin:SKIN[2],hair:HAIR[0],style:'short',  shirt:SHIRT[0],pants:PANTS[0]},
  {x:800, y:1004,s:1, skin:SKIN[0],hair:HAIR[2],style:'pigtails',shirt:SHIRT[5],pants:PANTS[1]},
  {x:1120,y:1004,s:1, skin:SKIN[3],hair:HAIR[3],style:'bun',    shirt:SHIRT[6],pants:PANTS[4]},
  {x:1440,y:1004,s:1, skin:SKIN[1],hair:HAIR[1],style:'long',   shirt:SHIRT[3],pants:PANTS[2]},
];
function seatKids(room, opts={}){
  const kids=[];
  CAST.forEach((c,i)=>{
    const layer = c.s<1?room.back:room.front;
    if (opts.desks!==false) desk(layer,c.x,c.y,c.s);
    const k=kidBack(layer,c); k.i=i; k.row=c.s<1?0:1;
    if (opts.chairs!==false) k.chair=chair(layer,c.x,c.y,c.s);
    kids.push(k);
  });
  return kids;
}
function sweatDrop(parent){
  return el('path',{d:'M0 -14 C6 -4 10 2 10 7 A10 10 0 0 1 -10 7 C-10 2 -6 -4 0 -14 Z',fill:C.sweat,opacity:0},parent);
}

/* ---------- 재생/녹화 ---------- */
const renders=[];
const ART=window.ART={ik,C,SKIN,HAIR,SHIRT,PANTS,TV,el,clamp,lerp,smooth,easeOut,easeInOut,backOut,span,wave,rng,
  kidBack,teacherSide,desk,chair,classroom,seatKids,CAST,dropMark,rainGroup,sweatDrop,tvScreenPlaceholder,
  dur:14, rects:{},
  svg(){ const s=el('svg',{width:1920,height:1080,viewBox:'0 0 1920 1080'}); document.getElementById('stage').appendChild(s); return s; },
  onFrame(fn){ renders.push(fn); },
  seek(t){ for(const f of renders) f(t); },
};
window.__seek=t=>ART.seek(t);
window.__ready=(document.fonts?document.fonts.ready:Promise.resolve()).then(()=>new Promise(r=>requestAnimationFrame(()=>r(true))));
window.addEventListener('load',()=>{
  ART.seek(0);
  if (!/record/.test(location.search)){
    const t0=performance.now();
    const loop=()=>{ ART.seek(((performance.now()-t0)/1000)%ART.dur); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  } else if (/[?&]t=([\d.]+)/.test(location.search)) {
    ART.seek(parseFloat(RegExp.$1));
  }
});
})();
