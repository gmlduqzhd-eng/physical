import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMPTY_PROGRESS,MAX_NOTE,REASONS,REASON_EXPORT_HEADERS,addPlay,mergeProgress,parseProgress,reasonExportRows,reasonRows,reasonsOf,setReasons,setVote,shareSummary,topProblems,type ClassProgress} from '../src/domain/classProgress';

const base=new Date(2026,10,18,10).getTime();
const name=(id:string)=>({jump:'점프',bingo:'몸 빙고',fox:'여우야'} as Record<string,string>)[id]??id;
/** 한 판: 기록 + 반응 + 이유. */
function round(p:ClassProgress,id:string,n:number,vote:'up'|'down',reasons:Parameters<typeof setReasons>[3],note?:string){
 const play=`${id}-${n}`,at=base+n*1000;
 return setReasons(setVote(addPlay(p,id,at,play),id,vote,at+1,play),id,play,reasons,note,at+2);
}

test('version 1 records are migrated: plays and votes kept, reasons start empty',()=>{
 const v1={version:1,plays:[{id:'jump',at:base,play:'p1'}],votes:[{id:'jump',at:base+1,vote:'up',play:'p1'}]};
 const p=parseProgress(v1);
 assert.equal(p.version,2);
 assert.deepEqual(p.plays,[{id:'jump',at:base,play:'p1'}]);
 assert.equal(p.votes.length,1);
 assert.deepEqual(p.reasons,[]);
});

test('stored reasons are validated: unknown reasons, control characters and overlong notes are cleaned',()=>{
 const raw={version:2,plays:[],votes:[],reasons:[
  {id:'jump',at:base,play:'p1',reasons:['hard','hard','nope','loved'],note:'  너무\n빨라요\u0007  '},
  {id:'jump',at:base,play:'p2',reasons:[],note:''},
  {id:'jump',at:base,reasons:['hard']},
  {id:'jump',at:base,play:'p3',reasons:['long'],note:'가'.repeat(200)},
 ]};
 const p=parseProgress(raw);
 assert.equal(p.reasons.length,2,'empty entries and entries without a play id are dropped');
 assert.deepEqual(p.reasons[0].reasons,['hard','loved']);
 assert.equal(p.reasons[0].note,'너무 빨라요');
 assert.equal(p.reasons[1].note?.length,MAX_NOTE);
});

test('reasons attach to one play; choosing again replaces, clearing removes, and another play stays separate',()=>{
 let p=addPlay(EMPTY_PROGRESS,'jump',base,'a');
 p=setReasons(p,'jump','a',['hard'],undefined,base+1);
 p=setReasons(p,'jump','a',['hard','long'],'메모',base+2);
 assert.equal(p.reasons.length,1);
 assert.deepEqual(reasonsOf(p,'a')?.reasons,['hard','long']);
 p=setReasons(p,'jump','b',['loved'],undefined,base+3);
 assert.equal(p.reasons.length,2);
 p=setReasons(p,'jump','a',[],'',base+4);
 assert.equal(reasonsOf(p,'a'),null);
 assert.deepEqual(reasonsOf(p,'b')?.reasons,['loved']);
});

test('aggregation counts reasons per game, keeps the latest notes and turns repeated reasons into a hint',()=>{
 let p=EMPTY_PROGRESS;
 p=round(p,'bingo',1,'down',['confusing'],'칸 고르는 법을 몰라요');
 p=round(p,'bingo',2,'down',['confusing','long']);
 p=round(p,'bingo',3,'up',['loved'],'두 번째는 잘했어요');
 p=round(p,'jump',4,'up',['loved']);
 p=round(p,'jump',5,'up',['loved','easy']);
 const rows=reasonRows(p),bingo=rows.find(r=>r.id==='bingo')!,jump=rows.find(r=>r.id==='jump')!;
 assert.equal(bingo.counts.confusing,2);assert.equal(bingo.counts.long,1);assert.equal(bingo.answered,3);
 assert.equal(bingo.plays,3);assert.equal(bingo.up,1);assert.equal(bingo.down,2);
 assert.deepEqual(bingo.notes.map(n=>n.note),['두 번째는 잘했어요','칸 고르는 법을 몰라요'],'newest first');
 assert.match(bingo.hint??'',/안내 보강/,'many 헷갈렸어요 → fix the guide, not archive');
 assert.match(jump.hint??'',/좋아했어요/);
 const top=topProblems(p);
 assert.deepEqual(top.map(t=>t.reason),['confusing']);
 assert.deepEqual(top[0].games,[{id:'bingo',count:2}]);
});

test('export rows line up with the headers and the share summary names problems and notes',()=>{
 let p=EMPTY_PROGRESS;
 p=round(p,'bingo',1,'down',['confusing'],'헷갈려했어요');
 p=round(p,'bingo',2,'down',['confusing']);
 const rows=reasonExportRows(p,name);
 assert.equal(rows.length,1);
 assert.equal(rows[0].length,REASON_EXPORT_HEADERS.length);
 assert.equal(rows[0][0],'몸 빙고');
 assert.equal(rows[0][REASON_EXPORT_HEADERS.indexOf('헷갈렸어요')],2);
 assert.equal(rows[0][REASON_EXPORT_HEADERS.length-1],'헷갈려했어요');
 const text=shareSummary(p,name,new Date(base));
 assert.match(text,/헷갈렸어요: 몸 빙고\(2\)/);
 assert.match(text,/최근 메모[\s\S]*몸 빙고: 헷갈려했어요/);
 assert.doesNotMatch(text,/undefined|NaN/);
 assert.match(shareSummary(EMPTY_PROGRESS,name,new Date(base)),/아직 기록이 없어요/);
});

test('merging tabs keeps the later reason for the same play and every other play',()=>{
 const a=setReasons(EMPTY_PROGRESS,'jump','p1',['hard'],undefined,base+1);
 const b=setReasons(setReasons(EMPTY_PROGRESS,'jump','p1',['long'],undefined,base+5),'fox','p2',['loved'],undefined,base+6);
 const m=mergeProgress(a,b);
 assert.equal(m.reasons.length,2);
 assert.deepEqual(reasonsOf(m,'p1')?.reasons,['long']);
});

test('the feedback slot offers every reason as an optional chip and a capped one-line note',()=>{
 const slot=readFileSync('src/presentation/components/ClassFeedbackSlot.tsx','utf8');
 assert.match(slot,/REASONS\.map/);
 assert.match(slot,/maxLength=\{MAX_NOTE\}/);
 assert.match(slot,/골라도 되고 안 골라도 돼요/);
 assert.equal(REASONS.length,6);
 const page=readFileSync('src/presentation/ClassProgressPage.tsx','utf8');
 assert.match(page,/공유용 요약 복사/);
 assert.match(page,/tab:'reasons'/);
});
