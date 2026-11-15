import test from 'node:test';
import assert from 'node:assert/strict';
import {CROWD_DRILLS,CROWD_GOALS,CROWD_GRADES,CROWD_PROMISES,CROWD_SOURCE,CROWD_STEPS,CROWD_THEMES,CROWD_WHY,crowdCheckResult,crowdChecks,crowdDecisions,crowdTheme,isCrowdGrade} from '../src/domain/crowdSafety';

test('six crowd-safety goals each have a check for every grade band, a drill, a reason and a promise',()=>{
 assert.equal(CROWD_GOALS.length,6);assert.equal(CROWD_DRILLS.length,6);assert.equal(CROWD_PROMISES.length,6);assert.equal(CROWD_STEPS.length,4);
 assert.deepEqual(CROWD_DRILLS.map(d=>d.goal),CROWD_GOALS.map(g=>g.id));
 for(const g of CROWD_GOALS){assert(CROWD_WHY[g.id as keyof typeof CROWD_WHY]);for(const grade of CROWD_GRADES){const c=g.checks[grade.id];assert(c.question.length>5&&c.options.length===2&&c.answer>=0&&c.answer<2,g.id+grade.id);}}
 assert(CROWD_SOURCE.url.startsWith('https://')&&CROWD_SOURCE.checked);
 assert(isCrowdGrade('3-4')&&!isCrowdGrade('7-8')&&!isCrowdGrade(null));
});
test('every theme and grade band gives decision cards with exactly one safe choice, in mixed order',()=>{
 assert.deepEqual(CROWD_THEMES.map(t=>t.id),['halloween','school','field','trip','sports','local']);
 assert.equal(crowdTheme('nope').id,'halloween');
 for(const theme of CROWD_THEMES)for(const grade of CROWD_GRADES){
  const cards=crowdDecisions(theme.id,grade.id);
  assert.equal(cards.length,theme.id==='halloween'?6:3,theme.id);
  for(const c of cards){assert(c.title&&c.situation.length>8,theme.id);assert.equal(c.choices.length,2);assert.equal(c.choices.filter(x=>x.safe).length,1);assert(c.choices.every(x=>x.text.length>4&&x.feedback.length>8));assert(c.goal in CROWD_WHY);}
  assert(new Set(cards.map(c=>c.choices[0].safe)).size===2,`${theme.id} keeps the safe choice in mixed positions`);
 }
 assert.notEqual(crowdDecisions('halloween','1-2')[0].situation,crowdDecisions('halloween','5-6')[0].situation);
});
test('the check counts right answers and names the goals to look at again',()=>{
 for(const grade of CROWD_GRADES){
  const checks=crowdChecks(grade.id),right=checks.map(c=>c.answer);assert.equal(new Set(right).size,2,'answers are not all in the same position');
  assert.deepEqual(crowdCheckResult(grade.id,right),{total:6,correct:6,missed:[]});
  const wrong=[...right];wrong[2]=1-wrong[2];wrong[5]=null as never;
  assert.deepEqual(crowdCheckResult(grade.id,wrong),{total:6,correct:4,missed:['warning','fallen']});
 }
});
