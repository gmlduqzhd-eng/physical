import test from 'node:test';
import assert from 'node:assert/strict';
import {DEEP_DIVE_IDS,DEEP_TABS,deepDive,hasDeepDive,quizResult,termTopics} from '../src/domain/sportDeepDive';
import {SPORT_BY_ID} from '../src/domain/sportsClassroom';
import {ANGLE_TARGETS,FIELD_METERS,POWERS,bestAngle,clampAngle,flight,flightPath,hitFeedback,isHit} from '../src/domain/angleLab';

test('the volleyball deep dive has terms, rules, six skills, positions and a ten-question quiz with valid answers',()=>{
 assert.deepEqual(DEEP_DIVE_IDS,['volleyball']);assert.equal(DEEP_TABS.length,4);
 for(const id of DEEP_DIVE_IDS)assert(SPORT_BY_ID.has(id),'deep dive belongs to a sport in the classroom');
 assert(hasDeepDive('volleyball')&&!hasDeepDive('archery'));assert.equal(deepDive('archery'),undefined);
 const dive=deepDive('volleyball')!;
 assert.equal(dive.skills.length,6);assert.equal(dive.quiz.length,10);assert(dive.terms.length>=10&&dive.rules.length>=6&&dive.positions.length>=4);
 for(const s of dive.skills)assert(s.steps.length>=3&&s.mistakes.length>=1&&s.drills.length>=1&&s.purpose&&s.preparation,s.id);
 for(const q of dive.quiz){assert(q.choices.length>=2&&q.answer>=0&&q.answer<q.choices.length&&q.explanation.length>5,q.id);assert.equal(new Set(q.choices).size,q.choices.length);}
 assert(new Set(dive.quiz.map(q=>q.answer)).size>2,'answers are spread over positions');assert(termTopics(dive).length>=3);
 const right=dive.quiz.map(q=>q.answer);assert.deepEqual(quizResult(dive,right),{total:10,correct:10,missed:[]});
 assert.deepEqual(quizResult(dive,right.map((a,i)=>i===0?null:i===4?(a+1)%4:a)),{total:10,correct:8,missed:['q1','q5']});
});
test('angle lab: 45 degrees goes farthest, 30 and 60 land together, and every target can be reached',()=>{
 for(const p of POWERS){
  const ranges=Array.from({length:91},(_,a)=>flight(a,p.speed).range);
  assert.equal(ranges[45],Math.max(...ranges),p.id);assert(ranges[45]>ranges[35]&&ranges[45]>ranges[55],p.id);assert.equal(flight(30,p.speed).range,flight(60,p.speed).range);
  assert.equal(flight(0,p.speed).range,0);assert.equal(flight(90,p.speed).range,0);assert(flight(90,p.speed).peak>flight(45,p.speed).peak);
  assert(Math.max(...ranges)<FIELD_METERS,'the ball stays on the drawn field');
 }
 assert.equal(flight(45,14).range,20);assert.equal(clampAngle(120),90);assert.equal(clampAngle(-3),0);assert.equal(clampAngle(NaN),45);
 for(const target of ANGLE_TARGETS)assert(POWERS.some(p=>Array.from({length:91},(_,a)=>a).some(a=>isHit(flight(a,p.speed).range,target))),`${target}m`);
 const path=flightPath(45,11);assert.deepEqual(path[0],[0,0]);assert(Math.abs(path.at(-1)![0]-flight(45,11).range)<0.1&&path.at(-1)![1]<0.01);assert(path.every(([x,y])=>x>=0&&y>=0));
 assert.equal(hitFeedback(9.4,9),'과녁에 맞았어요!');assert.match(hitFeedback(6,9),/3m 못 미쳤어요/);assert.match(hitFeedback(12.5,9),/3.5m 넘어갔어요/);
 assert.equal(bestAngle([],'soft'),null);assert.equal(bestAngle([{angle:30,power:'soft',range:5.7},{angle:45,power:'soft',range:6.5},{angle:45,power:'strong',range:20}],'soft'),45);
});
