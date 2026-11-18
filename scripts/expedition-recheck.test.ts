import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPEDITION_GAMES} from '../src/domain/expeditionGames';
import {createExpeditionRound} from '../src/domain/expeditionRules';
import {BOSS_ROUTES,DEFAULT_WORKSHOP,SERVER_FALLBACK_ROUTE,bossGateNames,settingsOf} from '../src/domain/expeditionWorkshop';
import type {ExpeditionSnapshot} from '../src/domain/flagship';
import {EXPEDITION_EXPRESSIONS} from '../src/presentation/components/minigames/expedition/expeditionExpressionData';
import {stepCue} from '../src/presentation/components/minigames/expression/expressionKidText';

const snapshot=()=>({runId:'r',game:'expedition-boss',seed:0,phase:0,status:'playing',revision:0,serverTime:0,startedAt:0,event:'calm',groups:[],clue:null,owner:true,groupId:null}) as ExpeditionSnapshot;
const sql=readFileSync('supabase/migrations/20261109054736_expedition_workshop.sql','utf8');

test('the client reads a snapshot without settings the same way the server runs it',()=>{
 // 서버 기본 설정(expedition_settings)과 경로를 모를 때의 ELSE 분기(expedition_route)를 SQL에서 그대로 읽는다.
 const serverDefault=JSON.parse(/s:='(\{[^']+\})'::jsonb\|\|coalesce\(input/.exec(sql)![1]) as {route:string};
 const elseRoute=/ELSE ARRAY\[([^\]]+)\] END;/.exec(sql)![1].split(',').map(v=>v.trim().replace(/'/g,''));
 assert.equal(SERVER_FALLBACK_ROUTE,serverDefault.route);
 assert.deepEqual([...BOSS_ROUTES[SERVER_FALLBACK_ROUTE]],elseRoute);
 const legacy=snapshot();
 assert.equal(settingsOf(legacy).route,serverDefault.route,'a snapshot without workshop settings follows the server default');
 const odd=snapshot();odd.workshop={version:1,settings:{...DEFAULT_WORKSHOP,route:'unknown' as never},lessonStep:0,lessonAt:0,observations:{}};
 assert.equal(settingsOf(odd).route,serverDefault.route,'an unknown route falls into the same ELSE branch as the server');
 // 새 원정은 앱이 경로까지 명시해서 보낸다(서버가 'rescue'를 저장한다).
 assert.equal(DEFAULT_WORKSHOP.route,'rescue');
 assert.match(readFileSync('src/presentation/flagship/FlagshipControl.tsx','utf8'),/action\('start',\{settings,mapVersion:2\}\)/);
 assert.match(readFileSync('src/presentation/GuidedClassroom.tsx','utf8'),/settings:\{\.\.\.\(sharedSettings\?\?DEFAULT_WORKSHOP\),packageMinutes\}/);
 assert.deepEqual([...bossGateNames('rescue')],['비밀길 연결','구조 작전','리듬 발전']);
});

test('reverse side-step: the arrow only ever points where students actually move',()=>{
 const g=EXPEDITION_GAMES.find(x=>x.spec==='S03')!;
 for(let r=0;r<g.rounds;r++)for(const seed of [.1,.37,.8]){
  for(const s of createExpeditionRound(g,r,1,()=>seed).steps){
   const called=s.instruction.includes('왼쪽')?'왼쪽':'오른쪽',opposite=called==='왼쪽'?'오른쪽':'왼쪽';
   if(s.title.startsWith('거꾸로!')){
    assert.doesNotMatch(s.title,/[←→]/,'no arrow before thinking: '+s.title);
    assert.ok(s.reveal&&s.reveal.after>=2&&s.reveal.after<s.seconds,'the answer is revealed after a short pause');
    assert.ok(s.reveal!.text.includes(opposite),s.reveal!.text);
    assert.equal(s.reveal!.text.includes('←'),opposite==='왼쪽');
    assert.equal(s.reveal!.text.includes('→'),opposite==='오른쪽');
   }else{
    assert.ok(s.title.includes(called),s.title);
    assert.equal(s.title.includes('←'),called==='왼쪽');
    assert.equal(s.title.includes('→'),called==='오른쪽');
   }
  }
 }
});

test('color-word game shows its rule once; the mirror game starts with the real action',()=>{
 const t06=EXPEDITION_GAMES.find(x=>x.spec==='T06')!;
 for(let r=0;r<t06.rounds;r++){const plan=createExpeditionRound(t06,r,4,()=>.4);assert.ok(plan.wordCue);for(const s of plan.steps)assert.doesNotMatch(s.hint??'',/이번 규칙/);}
 assert.match(readFileSync('src/presentation/components/minigames/expedition/ExpeditionActivity.tsx','utf8'),/plan\.wordCue\?null:<h3/);
 const mirror=EXPEDITION_EXPRESSIONS.find(g=>g.id==='exp-phone-49')!;
 assert.match(stepCue(mirror.steps[0] as {guide:string;title:string}),/거울처럼 똑같이 따라/);
});

test('team roles stay visible while playing; map and boss start from one big button and pin what to do now',async()=>{
 // 지도·보스전 첫 화면을 그려 본다: 큰 시작 버튼 하나가 안전 약속 확인을 겸하고, 따로 체크해야 하는 칸은 없다.
 const {renderHtml,textOf}=await import('./render-for-test');
 const {createElement}=await import('react');
 const {FlagshipActivity}=await import('../src/presentation/flagship/FlagshipActivity');
 for(const game of ['expedition-map','expedition-boss'] as const){
  const html=await renderHtml(createElement(FlagshipActivity,{game,onFinish:()=>{}}));
  const starts=[...html.matchAll(/<button[^>]*>((?:(?!<\/button>).)*)<\/button>/g)].map(m=>m[1]).filter(b=>b.includes('aria-hidden="true">▶'));
  assert.equal(starts.length,1,`${game}: one big start button`);
  assert.match(textOf(starts[0]),/시작 · 안전 약속 확인/,game);
  assert.doesNotMatch(html,/type="checkbox"/,`${game}: no separate safety checkbox gate`);
 }
 // 하는 중 화면(역할 띠·지금 할 일·접힌 안내)은 시작 버튼을 누른 뒤에만 나와 첫 화면 그리기로 닿지 않아 소스로 확인한다.
 const activity=readFileSync('src/presentation/components/minigames/expedition/ExpeditionActivity.tsx','utf8');
 assert.match(activity,/expedition-now-roles/);
 const flagship=readFileSync('src/presentation/flagship/FlagshipActivity.tsx','utf8');
 assert.match(flagship,/className="flagship-now"/);
 assert.match(flagship,/ExpeditionTutorial key="after-start" game=\{game\} collapsed/);
});
