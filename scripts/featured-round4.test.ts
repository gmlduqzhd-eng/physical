import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expeditionNextStep} from '../src/domain/expeditionGuidance';
import type {ExpeditionSnapshot} from '../src/domain/flagship';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('StartLabel reads one natural sentence and hides the visible "▶ 시작 · …" from screen readers',()=>{
 const src=read('../src/presentation/components/StartLabel.tsx');
 assert.match(src,/<span className="sr-only">\{sentence\}<\/span>/);
 assert.match(src,/className="start-label-main" aria-hidden="true">▶ 시작</);
 assert.match(src,/className="start-label-sub" aria-hidden="true">\{sub\}</);
 assert.doesNotMatch(src,/sr-only"> · </,'the "·" is no longer read aloud');
 assert.match(read('../src/presentation/components/StartLabel.css'),/\.start-label \.sr-only\{position:absolute/);
});

test('every start button passes a spoken sentence',()=>{
 for(const file of ['../src/presentation/components/minigames/common/PhonePlay.tsx','../src/presentation/components/minigames/common/MovementQuest.tsx','../src/presentation/components/minigames/expedition/ExpeditionActivity.tsx','../src/presentation/components/minigames/common/SafetyLesson.tsx','../src/presentation/flagship/FlagshipActivity.tsx','../src/presentation/GamePlayPage.tsx']){
  const src=read(file),uses=src.match(/<StartLabel [^>]*\/>/g)??[];
  assert(uses.length>0,file);
  for(const use of uses)assert.match(use,/spoken="[^"]+"/,`${file}: ${use}`);
 }
 // 바로 시작하는 준비 화면은 '준비 확인'처럼 확인 단계로 가는 것처럼 읽히지 않는다.
 assert.doesNotMatch(read('../src/presentation/GamePlayPage.tsx'),/sub="준비 확인"/);
});

test('movement missions start the first mission with one tap when there is nothing to choose',()=>{
 const src=read('../src/presentation/components/minigames/common/MovementQuest.tsx');
 assert.match(src,/const directStart=round===0&&records\.length===0&&!plan\.decision&&validChoice;/);
 assert.match(src,/directStart\s*\?<div className="mq-start-row"><button className="mq-primary" onClick=\{\(\) => start\(false\)\}>/);
 assert.match(src,/>작전 고르고 시작<\/button>/,'choosing first is still one tap away');
});

test('phone plays that need roles ask for them on the start screen and do not wait again',()=>{
 const play=read('../src/presentation/components/minigames/common/PhonePlay.tsx'),cls=read('../src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(play,/pp-setup-first[^>]*><strong>시작하기 전에 정해요<\/strong> \{classSetup\}/);
 assert.match(play,/<PhonePlayClass [^\n]*rolesReady\/>/);
 assert.match(cls,/const waitForTeacher=!!p\.setup&&!seated&&!rolesReady;/);
 assert.match(cls,/정한 역할 그대로 · \{p\.setup\}/,'the rules card still reminds the class of the roles');
});

test('flagship map and loop have one start button and fold secondary panels after start',()=>{
 const src=read('../src/presentation/flagship/FlagshipActivity.tsx');
 assert.equal((src.match(/onClick=\{\(\)=>setReady\(true\)\}/g)??[]).length,2,'one start for the page, one for an embedded gate');
 assert.match(src,/embedded\?<><p>\{meta\.desc\}<\/p><button className="flagship-primary" onClick=\{\(\)=>setReady\(true\)\}>/);
 assert.match(src,/<details className="flagship-more flagship-setup-more"><summary>자세히/);
 assert.match(src,/<details className="flagship-more"><summary>자세히 · /);
 for(const part of ['<StudentActionCue','<RoleRotation','<GroupSupport','key="after-start"'])assert(src.indexOf(part)>src.indexOf('<details className="flagship-more"><summary>'),`${part} lives inside 자세히`);
});

test('the secret map shows one step at a time',()=>{
 const src=read('../src/presentation/flagship/CooperativeMapGame.tsx');
 assert.match(src,/const STEP_NAMES=\['① 단서 묻기','② 걸어가 확인','③ 같은 길 고르기'\]/);
 assert.match(src,/aria-current=\{step===i\?'step':undefined\}/);
 for(const n of [0,1,2])assert.match(src,new RegExp(`\\{step===${n}&&<>`));
 assert.match(src,/setStep\(0\);\},\[s\.phase,s\.runId\]\)/,'a new gate starts from ①');
 assert.doesNotMatch(src,/className="map-flow"/,'the long three-card explanation is gone');
});

test('practice map guidance says buttons, the real lesson says the posted QR',()=>{
 const s={status:'playing',groupId:'g1',phase:0,groups:[{id:'g1',name:'1모둠',visited:[],vote:null,done:false,loop:[],quality:0,ship:{checkpoint:0}}]} as unknown as ExpeditionSnapshot;
 assert.doesNotMatch(expeditionNextStep(s,'expedition-map',true).instruction,/QR/);
 assert.match(expeditionNextStep(s,'expedition-map',true).instruction,/버튼/);
 assert.match(expeditionNextStep(s,'expedition-map').instruction,/안내판 QR/);
});
