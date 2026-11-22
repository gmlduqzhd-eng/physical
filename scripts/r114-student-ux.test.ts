import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {studentResultMessage} from '../src/domain/studentResultMessage';

const read=(path:string)=>readFileSync(path,'utf8');
const base={quiet:false,partial:false,queue:0,online:true,warning:'',score:300};

test('student result message is one short sentence and never claims what did not happen',()=>{
 assert.equal(studentResultMessage(base),'잘했어요! 선생님께 보냈어요.');
 assert.match(studentResultMessage({...base,queue:1,online:false}),/인터넷이 돌아오면/);
 assert.doesNotMatch(studentResultMessage({...base,queue:1,online:false}),/보냈어요/);
 assert.equal(studentResultMessage({...base,quiet:true}),'쉬면서 지켜본 것도 기록했어요.');
 assert.equal(studentResultMessage({...base,partial:true}),'해 본 만큼 기록했어요.');
 assert.equal(studentResultMessage({...base,score:0}),'참여한 것을 기록했어요.');
 for(const v of [base,{...base,queue:2},{...base,quiet:true}])assert.doesNotMatch(studentResultMessage(v),/서버|승인|요청/);
});

test('student result card: celebration and score first, codes and adult notes folded for the teacher',()=>{
 const page=read('src/presentation/GamePlayPage.tsx');
 assert.match(page,/\{!hasBattle&&<div className="flex items-center gap-1\.5/);
 assert.match(page,/student-result-hero[\s\S]*오늘 얻은 점수/);
 assert.ok(page.indexOf('student-result-hero')<page.indexOf('오늘 잘한 움직임 하나'),'score before reflection');
 assert.match(page,/<summary className="cursor-pointer font-bold">선생님용 설명<\/summary>/);
 // 배지 토스트는 결과 화면에서 아래쪽(축하·점수를 가리지 않게).
 assert.match(page,/game-achievement-toast fixed \$\{gameFinished \? 'bottom-6' : 'top-20'\}/);
});

test('student screens show only the page buttons in the header',()=>{
 const toolbar=read('src/presentation/components/HeaderToolbar.tsx');
 assert.match(toolbar,/if \(studentMode \?\? isStudentRoute\(pathname, search\)\) return <nav className=\{`header-icon-scope icon-toolbar icon-toolbar-student/);
 assert.match(read('src/presentation/LessonShell.tsx'),/studentMode=\{audience === 'student'\}/);
 assert.match(read('src/presentation/QuickJoin.tsx'),/<FlowShell utilities studentMode/);
 assert.match(read('src/presentation/MobileMissionView.tsx'),/student-classroom-header"><HeaderToolbar studentMode>/);
 assert.match(read('src/presentation/components/WaitingScreen.tsx'),/<HeaderToolbar studentMode>/);
 const page=read('src/presentation/GamePlayPage.tsx');
 assert.match(page,/<HeaderToolbar studentMode=\{hasBattle \|\| undefined\}>/);
 assert.match(page,/!hasBattle && <TvModeButton/);
});


test('group phone: start is the biggest first button, help is secondary below it',()=>{
 const view=read('src/presentation/MobileMissionView.tsx');
 const start=view.indexOf('student-guided-start');const help=view.indexOf('student-guided-help');
 assert.ok(start>0&&help>start,'start before help');
 assert.match(view,/student-guided-start w-full mt-5 py-5 bg-cyan-700 text-white rounded-2xl font-black text-2xl/);
 assert.match(view,/<span aria-hidden="true">✅ <\/span><span>선생님 화면에 저장했어요\.<\/span>/);
 assert.doesNotMatch(view,/게임 결과를 제출하면/);
});

test('lobby uses plain words and a big number-only password box',()=>{
 const lobby=read('src/presentation/Lobby.tsx');
 assert.match(lobby,/모둠 비밀번호 \(숫자 4개\)<input className="student-pin-input" type="text" inputMode="numeric"/);
 assert.doesNotMatch(lobby,/모둠 PIN/);
 assert.match(read('src/presentation/Lobby.css'),/input\.student-pin-input\{[^}]*font-size:2\.25rem/);
 assert.match(read('src/presentation/components/StudentNumberPad.css'),/\.snp \.snp-tools :is\(button,input\)\{scroll-margin-bottom:104px\}/);
 const home=read('src/presentation/UnifiedHomePage.tsx');
 assert.match(home,/<Link to="\/lobby" className="home-student-join" data-home-student>🙋 학생 참여하기/);
});

test('class progress: countdown ring, one step label, lone button spans the row',()=>{
 const cls=read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
 assert.match(cls,/className="pc-countdown"[\s\S]*초 뒤 시작/);
 assert.match(cls,/\/\$\{p\.rounds\.length\}단계/);
 assert.doesNotMatch(cls,/'곧 시작해요'/);
 assert.match(read('src/presentation/components/minigames/common/PhonePlay.css'),/\.pc-controls>button:only-child\{grid-column:1\/-1\}/);
});
