import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { studentResultMessage } from '../src/domain/studentResultMessage';
import { allowsBackgroundMusic } from '../src/application/backgroundMusicRoutes';

const read = (path: string) => readFileSync(path, 'utf8');

test('student result message says "화면을 열어 두세요" at most once', () => {
  const base = { quiet: false, partial: false, warning: '', score: 300 };
  const count = (text: string) => text.split('화면을 열어 두세요').length - 1;
  assert.equal(count(studentResultMessage({ ...base, queue: 1, online: false, storageAvailable: false })), 1);
  assert.equal(count(studentResultMessage({ ...base, queue: 1, online: false, storageAvailable: true })), 1);
  assert.equal(count(studentResultMessage({ ...base, queue: 1, online: true, storageAvailable: false })), 1);
  assert.equal(count(studentResultMessage({ ...base, queue: 1, online: true })), 0);
  assert.equal(studentResultMessage({ ...base, queue: 0, online: true, storageAvailable: false }), '잘했어요! 선생님께 보냈어요.');
  // 결과 화면에서 따로 덧붙이지 않는다.
  assert.doesNotMatch(read('src/presentation/GamePlayPage.tsx'), /&&' 화면을 열어 두세요\.'/);
});

test('no background music on student screens (they have no sound settings)', () => {
  for (const [path, search] of [['/lobby', ''], ['/join', '?room=r&group=g'], ['/mobile/r/g', ''], ['/play/zigzag', '?room=r&group=g&guided=1']]) {
    assert.equal(allowsBackgroundMusic(path, search), false, path);
  }
  assert.match(read('src/application/BackgroundMusicContext.tsx'), /allowsBackgroundMusic\(pathname, search\)/);
});

test('lobby opens on the password box; students never read "PIN" or "코드"', () => {
  const lobby = read('src/presentation/Lobby.tsx');
  assert.match(lobby, /useState<'qr'\|'code'>\('code'\)/);
  assert.match(lobby, /QR을 찍어서 들어갈래요/);
  assert.match(lobby, /QR 대신 비밀번호로 들어갈래요/);
  const visible = (source: string) => source.replace(/\/\/[^\n]*/g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
  for (const file of ['src/presentation/Lobby.tsx', 'src/presentation/QuickJoin.tsx']) {
    const text = visible(read(file)).replace(/pinCode|setPinCode|pinRef|joinStudentByPin|student-pin-[a-z]+|[?&'"]pin['"]?|entry_pin|\.get\('code'\)|setCode|codeFormRef|revealCode|setRevealCode|'code'|\bcode\b|!code/g, '');
    assert.doesNotMatch(text, /PIN|핀 번호|참여 코드|코드로/, file);
  }
  const repo = read('src/data/classroomRepository.ts');
  assert.match(repo, /invalid_pin:'모둠 비밀번호가 맞지 않거나 끝난 수업이에요\. 선생님께 물어봐요\.'/);
  assert.doesNotMatch(repo, /PIN이 맞지 않거나|모둠 참여 코드가|잘못된 참여 코드/);
  const mobile = read('src/presentation/MobileMissionView.tsx');
  assert.match(mobile, /비밀번호로 다시 들어가기/);
  assert.doesNotMatch(mobile, /PIN으로/);
});

test('the group phone uses in-app notices instead of system alert/confirm', () => {
  const mobile = read('src/presentation/MobileMissionView.tsx');
  assert.doesNotMatch(mobile, /(?<![\w.])alert\(/);
  assert.doesNotMatch(mobile, /window\.confirm\(|(?<![\w.])confirm\(/);
  assert.match(mobile, /className="student-toast" role="status" aria-live="polite"/);
  assert.match(mobile, /role="alertdialog" aria-modal="true" aria-labelledby="student-ask-text"/);
  assert.match(mobile, /const questionRef = useModalDialog\(!!question, \(\) => answer\(false\)\);/);
  assert.match(mobile, /const scannerRef = useModalDialog\(showScanner, \(\) => setShowScanner\(false\)\);/);
  assert.equal(mobile.match(/ref=\{scannerRef\} role="dialog" aria-modal="true"/g)?.length, 2);
  // 저장 확인은 첫 화면 위쪽 알림으로도 띄운다.
  assert.match(mobile, /notify\('✅ 선생님 화면에 저장했어요\.'\)/);
  // 10~12px 글씨를 남기지 않는다.
  assert.doesNotMatch(mobile, /text-\[(9|10|11|12)px\]|text-xs/);
  const css = read('src/presentation/MobileMissionView.css');
  assert.match(css, /\.student-toast\{position:fixed;top:max\(12px,env\(safe-area-inset-top\)\)/);
  assert.match(css, /\.student-ask-actions button\{min-height:56px/);
});

test('light cards keep dark text in a dark colour scheme', () => {
  const mobile = read('src/presentation/MobileMissionView.tsx');
  assert.match(mobile, /<div data-game-color className="student-activity-card bg-cyan-50/);
  assert.match(read('src/presentation/MobileMissionView.css'), /\.student-guided-room \.student-activity-card,\.student-guided-room \.student-reflection-picked\{background:#ecfeff!important;color:#0f172a!important\}/);
  const pad = read('src/presentation/components/StudentNumberPad.css');
  assert.match(pad, /\.snp\{[^}]*color:inherit\}/);
  assert.match(pad, /\.snp-hint\{[^}]*color:inherit/);
  const waiting = read('src/presentation/components/WaitingScreen.tsx');
  assert.match(waiting, /<span data-game-color className="px-3 py-1 bg-cyan-50 text-cyan-800 text-sm/);
  assert.doesNotMatch(waiting, /text-xs/);
});

test('student play: back button says where it goes, help button is hidden, small text is 14px+', () => {
  const page = read('src/presentation/GamePlayPage.tsx');
  assert.match(page, /const backLabel = hubPath\.startsWith\('\/mobile\/'\) \? '우리 모둠으로' : '활동 목록으로';/);
  assert.match(page, /\{!hasBattle&&<button className="icon-toolbar-action" type="button" onClick=\{\(\) => navigate\('\/manual'\)\}/);
  assert.match(page, /data-student-play=\{hasBattle \? "" : undefined\}/);
  assert.doesNotMatch(page, /text-\[(9|10|11)px\]/);
  const css = read('src/presentation/GamePlayPage.css');
  assert.match(css, /\.game-tools-layout\[data-student-play\] \.mq-map-mini small\{font-size:14px\}/);
  assert.match(css, /\.game-tools-layout\[data-student-play\] :is\(\.activity-brief,\.student-result-teacher-note\)>summary\{min-height:44px/);
  for (const file of ['src/presentation/MobileMissionView.tsx', 'src/presentation/components/WaitingScreen.tsx']) assert.doesNotMatch(read(file), /to="\/manual"/, file);
  assert.match(read('src/presentation/LessonShell.tsx'), /\{audience !== 'student' && <Link className="icon-toolbar-action" to="\/manual"/);
  assert.match(read('src/presentation/FlowShell.tsx'), /\{!studentMode && <Link className="icon-toolbar-action" to="\/manual"/);
  assert.doesNotMatch(read('src/presentation/components/QuickPinClassroom.tsx'), /text-\[(9|10|11)px\]|text-xs/);
});

test('after picking a number the tools under the pad are scrolled clear of the sticky enter button', () => {
  const pad = read('src/presentation/components/StudentNumberPad.tsx');
  assert.match(pad, /querySelectorAll<HTMLElement>\('\.snp-tools button, \.snp-tools input'\)/);
  assert.match(pad, /last\.scrollIntoView\(\{ block: 'nearest' \}\)/);
  assert.match(read('src/presentation/components/StudentNumberPad.css'), /\.snp \.snp-tools :is\(button,input\)\{scroll-margin-bottom:104px\}/);
});
