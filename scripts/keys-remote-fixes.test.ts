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
 assert.match(engine,/NATIVE_SPACE_ZONES='\.tv-voice,\.fun-remote-panel,\.fun-paused'/);
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
