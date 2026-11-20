import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFunState,stateBeforeCue,type FunState} from '../src/domain/funLoop';
import {keyToFunCommand,modalDialogOpen} from '../src/application/funCommandBus';

const read=(p:string)=>readFileSync(p,'utf8');
const timing={demo:10,tutorial:30,play:60,climax:20,cue:6};

test('a round saved before the special move was renamed still counts its specials',()=>{
 const base=createFunState({teams:2,timing,seed:3});
 const withLog=(text:string):FunState=>({...base,phase:'play',log:[...base.log,{phase:'play',text,cue:1}]});
 assert.equal(stateBeforeCue(withLog('한 방 공격!'),{phase:'play',index:3}).specials,1);
 assert.equal(stateBeforeCue(withLog('필살기!'),{phase:'play',index:3}).specials,1,'old saved text');
 assert.equal(stateBeforeCue(withLog('다른 기록'),{phase:'play',index:3}).specials,0);
});

test('game keys are ignored while a modal dialog is open (checked in the browser; Node has no document)',()=>{
 assert.equal(modalDialogOpen(),false);
 const g=globalThis as {document?:unknown};
 const had=Object.prototype.hasOwnProperty.call(g,'document'),old=g.document;
 try{
  let asked='';
  g.document={querySelector:(sel:string)=>{asked=sel;return {};}};
  assert.equal(modalDialogOpen(),true);
  assert.match(asked,/aria-modal="true"/);assert.match(asked,/role="alertdialog"/);
  assert.equal(keyToFunCommand({key:' ',target:{tagName:'BUTTON'}}),null,'Space does not reach the game');
  assert.equal(keyToFunCommand({key:'p',target:{tagName:'DIV'}}),null);
  assert.equal(keyToFunCommand({key:'1',target:{tagName:'DIV'}}),null);
  g.document={querySelector:()=>null};
  assert.deepEqual(keyToFunCommand({key:'p',target:{tagName:'DIV'}}),{type:'pause'});
 }finally{if(had)g.document=old;else delete g.document;}
});

test('the lesson bar asks in a modal dialog that pauses the game and gives focus back',()=>{
 const bar=read('src/presentation/components/TodayLessonBar.tsx');
 assert.match(bar,/useModalDialog\(!!ask,cancel\)/,'Esc, focus trap and scroll lock come from the shared dialog hook');
 assert.match(bar,/role="alertdialog" aria-modal="true"/);
 assert.match(bar,/held\.current=playing&&!!mine\.hold\?\.\(\)/,'the game clock stops while asking');
 assert.match(bar,/const cancel=\(\)=>\{release\(\);refocus\.current=true;setAsking\(null\);\}/,'cancel resumes only what the dialog paused and returns focus');
 assert.match(bar,/아직 활동 중이에요\. 기록 없이 넘어갈까요\?/,'activities without a result screen get their own wording');
 const sig=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(sig,/hold:\(\)=>\{if\(pausedRef\.current\)return false;/,'a round the teacher already paused stays paused after cancel');
 const phone=read('src/presentation/components/minigames/common/PhonePlay.tsx'),cls=read('src/presentation/components/minigames/common/PhonePlayClass.tsx'),page=read('src/presentation/GamePlayPage.tsx');
 for(const src of [phone,cls,page])assert.match(src,/useReportLessonActivity\(/,'warm-up and cool-down activities report that they are running');
});

test('Space must be pressed twice to skip the main game or end the last round',()=>{
 const engine=read('src/presentation/components/fun/useFunEngine.ts');
 assert.match(engine,/export const SKIP_CONFIRM_MS=3000/);
 assert.match(engine,/if\(cmd\.type==='next'&&isSkipPhase\(stateRef\.current\.phase\)\)\{\s*if\(!armed\.current\)\{arm\(\);return;\}/);
 assert.match(engine,/const isSkipPhase=\(p:FunState\['phase'\]\)=>p==='play'\|\|p==='climax'/,'the tutorial and the demo still move on with one press');
 assert.match(read('src/presentation/components/minigames/signature/SignaturePlay.tsx'),/engine\.skipArmed&&<p className="fun-skip-hint" role="status">/);
});

test('a practice-only round is not recorded, and the remote panel shows the TV number where the phone asks for it',()=>{
 const result=read('src/presentation/components/fun/ResultCeremony.tsx');
 assert.match(result,/summary\.practiceOnly\?<p className="fun-note" role="status">연습 판은 기록하지 않아요/);
 assert.match(result,/\{!summary\.practiceOnly&&afterRecord\}/);
 assert.match(read('src/presentation/components/minigames/signature/SignaturePlay.tsx'),/if\(recorded\|\|summary\.practiceOnly\)return;/);
 const remote=read('src/presentation/components/fun/RemoteLink.tsx');
 assert.match(remote,/!d\.trusted&&tvCode&&<p className="fun-remote-step">① 휴대폰이 먼저 TV 확인 번호를 물어요/);
 assert.match(remote,/open=\{pending\.some\(d=>!d\.trusted\)\|\|undefined\}/);
 assert.match(remote,/return \(\)=>\{window\.clearTimeout\(id\);setJustLinked\(false\);\};/,'the "linked" line is cleared when the panel closes early');
});

test('the lesson confirm opens on 취소, and the game ignores the remote while it is open',async()=>{
 const bar=read('src/presentation/components/TodayLessonBar.tsx');
 // 처음 초점이 '취소'여야 Space·Enter가 게임을 끝내지 않는다(브라우저 흐름은 signature-e2e의 lessonConfirm이 확인).
 assert.match(bar,/cancelRef\.current\?\.focus\(\)/);
 assert.match(bar,/<button ref=\{cancelRef\}[^>]*onClick=\{cancel\}>취소<\/button>/);
 const {isLessonConfirming,setLessonConfirming}=await import('../src/presentation/components/todayLessonActivity');
 assert.equal(isLessonConfirming(),false);
 setLessonConfirming(true);assert.equal(isLessonConfirming(),true);
 setLessonConfirming(false);assert.equal(isLessonConfirming(),false);
 const engine=read('src/presentation/components/fun/useFunEngine.ts');
 assert.match(engine,/source==='remote'&&isLessonConfirming\(\)/);
 // 리모컨에는 'TV에서 확인 중이라'로 알린다(기존 '반영되지 않았어요' 응답 길을 그대로 쓴다).
 assert.match(read('src/application/funRemote.ts'),/if\(latest\.busy\)return 'busy'/);
 assert.match(read('src/presentation/FunRemotePage.tsx'),/busy:'TV에서 확인 중이라'/);
});

test('Space presses the focused button inside the voice panel, the remote panel and the pause cover',()=>{
 const engine=read('src/presentation/components/fun/useFunEngine.ts');
 assert.match(engine,/NATIVE_SPACE_ZONES='\.tv-voice,\.fun-remote-panel,\.fun-dock,\.fun-paused'/);
 assert.match(engine,/e\.key===' '&&target\?\.closest\(NATIVE_SPACE_ZONES\)/);
});

test('whole-class and device play tell the lesson bar when they are really running, and can be held',()=>{
 const cls=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(cls,/useReportLessonActivity\(phase==='rules'\?null:/,'the rules screen (not started) does not ask');
 assert.match(cls,/phase==='record'\?'result':'playing'/,'the record step is "not recorded yet", not "playing"');
 assert.match(cls,/hold:\(\)=>\{if\(pausedRef\.current\)return false;setPaused\(true\)/);
 assert.match(cls,/release:\(\)=>setPaused\(false\)/);
 const dev=read('src/presentation/components/minigames/common/PhonePlay.tsx');
 assert.match(dev,/phase==='intro'\|\|phase==='plan'\|\|\(phase==='record'&&practice\)\?null:/);
 assert.match(dev,/hold:\(\)=>\{if\(pausedRef\.current\)return false;setPaused\(true\)/);
});

test('the remote panel pauses the round and blocks game keys while it covers the signal',()=>{
 assert.match(read('src/presentation/components/fun/remotePanelState.ts'),/export function setRemotePanelOpen/);
 assert.match(read('src/presentation/components/fun/RemoteLink.tsx'),/useEffect\(\(\)=>\{setRemotePanelOpen\(open\);\},\[open\]\)/,'the panel reports when it opens and closes');
 assert.match(read('src/presentation/components/fun/useFunEngine.ts'),/if\(isRemotePanelOpen\(\)&&cmd\.type!=='pause'\)return;/,'only P works while the panel is open');
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/if\(isCuePhase\(state\.phase\)&&!state\.paused\)\{panelHeld\.current=true;/,'opening the panel during a round (or reaching a round with it open) pauses it');
 assert.match(play,/if\(panelHeld\.current\)\{panelHeld\.current=false;if\(state\.paused\)/,'closing resumes only what the panel paused');
 assert.match(play,/if\(resumed\)\{panelHeld\.current=false;requestRemotePanelClose\(\);return;\}/,'resuming with the panel open (P or phone) closes the panel instead of running behind it, and forgets the panel hold');
});

test('ending a round asks once more, and the arena cannot be clicked behind the lesson dialog',()=>{
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/export const END_CONFIRM_MS=3000/);
 assert.match(play,/label:endArmed\?'■ 한 번 더 누르면 끝나요':'■ 끝내기'/);
 assert.match(play,/data-confirming=\{confirming\|\|undefined\} inert=\{confirming\|\|undefined\}/,'the whole arena (incl. the pause cover) is inert while the lesson dialog is open');
 assert.match(play,/className="fun-dock"[^>]*inert=\{lessonConfirming\|\|undefined\}/);
});

test('inside a lesson the result says 오늘 수업으로, and the phone shows TV 확인 중 before any press',()=>{
 assert.match(read('src/presentation/components/fun/ResultCeremony.tsx'),/exitLabel='활동 목록으로'/);
 assert.match(read('src/presentation/components/minigames/signature/SignaturePlay.tsx'),/exitLabel=\{fromTodayLesson\(\)\?'오늘 수업으로':undefined\}/);
 assert.match(read('src/presentation/FunRemotePage.tsx'),/ready&&tvBusy\?'TV에서 확인 중이에요/);
});

test('expression activities keep the variant bar at the top on wide screens',()=>{
 const css=read('src/presentation/components/minigames/common/ExpressionActivity.css');
 assert.match(css,/@media \(max-width:640px\)\{\[data-consolidated\]:has\(\.expression-activity\) > \.movement-quest:first-child\{order:2/);
 assert.doesNotMatch(css.replace(/@media \(max-width:640px\)\{[^\n]*\}\}/g,''),/:has\(\.expression-activity\) > \.movement-quest:first-child\{order:2/);
});

test('the phone keeps the TV busy flag so it can say TV 확인 중 before any press',async()=>{
 const {parseSnapshot}=await import('../src/application/funRemote');
 const base={teams:2,scores:[0,1],phase:'play',secondsLeft:30,combo:0,gameName:'신호 대장',cue:'출동!'};
 assert.equal(parseSnapshot({...base,busy:true})?.busy,true);
 assert.equal(parseSnapshot(base)?.busy,undefined);
 assert.equal(parseSnapshot({...base,busy:'yes'})?.busy,undefined,'only a real true counts');
});

test('leaving a running round from the in-game back button asks first, and says 오늘 수업 inside a lesson',()=>{
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/onClick=\{askLeave\}>\{inLesson\?'← 오늘 수업':'← 목록'\}/);
 assert.match(play,/if\(act\?\.gameId===game\.id&&act\.phase==='playing'\)\{leaveHeld\.current=!!act\.hold\?\.\(\);setLeaveAsk\(true\);\}/,'only a running round asks; the round is held while asking');
 assert.match(play,/role="alertdialog" aria-modal="true"/);
 for(const label of ['결과 발표 보기','기록 없이 나가기','취소'])assert.ok(play.includes(`>${label}</button>`),label);
 assert.match(play,/setLessonConfirming\(true\);leaveCancelRef\.current\?\.focus\(\)/,'the arena and the phone remote are blocked while asking, and focus starts on 취소');
});

test('while a confirm dialog is open the pause cover shows no resume button and clicks cannot steal focus',()=>{
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/confirming\?<div className="fun-paused" data-confirming="true" role="status">/);
 assert.match(play,/document\.addEventListener\('mousedown',keep,true\)/);
});

test('ending from the result button also needs a second press; skipping to the climax does not',()=>{
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/cmd\.type==='next'&&state\.phase==='climax'\?'result'/);
 assert.match(play,/'▶ 한 번 더 누르면 결과 발표'/);
});

test('the remote panel closes with Esc unless a modal dialog is open',()=>{
 const link=read('src/presentation/components/fun/RemoteLink.tsx');
 assert.match(link,/e\.key!=='Escape'\|\|document\.querySelector\('\[aria-modal="true"\],\[role="alertdialog"\]'\)/);
 assert.match(link,/onRemotePanelCloseRequest\(\(\)=>closeRef\.current\(\)\)/);
});

test('short phones keep a small −1 next to +1 for 3–4 teams',()=>{
 const css=read('src/presentation/components/fun/fun.css');
 assert.doesNotMatch(css,/\.fun-team-buttons button:not\(\.fun-plus\)\{display:none\}/);
 assert.match(css,/\.fun-scoreboard\[data-teams="4"\] \.fun-team-buttons\{grid-template-columns:minmax\(0,2fr\) minmax\(0,3fr\)/);
});

// ── UI·UX: 버튼 자리 통일 · 팀 모양 · 남은 시간 막대 · 차례 표시 · TV 모드 ──
test('teams are told apart by shape as well as colour, in the agreed order',async()=>{
 const {TEAM_SHAPES}=await import('../src/presentation/components/fun/teamShapes');
 assert.deepEqual([...TEAM_SHAPES],['●','▲','■','◆']);
 const parts=read('src/presentation/components/fun/FunParts.tsx');
 assert.match(parts,/<TeamShape team=\{team\}\/>/,'scoreboard shows the shape');
 assert.match(read('src/presentation/components/fun/ResultCeremony.tsx'),/<TeamShape team=\{r\.team\}\/>/,'podium shows the shape');
 // 예전의 색 점(::before)은 쓰지 않는다.
 assert.match(read('src/presentation/components/fun/fun.css'),/\.fun-team-name::before\{content:none\}/);
});
test('the remaining time is also a bar that turns amber then red, and the readout is a timer',()=>{
 const parts=read('src/presentation/components/fun/FunParts.tsx');
 assert.match(parts,/const level=timeLevel\(left,total\)/,'the bar uses the phase-proportional levels');
 const css=read('src/presentation/components/fun/fun.css');
 assert.match(css,/\.fun-timebar\[data-level=warn\] i\{background:#f59e0b\}\.fun-timebar\[data-level=danger\] i\{background:#ef4444\}/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)\{\.fun-timebar i,\.fun-timer\{transition:none\}\}/);
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/className="fun-timer" role="timer" data-level=\{timeLevel\([^}]*\]\)\} aria-label=\{`남은 시간 \$\{left\}초`\}/);
 assert.match(play,/<TimeBar left=\{left\} total=\{game\.timing\[/);
});
test('controls keep their places: 다음 bottom-right, leave top-left, one primary button',()=>{
 const css=read('src/presentation/components/fun/fun.css');
 // 버튼 줄은 오른쪽 아래에서 시작해 위로 감긴다: 첫 버튼('다음')이 늘 오른쪽 아래.
 assert.match(css,/\.fun-controls\{display:flex;flex-direction:row-reverse;flex-wrap:wrap-reverse\}/);
 assert.match(css,/\.fun-dock \.fun-exit\{margin-right:auto;order:-1\}/);
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 // '다음'이 버튼 목록의 첫째, '일시정지'가 둘째(화면에서는 오른쪽 아래와 그 왼쪽).
 assert.match(play,/const buttons:TeacherButton\[\]=\[[\s\S]{0,400}command:\{type:'next'\}[\s\S]{0,200}command:\{type:'pause'\}/);
 // 이어 할 판이 있으면 '이어 하기'만 주 버튼.
 assert.match(play,/className=\{saved\?'fun-secondary fun-big':'fun-primary fun-big'\}/);
 const result=read('src/presentation/components/fun/ResultCeremony.tsx');
 assert.match(result,/className=\{summary\.practiceOnly\?'fun-primary':'fun-secondary'\} onClick=\{onReplay\}/);
 assert.match(result,/className=\{recorded&&!summary\.practiceOnly\?'fun-primary':'fun-secondary'\} onClick=\{onExit\}/);
 assert.match(read('src/presentation/components/fun/FunParts.tsx'),/className="fun-secondary fun-demo-skip"/,'the demo button is not a second primary');
});
test('turn-taking games name the team whose turn it is, not only colour it',()=>{
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/data-turn=\{turnTeam\?\?undefined\}/);
 assert.match(play,/className="fun-turn-chip"[\s\S]{0,160}\{TEAM_NAMES\[turnTeam\]\} 차례/);
 for(const m of ['sig-move-bingo','sig-memory-relay','sig-stage-show'])
  assert.match(read(`src/presentation/components/minigames/signature/modules/${m}.tsx`),/useTurnTeam/,`${m} reports its turn team`);
});
test('TV mode enlarges the signal, hides small print and leaves with Esc or by ending fullscreen',()=>{
 const css=read('src/presentation/components/fun/fun.css');
 assert.match(css,/html\[data-tv-mode="on"\] \.fun-arena \.fun-hint,html\[data-tv-mode="on"\] \.fun-arena \.fun-controls kbd/);
 assert.match(css,/html\[data-tv-mode="on"\] \.fun-cue\{font-size:clamp\(60px,11\.5vw,176px\)\}/);
 assert.match(css,/html\[data-tv-mode="on"\] \.fun-intro\{position:fixed;inset:0/);
 const exit=read('src/presentation/components/fun/useTvModeExit.ts');
 assert.match(exit,/e\.key!=='Escape'\|\|e\.defaultPrevented\|\|fullscreenEl\(\)\|\|document\.querySelector\(OPEN_LAYERS\)/,'Esc is left to an open dialog');
 assert.match(exit,/if\(was&&!now&&!document\.querySelector\(OPEN_LAYERS\)\)setTvMode\(false\)/,'ending fullscreen turns TV mode off unless a dialog is open');
 const control=read('src/presentation/components/fun/TvMode.tsx');
 assert.match(control,/requestFullscreen\?\.\(\)\.catch\(\(\)=>\{\}\)/,'a refused fullscreen is ignored');
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.equal((play.match(/<TvModeControl className="fun-tv-btn"\/>/g)??[]).length,2,'on the start screen and in the dock');
});

test('a double tap on the phone remote next no longer skips a whole phase',async()=>{
 const {shouldIgnoreRemoteNext,REMOTE_NEXT_GUARD_MS}=await import('../src/presentation/components/fun/remoteNextGuard');
 assert.equal(REMOTE_NEXT_GUARD_MS,800);
 assert.equal(shouldIgnoreRemoteNext(10_000,-Infinity,-Infinity),false,'a first remote next goes through');
 assert.equal(shouldIgnoreRemoteNext(10_150,10_000,-Infinity),true,'a second tap 150ms later is dropped');
 assert.equal(shouldIgnoreRemoteNext(11_000,10_000,10_020),false,'a deliberate next a second later goes through');
 assert.equal(shouldIgnoreRemoteNext(10_300,-Infinity,10_000),true,'a remote next right after the phase changed on its own is dropped');
 const engine=read('src/presentation/components/fun/useFunEngine.ts');
 assert.match(engine,/source==='remote'&&cmd\.type==='next'/,'only remote next is guarded (TV buttons and keys unchanged)');
});

test('time colors follow the phase length so short phases do not start yellow or red',async()=>{
 const {timeLevel}=await import('../src/presentation/components/fun/timeLevel');
 assert.equal(timeLevel(12,12),'ok','a 12s demo starts green');
 assert.equal(timeLevel(3,12),'warn');assert.equal(timeLevel(1,12),'danger');
 assert.equal(timeLevel(30,30),'ok','a 30s practice starts green');
 assert.equal(timeLevel(25,120),'ok');assert.equal(timeLevel(20,120),'warn');assert.equal(timeLevel(10,120),'danger','long phases keep the 20s/10s marks');
 const play=read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
 assert.match(play,/className="fun-timer" role="timer" data-level=\{timeLevel\(/,'the number turns red with the bar');
});

test('module button sizes are not overridden by the arena font reset',()=>{
 const css=read('src/presentation/components/fun/fun.css');
 assert.match(css,/:where\(\.fun-arena,\.fun-intro\) button\{font:inherit/);
 assert.doesNotMatch(css,/^\.fun-arena button,\.fun-intro button\{font:inherit/m);
 const bingo=read('src/presentation/components/minigames/signature/modules/sig-move-bingo.css');
 assert.match(bingo,/html\[data-tv-mode="on"\] \.sig-bingo-cell\{[^}]*font-size:clamp\(18px/,'bingo cells grow in TV mode');
 assert.match(bingo,/grid-auto-rows:minmax\(0,1fr\)/,'the board fills its panel row by row');
});
