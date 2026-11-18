import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {expeditionNextStep} from '../src/domain/expeditionGuidance';
import type {ExpeditionSnapshot} from '../src/domain/flagship';
import {renderHtml,textOf} from './render-for-test';

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
 // 실제 시작 화면을 그려 본다: 번호를 쓰는 첫 판이면 지도나 출발 순서가 '바로 첫 작전' 버튼과 함께 보인다.
 const {createElement}=await import('react');
 const {MovementQuest}=await import('../src/presentation/components/minigames/common/MovementQuest');
 for(const id of numbered){
  const html=await renderHtml(createElement(MovementQuest,{gameId:id as never,solo:true})),text=textOf(html);
  assert.match(html,/data-start-brief/,`${id}: start brief on the start screen`);
  assert.ok(text.indexOf('바로 첫 작전')>0,`${id}: one-tap start`);
  assert.match(text,/작전 고르고 시작/,`${id}: choosing first is still one tap away`);
 }
 const plain=['zigzag','pass-gate-rescue','relay-mission-runner','space-occupier','sound-goalball'].find(id=>!numbered.includes(id));
 if(plain)assert.doesNotMatch(await renderHtml(createElement(MovementQuest,{gameId:plain as never,solo:true})),/data-start-brief/,`${plain}: no brief without numbers`);
});

test('phone plays that need roles ask for them on the start screen and do not wait again',async()=>{
 const {createElement}=await import('react');
 const {PHONE_PLAYS}=await import('../src/domain/phonePlayCatalog');
 const {adaptClassicPlay}=await import('../src/domain/phonePlayClassicsMode');
 const {PhonePlay}=await import('../src/presentation/components/minigames/common/PhonePlay');
 const {PhonePlayClass}=await import('../src/presentation/components/minigames/common/PhonePlayClass');
 const play=PHONE_PLAYS.find(p=>adaptClassicPlay(p,false,Infinity).setup);
 assert.ok(play,'a phone play with roles to set up');
 const setup=adaptClassicPlay(play,false,Infinity).setup!;
 // 반 전체 시작 화면: 역할을 먼저 정하라는 안내와, 정했다는 뜻이 담긴 시작 버튼.
 const start=textOf(await renderHtml(createElement(PhonePlay,{play})));
 assert.ok(start.includes(`시작하기 전에 정해요 ${setup}`),start);
 assert.match(start,/시작 · 역할 정했어요 · 반 전체/);
 // 시작 화면에서 정하고 들어오면(rolesReady) 규칙 카드는 기다리지 않고 초를 센다. 역할은 다시 알려 준다.
 const props={play,taskSeconds:30,seated:false,level:'기본 방법',voice:false,sound:false,pace:1,onLeave:()=>{}} as never;
 const ready=textOf(await renderHtml(createElement(PhonePlayClass,{...(props as object),rolesReady:true} as never)));
 assert.ok(ready.includes(`정한 역할 그대로 · ${setup}`),'the rules card still reminds the class of the roles');
 assert.match(ready,/\d+초 뒤 시작/,'the rules card counts down instead of waiting');
 const waiting=textOf(await renderHtml(createElement(PhonePlayClass,props)));
 assert.ok(waiting.includes(`먼저 정해요 · ${setup}`),'without the start-screen choice it still waits for roles');
 // PhonePlay가 반 전체 진행을 rolesReady로 여는지는 버튼을 눌러야 보이므로(이 테스트는 첫 화면만 그린다) 소스로 확인한다.
 assert.match(read('../src/presentation/components/minigames/common/PhonePlay.tsx'),/<PhonePlayClass [^\n]*rolesReady\/>/);
});

test('flagship map and loop have one start button and fold secondary panels after start',()=>{
 const src=read('../src/presentation/flagship/FlagshipActivity.tsx');
 assert.equal((src.match(/onClick=\{\(\)=>setReady\(true\)\}/g)??[]).length,2,'one start for the page, one for an embedded gate');
 assert.match(src,/embedded\?<><p>\{meta\.desc\}<\/p><button className="flagship-primary" onClick=\{\(\)=>setReady\(true\)\}>/);
 assert.match(src,/<details className="flagship-more flagship-setup-more"><summary>자세히/);
 assert.match(src,/<details className="flagship-more"><summary>자세히 · /);
 for(const part of ['<StudentActionCue','<RoleRotation','<GroupSupport','key="after-start"'])assert(src.indexOf(part)>src.indexOf('<details className="flagship-more"><summary>'),`${part} lives inside 자세히`);
});

test('the secret map shows one step at a time',async()=>{
 const {createElement}=await import('react');
 const {CooperativeMapGame}=await import('../src/presentation/flagship/CooperativeMapGame');
 const snapshot={runId:'r1',game:'expedition-map',seed:1,phase:0,status:'playing',revision:1,serverTime:0,startedAt:0,event:'',clue:null,owner:false,groupId:'g1',
  groups:[{id:'g1',name:'1모둠',visited:[],vote:null,done:false,loop:[],quality:0,ship:{checkpoint:0}}]} as unknown as ExpeditionSnapshot;
 const html=await renderHtml(createElement(CooperativeMapGame,{snapshot,send:async()=>true,practice:true,disabled:false}));
 const steps=[...html.matchAll(/<button type="button"([^>]*)>(?:<span aria-hidden="true">[^<]*<\/span>)?([^<]+)<\/button>/g)].map(m=>({current:/aria-current="step"/.test(m[1]),name:m[2]}));
 assert.deepEqual(steps.map(s=>s.name),['① 힌트 묻기','② 걸어가 확인','③ 같은 길 고르기']);
 assert.deepEqual(steps.map(s=>s.current),[true,false,false],'only the current step is marked');
 const text=textOf(html);
 assert.match(text,/다른 모둠에게 물어봐요/,'step ① panel is shown');
 assert.doesNotMatch(text,/걸어가서 확인해요|모두 같은 길을 골라요/,'steps ② and ③ stay hidden until chosen');
 assert.doesNotMatch(html,/class="map-flow"/,'the long three-card explanation is gone');
 // 새 관문에서 ①로 돌아가는 것은 effect(브라우저에서만 실행)라 첫 화면 그리기로는 볼 수 없어 소스로 확인한다.
 assert.match(read('../src/presentation/flagship/CooperativeMapGame.tsx'),/setStep\(0\);\},\[s\.phase,s\.runId\]\)/,'a new gate starts from ①');
});

test('practice map guidance says buttons, the real lesson says the posted QR',()=>{
 const s={status:'playing',groupId:'g1',phase:0,groups:[{id:'g1',name:'1모둠',visited:[],vote:null,done:false,loop:[],quality:0,ship:{checkpoint:0}}]} as unknown as ExpeditionSnapshot;
 assert.doesNotMatch(expeditionNextStep(s,'expedition-map',true).instruction,/QR/);
 assert.match(expeditionNextStep(s,'expedition-map',true).instruction,/버튼/);
 assert.match(expeditionNextStep(s,'expedition-map').instruction,/안내판 QR/);
});

test('the role-swap notice shows outside the folded details when it is due',async()=>{
 const src=read('../src/presentation/flagship/FlagshipActivity.tsx');
 const banner=src.indexOf('<RoleSwapBanner'),details=src.indexOf('<details className="flagship-more"><summary>');
 assert.ok(banner>0&&banner<details,'the banner is rendered before (outside) the folded details');
 // 배너 자체: 교대 시간이 되면 알림을 그리고, 아직이면 아무것도 그리지 않는다.
 const {createElement}=await import('react');
 const {RoleSwapBanner}=await import('../src/presentation/flagship/WorkshopPanels');
 const {DEFAULT_WORKSHOP}=await import('../src/domain/expeditionWorkshop');
 const now=Date.now(),group={id:'g1',name:'1모둠',visited:[],vote:null,done:false,loop:[],quality:0,ship:{checkpoint:0}};
 const at=(startedAt:number)=>({runId:'r',game:'expedition-loop',seed:1,phase:0,status:'playing',revision:1,serverTime:now,startedAt,event:'',clue:null,owner:true,groupId:'g1',groups:[group]}) as unknown as ExpeditionSnapshot;
 const drawBanner=(s:ExpeditionSnapshot)=>renderHtml(createElement(RoleSwapBanner,{snapshot:s,group:s.groups[0],send:async()=>true,disabled:false}));
 const due=await drawBanner(at(now-(DEFAULT_WORKSHOP.roleEvery+1)*60000));
 assert.match(due,/role="alert"/);assert.match(textOf(due),/역할을 바꿀 시간이에요/);
 assert.equal(await drawBanner(at(now)),'','nothing is drawn before the swap is due');
});

test('robot-lab style layouts start with one tap that also confirms the safety promises',async()=>{
 const {createElement}=await import('react');
 const {PhysicalActivityLayout}=await import('../src/presentation/components/minigames/common/PhysicalActivityLayout');
 const html=await renderHtml(createElement(PhysicalActivityLayout,{title:'로봇 실험실',emoji:'🤖',domain:'운동',achievementCode:'x',achievementTitle:'x',activityType:'모둠',expectedMinutes:10,
  instructions:['첫 단계'],safetyItems:[{id:'a',text:'주변을 넓게 비워요'}],children:()=>null}));
 const start=html.search(/<button[^>]*>(?:(?!<\/button>).)*시작/),intro=html.indexOf('활동 방법');
 assert.ok(start>0&&start<intro,'the start button sits above the instructions');
 const button=html.slice(start,html.indexOf('</button>',start));
 assert.doesNotMatch(button,/disabled/,'no checkbox gate before starting');
 assert.match(textOf(button),/안전/,'the one tap also confirms the safety promises');
});

test('easy words: signature concepts and the map game read at a grade 1–2 level',async()=>{
 const {SIGNATURE_GAMES}=await import('../src/domain/signatureGames');
 const {easyMapWords,mapBrief}=await import('../src/domain/cooperativeMap');
 for(const g of SIGNATURE_GAMES){
  const shown=[g.concept,g.oneLine,...g.rules,g.reflection,g.nextChallenge,...g.demo.map(d=>d.caption)].join(' ');
  assert.doesNotMatch(shown,/심폐 지구력|민첩성|협응|반응 속도|콤보|커튼콜|까닭/,`${g.id} uses easy words`);
 }
 // 수업방(서버)이 보내는 예전 낱말도 화면에서는 쉬운 말로 바뀐다. 이미 쉬운 말은 그대로다.
 assert.equal(easyMapWords('길 단서는 다른 모둠에게 물어봐요. 운반 약속: 1관문 손바닥 펴기 → 2관문 팔 작게 펼치기. 관문마다 몸짓으로 전해요.'),
  '길 힌트는 다른 모둠에게 물어봐요. 몸짓 약속: 1번 문 손바닥 펴기 → 2번 문 팔 작게 펼치기. 문마다 몸짓으로 알려 줘요.');
 assert.equal(easyMapWords('운반 약속 설계단'),'몸짓 약속 모둠');
 for(const i of [0,1,2]){const b=mapBrief(i,3,4);assert.equal(easyMapWords(b.text),b.text);assert.equal(easyMapWords(b.title),b.title);assert.doesNotMatch(b.title+b.text,/단서|관문|운반|탐사단|설계단|연결단/);}
});
