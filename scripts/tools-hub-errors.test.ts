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
 assert.match(taken,/이전 수업 이어가기/);assert.match(taken,/다른 번호/);assert.doesNotMatch(taken,/번호 해제/,'there is no release button on the teacher screen');
 assert.match(sb,/res\.json\(\)\.catch\(\(\) => null\)/);
});

test('target cues read naturally and still differ by distance',()=>{
 const settings:QuestSettings={seated:false,gentle:false,practice:false,players:3};
 const near=makeQuestRound('target',0,settings,'near').cues,far=makeQuestRound('target',0,settings,'far').cues;
 assert.notDeepEqual(near,far);
 assert.doesNotMatch(near.join(' '),/가까운 가운데|회수/);
 assert.match(near[0],/가까이 있는 가운데 표적/);assert.match(near[1],/주워 와요/);
});
