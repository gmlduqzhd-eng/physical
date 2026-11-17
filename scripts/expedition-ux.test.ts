import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EXPEDITION_GAMES} from '../src/domain/expeditionGames';
import {createExpeditionRound,expeditionRuleCard,SOLO_ROLE,stepHeadline} from '../src/domain/expeditionRules';
import {EXPEDITION_EXPRESSIONS} from '../src/presentation/components/minigames/expedition/expeditionExpressionData';
import {rhythmStars,starText} from '../src/domain/expeditionGuidance';
import {BOSS_ROUTES,DEFAULT_WORKSHOP} from '../src/domain/expeditionWorkshop';
import {withParticle} from '../src/domain/koreanParticle';
import {isAvailableGame} from '../src/domain/gameLifecycle';

const live=EXPEDITION_GAMES.filter(g=>isAvailableGame(g.id));
const liveB=live.filter(g=>g.kind==='B'),liveA=live.filter(g=>g.kind==='A');
const rounds=(g:typeof liveB[number])=>Array.from({length:g.rounds},(_,r)=>createExpeditionRound(g,r,g.players,()=>.37));

test('step titles say what to do instead of "구간 N"',()=>{
 for(const g of liveB)for(const plan of rounds(g))for(const step of plan.steps){
  assert.doesNotMatch(step.title,/^구간 \d+$/,`${g.id}: ${step.instruction}`);
  assert(step.title.length>=2,`${g.id} has a real title`);
 }
 assert.equal(stepHeadline('표식을 다녀와요: 빨강 ●'),'빨강 ●');
 assert.equal(stepHeadline('이번 규칙: 글자의 뜻. 한 사람씩 다녀와요.'),'글자의 뜻');
 assert.equal(stepHeadline('기억한 순서대로 표식을 다녀와요. 기기는 내려놓아요.'),'기억한 순서대로 표식을 다녀와요');
 // 진행 칸은 '1번째 원정' 대신 라운드 번호와(짧으면) 첫 지시를 함께 보여 준다.
 for(const g of liveB)for(const [i,plan] of rounds(g).entries())assert.match(plan.title,/라운드|번 방|보물상자/,`${g.id} round ${i}`);
});

test('the prep card splits the description into what to do and what success looks like',()=>{
 for(const g of liveB){const card=expeditionRuleCard(g.desc);assert(card.what.length>5&&!card.what.includes('성공:'),g.id);assert(card.success.length>3,g.id);}
 assert.deepEqual(expeditionRuleCard('걸어요. 성공: 세 번 했어요.'),{what:'걸어요.',success:'세 번 했어요.'});
});

test('expression expeditions read as "~해요", without spec notes, and give a tip per step',()=>{
 assert.equal(liveA.length,13);
 for(const g of liveA){
  assert.doesNotMatch(g.desc,/한다\.|않는다\.|만든다\.|완성한다|비교한다|수행한다/,`${g.id}: ${g.desc}`);
  assert.doesNotMatch(g.desc,/자동 기억력 검사|복기/,g.id);
  for(const s of g.expressionSteps!)assert.doesNotMatch(s.guide+s.title,/복기|공정/,`${g.id} ${s.title}`);
 }
 for(const data of EXPEDITION_EXPRESSIONS.filter(d=>liveA.some(g=>g.id===d.id))){
  const game=liveA.find(g=>g.id===data.id)!;
  const tips=data.steps.map(s=>s.actionTip);
  assert(tips.every(t=>t&&t!==game.alternative),`${data.id} tips are about the step, not the substitute move`);
  assert(!tips.join().includes('도구 이동을 도와'),data.id);
 }
 const mirror=liveA.find(g=>g.id==='exp-phone-49')!;
 assert.equal(mirror.players,2);assert.match(mirror.expressionSteps!.map(s=>s.guide).join(' '),/짝/);
 assert.equal(EXPEDITION_EXPRESSIONS.find(d=>d.id==='exp-phone-49')!.playMode,'협동');
 assert.equal(liveA.find(g=>g.id==='exp-tablet-17')!.expressionSteps!.reduce((n,s)=>n+s.seconds,0),150,'four people get time to show their name steps');
});

test('co-op and partner expeditions give everyone a real role',()=>{
 for(const g of liveB.filter(g=>g.players>1))for(const plan of rounds(g)){
  assert.equal(plan.roles.length,g.players,g.id);
  for(const role of plan.roles)assert(!role.includes(SOLO_ROLE)&&!role.includes('개인 통로에서 수행'),`${g.id}: ${role}`);
 }
});

test('turn-taking group steps are long enough to finish',()=>{
 for(const g of liveB.filter(g=>g.players>1))for(const plan of rounds(g))for(const step of plan.steps)if(!step.beats)assert(step.seconds>=15,`${g.id} ${step.title} ${step.seconds}s`);
 const turns=liveB.find(g=>g.id==='exp-tablet-07')!;assert(rounds(turns)[0].steps[0].seconds>=40);
});

test('similar expeditions are told apart by name',()=>{
 const name=(id:string)=>EXPEDITION_GAMES.find(g=>g.id===id)!.name;
 for(const [a,b] of [['exp-phone-45','exp-phone-42'],['exp-tablet-13','exp-tablet-15'],['exp-phone-41','exp-tablet-16'],['exp-phone-36','exp-tablet-26'],['exp-phone-07','exp-tablet-35']]){
  assert.notEqual(name(a),name(b));assert.notEqual(name(a).split(' ')[0],name(b).split(' ')[0],`${a}/${b}`);
 }
});

test('particles and plain words on the expedition screens',()=>{
 assert.deepEqual(['숲','강','탑'].map(w=>withParticle(w,'으로')),['숲으로','강으로','탑으로']);
 const map=readFileSync('src/presentation/flagship/CooperativeMapGame.tsx','utf8');
 assert.match(map,/withParticle\(STATION_NAMES\[station\],'으로'\)/);assert.doesNotMatch(map,/\}로 함께 이동/);
 const activity=readFileSync('src/presentation/components/minigames/expedition/ExpeditionActivity.tsx','utf8');
 assert.doesNotMatch(activity,/전원 참여'\}과|참여과|수행 신고|거치/);
 assert.doesNotMatch(readFileSync('src/presentation/flagship/WorkshopPanels.tsx','utf8'),/\}을 정해요|거치/);
 const loop=readFileSync('src/presentation/flagship/LoopGame.tsx','utf8');
 assert.doesNotMatch(loop,/BPM|% 이상이면 다음 관문에 기여/);
 assert.equal(rhythmStars(49,50),1);assert.equal(rhythmStars(50,50),2);assert.equal(rhythmStars(92,50),3);assert.equal(rhythmStars(10,50),0);assert.equal(starText(0),'☆');
 for(const g of liveB)for(const plan of rounds(g))for(const step of plan.steps)assert.doesNotMatch(step.instruction,/거치|수행해요\. 기기는/,g.id);
});

test('the active screen puts the instruction first and practice is only for the gentle mode',()=>{
 const activity=readFileSync('src/presentation/components/minigames/expedition/ExpeditionActivity.tsx','utf8');
 const active=activity.slice(activity.indexOf("{phase==='active'&&<>"));
 assert(active.indexOf('expedition-now')<active.indexOf('expedition-board'),'instruction before the board');
 assert(activity.indexOf("expedition-now")<activity.indexOf('className="expedition-roles"'),'roles are below the instruction');
 assert.doesNotMatch(activity,/className="expedition-roles" open=/,'roles stay folded');
 assert.match(activity,/if\(revamped&&gentle\)\{setPracticePlan/);
 assert(activity.indexOf('expedition-rules')<activity.indexOf('<ExpeditionDemo'),'rule card first');
 assert(activity.indexOf('>원정 시작</button>')<activity.indexOf('<ExpeditionDemo'),'start button before the demo');
});

test('the boss starts on a route that needs no sensor devices',()=>{
 assert.equal(DEFAULT_WORKSHOP.route,'rescue');
 assert(!(BOSS_ROUTES[DEFAULT_WORKSHOP.route] as readonly string[]).includes('expedition-ship'));
 const flagship=readFileSync('src/presentation/flagship/FlagshipActivity.tsx','utf8');
 assert.match(flagship,/\{!embedded&&<header className="flagship-title">/);
 assert.match(flagship,/game!=='expedition-boss'&&<StudentActionCue/);
});
