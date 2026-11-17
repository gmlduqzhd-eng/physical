import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHONE_PLAYS,PHONE_PLAY_BY_ID} from '../src/domain/phonePlayCatalog';
import {classCueMs,classPhaseMs,classRoundView} from '../src/domain/phoneClassMode';
import {bingoLines,BINGO_BOARD,CLASSIC_LADDER,ladderTop} from '../src/domain/phonePlayClassicsMode';
import {matchesActivitySearch} from '../src/domain/activitySearch';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const play=(n:number)=>PHONE_PLAY_BY_ID.get(`phone-play-${String(n).padStart(3,'0')}`)!;
/** 몸으로 무엇을 할지 알 수 없는 개념어. 반 전체 화면의 큰 신호에는 쓰지 않는다. */
const ABSTRACT=['확인','합의','조건','교대','계획','표현','살피기','비교','역할','선택','연결','동의','해답','부품','감독','귀환','지지','번역','역순'];

test('every whole-class signal is an action phrase, not an abstract word',()=>{
 const bad:string[]=[];
 for(const p of PHONE_PLAYS)for(const level of ['쉬운 방법','기본 방법','추가 도전'])for(let r=0;r<3;r++)
  for(const cue of classRoundView(p,r,level,false,7).cues){const word=ABSTRACT.find(w=>cue.includes(w));if(word)bad.push(`${p.id} ${level} ${r+1}과제 「${cue}」 (${word})`);}
 assert.deepEqual(bad,[]);
});

test('each mission has its own signals: missions 1–3 never show the same list',()=>{
 const same=PHONE_PLAYS.filter(p=>new Set([0,1,2].map(r=>JSON.stringify(classRoundView(p,r,'기본 방법',false,7).cues))).size<3).map(p=>p.id);
 assert.deepEqual(same,[]);
});

test('memory plays keep the order on screen and point at the current step',()=>{
 const memory=PHONE_PLAYS.filter(p=>p.kind==='memory');
 assert(memory.length>=7);
 for(const p of memory)for(const level of ['쉬운 방법','기본 방법'])for(let r=0;r<3;r++){
  const v=classRoundView(p,r,level,false);
  assert(v.sequence.length>=2,`${p.id} shows the sequence`);
  assert.equal(v.steps.length,v.cues.length,`${p.id} every signal points at a step`);
  assert(v.steps.every(i=>i>=0&&i<v.sequence.length),p.id);
  assert.doesNotMatch(v.cues.join(' '),/기본 순서를 익힌 뒤|번째 박자에 선택한/,`${p.id} shows actions, not a rule sentence`);
 }
 // 거꾸로 따라 하기는 순서대로 한 뒤 끝에서부터 거꾸로 짚는다.
 const reverse=classRoundView(play(14),0,'기본 방법',false);
 assert.deepEqual(reverse.steps,[0,1,2,2,1,0]);
 // 빠진 동작 찾기는 빠진 자리를 ?로 보여 준다.
 assert(classRoundView(play(6),1,'기본 방법',false).sequence.includes('?'));
 // 모둠 몸 암호는 동작의 뜻을 신호 아래에 보여 준다.
 assert(classRoundView(play(77),0,'기본 방법',false).rules.some(r=>r.startsWith('뜻:')));
});

test('the current rule stays under the signal, and swap signals show the new meaning',()=>{
 for(const p of PHONE_PLAYS)for(let r=0;r<3;r++){const v=classRoundView(p,r,'기본 방법',false,3);assert.equal(v.rules.length,v.cues.length,p.id);assert(v.rules.every(x=>x.length>3),p.id);}
 const swap=classRoundView(play(11),2,'기본 방법',false);
 assert.deepEqual(swap.cues,['새','바꿔!','나무','바꿔!','새']);
 assert.match(swap.rules[0],/새=팔 펴기/);assert.match(swap.rules[2],/새=손 모으기/);assert.match(swap.rules[4],/새=팔 펴기/);
 assert.match(classRoundView(play(1),0,'기본 방법',false).rules[0],/출동/);
});

test('decision plays never put the wrong choices on the class screen',()=>{
 for(const p of PHONE_PLAYS.filter(p=>p.kind==='decision')){
  const v=classRoundView(p,0,'기본 방법',false);
  assert.deepEqual(v.choices,[],p.id);assert.equal(v.plan,p.options?.[0],p.id);
  for(const wrong of p.options?.slice(1)??[])assert(!v.cues.includes(wrong)&&v.brief!==wrong,p.id);
 }
 assert(classPhaseMs('brief',45,true)>classPhaseMs('brief',45,false),'a plan or a sequence gets a longer brief');
});

test('every play starts with a three-line rule card, and renamed plays are still found by the old name',()=>{
 for(const p of PHONE_PLAYS){assert.equal(p.rule3.length,3,p.id);assert(p.rule3.every(line=>line.length>=6),p.id);}
 const renamed=PHONE_PLAYS.filter(p=>p.oldName);
 assert(renamed.length>=30,'hard names were simplified');
 for(const p of renamed){const game=AVAILABLE_GAMES.find(g=>g.type===p.id)!;assert.equal(game.name,p.name);assert(matchesActivitySearch(game,p.oldName!),`${p.id} ${p.oldName}`);}
 assert.equal(play(17).name,'시소 팔');assert.match(play(17).goal,/같게, 다르게, 반대로/);
 assert.match(play(6).goal,/화면에서 빠진 동작/);
 assert.doesNotMatch(play(15).rounds[1],/팔 방향/,'mission 2 matches the foot-only signals');
});

test('classic plays get their own screens and timings',()=>{
 assert(classCueMs('phone-play-101')>=12000);assert.equal(classCueMs('phone-play-106'),10000);assert.equal(classCueMs('phone-play-001'),6000);
 assert.match(classRoundView(play(106),0,'기본 방법',false,1).cues[0],/10초/,'walking to a corner takes 10 seconds');
 assert.deepEqual(CLASSIC_LADDER.map(s=>s.name),['알','병아리','닭','하늘 새']);
 assert.deepEqual([0,1,2].map(r=>ladderTop(r,false)),[1,2,3]);
 assert.equal(BINGO_BOARD.flat().length,9);
 assert.equal(bingoLines(Array(9).fill(false)),0);
 assert.equal(bingoLines([true,true,true,false,false,false,false,false,false]),1);
 assert.equal(bingoLines([true,false,false,false,true,false,false,false,true]),1,'diagonals count');
 for(const id of ['phone-play-102','phone-play-103','phone-play-036','phone-play-008'])assert(PHONE_PLAY_BY_ID.get(id)!.setup,`${id} waits for roles to be chosen`);
});

test('the start screen puts the rules and the start buttons first and folds the settings',()=>{
 const device=read('src/presentation/components/minigames/common/PhonePlay.tsx');
 const intro=device.slice(device.indexOf("{phase==='intro'&&<>"));
 const card=intro.indexOf('<PhoneRuleCard'),start=intro.indexOf('반 전체로 바로 시작'),more=intro.indexOf('<details className="pp-panel pp-more"');
 assert(card>0&&start>card&&more>start,'rule card → start buttons → folded settings');
 assert.equal((device.match(/기기가 동작이나 체력을 판정하지 않아요/g)??[]).length,1,'the notice is shown once');
 assert.match(device,/blockReason/,'a disabled start explains why');
 assert.match(device,/onClick=\{\(\)=>start\(false\)\}>폰 내려놓고 활동 시작/,'practice is optional');
 const cls=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(cls,/useState<Phase>\('rules'\)/,'the class run opens on the rule card');
 assert.match(cls,/준비됐어요 · 시작/);
});
