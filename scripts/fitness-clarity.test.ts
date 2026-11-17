import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {QUEST_IDS,QUEST_META,makeQuestRound,type QuestId} from '../src/domain/movementQuests';
import {QUEST_CLARITY} from '../src/domain/questClarity';
import {questCueView,memoryTile,SIGNAL_COLORS} from '../src/domain/questCueView';
import {AVAILABLE_GAMES} from '../src/domain/gamesData';

const read=(p:string)=>readFileSync(p,'utf8');
const settings={seated:false,gentle:true,practice:true,players:3,seed:7};
const LIVE_QUESTS=QUEST_IDS.filter(id=>AVAILABLE_GAMES.some(g=>g.type===id));
const OLD_NAMES=['징검섬 배달부','높낮이 보물 선반','균형 등대 지키기','내가 고르는 운동 원정','신호등 구조 산책','기억의 보급 발자국','몸으로 느끼는 시간길','갈림길 보급 작전','표적 보급 실험실','내 페이스 왕복 우편','몸의 변화 관찰 탐정','내 속도 호흡 쉼터','1분 신호등 반응 챌린지','외발 서기 균형','야구/티볼 주루 판단'];

test('red_green signals carry their traffic-light color, other quests get icons',()=>{
 for(let round=0;round<3;round++)for(const cue of makeQuestRound('red_green',round,settings).cues){
  const view=questCueView('red_green',cue);
  assert.ok(view.color,`${cue} has a color`);
  assert.equal(view.color,cue.startsWith('초록')?SIGNAL_COLORS.green:cue.startsWith('노랑')?SIGNAL_COLORS.yellow:SIGNAL_COLORS.red);
  assert.ok(view.tone);
 }
 for(let round=0;round<3;round++){
  for(const cue of makeQuestRound('jump',round,settings).cues)assert.match(questCueView('jump',cue).badge??'',/^\d번 섬$/);
  for(const cue of makeQuestRound('squat',round,settings).cues)assert.ok(questCueView('squat',cue).icon,cue);
  for(const symbol of makeQuestRound('memory',round,settings).preview!){const tile=memoryTile(symbol);assert.match(tile.icon,/^[●▲■◆]$/);assert.ok(tile.name.length>1);}
 }
 assert.equal(questCueView('zigzag','7번').color,undefined,'games without colored signals stay neutral');
});

test('fitness quests use their own round names and three short rules in easy words',()=>{
 for(const id of LIVE_QUESTS as QuestId[]){
  const titles=[0,1,2].map(r=>makeQuestRound(id,r,settings).title);
  for(const t of titles)assert.doesNotMatch(t,/^(규칙 익히기|방법 바꾸기|연결 도전|첫 시도|방법 조절|비교 도전|준비 살피기|방법 시도|느낌 비교)$/,`${id}: ${t}`);
  assert.equal(QUEST_META[id].rules.length,3,id);
  for(const text of [QUEST_META[id].name,QUEST_META[id].description,...QUEST_META[id].rules])assert.doesNotMatch(text,/복기|거치|심미성|운동 처방/,`${id}: ${text}`);
 }
 for(const [id,c] of Object.entries(QUEST_CLARITY))if(c.rounds)assert.equal(new Set(c.rounds).size,3,id);
});

test('activity names agree everywhere: library, game page, daily routine, type test and station screens',()=>{
 for(const id of LIVE_QUESTS){const g=AVAILABLE_GAMES.find(x=>x.type===id)!;assert.equal(g.name,QUEST_META[id as QuestId].name,id);}
 assert.equal(QUEST_META.red_green.name,'신호등 걷고 멈추기');assert.equal(QUEST_META.one_leg.name,'한 발 등대 서기');assert.equal(QUEST_META.target.name,'콩주머니 표적 던지기');
 const page=read('src/presentation/GamePlayPage.tsx'),titles=page.slice(page.indexOf('const GAME_TITLES'),page.indexOf('};',page.indexOf('const GAME_TITLES')));
 for(const id of ['red_green','one_leg','jump','squat','zigzag','memory','target','stopwatch','fitness','plank','base-running-decide','sound-goalball'])
  assert.match(titles,new RegExp(`${id.includes('-')?`'${id}'`:id}: \\{ name: QUEST_META\\['${id}'\\]\\.name`),id);
 assert.match(read('src/presentation/components/DailyStreakModal.tsx'),/QUEST_META\.red_green\.name/);
 for(const path of ['src/presentation/components/DailyStreakModal.tsx','src/presentation/components/PhysicalMbtiTest.tsx','src/presentation/components/StationCircuitMode.tsx','src/presentation/components/QuickPinClassroom.tsx','src/presentation/AdminControlPanel.tsx',page&&'src/presentation/GamePlayPage.tsx'])
  for(const old of OLD_NAMES)assert.ok(!read(path).includes(old),`${path} still says ${old}`);
});

test('the quest screen starts with one tap per step, shows the signal alone, and blocks unsafe paths',()=>{
 const src=read('src/presentation/components/minigames/common/MovementQuest.tsx');
 assert.match(src,/useState\(\(\)=>defaultChoice\(0\)\)/,'the first method is chosen in advance');
 assert.match(src,/>시작<\/button>/);
 assert.match(src,/작전 시작 · 기기 내려놓기/);assert.match(src,/짧게 연습하기 \(점수 없음/,'practice is optional');
 assert.doesNotMatch(src,/rehearsed/,'practice no longer gates the real start');
 assert.match(src,/disabled=\{blockedPath\}/);
 assert.match(src,/\{!focus&&<header/);assert.match(src,/data-focus=\{focus\|\|undefined\}/);
 assert.doesNotMatch(src,/mq-progress/,'only one progress indicator');
 assert.match(read('src/presentation/components/minigames/common/MovementQuest.css'),/\[data-consolidated\]:has\(\.movement-quest\[data-focus\]\) > \.consolidated-course-bar\{display:none\}/);
 assert.match(read('src/presentation/components/minigames/common/ConsolidatedActivity.tsx'),/다른 놀이 방법 \$\{variants\.length\}개/);
 assert.match(read('src/presentation/components/minigames/common/ActivityDemo.tsx'),/open=false,autoplay=false/,'demo stays closed by default for other layouts');
});

test('emotion picks the feeling without a countdown, the robot lab folds its safety list, pulse offers three feelings',()=>{
 assert.match(read('src/presentation/components/minigames/EmotionThermometer.tsx'),/countdown=\{false\}/);
 assert.doesNotMatch(read('src/presentation/components/minigames/EmotionThermometer.tsx'),/심미성/);
 const layout=read('src/presentation/components/minigames/common/PhysicalActivityLayout.tsx');
 assert.match(layout,/countdown: useCountdown = true/);assert.match(layout,/안전 약속 \{safetyItems\.length\}가지를 모두 확인했어요/);
 assert.match(read('src/presentation/components/minigames/PartnerRobotLab.tsx'),/예시 블록 넣어 보기/);
 const options=makeQuestRound('pulse-detective',1,settings).reflection!.options;
 assert.deepEqual(options.slice(0,3),['🐢 느려요','🙂 보통이에요','🐇 빨라요']);
 assert.doesNotMatch(read('src/presentation/components/minigames/StretchTimer.tsx'),/운동 처방/);
});
