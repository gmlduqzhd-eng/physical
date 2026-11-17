import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHONE_PLAY_BY_ID} from '../src/domain/phonePlayCatalog';
import {CLASS_TASK_SECONDS,classCueIntervalMs,classCueMs,classRoundView,deviceRuleLine,EVOLVE_HARD_RULE} from '../src/domain/phoneClassMode';
import {BINGO_ROWS_TO_WIN,bingoRows} from '../src/domain/phonePlayClassicsMode';

// 2026-11 직관성 재점검에서 나온 준비물 없는 놀이 문제.
const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const play=(n:number)=>PHONE_PLAY_BY_ID.get(`phone-play-${String(n).padStart(3,'0')}`)!;
const CLASS=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
const DEVICE=read('src/presentation/components/minigames/common/PhonePlay.tsx');
const CSS=read('src/presentation/components/minigames/common/PhonePlay.css');

test('memory plays show the real sequence before the task and hide it only while playing',()=>{
 // 빠진 동작 찾기: 안내에는 세 동작이 모두 보이고, 하는 동안에만 한 칸이 ?로 숨는다.
 for(const r of [0,1,2]){
  const v=classRoundView(play(6),r,'기본 방법',false);
  assert.equal(v.reveal.length,3);assert.ok(!v.reveal.includes('?'),'the brief shows every move');
  assert.equal(v.brief,v.reveal.join(' → '));
  assert.equal(v.sequence.filter(c=>c==='?').length,1,'one move is hidden while playing');
  const hidden=v.sequence.indexOf('?');assert.notEqual(v.reveal[hidden],'?');
 }
 // 추가 도전: 안내에는 진짜 순서, 하는 동안에는 가린 순서.
 for(const n of [14,19,28])for(const r of [0,1,2]){
  const v=classRoundView(play(n),r,'추가 도전',false);
  assert.ok(v.reveal.length>0&&v.reveal.every(c=>!c.includes('?')),`${n} brief shows the real order`);
  assert.equal(v.brief,v.reveal.join(' → '));
  assert.ok(v.sequence.every(c=>c.includes('?')),`${n} the order is hidden while playing`);
 }
 // 화면: 안내·카운트다운에는 reveal, 하는 동안에는 sequence를 보여 준다.
 assert.match(CLASS,/shownSequence=phase==='active'\?view\.sequence:view\.reveal/);
 assert.match(CLASS,/\(running\|\|phase==='countdown'\)&&shownSequence\.length>0/);
 // 3줄 규칙도 '먼저 보여 준 뒤 가린다'고 말한다.
 assert.match(play(6).rule3[0],/먼저 세 동작을 보여 준 뒤/);
});

test('board plays (101·104·105) fit one screen and keep the timer in the header',()=>{
 assert.match(CLASS,/const board=\['phone-play-101','phone-play-104','phone-play-105'\]\.includes\(p\.id\)/);
 assert.match(CLASS,/data-board=\{board\|\|undefined\}/);
 assert.match(CLASS,/<p className="pc-timer"/);
 assert.match(CSS,/\.phone-class\[data-board\] \.pc-cue/);
 assert.match(CSS,/\.phone-class \.pc-timer\{/);
 // 남은 시간은 신호 칸 아래가 아니라 머리글에 있으므로, 칸이 길어져도 가려지지 않는다.
 assert.doesNotMatch(CLASS,/`\$\{left\}초 남음`:phase==='brief'\?\(view\.memory/);
});

test('every cue of an ordered memory task fits in the task time, also at slow pace',()=>{
 for(const n of [6,14,15,19,28,33,44])for(const level of ['쉬운 방법','기본 방법','추가 도전'])for(const r of [0,1,2])for(const pace of [0.8,1,1.5])for(const seconds of CLASS_TASK_SECONDS){
  const base=classCueMs(play(n).id)*pace,v=classRoundView(play(n),r,level,false,1,base/1000,seconds);
  const interval=classCueIntervalMs(base,seconds,v.cues.length,v.memory);
  assert.ok(interval*v.cues.length<=seconds*1000,`${n} ${level} ${r+1}과제 ${seconds}초 ×${pace}: ${v.cues.length}×${interval}ms`);
  assert.ok(interval<=base,'never slower than the chosen pace');
 }
 // 014 거꾸로 따라 하기: 30초 과제에 추가 도전(8개)도 마지막 동작까지 나온다.
 const v=classRoundView(play(14),0,'추가 도전',false,1,6,30);
 assert.equal(v.cues.length,8);assert.equal(classCueIntervalMs(6000,30,8,true),3750);
 // 기억 놀이가 아니면 정해 둔 간격 그대로다.
 assert.equal(classCueIntervalMs(6000,30,20,false),6000);
 assert.match(CLASS,/const cueMs=classCueIntervalMs\(baseCueMs,taskSeconds,view\.cues\.length,view\.memory\)/);
});

test('one-device mode puts a big signal at the top and shows the current meaning for 새와 나무',()=>{
 assert.match(DEVICE,/data-focus=\{phase==='countdown'\|\|phase==='active'\|\|undefined\}/);
 assert.match(CSS,/\.phone-play\[data-focus\]>header\{display:none\}/);
 assert.match(CSS,/\.phone-play\[data-focus\] \.activity-progress\{display:none!important\}/);
 assert.match(CSS,/\.phone-play\[data-focus\] \.pp-signal strong\{font-size:clamp\(32px/);
 const cues=['새','나무','바꿔!','새'];
 assert.match(deviceRuleLine(play(11),0,cues,0),/새=팔 펴기/);
 assert.match(deviceRuleLine(play(11),0,cues,3),/새=손 모으기/,'after 바꿔! the meanings are swapped');
 assert.match(DEVICE,/deviceRuleLine\(p,round,activeCues,cueIndex,level\)/);
});

test('movement bingo: one row per task, 빙고 only after all three rows, and the copy says so',()=>{
 const none=Array(9).fill(false),row=(n:number)=>none.map((_,i)=>Math.floor(i/3)<n);
 assert.equal(bingoRows(none),0);assert.equal(bingoRows(row(1)),1);assert.equal(bingoRows(row(3)),BINGO_ROWS_TO_WIN);
 assert.equal(bingoRows([true,false,false,true,false,false,true,false,false]),0,'a column is not a task row');
 assert.match(play(105).rule3[2],/세 줄을 다 지우면 빙고/);
 assert.match(play(105).rules.join(' '),/세 줄을 다 지우면/);
 assert.match(CLASS,/left>0\?<p className="pc-bingo-progress"/);
 assert.match(CLASS,/🎉 빙고! 세 줄을 다 지웠어요/);
});

test('진화 산책 추가 도전: the rule line says a loss moves you one step down',()=>{
 for(const r of [0,1,2])for(const rule of classRoundView(play(104),r,'추가 도전',false,3).rules)assert.equal(rule,EVOLVE_HARD_RULE);
 assert.match(classRoundView(play(104),0,'기본 방법',false,3).rules[0],/지면 그대로/);
 assert.equal(deviceRuleLine(play(104),0,['x'],0,'추가 도전'),EVOLVE_HARD_RULE);
});

test('the rule card does not read a changing countdown every second',()=>{
 const rules=CLASS.slice(CLASS.indexOf("{phase==='rules'&&<div"),CLASS.indexOf("{['countdown','brief','active'].includes(phase)&&<div"));
 assert.match(rules,/aria-live="polite"/);
 assert.doesNotMatch(rules,/\{left\}/,'no ticking number inside the live region');
 assert.match(CLASS,/aria-hidden=\{phase==='rules'\|\|phase==='countdown'\|\|undefined\}/);
});

test('small fixes: role pause unpauses, observe compare needs before and after, retry clears the bingo row',()=>{
 assert.match(CLASS,/onClick=\{\(\)=>\{unlockAudio\(\);setElapsed\(0\);setPaused\(false\);setPhase\('countdown'\);\}\}>준비됐어요 · 시작/);
 assert.match(DEVICE,/compareReady=p\.kind!=='observe'\|\|\(!!comparison&&\(comparison!=='compared'\|\|\(!!before&&!!after\)\)\)/);
 assert.match(DEVICE,/<option value="compared" disabled=\{!before\|\|!after\}>/);
 assert.match(DEVICE,/앞: \{before\|\|'고르지 않음'\} · 뒤: \{after\|\|'고르지 않음'\}/);
 assert.match(DEVICE,/if\(p\.id==='phone-play-105'\)setBingo\(b=>b\.map\(\(v,i\)=>Math\.floor\(i\/3\)===round\?false:v\)\);setPhase\('plan'\)/);
});
