import test from 'node:test';
import assert from 'node:assert/strict';
import {JOURNEY_ISLANDS,JOURNEY_KINDS,JOURNEY_TOTAL,STAMPS_PER_ISLAND,addStamp,islandStamps,isJourneyKind,journeyProgress,kindCounts,localDate,parseJourney,undoStamp,type JourneyStamp} from '../src/domain/classJourney';

test('the journey crosses seven islands, four stamps each, and stops when the map is full',()=>{
 assert.equal(JOURNEY_ISLANDS.length,7);assert.equal(JOURNEY_TOTAL,28);assert.equal(new Set(JOURNEY_ISLANDS.map(i=>i.id)).size,7);
 for(const i of JOURNEY_ISLANDS)assert(i.name&&i.value.length>5&&i.quest.length>8);
 let stamps:JourneyStamp[]=[];
 assert.deepEqual(journeyProgress(stamps),{total:0,arrived:0,sailingTo:0,stepsToNext:4,finished:false,justArrived:null});
 for(let n=1;n<=JOURNEY_TOTAL;n++){
  stamps=addStamp(stamps,JOURNEY_KINDS[n%JOURNEY_KINDS.length].id,'2026-11-15');const p=journeyProgress(stamps);
  assert.equal(p.total,n);assert.equal(p.arrived,Math.floor(n/STAMPS_PER_ISLAND));
  assert.equal(p.justArrived?.id,n%STAMPS_PER_ISLAND===0?JOURNEY_ISLANDS[n/STAMPS_PER_ISLAND-1].id:undefined);
  assert.equal(p.finished,n===JOURNEY_TOTAL);if(!p.finished)assert(p.stepsToNext>=1&&p.stepsToNext<=4&&p.sailingTo===p.arrived);
 }
 assert.equal(journeyProgress(stamps).sailingTo,null);assert.equal(addStamp(stamps,'play').length,JOURNEY_TOTAL);
 assert.equal(islandStamps(stamps,6).length,4);assert.equal(islandStamps(stamps.slice(0,5),1).length,1);
 assert.equal(undoStamp(stamps).length,27);assert.deepEqual(undoStamp([]),[]);
 assert.equal(kindCounts(stamps).reduce((a,k)=>a+k.count,0),28);
});
test('stored journeys are filtered: unknown kinds, bad dates and extra stamps are dropped',()=>{
 assert.deepEqual(parseJourney(null),[]);assert.deepEqual(parseJourney({}),[]);
 assert.deepEqual(parseJourney([{kind:'sports',date:'2026-11-15',name:'홍길동'},{kind:'hack',date:'2026-11-15'},{kind:'play',date:'어제'},null,'x']),[{kind:'sports',date:'2026-11-15'}]);
 assert.equal(parseJourney(Array(40).fill({kind:'play',date:'2026-01-02'})).length,JOURNEY_TOTAL);
 assert(isJourneyKind('safety')&&!isJourneyKind('x')&&!isJourneyKind(3));
 assert.equal(localDate(new Date(2026,0,5)),'2026-01-05');
});
test('arrival missions do not ask a whole group to balance on one leg while linked together',()=>{
 for(const i of JOURNEY_ISLANDS)assert.doesNotMatch(i.quest,/어깨동무.*한 발|한 발.*어깨동무/,i.id);
});
