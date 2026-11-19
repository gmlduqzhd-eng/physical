import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {routeTitle,playIdOf} from '../src/domain/routeTitles';

const read=(p:string)=>readFileSync(p,'utf8');
const cssFiles=(dir:string):string[]=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?cssFiles(join(dir,e.name)):e.name.endsWith('.css')?[join(dir,e.name)]:[]);
type Face={family:string;file:string;ranges:[number,number][]};
const faces=():Face[]=>[...read('src/presentation/fontFaces.css').matchAll(/@font-face\{font-family:(\w+);src:url\('\/fonts\/([^']+)'\)[^}]*unicode-range:([^}]+)\}/g)]
 .map(m=>({family:m[1],file:m[2],ranges:m[3].split(',').map(r=>{const [a,b]=r.replace('U+','').split('-');return [parseInt(a,16),parseInt(b??a,16)] as [number,number];})}));
const covers=(face:Face,cp:number)=>face.ranges.some(([a,b])=>cp>=a&&cp<=b);

test('every font piece named in the CSS and in index.html is shipped, and no page asks for a removed font',()=>{
 const list=faces();assert.ok(list.length>=5);
 for(const f of list)assert.ok(existsSync(join('public/fonts',f.file)),f.file);
 for(const m of read('index.html').matchAll(/href="\/fonts\/([^"]+)"/g))assert.ok(existsSync(join('public/fonts',m[1])),m[1]);
 for(const file of cssFiles('src')){const css=read(file);
  for(const m of css.matchAll(/url\(\s*['"]?\/fonts\/([^'")]+)/g))assert.ok(existsSync(join('public/fonts',m[1])),`${file}: ${m[1]}`);
  assert.doesNotMatch(css,/\b(?:Lesson|Game|Role|Landing|Activity|Unified)Pretendard\b|AccessQrSans|Maplestory/,file);}
});

test('the first font piece is small, and any Hangul or Latin letter is still drawn in the app font',()=>{
 const list=faces();
 for(const family of ['ForestSans','ForestSerif']){
  const mine=list.filter(f=>f.family===family);const app=mine.find(f=>f.file.includes('-app.'));assert.ok(app,family);
  assert.ok(statSync(join('public/fonts',app.file)).size<400_000,`${family} first piece stays small`);
  // 흔한 글자는 첫 조각에, 드문 글자(이름에 쓰는 '뷁', '똠' 등)는 뒤 조각에 있어야 한다.
  for(const ch of '가나다체육수업시작해요')assert.ok(covers(app,ch.codePointAt(0)!),`${family} app piece has ${ch}`);
  for(let cp=0xAC00;cp<=0xD7A3;cp+=37)assert.ok(mine.some(f=>covers(f,cp)),`${family} draws U+${cp.toString(16)}`);
 }
 // 조각은 뒤에 선언된 것부터 쓰인다. 모든 한글을 받는 조각이 맨 앞(가장 나중 순서)이어야 흔한 글자에 큰 파일을 받지 않는다.
 const sans=list.filter(f=>f.family==='ForestSans');
 assert.ok(sans[0].file.includes('-rest.')&&sans.at(-1)!.file.includes('-app.'));
 assert.ok(!covers(sans[0],0x1F600),'an emoji must not pull the big catch-all piece');
});

test('home does not pull Supabase unless this tab is signed in',()=>{
 const src=read('src/presentation/components/HomeAccountTabs.tsx');
 assert.doesNotMatch(src,/^import[^\n]*data\/supabase/m);
 assert.match(src,/if\(!readStorage\('physical_supabase_auth','session'\)\)return;/);
});

test('page titles follow the route',()=>{
 assert.equal(routeTitle('/'),'땀방울 원정대');
 assert.equal(routeTitle('/hub'),'활동 고르기 · 땀방울 원정대');
 assert.equal(routeTitle('/today'),'오늘 수업 · 땀방울 원정대');
 assert.equal(routeTitle('/tools'),'수업 도구 · 땀방울 원정대');
 assert.equal(routeTitle('/sports/volleyball'),'종목 교실 · 땀방울 원정대');
 assert.equal(routeTitle('/class-progress'),'우리 반 반응 · 땀방울 원정대');
 assert.equal(routeTitle('/guide'),'1분 안내 · 땀방울 원정대');
 assert.equal(playIdOf('/solo/play/zigzag'),'zigzag');
 assert.equal(routeTitle('/play/sig-boss-raid','우리 반 보스전'),'우리 반 보스전 · 땀방울 원정대');
 assert.equal(routeTitle('/play/unknown'),'놀이 · 땀방울 원정대');
 assert.doesNotMatch(read('index.html'),/130개/);
});

test('installed app: any orientation, PNG icons, and the home picture is kept for offline',()=>{
 const manifest=JSON.parse(read('public/manifest.json'));
 assert.equal(manifest.orientation,'any');
 const icons=manifest.icons as {src:string;type:string;purpose:string;sizes:string}[];
 for(const size of ['192x192','512x512'])assert.ok(icons.some(i=>i.type==='image/png'&&i.sizes===size&&i.purpose==='any'));
 assert.ok(icons.some(i=>i.type==='image/png'&&i.purpose==='maskable'));
 for(const i of icons)assert.ok(existsSync(join('public',i.src)),i.src);
 const touch=read('index.html').match(/rel="apple-touch-icon" href="([^"]+)"/);assert.ok(touch&&existsSync(join('public',touch[1])));
 // The worker follows quoted /images/… names inside the scripts (the build may quote with backticks).
 const sw=read('public/sw.js');const pattern=sw.match(/source\.matchAll\((\/\["'`\]\(\(\?:.*?\/g)\)/);assert.ok(pattern);
 const re=new RegExp(pattern[1].slice(1,pattern[1].lastIndexOf('/')),'g');
 const found=[...'srcSet:`/images/home-hero-900.webp`,src:"/images/home-hero-1600.webp"'.matchAll(re)].map(m=>m[1]);
 assert.deepEqual(found,['/images/home-hero-900.webp','/images/home-hero-1600.webp']);
 for(const f of found)assert.ok(existsSync(join('public',f)));
});

test('music stays off until asked, and a dark screen survives a reload in the same tab',()=>{
 const music=read('src/application/BackgroundMusicContext.tsx');
 assert.match(music,/readStorage\(preferenceKey\) === "on"/);assert.match(music,/preload="none"/);
 const header=read('src/presentation/components/HeaderUtilities.tsx');
 assert.match(header,/'음악 켜기'/);assert.match(header,/if \(!music\.enabled && !musicOpen\) music\.toggle\(\)/);
 const theme=read('src/application/ThemeContext.tsx');
 assert.match(theme,/sessionStorage\.getItem\(themeKey\) === 'dark'/);assert.match(theme,/sessionStorage\.setItem\(themeKey, theme\)/);
});

test('home keeps one clear start and does not repeat the same doors',()=>{
 const home=read('src/presentation/UnifiedHomePage.tsx');
 const count=(to:string)=>home.split(`to="${to}"`).length-1;
 assert.equal(count('/today'),1);assert.ok(count('/hub')<=2);assert.equal(count('/lobby'),1);
 assert.match(home,/오늘 수업 시작/);assert.match(home,/활동 고르기/);assert.match(home,/추천 활동 \{FEATURED_GAMES\.length\}개/);
 // 줄였어도 닿는 곳은 그대로다.
 for(const to of ['/tools','/teacher','/solo','/expeditions','/hub?collection=phone','/try/map','/together'])assert.ok(home.includes(`"${to}"`),to);
});
