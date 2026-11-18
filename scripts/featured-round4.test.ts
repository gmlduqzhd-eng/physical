import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expeditionNextStep} from '../src/domain/expeditionGuidance';
import type {ExpeditionSnapshot} from '../src/domain/flagship';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

/** 그린 HTML에서 낭독기가 읽는 글자(aria-hidden 뺌)와 눈에 보이는 글자(sr-only 뺌)를 꺼낸다. */
const strip=(html:string)=>html.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const dropHidden=(html:string)=>html.replace(/<span aria-hidden="true">[^<]*<\/span>/g,'');
const dropSrOnly=(html:string)=>html.replace(/<span class="sr-only">[^<]*<\/span>/g,' ');
test('StartLabel: the accessible name contains the visible text (WCAG 2.5.3 label in name)',async()=>{
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {createElement}=await import('react');
 const {StartLabel}=await import('../src/presentation/components/StartLabelText');
 for(const sub of ['반 전체','작전 고르기','안전 약속 확인','바로 시작',undefined]){
  const html=renderToStaticMarkup(createElement(StartLabel,{sub}));
  const name=strip(dropHidden(html)),visible=strip(dropSrOnly(html)).replace(/^▶\s*/,'');
  assert.equal(name,sub?`시작 · ${sub}`:'시작');
  // 보이는 낱말이 같은 순서로 이름 안에 들어 있어야 음성으로 보이는 대로 말해 누를 수 있다.
  const words=visible.split(/\s+/).filter(Boolean);let at=0;for(const w of words){const i=name.indexOf(w,at);assert.ok(i>=0,`${w} in ${name}`);at=i+w.length;}
  assert.doesNotMatch(html,/aria-hidden="true">[^<▶ ]/,'only the ▶ arrow is hidden from screen readers');
 }
});

test('start buttons do not override their visible label with a different spoken name',()=>{
 for(const file of ['../src/presentation/components/minigames/common/PhonePlay.tsx','../src/presentation/components/minigames/common/MovementQuest.tsx','../src/presentation/components/minigames/expedition/ExpeditionActivity.tsx','../src/presentation/components/minigames/common/SafetyLesson.tsx','../src/presentation/flagship/FlagshipActivity.tsx','../src/presentation/GamePlayPage.tsx']){
  // 시작 글자마다 그 글자를 감싼 버튼 태그(바로 앞 '<button'부터)를 꺼내, 보이는 글자를 덮는 aria-label이 없는지 본다.
  const src=read(file),uses=[...src.matchAll(/<StartLabel [^>]*\/>/g)].map(m=>{const at=m.index!;return src.slice(src.lastIndexOf('<button',at),at+m[0].length);});
  assert(uses.length>0,file);
  for(const use of uses){assert.doesNotMatch(use,/aria-label=/,`${file}: ${use}`);assert.doesNotMatch(use,/spoken=/,`${file}: ${use}`);}
 }
 assert.doesNotMatch(read('../src/presentation/GamePlayPage.tsx'),/sub="준비 확인"/);
});

test('one-tap quests whose signals use numbers show the map or start order on the start screen',async()=>{
 const {makeQuestRound}=await import('../src/domain/movementQuests');
 const settings={seated:false,gentle:true,practice:false,players:4};
 const numbered=['zigzag','pass-gate-rescue','relay-mission-runner','space-occupier','sound-goalball'].filter(id=>{const plan=makeQuestRound(id as never,0,settings as never);return plan.blocked!==undefined||!!plan.roles?.length;});
 assert.ok(numbered.length>=3,`quests with numbered first rounds: ${numbered}`);
 const src=read('../src/presentation/components/minigames/common/MovementQuest.tsx');
 // 바로 시작 버튼과 같은 조건에서, 지도나 출발 순서를 시작 화면에 먼저 보여 준다.
 assert.match(src,/\{directStart&&\(plan\.blocked!==undefined\|\|!!plan\.roles\?\.length\)&&<div className="mq-start-brief" data-start-brief>/);
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

test('the role-swap notice shows outside the folded details when it is due',()=>{
 const src=read('../src/presentation/flagship/FlagshipActivity.tsx');
 const banner=src.indexOf('<RoleSwapBanner'),details=src.indexOf('<details className="flagship-more"><summary>');
 assert.ok(banner>0&&banner<details,'the banner is rendered before (outside) the folded details');
 const panels=read('../src/presentation/flagship/WorkshopPanels.tsx');
 assert.match(panels,/export function RoleSwapBanner[\s\S]*?if\(!due\)return null;[\s\S]*?역할을 바꿀 시간이에요/);
});

test('robot-lab style layouts start with one tap that also confirms the safety promises',()=>{
 const layout=read('../src/presentation/components/minigames/common/PhysicalActivityLayout.tsx');
 const start=layout.indexOf('<StartLabel sub={safetyItems.length'),intro=layout.indexOf('활동 방법');
 assert.ok(start>0&&start<intro,'the start button sits above the instructions');
 assert.doesNotMatch(layout,/disabled=\{safetyItems\.some/,'no checkbox gate before starting');
});
