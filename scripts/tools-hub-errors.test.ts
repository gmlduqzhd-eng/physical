import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CLASS_TOOLS,COUNTDOWN_PRESETS,formatCountdown,parseDrawSaved,parseGroupsSaved,parseRaceSaved,splitGroups} from '../src/domain/classTools';
import {activityGroup} from '../src/domain/activityGroups';
import {GAMES} from '../src/domain/gamesData';
import {FEATURED_GAMES,libraryLead} from '../src/domain/featuredGames';
import {isChunkLoadError} from '../src/components/chunkLoadError';
import {makeQuestRound,type QuestSettings} from '../src/domain/movementQuests';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('number draw comes back after a reload only when the saved order is possible',()=>{
 assert.deepEqual(parseDrawSaved({total:25,drawn:[3,17,1]}),{total:25,drawn:[3,17,1]});
 assert.deepEqual(parseDrawSaved(JSON.parse(JSON.stringify({total:40,drawn:[]}))),{total:40,drawn:[]});
 for(const bad of [null,[],{total:25},{total:1,drawn:[]},{total:41,drawn:[]},{total:5,drawn:[6]},{total:5,drawn:[0]},{total:5,drawn:[2,2]},{total:3,drawn:[1,2,3,1]},{total:5,drawn:['1']},{total:5.5,drawn:[]}])
  assert.equal(parseDrawSaved(bad),null,JSON.stringify(bad));
});

test('saved groups must hold every number exactly once',()=>{
 const groups=splitGroups(24,4);
 assert.deepEqual(parseGroupsSaved({total:24,count:4,groups}),{total:24,count:4,groups});
 assert.deepEqual(parseGroupsSaved({total:24,count:4,groups:[]})?.groups,[]);
 assert.equal(parseGroupsSaved({total:24,count:4,groups:groups.slice(1)}),null,'a missing group');
 assert.equal(parseGroupsSaved({total:4,count:2,groups:[[1,2],[2,4]]}),null,'a repeated number');
 assert.equal(parseGroupsSaved({total:4,count:2,groups:[[1,2],[3,9]]}),null,'a number outside the class');
 assert.equal(parseGroupsSaved({total:4,count:11,groups:[]}),null);
 assert.equal(parseGroupsSaved('x'),null);
});

test('a race that was running keeps counting through a reload; a paused one stays put',()=>{
 const times=[null,12_300,null,null,null,null,null,null],savedAt=1_000_000;
 const running=parseRaceSaved({lanes:4,times,ms:15_000,running:true,savedAt},savedAt+4_000);
 assert.equal(running?.ms,19_000,'time that passed during the reload is added');assert.equal(running?.running,true);assert.deepEqual(running?.times,times);
 const paused=parseRaceSaved({lanes:4,times,ms:15_000,running:false,savedAt},savedAt+4_000);
 assert.equal(paused?.ms,15_000);assert.equal(paused?.running,false);
 assert.equal(parseRaceSaved({lanes:4,times:Array(8).fill(null),ms:0,running:false,savedAt},savedAt),null,'nothing to resume');
 assert.equal(parseRaceSaved({lanes:4,times,ms:15_000,running:true,savedAt},savedAt+25*60*60*1000),null,'a race from another day is dropped');
 assert.equal(parseRaceSaved({lanes:4,times,ms:15_000,running:true,savedAt},savedAt-1),null,'a clock that went backwards');
 for(const bad of [{lanes:9,times,ms:0,running:false,savedAt},{lanes:4,times:[1],ms:0,running:false,savedAt},{lanes:4,times,ms:-1,running:false,savedAt},{lanes:4,times:times.map(()=>'x'),ms:1,running:false,savedAt}])
  assert.equal(parseRaceSaved(bad,savedAt),null);
});

test('class tools persist per tab and the race buttons have the right emphasis',()=>{
 const src=read('src/presentation/ClassTools.tsx'),css=read('src/presentation/ClassTools.css');
 for(const key of ['DRAW_KEY','GROUPS_KEY','RACE_KEY'])assert.match(src,new RegExp(`writeStorage\\(${key},[^;]*'session'\\)`),`${key} is written to tab storage`);
 assert.match(src,/이어서 하기<\/button><button onClick=\{onFresh\}>새로 하기/,'resume banner offers both choices');
 assert.match(src,/className="primary tools-arrive"/);assert.match(src,/className="tools-cancel"/);
 assert.match(css,/\.tools-arrive\{[^}]*min-height:56px/);assert.match(css,/\.tools-cancel\{[^}]*font-size:14px/);
 assert.match(css,/@media\(min-width:900px\)\{\.tools-lanes\[data-many=yes\]\{grid-template-columns:1fr 1fr\}\}/,'five or more teams sit in two columns on a TV');
});

test('there is a plain countdown tool with the four presets',()=>{
 assert.ok(CLASS_TOOLS.some(t=>t.id==='timer'&&t.label==='카운트다운'));
 assert.deepEqual(COUNTDOWN_PRESETS.map(p=>p.seconds),[30,60,180,300]);
 assert.equal(formatCountdown(90),'1:30');assert.equal(formatCountdown(4.2),'0:05');assert.equal(formatCountdown(0),'0:00');assert.equal(formatCountdown(-3),'0:00');assert.equal(formatCountdown(300),'5:00');
});

test('signature games get a sensible category, and the 42 set is called 추천 활동',()=>{
 const group=(id:string)=>activityGroup(GAMES.find(g=>g.type===id)!).id;
 assert.equal(group('sig-memory-relay'),'thinking');assert.equal(group('sig-move-bingo'),'thinking');
 assert.equal(group('sig-signal-captain'),'reaction');assert.equal(group('sig-boss-raid'),'fitness');assert.equal(group('sig-stage-show'),'rhythm');
 const lead=libraryLead(false,false,0);
 assert.match(lead,new RegExp(`추천 활동 ${FEATURED_GAMES.length}개`));assert.doesNotMatch(lead,/대표 게임/);
 assert.doesNotMatch(libraryLead(false,true,0)+libraryLead(false,false,0,{query:'공'})+libraryLead(false,false,0,{phoneOnly:true}),/대표 게임/);
 const hub=read('src/presentation/ActivityLibrary.tsx');
 // 화면 글(JSX·문자열)에는 '대표 게임'이 남지 않는다(주석 제외).
 assert.doesNotMatch(hub.split('\n').filter(l=>!/^\s*\/\//.test(l)).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g,''),/대표 게임/);
 assert.match(hub,/data-list-count role="status" aria-live="polite"/);
 assert.match(hub,/<details className="activity-filter-more"/,'secondary filters are folded so cards reach the first TV screen');
});

test('chunk-load failures are told apart from other errors, and error screens use plain words',()=>{
 assert.equal(isChunkLoadError(new TypeError('Failed to fetch dynamically imported module: https://x/assets/Game-abc.js')),true);
 assert.equal(isChunkLoadError(new Error('Importing a module script failed.')),true);
 assert.equal(isChunkLoadError(new Error("Cannot read properties of undefined (reading 'x')")),false);
 assert.equal(isChunkLoadError(undefined),false);
 const top=read('src/components/ErrorBoundary.tsx'),play=read('src/components/PlayErrorBoundary.tsx'),app=read('src/App.tsx');
 assert.doesNotMatch(top+play,/시스템 오류|예기치 않은/);
 assert.match(play,/이 놀이를 못 열었어요/);assert.match(play,/다시 열기/);assert.match(play,/목록으로/);assert.match(play,/<FlowShell/,'the header stays');
 assert.equal((app.match(/<PlayErrorBoundary><GamePlayPage \/><\/PlayErrorBoundary>/g)||[]).length,2,'both play routes are wrapped');
});

test('join and teacher errors never show raw English and only promise what exists',()=>{
 const repo=read('src/data/classroomRepository.ts'),sb=read('src/data/supabase.ts');
 const taken=repo.match(/number_taken:'([^']+)'/)![1];
 assert.doesNotMatch(taken,/이전 수업 이어가기/,'only mentioned when that button is on screen');assert.match(taken,/다른 번호/);assert.ok(taken.length<=45,'short for grade 1-2');
 assert.match(read('src/application/studentIdentity.ts'),/canResume \? ' 내가 먼저 들어왔다면 위의 ‘이전 수업 이어가기’/);assert.doesNotMatch(taken,/번호 해제/,'there is no release button on the teacher screen');
 assert.match(sb,/res\.json\(\)\.catch\(\(\) => null\)/);
});

test('target cues read naturally and still differ by distance',()=>{
 const settings:QuestSettings={seated:false,gentle:false,practice:false,players:3};
 const near=makeQuestRound('target',0,settings,'near').cues,far=makeQuestRound('target',0,settings,'far').cues;
 assert.notDeepEqual(near,far);
 assert.doesNotMatch(near.join(' '),/가까운 가운데|회수/);
 assert.match(near[0],/가까이 있는 가운데 표적/);assert.match(near[1],/주워 와요/);
});

/* ── round 103: 오래 떠난 레이스·카운트다운 이어 하기·탭 제목·도구 수 ── */
test('a race left running for over an hour comes back stopped at its saved time, and absurd times are rejected',async()=>{
 const {RACE_MAX_MS,STALE_RACE_MS}=await import('../src/domain/classTools');
 const savedAt=1_000_000,times=[3_000,null,null,null,null,null,null,null];
 const stale=parseRaceSaved({lanes:6,times,ms:65_000,running:true,savedAt},savedAt+STALE_RACE_MS+1)!;
 assert.equal(stale.running,false,'stopped');assert.equal(stale.ms,65_000,'gap is not added');assert.equal(stale.stale,true);
 const fresh=parseRaceSaved({lanes:6,times,ms:65_000,running:true,savedAt},savedAt+30_000)!;
 assert.equal(fresh.running,true);assert.equal(fresh.ms,95_000);assert.equal(fresh.stale,undefined);
 assert.equal(parseRaceSaved({lanes:4,times,ms:1e99,running:false,savedAt},savedAt),null,'1e99 ms');
 assert.equal(parseRaceSaved({lanes:4,times:[1e99,null,null,null,null,null,null,null],ms:1000,running:false,savedAt},savedAt),null,'1e99 arrival');
 assert.equal(parseRaceSaved({lanes:4,times,ms:RACE_MAX_MS+1,running:false,savedAt},savedAt),null,'over 6 hours');
});

test('countdown resumes from its end time, finishes if it ended while away, and drops bad or old records',async()=>{
 const {parseCountdownSaved}=await import('../src/domain/classTools');
 const savedAt=5_000_000;
 const running=parseCountdownSaved({total:60,left:60,running:true,endAt:savedAt+60_000,savedAt},savedAt+20_000)!;
 assert.equal(running.running,true);assert.ok(Math.abs(running.left-40)<0.01);
 const ended=parseCountdownSaved({total:60,left:60,running:true,endAt:savedAt+60_000,savedAt},savedAt+90_000)!;
 assert.deepEqual([ended.running,ended.left],[false,0],'ended while away → done, no whistle replay');
 const paused=parseCountdownSaved({total:180,left:42.5,running:false,endAt:null,savedAt},savedAt+1_000)!;
 assert.deepEqual([paused.total,paused.left,paused.running],[180,42.5,false]);
 assert.equal(parseCountdownSaved({total:60,left:60,running:false,endAt:null,savedAt},savedAt),null,'untouched preset: nothing to resume');
 assert.equal(parseCountdownSaved({total:77,left:10,running:false,endAt:null,savedAt},savedAt),null,'not a preset');
 assert.equal(parseCountdownSaved({total:60,left:90,running:false,endAt:null,savedAt},savedAt),null,'left over total');
 assert.equal(parseCountdownSaved({total:60,left:10,running:false,endAt:null,savedAt},savedAt+2*60*60*1000),null,'older than an hour');
 assert.equal(parseCountdownSaved({total:60,left:60,running:true,endAt:savedAt+10*60_000,savedAt},savedAt),null,'end time further than the preset');
 for(const bad of [null,'x',[],{total:60}])assert.equal(parseCountdownSaved(bad,savedAt),null);
});

test('every route has a tab title and an unknown game says so',async()=>{
 const {routeTitle,SITE_NAME}=await import('../src/domain/routeTitles');
 for(const path of ['/try','/try/map','/together','/journey','/more','/lab/angle','/demo','/device-check','/board','/board/ab12'])
  assert.notEqual(routeTitle(path),SITE_NAME,`${path} has its own title`);
 assert.equal(routeTitle('/play/nope',null),`찾을 수 없는 놀이 · ${SITE_NAME}`);
 assert.equal(routeTitle('/play/sig-boss-raid','우리 반 보스전'),`우리 반 보스전 · ${SITE_NAME}`);
 assert.equal(routeTitle('/play/sig-boss-raid'),`놀이 · ${SITE_NAME}`,'name not loaded yet');
});

test('the home 수업 도구 card counts the real tools',async()=>{
 const {ENCYCLOPEDIA}=await import('../src/domain/encyclopedia');
 const tools=ENCYCLOPEDIA.find(e=>e.id==='tools')!;
 assert.match(tools.summary,new RegExp(`${CLASS_TOOLS.length}가지`));
});

test('countdown controls sit above the digits and race shows a running state instead of a disabled start',()=>{
 const src=read('src/presentation/ClassTools.tsx'),css=read('src/presentation/ClassTools.css');
 // 렌더 없이 확인할 수 있는 배치 약속만 본다(실제 위치는 Playwright로 확인).
 assert.ok(src.indexOf('tools-countdown-controls')<src.indexOf('className="tools-big tools-countdown"'),'controls before digits');
 assert.match(css,/tools-countdown strong\{font-size:clamp\([^)]*vh/,'digit size bound to viewport height');
 assert.match(src,/🏃 달리는 중/);assert.doesNotMatch(src,/\{clock\.ms\?'이어서 출발':'출발!'\}/);
 assert.match(read('src/presentation/SignatureCardsPrint.css'),/list-style:decimal/);
});

test('hub shows chosen filters as removable chips when collapsed and opens the grade box for ?grade=',()=>{
 const src=read('src/presentation/ActivityLibrary.tsx');
 assert.match(src,/activity-filter-chosen/);assert.match(src,/조건 지우기/);
 assert.match(src,/useState\(grade!=='전체'\|\|device!=='전체'\)/);
});

test('expedition wording no longer says 관문 or awkward 문 phrases on screen',()=>{
 for(const [path,bad] of [
  ['src/presentation/flagship/WorkshopPanels.tsx',/아래 문에 참여/],
  ['src/domain/playRecipes.ts',/지금 문을 함께 해결/],
  ['src/presentation/flagship/FlagshipActivity.tsx',/문 열기 참여 확인|함께 여는 문 개방/],
  ['src/domain/expeditionGuidance.ts',/아래 문에서/],
  ['src/domain/expeditionWorkshop.ts',/공동 관문/],
  ['src/presentation/GuidedClassroom.tsx',/관문이 이어지는/],
 ] as const)assert.doesNotMatch(read(path),bad,path);
});
