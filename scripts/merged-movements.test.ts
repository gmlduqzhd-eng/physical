import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MERGED_MOVEMENT_IDS,mergedMovementMeta,makeMergedMovementRound} from '../src/domain/mergedMovementVariants';
import {MERGED_GAMES,REMOVED_GAMES} from '../src/domain/gameLifecycle';
import {EXPEDITION_BY_ID} from '../src/domain/expeditionGames';
import {EXPRESSION_GAMES} from '../src/presentation/components/minigames/expression/expressionGamesData';
import {questDuration,questResult,questAccurate} from '../src/domain/movementQuests';
import {getPhysicalActivityPlan} from '../src/domain/physicalActivityPlans';
test('all 60 screen variants (55 live + 5 cleaned) have distinct physical plans and all 13 expression variants keep native stages',()=>{
 const legacy=MERGED_GAMES.filter(g=>!EXPEDITION_BY_ID.has(g.id)&&!EXPRESSION_GAMES.some(e=>e.id===g.id));// 2026-11 정리(a406144)에서 화면 변형 5개는 다른 활동으로 바로 이어지는 정리 항목이 됐다. 예전 기록 이름을 위해 변형 정보는 남겨 둔다.
 assert.equal(legacy.length,55);const cleaned=MERGED_MOVEMENT_IDS.filter(id=>!legacy.some(g=>g.id===id));assert.equal(cleaned.length,5);
 for(const id of cleaned)assert(REMOVED_GAMES.find(g=>g.id===id)?.target,id);
 assert.deepEqual(new Set(MERGED_MOVEMENT_IDS),new Set([...legacy.map(g=>g.id),...cleaned]));
 const signatures=new Set();
 for(const id of MERGED_MOVEMENT_IDS){const meta=mergedMovementMeta(id)!;assert(meta.name&&meta.rules.length===3&&meta.equipment?.length&&meta.alternative);if(!cleaned.includes(id))assert.equal(getPhysicalActivityPlan(id).title,meta.name);const plans=[0,1,2].map(r=>makeMergedMovementRound(id,r,{seated:false,gentle:true,practice:true,players:2},'close'));signatures.add(JSON.stringify(plans.map(p=>p.cues)));assert(plans.every(p=>p.cues.length===3&&p.choices.length===2));}
 assert.equal(signatures.size,60);assert.equal(MERGED_GAMES.filter(g=>g.stage===2&&!MERGED_MOVEMENT_IDS.includes(g.id)).length,13);
 for(const entry of MERGED_GAMES.filter(g=>g.stage===2&&!MERGED_MOVEMENT_IDS.includes(g.id))){const e=EXPRESSION_GAMES.find(e=>e.id===entry.id)!;assert(e.steps.length>=3&&e.rubric.length>=2);}
});
test('variants validate their own answers, choices, duration and direct reports at either pace',()=>{
 for(const id of MERGED_MOVEMENT_IDS)for(const seated of [false,true])for(const gentle of [false,true]){
  const s={seated,gentle,practice:true,players:2};const factory=(r:number,config:typeof s,c?:string)=>makeMergedMovementRound(id,r,config,c);
  const records=[0,1,2].map(round=>{const p=factory(round,s,'close');return {round,choice:'close',outcome:'complete' as const,activeMs:questDuration(p),retries:0,answer:p.question?.answer};});
  assert.equal(questResult('fitness',s,records,factory)?.amount,300);
  assert.equal(questResult('fitness',s,[{...records[0],choice:'not-real'},...records.slice(1)],factory),null);
  assert.equal(questResult('fitness',s,[{...records[0],activeMs:0},...records.slice(1)],factory),null);
  const p=factory(0,s);if(p.question)assert(!questAccurate(p,{answer:[],activeMs:questDuration(p)}));
 }
});


test('course provenance survives alongside all ten existing metrics',async()=>{
 const {normalizeGameResultDetails}=await import('../src/domain/gameResultDetails');
 const metrics=Object.fromEntries(Array.from({length:10},(_,i)=>['metric'+i,'value'+i]));
 const course={sourceId:'tilt_balance',targetId:'one_leg',sourceName:'예전 균형',targetName:'균형 등대 지키기',version:1 as const};
 const result=normalizeGameResultDetails({metrics,course})!;assert.deepEqual(result.metrics,metrics);assert.deepEqual(result.course,course);
});
