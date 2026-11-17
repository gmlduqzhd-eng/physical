import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EMPTY_PROGRESS,MAP_TILES,addPlay,archiveCandidates,classBadges,currentVote,featuredCandidates,mapView,newBadges,parseProgress,reactionRows,setVote,weekCompare,weekStart,type ClassProgress} from '../src/domain/classProgress';

const base=new Date(2026,10,18,10).getTime(); // 2026-11-18(수) 10시
const DAY=86_400_000;
const play=(p:ClassProgress,id:string,at:number)=>addPlay(p,id,at);

test('a vote belongs to the latest play: voting again replaces it, a new play starts a new vote',()=>{
 let p=play(EMPTY_PROGRESS,'jump',base);
 p=setVote(p,'jump','down',base+1);p=setVote(p,'jump','up',base+2);
 assert.equal(currentVote(p,'jump'),'up');assert.equal(p.votes.length,1);
 p=play(p,'jump',base+10);
 assert.equal(currentVote(p,'jump'),null,'a new play has no vote yet');
 p=setVote(p,'jump','up',base+11);
 const [row]=reactionRows(p);
 assert.deepEqual([row.id,row.plays,row.up,row.down,row.ratio],['jump',2,2,0,1]);
});

test('archive and featured candidates need enough plays and a clear ratio',()=>{
 let p=EMPTY_PROGRESS;
 for(let i=0;i<3;i++){p=play(p,'weak',base+i*10);p=setVote(p,'weak',i===0?'up':'down',base+i*10+1);}
 for(let i=0;i<3;i++){p=play(p,'loved',base+100+i*10);p=setVote(p,'loved','up',base+100+i*10+1);}
 for(let i=0;i<2;i++){p=play(p,'fewplays',base+200+i*10);p=setVote(p,'fewplays','down',base+200+i*10+1);}
 const rows=reactionRows(p),featured=(id:string)=>id==='weak'||id==='fewplays';
 assert.deepEqual(archiveCandidates(rows,featured).map(r=>r.id),['weak']);
 assert.deepEqual(featuredCandidates(rows,featured).map(r=>r.id),['loved']);
});

test('the map opens one tile per play, wraps into laps, and names the next region',()=>{
 let p=EMPTY_PROGRESS;
 assert.equal(mapView(p).opened,0);assert.equal(mapView(p).nextRegion?.name,'숲속 길');
 for(let i=0;i<7;i++)p=play(p,'g'+(i%3),base+i);
 const m=mapView(p);
 assert.equal(m.opened,7);assert.equal(m.tiles.filter(t=>t.open).length,7);assert.equal(m.current.name,'숲속 길');assert.equal(m.nextRegion?.name,'시냇물 다리');
 for(let i=0;i<MAP_TILES;i++)p=play(p,'g',base+100+i);
 assert.equal(mapView(p).lap,2);assert.equal(mapView(p).opened,7);
});

test('week comparison counts Monday-to-now against the week before',()=>{
 assert.equal(new Date(weekStart(base)).getDay(),1);
 let p=EMPTY_PROGRESS;
 p=play(p,'a',base-7*DAY);p=play(p,'a',base-6*DAY);
 p=play(p,'a',base-DAY);p=play(p,'a',base-1000);p=play(p,'a',base);
 const w=weekCompare(p,base);
 assert.equal(w.thisWeek,3);assert.equal(w.lastWeek,2);assert.equal(w.line,'지난주보다 1판 더 했어요!');
 assert.equal(weekCompare(EMPTY_PROGRESS,base).line,'이번 주 첫 판을 시작해요!');
});

test('badges come at milestones, and only new ones are announced',()=>{
 let p=EMPTY_PROGRESS;
 const before=p;p=play(p,'a',base);
 assert.deepEqual(newBadges(before,p).map(b=>b.id),['plays-1']);
 for(let i=0;i<4;i++)p=play(p,'g'+i,base+i+1);
 const b=classBadges(p);
 assert.ok(b.find(x=>x.id==='plays-5')!.earned);assert.ok(b.find(x=>x.id==='variety-5')!.earned);assert.ok(!b.find(x=>x.id==='plays-10')!.earned);
});

test('stored data is validated and bounded',()=>{
 assert.deepEqual(parseProgress(null),EMPTY_PROGRESS);
 const p=parseProgress({plays:[{id:'a',at:1},{id:'',at:2},{id:'b',at:'x'},null],votes:[{id:'a',at:3,vote:'up'},{id:'a',at:4,vote:'meh'}]});
 assert.deepEqual(p.plays,[{id:'a',at:1}]);assert.deepEqual(p.votes,[{id:'a',at:3,vote:'up'}]);
 let big=EMPTY_PROGRESS;for(let i=0;i<2100;i++)big=play(big,'x',base+i);
 assert.equal(big.plays.length,2000);
});

test('every finished game passes the shared result screen: plays are counted there and the slot is shown',()=>{
 const page=readFileSync('src/presentation/GamePlayPage.tsx','utf8');
 assert.match(page,/setGameFinished\(true\);\n\s*if\(gameType\)recordPlay\(gameType\);/);
 assert.match(page,/<ClassFeedbackSlot gameId=\{gameType\}\/>/);
 const sig=readFileSync('src/presentation/components/minigames/signature/SignaturePlay.tsx','utf8');
 assert.match(sig,/afterRecord=\{<ClassFeedbackSlot gameId=\{game\.id\}\/>\}/);
 // 리모컨은 판(round)보다 오래 사는 바깥 막대에 있다(결과·'한 판 더'에도 연결 유지).
 assert.match(sig,/<RemoteLink bus=\{bus\} initialCode=\{room\}/);
 const app=readFileSync('src/App.tsx','utf8');
 assert.match(app,/path="\/class-progress"/);assert.match(app,/path="\/fun-remote"/);
});
