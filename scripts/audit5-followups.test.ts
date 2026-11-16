import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';
import {FLAGSHIPS} from '../src/domain/flagship';
import {PRIMARY_EXPERIENCES} from '../src/domain/playRecipes';
import {achievementLabel,PENDING_CURRICULUM_CODE} from '../src/domain/curriculumCode';
import {continuationName} from '../src/domain/activityShelves';
import {lessonPresets} from '../src/domain/lessonPresets';
import type {GameRoom,MissionTemplate} from '../src/domain/types';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const live=new Set(AVAILABLE_GAMES.map(g=>g.type));

test('the cooldown routine never asks children to hold their breath, press the neck or enter a pulse number',()=>{
 const source=read('src/presentation/components/CooldownTimerModal.tsx');
 assert.doesNotMatch(source,/숨 멈추기|경동맥|부교감|부상을 방지|counter: 7|counter: 8/);
 assert.doesNotMatch(source,/\brequired\b/,'the pulse count is optional');
 assert.match(source,/목은 누르지 않아요/);assert.match(source,/숨은 참지 않아요/);
});

test('the class TV no longer fires a surprise plank and the stop screen is not a disaster alarm',()=>{
 for(const path of ['src/presentation/ScoreBoard.tsx','src/presentation/MobileMissionView.tsx','src/presentation/TeacherRemote.tsx','src/presentation/AdminControlPanel.tsx'])
  assert.doesNotMatch(read(path),/플랭크 실시|해일 경보|대피하십시오|지진·해일/,path);
});

test('two-player battles count a body move, not rapid tapping',()=>{
 const source=read('src/presentation/components/SplitBattleGame.tsx');
 assert.doesNotMatch(source,/연타해서|폭풍 연타|\/ 25/);
 assert.match(source,/MOVE_LOCK_MS/);
});

test('teacher panels only open activities that are still in use',()=>{
 const admin=read('src/presentation/AdminControlPanel.tsx');
 const ids=[...admin.matchAll(/active_minigame: \{ type: '([^']+)'/g)].map(m=>m[1]).filter(id=>!['quiz','bomb','team_battle'].includes(id));
 assert(ids.length>5);for(const id of ids)assert(live.has(id),id);
 assert.doesNotMatch(admin,/텔레파시|운빨/);
 const roulette=read('src/presentation/components/WarmupRoulette.tsx');
 const sections=[...roulette.matchAll(/type: '([^']+)'/g)].map(m=>m[1]);
 assert.equal(sections.length,20);for(const id of sections)assert(live.has(id),id);
});

test('placeholder curriculum codes are shown as a learning goal, real codes stay',()=>{
 assert.equal(achievementLabel(PENDING_CURRICULUM_CODE),'학습 목표');assert.equal(achievementLabel('[4체02-06]'),'[4체02-06]');
});

test('the flagship pages agree on time and equipment',()=>{
 for(const e of PRIMARY_EXPERIENCES){const f=FLAGSHIPS.find(x=>x.id===e.game)!;assert.equal(e.minutes,f.minutes);assert.equal(e.equipment,f.device);}
 assert.match(FLAGSHIPS.find(f=>f.id==='expedition-boss')!.device,/2대/);
});

test('records and past lessons tell cleaned activities apart from long-retired games',()=>{
 assert.equal(continuationName('reaction'),null,'a merged course keeps its own name');
 assert.equal(continuationName('expedition-ship'),'움직이는 비밀지도');
 const make=(gameType:string)=>{const template={id:'t',name:gameType,buttons:[{id:'m',title:'x',desc:'',amount:10,cooldown:0,iconName:'Flag',color:'',bg:'',requires_approval:true,gameType}]} as MissionTemplate;const room={id:'r',template_id:'t',name:gameType,status:'finished',global_time_modifier:2100,setup_minutes:30,goal_percent:75} as GameRoom;return lessonPresets([room],[template],[{room_id:'r'}]);};
 assert.equal(make('scream').length,0,'a long-retired game does not come back as an activity the teacher never used');
 assert.equal(make('expedition-ship')[0]?.game.type,'expedition-map');
});

test('badges can all be earned and spoken sentences use the right particle',()=>{
 assert.doesNotMatch(read('src/presentation/components/BadgeArchiveModal.tsx'),/brave/);
 assert.doesNotMatch(read('src/presentation/GameHub.tsx'),/'brave'/);
 assert.doesNotMatch(read('src/domain/lessonPlan.ts'),/은\(는\)|을\(를\)|이\(가\)/);
 assert.doesNotMatch(read('src/presentation/components/ClassPlaylistPlayer.tsx'),/title}을 시작/);
 assert.doesNotMatch(read('src/presentation/components/QuickPinClassroom.tsx'),/AI 수업 준비실/);
});
