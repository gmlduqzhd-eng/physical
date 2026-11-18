import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderHtml,textOf} from './render-for-test';
import {EMPTY_PROGRESS,addPlay,currentVote,mergeProgress,parseProgress,reactionRows,setVote,type ClassProgress} from '../src/domain/classProgress';
import {libraryLead,FEATURED_GAMES} from '../src/domain/featuredGames';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {lessonPresets} from '../src/domain/lessonPresets';
import {createExpeditionRound} from '../src/domain/expeditionRules';
import {EXPEDITION_BY_ID} from '../src/domain/expeditionGames';

const empty=():ClassProgress=>({...EMPTY_PROGRESS,plays:[],votes:[]});

test('a vote before recording the next play does not overwrite the previous play vote',()=>{
 let p=empty();
 // 1판: 기록하고 👍
 p=addPlay(p,'sig-boss-raid',1000,'play-1');p=setVote(p,'sig-boss-raid','up',1100,'play-1');
 // 2판: 기록하기 전에 👎 (예전에는 1판의 👍를 덮어썼다)
 p=setVote(p,'sig-boss-raid','down',2000,'play-2');
 assert.equal(currentVote(p,'sig-boss-raid','play-1'),'up');
 assert.equal(currentVote(p,'sig-boss-raid','play-2'),'down');
 let row=reactionRows(p)[0];
 assert.deepEqual({plays:row.plays,up:row.up,down:row.down,unrecorded:row.unrecorded},{plays:1,up:1,down:1,unrecorded:1});
 // 2판을 기록하면 기록 안 한 반응이 사라진다(같은 판으로 묶임)
 p=addPlay(p,'sig-boss-raid',2100,'play-2');
 row=reactionRows(p)[0];
 assert.deepEqual({plays:row.plays,unrecorded:row.unrecorded},{plays:2,unrecorded:0});
 // 같은 판에서 반응을 바꾸면 한 표만 남는다
 p=setVote(p,'sig-boss-raid','up',2200,'play-2');
 assert.equal(p.votes.filter(v=>v.play==='play-2').length,1);
 // 같은 판을 두 번 기록하지 않는다
 assert.equal(addPlay(p,'sig-boss-raid',2300,'play-2').plays.length,2);
});

test('play ids survive saving and old records without play ids still work',()=>{
 const saved=JSON.parse(JSON.stringify(setVote(addPlay(empty(),'jump',10,'abc'),'jump','up',11,'abc')));
 const back=parseProgress(saved);
 assert.equal(back.plays[0].play,'abc');assert.equal(back.votes[0].play,'abc');
 // 예전 방식(판 id 없음): 마지막 판 이후 반응을 바꾼다
 let old=addPlay(empty(),'jump',100);old=setVote(old,'jump','up',110);old=setVote(old,'jump','down',120);
 assert.equal(old.votes.length,1);assert.equal(currentVote(old,'jump'),'down');
 assert.equal(parseProgress({plays:[{id:'x',at:1,play:{}}],votes:[]}).plays[0].play,undefined);
});

test('merging records from another tab keeps both sides (used after a failed save)',()=>{
 const mine=setVote(addPlay(empty(),'a',1,'p1'),'a','up',2,'p1');
 const other=setVote(addPlay(addPlay(empty(),'a',1,'p1'),'b',5,'p2'),'a','down',9,'p1');
 const merged=mergeProgress(mine,other);
 assert.equal(merged.plays.length,2);
 assert.equal(merged.votes.length,1);assert.equal(merged.votes[0].vote,'down','the later vote for the same play wins');
 const store=readFileSync('src/application/classProgressStore.ts','utf8');
 assert.match(store,/saveFailed\?mergeProgress\(memory,withoutRemoved\(stored,clearedAt,removedReasons\)\):stored/);
 assert.doesNotMatch(store,/if\(saveFailed\)return memory;/);
 assert.doesNotMatch(store,/&&!saveFailed\)on\(\)/);
});

test('the feedback slot keys votes by play, and results record the same play id',()=>{
 const slot=readFileSync('src/presentation/components/ClassFeedbackSlot.tsx','utf8');
 assert.match(slot,/playId\?:string/);
 assert.match(slot,/holdPlayId\(gameId,claimed\)/);
 assert.match(slot,/recordVote\(gameId,v,Date\.now\(\),play\)/);
 const page=readFileSync('src/presentation/GamePlayPage.tsx','utf8');
 assert.match(page,/recordPlay\(gameType,Date\.now\(\),openPlayId\(gameType\)\?\?sessionPlayId\)/);
 const dash=readFileSync('src/presentation/ClassProgressPage.tsx','utf8');
 assert.match(dash,/기록 안 한 판 반응/);
});

test('primary start buttons share one label shape',async()=>{
 // 첫 화면을 실제로 그려, 큰 시작 버튼이 모두 '▶ 시작 · …' 한 모양인지 본다.
 const {createElement}=await import('react');
 const {PhonePlay}=await import('../src/presentation/components/minigames/common/PhonePlay');
 const {MovementQuest}=await import('../src/presentation/components/minigames/common/MovementQuest');
 const {SafetyLesson}=await import('../src/presentation/components/minigames/common/SafetyLesson');
 const {ExpeditionActivity}=await import('../src/presentation/components/minigames/expedition/ExpeditionActivity');
 const {PHONE_PLAYS}=await import('../src/domain/phonePlayCatalog');
 const {adaptClassicPlay}=await import('../src/domain/phonePlayClassicsMode');
 const {EXPEDITION_GAMES}=await import('../src/domain/expeditionGames');
 const {SAFETY_LESSONS}=await import('../src/domain/safetyLessons');
 const {FlagshipActivity}=await import('../src/presentation/flagship/FlagshipActivity');
 const screens:[string,ReturnType<typeof createElement>,string][]=[
  ['phone play',createElement(PhonePlay,{play:PHONE_PLAYS.find(p=>!adaptClassicPlay(p,false,Infinity).setup)!}),'반 전체'],
  ['expedition',createElement(ExpeditionActivity,{game:EXPEDITION_GAMES[0],groupId:'g',solo:false,enqueueAction:()=>{}}),'원정'],
  ['movement quest',createElement(MovementQuest,{gameId:'zigzag' as never,solo:true}),'바로 첫 작전'],
  ['safety lesson',createElement(SafetyLesson,{gameId:Object.keys(SAFETY_LESSONS)[0] as never}),'안전 상황 살펴보기'],
  ['flagship',createElement(FlagshipActivity,{game:'expedition-map',onFinish:()=>{}}),'안전 약속 확인'],
 ];
 for(const [name,element,sub] of screens){
  const html=await renderHtml(element);
  const button=[...html.matchAll(/<button[^>]*>((?:(?!<\/button>).)*)<\/button>/g)].map(m=>m[1]).find(b=>b.includes('aria-hidden="true">▶'));
  assert.ok(button,`${name}: a ▶ start button`);
  assert.equal(textOf(button.replace(/<span aria-hidden="true">[^<]*<\/span>/g,'')),`시작 · ${sub}`,name);
 }
 // GamePlayPage의 '바로 시작'은 주소의 게임 ID·로그인·수업 방을 다 갖춘 경로 안에서만 그려져 첫 화면 그리기로는 닿지 않아 소스로 확인한다.
 assert.ok(readFileSync('src/presentation/GamePlayPage.tsx','utf8').includes('<StartLabel sub="바로 시작"/>'),'GamePlayPage');
});

test('shape game roles follow the current shape (no corners in a line)',()=>{
 const game=EXPEDITION_BY_ID.get('exp-tablet-02')!;
 const line=createExpeditionRound(game,0,4);
 assert.match(line.steps[0].instruction,/한 줄/);
 assert.ok(line.roles.every(r=>!/꼭짓점|모서리/.test(r)),line.roles.join());
 const square=createExpeditionRound(game,2,4);
 assert.match(square.steps[0].instruction,/네모/);
 assert.ok(square.roles.some(r=>/모서리/.test(r)));
});

test('TV-only signature games are not offered as student-device lesson presets',()=>{
 const sig=AVAILABLE_GAMES.find(g=>g.type.startsWith('sig-'))!;
 const rooms=[{id:'r1',name:sig.name,template_id:'t1',setup_minutes:20}] as never;
 const templates=[{id:'t1',name:sig.name,buttons:[{id:sig.type,label:sig.name}]}] as never;
 assert.equal(lessonPresets(rooms,templates,[{room_id:'r1'},{room_id:'r1'}]).length,0);
 const guided=readFileSync('src/presentation/GuidedClassroom.tsx','utf8');
 assert.match(guided,/useState\(recipe&&requestedGame\?3:requestedGame\?2:1\)/);
});

test('hub lead text follows search and the equipment-free collection',async()=>{
 assert.match(libraryLead(false,false,0,{query:'달리기'}),new RegExp(`모든 활동 ${AVAILABLE_GAMES.length}개`));
 assert.match(libraryLead(false,false,0,{phoneOnly:true}),/보관함까지 모두/);
 assert.match(libraryLead(false,false,0),new RegExp(`대표 게임 ${FEATURED_GAMES.length}개`));
 // 활동 목록 화면을 그려 본다: 찾은 활동 수를 보여 주고, 준비물 없는 놀이 칩은 보관함까지 센다고 알려 준다.
 const {createElement}=await import('react');
 const {ActivityPicker}=await import('../src/presentation/ActivityLibrary');
 const found=await renderHtml(createElement(ActivityPicker,{}),'/?q='+encodeURIComponent('달리기'));
 assert.match(found,/data-list-count/,'the list shows how many it found');
 assert.match(textOf(found),/준비물 없는 놀이만 \(\d+ · 보관함 포함\)/);
 const none=await renderHtml(createElement(ActivityPicker,{}),'/?q='+encodeURIComponent('쿼디치'));
 assert.doesNotMatch(none,/data-list-count/,'no count when nothing is found');
});
