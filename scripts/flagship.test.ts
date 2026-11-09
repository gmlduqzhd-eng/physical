import test from 'node:test';
import assert from 'node:assert/strict';
import {FLAGSHIP_IDS,FLAGSHIP_GAMES,FLAGSHIP_LESSONS,mapOrder,groupClue,initialShip,shipStep,SHIP_TARGETS,rhythmScore,LOOP_PATTERNS,rescueHit,armInput,shadowDistance} from '../src/domain/flagship';
test('all six expeditions have distinct catalog/lesson routes and explicit equipment and safety',()=>{
 assert.equal(new Set(FLAGSHIP_IDS).size,6);assert.equal(FLAGSHIP_GAMES.length,6);assert.equal(FLAGSHIP_LESSONS.length,6);
 for(const g of FLAGSHIP_GAMES){const l=FLAGSHIP_LESSONS.find(v=>v.id===g.type)!;assert(l.route.endsWith(g.type));assert(g.equipment!.length);assert(g.safetyTips!.length>=3);assert.equal(g.achievement.code,'연계 확인 필요');}
});
test('distributed map clues reconstruct a changing path without random success',()=>{for(let seed=0;seed<20;seed++){const path=mapOrder(seed);assert.equal(new Set(path).size,3);assert.notDeepEqual(path,mapOrder(seed+1));assert(groupClue(0,seed).includes('첫'));assert(groupClue(1,seed).includes('마지막'));assert(groupClue(2,seed).includes('가운데'));}});
test('two-axis steering reaches all docks with controlled deceleration and bounded physics',()=>{
 let s=initialShip();let ticks=0;
 for(;ticks<4000&&s.checkpoint<3;ticks++){const t=SHIP_TARGETS[s.checkpoint],x=Math.max(-1,Math.min(1,(t.x-s.x)*.12-s.vx*.3)),y=Math.max(-1,Math.min(1,(t.y-s.y)*.12-s.vy*.3));s=shipStep(s,x,y,100);assert(s.x>=5&&s.x<=95&&s.y>=5&&s.y<=95);}
 assert.equal(s.checkpoint,3);assert(ticks>20);let fast=initialShip();for(let i=0;i<200;i++)fast=shipStep(fast,1,1,100000);assert(fast.bumps>0);assert(fast.x<=95&&fast.y<=95);
});
test('rhythm evaluation penalizes extra taps, matches nearest beats only once and rejects invalid times',()=>{
 const pattern=LOOP_PATTERNS[0],perfect=[0,1200,2400,3600];assert.equal(rhythmScore(perfect,pattern).accuracy,100);assert(rhythmScore([...perfect,20,30],pattern).accuracy<100);assert.equal(rhythmScore([NaN,Infinity,-10,9000],pattern).hits,0);assert.equal(rhythmScore([400,1600,2800,4000],pattern).hits,0);
});
test('every rescue target is reachable while wind and angle alter the outcome',()=>{for(let round=0;round<3;round++){let solutions=0,failures=0;for(let angle=15;angle<=80;angle+=5)for(let p=15;p<90;p+=2){if(rescueHit(angle,p,round))solutions++;else failures++;}assert(solutions>0);assert(failures>solutions);}assert.equal(rescueHit(NaN,30,0),false);});
test('local pose inputs require visible landmarks and remain bounded; shadow mirror changes matching',()=>{
 const p=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}));p[16]={x:.8,y:.2,visibility:1};const a=armInput(p)!;assert(a.angle>=15&&a.angle<=80);assert(a.x>=0&&a.x<=1);assert.equal(armInput([]),null);p[16].visibility=.1;assert.equal(armInput(p),null);assert.equal(shadowDistance({x:.2,y:.3},{x:.8,y:.3},true)<1e-8,true);assert(shadowDistance({x:.2,y:.3},{x:.8,y:.3},false)>.5);
});
