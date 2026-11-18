import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
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
 assert.match(store,/saveFailed\?mergeProgress\(memory,stored\):stored/);
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

test('primary start buttons share one label shape',()=>{
 const files={
  'src/presentation/components/minigames/common/PhonePlay.tsx':'<StartLabel sub="반 전체"/>',
  'src/presentation/components/minigames/expedition/ExpeditionActivity.tsx':'<StartLabel sub="원정"/>',
  'src/presentation/components/minigames/common/MovementQuest.tsx':'<StartLabel sub="바로 첫 작전"/>',
  'src/presentation/components/minigames/common/SafetyLesson.tsx':'<StartLabel sub="안전 상황 살펴보기"/>',
  'src/presentation/GamePlayPage.tsx':'<StartLabel sub="바로 시작"/>',
  'src/presentation/flagship/FlagshipActivity.tsx':'<StartLabel sub="안전 약속 확인"/>',
 };
 for(const [file,label] of Object.entries(files))assert.ok(readFileSync(file,'utf8').includes(label),file);
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

test('hub lead text follows search and the equipment-free collection',()=>{
 assert.match(libraryLead(false,false,0,{query:'달리기'}),new RegExp(`모든 활동 ${AVAILABLE_GAMES.length}개`));
 assert.match(libraryLead(false,false,0,{phoneOnly:true}),/보관함까지 모두/);
 assert.match(libraryLead(false,false,0),new RegExp(`대표 게임 ${FEATURED_GAMES.length}개`));
 const lib=readFileSync('src/presentation/ActivityLibrary.tsx','utf8');
 assert.match(lib,/\{games\.length>0&&<span className="muted small" data-list-count>/);
 assert.match(lib,/보관함 포함/);
});
