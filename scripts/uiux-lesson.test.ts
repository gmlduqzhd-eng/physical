import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {EMPTY_PROGRESS,MAP_TILES,addPlay,type ClassProgress} from '../src/domain/classProgress';
import {MAP_MOMENT_MS,lessonMapMoment} from '../src/domain/lessonMapMoment';

const read=(p:string)=>readFileSync(p,'utf8');
const t0=new Date(2026,10,19,9).getTime();
const plays=(n:number,from=t0):ClassProgress=>{let p=EMPTY_PROGRESS;for(let i=0;i<n;i++)p=addPlay(p,'sig-boss-raid',from+i*1000,`play-${from}-${i}`);return p;};

test('수업 끝 지도 장면: 이번 수업에 기록한 판만큼 칸이 열리고, 기록이 없으면 띄우지 않는다',()=>{
 assert.equal(lessonMapMoment(EMPTY_PROGRESS,t0,t0+60000),null);
 // 지난 수업 5판 + 이번 수업 3판
 let p=plays(5,t0-86400000);
 for(let i=0;i<3;i++)p=addPlay(p,'sig-signal-captain',t0+i*1000,`now-${i}`);
 const m=lessonMapMoment(p,t0,t0+60000)!;
 assert.equal(m.gained,3);
 assert.deepEqual(m.fresh,[5,6,7]);
 assert.equal(m.wrapped,false);
 assert.equal(m.line,'지도 칸이 3칸 열렸어요!');
 assert.equal(m.view.opened,8);
 // 수업 시간 밖의 판은 세지 않는다.
 assert.equal(lessonMapMoment(p,t0+10000,t0+60000),null);
 assert.ok(MAP_MOMENT_MS>=2500&&MAP_MOMENT_MS<=4000,'3초쯤 보여 준다');
});

test('수업 끝 지도 장면: 수업 중 한 바퀴를 다 돌면 새 지도에서 다시 센다',()=>{
 let p=plays(MAP_TILES-1,t0-86400000);
 for(let i=0;i<3;i++)p=addPlay(p,'sig-move-bingo',t0+i*1000,`wrap-${i}`);
 const m=lessonMapMoment(p,t0,t0+60000)!;
 assert.equal(m.wrapped,true);
 assert.equal(m.view.opened,2);
 assert.deepEqual(m.fresh,[0,1]);
 assert.match(m.line,/한 바퀴 다 돌았어요/);
});

test('끝 화면: 지도 장면은 건너뛸 수 있고, 같은 수업에서는 한 번만 뜨고, 움직임 줄이기를 지킨다',()=>{
 const page=read('src/presentation/TodayLesson.tsx'),css=read('src/presentation/TodayLesson.css');
 assert.match(page,/moment&&momentOpen&&<MapMoment moment=\{moment\} onClose=\{closeMoment\}\/>/);
 assert.match(page,/writeStorage\(momentKey,'seen','session'\)/);
 assert.match(page,/className="today-map-moment-skip" onClick=\{onClose\}>건너뛰기/);
 assert.match(page,/to="\/class-progress\?tab=map"/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.today-map-moment,\.today-map-moment-tiles li\[data-fresh\]\{animation:none\}/);
});

test('오늘 수업 막대: 단계마다 점 하나(●●○○), 지금 단계를 강조하고 이름은 막대가 읽어 준다',()=>{
 const bar=read('src/presentation/components/TodayLessonBar.tsx'),css=read('src/presentation/components/TodayLessonBar.css');
 assert.match(bar,/className="today-bar-dots" aria-hidden="true">\{run\.plan\.stages\.map\(/);
 assert.match(bar,/data-state=\{i<run\.index\?'done':i===run\.index\?'now':'next'\}/);
 assert.match(bar,/\{i<=run\.index\?'●':'○'\}/);
 // 두 모드(지금 단계 화면, 다른 화면) 모두에 점이 있다.
 assert.equal((bar.match(/\{dots\}/g)||[]).length,2);
 assert.match(bar,/const label=`오늘 수업 \$\{run\.index\+1\}\/\$\{total\} · \$\{STAGE_LABEL\[stage\.kind\]\}/);
 assert.match(css,/\.today-bar-dots i\[data-state="now"\]/);
});

test('반 전체 진행: TV 모드 단추, 줄어드는 남은 시간 막대, 왼쪽 위 그만두기, 주 버튼 하나',()=>{
 const src=read('src/presentation/components/minigames/common/PhonePlayClass.tsx'),css=read('src/presentation/components/minigames/common/PhonePlay.css');
 assert.match(src,/<TvModeButton className="pc-tv"\/>/);
 assert.match(src,/className="pc-timebar" data-state=\{barState\}[^>]*role="progressbar"[^>]*aria-valuetext=\{`\$\{left\}초 남음`\}/);
 assert.match(src,/const barState=phase==='active'\?\(left<=10\?'urgent':left<=20\?'soon':'ok'\):'brief'/);
 // 그만두기는 머리글(왼쪽 위)에 하나만 있고, 아래쪽 긴 닫기 단추는 없다.
 assert.match(src,/<header className="pc-head">[\s\S]{0,200}className="pc-leave" aria-label="닫기 · 반 전체 진행 그만두기"/);
 assert.doesNotMatch(src,/className="pp-exit"/);
 // 멈춘 동안에는 '이어서 하기'만 주 버튼이다.
 assert.match(src,/<button className=\{paused\?'pc-pause':'pp-primary'\} onClick=\{\(\)=>\{setElapsed\(duration\);\}\}/);
 assert.match(css,/\.pc-timebar\[data-state=urgent\] i\{background:#dc2626\}/);
 assert.match(css,/prefers-reduced-motion:reduce\)\{\.phone-class \.pc-timebar i\{transition:none\}\}/);
 assert.match(css,/html\[data-tv-mode="on"\] \.phone-class \.pc-head \.pp-eyebrow/);
 assert.match(css,/html\[data-tv-mode="on"\] \.phone-class:not\(\[data-board\]\) \.pc-cue\{font-size:clamp\(40px,9vw,150px\)/);
});

test('놀이 화면 틀: TV 모드에서 위쪽 도구 막대를 숨기고, 결과 화면은 결과 → 반응 → 그 밖 순서다',()=>{
 const page=read('src/presentation/GamePlayPage.tsx'),css=read('src/presentation/GamePlayPage.css');
 assert.match(page,/<TvModeButton className="game-toolbar-tv"\/>/);
 assert.match(page,/\}, \[hasStarted, tvMode\]\);/);
 assert.match(css,/html\[data-tv-mode="on"\] \.game-tools-layout:has\(\.has-game-toolbar\) \.game-utilities-bar\{display:none\}/);
 assert.match(css,/html\[data-tv-mode="on"\] \.game-tools-layout:has\(\.has-game-toolbar\)\{--game-utility-height:0px\}/);
 const slot=page.indexOf('<ClassFeedbackSlot gameId={gameType} playId={sessionPlayId}/>');
 assert.ok(slot>page.indexOf('result-score-value'),'반응 칸은 점수 뒤');
 assert.ok(slot<page.indexOf('오늘의 활동은 얼마나 힘들었나요?'),'반응 칸은 힘든 정도 앞');
 assert.equal((page.match(/<ClassFeedbackSlot /g)||[]).length,1);
});
