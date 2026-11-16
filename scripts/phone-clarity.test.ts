import test from 'node:test';
import assert from 'node:assert/strict';
import {PHONE_PLAYS,PHONE_PLAY_BY_ID,phoneSequence,phoneSetup,phoneGrades} from '../src/domain/phonePlayCatalog';
import {PHONE_PLAY_CLARITY} from '../src/domain/phonePlayClarity';
import {classRoundView,classPhaseMs} from '../src/domain/phoneClassMode';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {isAvailableGame} from '../src/domain/gameLifecycle';

const play=(n:number)=>PHONE_PLAY_BY_ID.get(`phone-play-${String(n).padStart(3,'0')}`)!;
test('every clarity entry belongs to a play that is still offered, and per-task cues have three tasks',()=>{
 for(const [id,c] of Object.entries(PHONE_PLAY_CLARITY)){assert(isAvailableGame(id),id);if(c.roundCues)assert(c.roundCues.length===3&&c.roundCues.every(r=>r.length>0),id);}
});
test('cues show the signal, not the answer, and each task gets its own signals',()=>{
 for(let r=0;r<3;r++)assert(!phoneSequence(play(1),r).some(c=>/움직이지 않기|대기,/.test(c)),'예외 신호 never spells out “do not move”');
 assert.deepEqual(phoneSequence(play(20),1),['손 멈춤 발 작게','손 멈춤 발 천천히'],'task 2 is “hands still, feet only”');
 assert(phoneSequence(play(38),0).length===4&&phoneSequence(play(38),0)[3]==='한 박자 쉼','four beats with the rest on the fourth');
 assert(!PHONE_PLAYS.some(p=>p.rules.some(r=>r.includes('완전히 돌아선'))),'no turning around in a crowded classroom');
 assert(!play(17).rounds.concat(play(17).rules).some(t=>/반대쪽 팔|반대 방향/.test(t)),'partner game uses heights, not mirrored left and right');
});
test('plays whose order is the point keep their order; only signal and memory plays rotate',()=>{
 for(const p of PHONE_PLAYS.filter(p=>!p.roundCues&&!['signal','memory'].includes(p.kind)))assert.deepEqual(phoneSequence(p,1),phoneSequence(p,0),p.id);
 const rotating=PHONE_PLAYS.find(p=>p.kind==='signal'&&!p.roundCues&&p.cues.length>2)!;assert.notDeepEqual(phoneSequence(rotating,1),phoneSequence(rotating,0));
});
test('the TV shows the task the voice reads, keeps memory orders on the easy level and lists decision choices',()=>{
 for(const p of PHONE_PLAYS.filter(p=>p.kind!=='memory'))for(let r=0;r<3;r++)assert.equal(classRoundView(p,r,'기본 방법',false).brief,p.rounds[r],p.id);
 const memory=PHONE_PLAYS.find(p=>p.kind==='memory'&&p.id!=='phone-play-006'&&p.id!=='phone-play-003')!;
 assert(classRoundView(memory,0,'쉬운 방법',false).cues.some(c=>c.startsWith('순서: ')));
 for(const p of PHONE_PLAYS.filter(p=>p.kind==='decision')){const v=classRoundView(p,0,'기본 방법',false);assert.deepEqual(v.choices,p.options??[],p.id);assert(v.choices.length>=2,p.id);}
 assert(classPhaseMs('brief',45,true)>classPhaseMs('brief',45,false));
});
test('grade labels and space notes tell the truth',()=>{
 for(const n of [11,15,17,19,24,28,37,44,77,90]){const p=play(n);assert.deepEqual(phoneGrades(p),['3~4학년군','5~6학년군'],p.id);assert.deepEqual(AVAILABLE_GAMES.find(g=>g.type===p.id)!.grades,['3~4학년군','5~6학년군']);}
 for(const p of PHONE_PLAYS.filter(p=>p.space==='두 걸음'))assert.match(phoneSetup(p),/책상을 밀어/,p.id);
 for(const p of PHONE_PLAYS)assert.doesNotMatch(phoneSetup(p),/가구/);
});
