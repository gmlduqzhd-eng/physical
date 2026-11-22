import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { autoNickname, isAutoNickname, validateStudentIdentity } from '../src/application/studentIdentity';
import { resumeLabel } from '../src/application/lastStudentEntry';
import { isSendLocked, lockAfterSend, SEND_LOCK_MIN_MS, SEND_LOCK_MS } from '../src/application/remoteSendLock';

test('the phone remote sends one phase-changing command per phase (no double-tap skip)', () => {
  const lock = lockAfterSend('tutorial', 1000);
  assert.equal(isSendLocked(lock, 'tutorial', 1100), true, 'a second tap right after is ignored');
  assert.equal(isSendLocked(lock, 'play', 1150), true, 'even if the TV already moved on, a quick second tap is ignored');
  assert.equal(isSendLocked(lock, 'play', 1000 + SEND_LOCK_MIN_MS), false, 'after the minimum hold, the new phase unlocks it');
  assert.equal(isSendLocked(lock, 'tutorial', 1000 + SEND_LOCK_MS), false, 'unlocks after the timeout even if no snapshot came');
  assert.equal(isSendLocked(null, 'play', 0), false);
  assert.equal(isSendLocked(lockAfterSend(undefined, 0), undefined, 10), true, 'unknown phase still locks by time');
  const page = readFileSync('src/presentation/FunRemotePage.tsx', 'utf8');
  assert.match(page, /sendStep\(\{type:'next'\},nextLabel\)/);
  assert.match(page, /sendStep\(\{type:'end'\},'끝내기'\)/);
  assert.match(page, /role="alertdialog" aria-modal="true"/, 'confirm opens as a modal sheet');
});

const read = (file: string) => readFileSync(file, 'utf8');

test('student join: tap a number and enter, nickname is optional and defaults to the number', () => {
  assert.equal(autoNickname(12), '12번');
  assert.deepEqual(validateStudentIdentity('12', ''), { number: 12, nickname: '12번' }, 'no nickname needed');
  assert.deepEqual(validateStudentIdentity('7', '3번'), { number: 7, nickname: '7번' }, 'an auto nickname follows the new number');
  assert.deepEqual(validateStudentIdentity('7', ' 바람 '), { number: 7, nickname: '바람' }, 'a chosen nickname is kept');
  assert.throws(() => validateStudentIdentity('', ''), /번호를 눌러/);
  assert.throws(() => validateStudentIdentity('100', ''));
  assert.throws(() => validateStudentIdentity('3', '바'), /2~12자/);
  assert.equal(isAutoNickname(''), true);
  assert.equal(isAutoNickname('99번'), true);
  assert.equal(isAutoNickname('바람'), false);
  assert.equal(resumeLabel({ number: '12', nickname: '12번' }), '12번', 'no "12번 12번"');
  assert.equal(resumeLabel({ number: '12', nickname: '바람' }), '12번 바람');
  const pad = read('src/presentation/components/StudentNumberPad.tsx');
  assert.match(pad, /내 번호를 눌러요/);
  assert.match(pad, /aria-pressed=\{picked === value\}/);
  assert.match(pad, /disabled=\{isTaken\}/, 'numbers another device holds cannot be tapped');
  assert.match(pad, /31번부터 더 보기/);
  assert.match(pad, /별명 바꾸기/);
  assert.match(pad, /별명 \(2~12자\)/);
  assert.doesNotMatch(pad, /required/, 'no field has to be typed');
  const css = read('src/presentation/components/StudentNumberPad.css');
  assert.match(css, /\.snp-num\{[^}]*min-height:clamp\(56px/, 'number buttons are at least 56px');
  const join = read('src/presentation/QuickJoin.tsx');
  assert.match(join, /<StudentNumberPad [^>]*taken=\{taken\}/);
  assert.match(join, /isNumberTakenError/);
  assert.match(join, /학생으로 이어가기/);
  assert.match(join, /다른 학생으로 들어가기/);
  assert.match(join, /우리 모둠으로 입장/);
  assert.equal((join.match(/ui-btn--primary ui-btn--lg sui-block my-4/g) ?? []).length, 1, 'one primary enter button in the form');
  const lobby = read('src/presentation/Lobby.tsx');
  assert.equal((lobby.match(/<StudentNumberPad [^>]*taken=\{taken\}/g) ?? []).length, 2, 'PIN join and resume-profile forms both use the pad');
  assert.match(lobby, /다른 학생으로 들어가기/);
  const battle = read('src/presentation/components/QuickPinClassroom.tsx');
  assert.match(battle, /<StudentNumberPad /);
  assert.match(read('src/data/classroomRepository.ts'), /export const isNumberTakenError/);
  assert.match(read('src/presentation/PrivacyPage.tsx'), /번호\(1~99\)를 누릅니다/);
});

test('phone remote puts next and pause first, teams in a shape-coded grid, and rare actions behind more', () => {
  const page = read('src/presentation/FunRemotePage.tsx');
  const css = read('src/presentation/FunRemotePage.css');
  const big = page.indexOf('className="frp-big"');
  const teams = page.indexOf('className="frp-teams"');
  const more = page.indexOf('className="frp-more-toggle"');
  assert.ok(big > 0 && teams > big && more > teams, 'order: big buttons, teams, more');
  assert.match(page, /className="frp-next"[^>]*onClick=\{\(\)=>sendStep\(\{type:'next'\},nextLabel\)\}/);
  assert.match(page, /className="frp-pause"/);
  assert.match(page, /TEAM_SHAPES=\['●','▲','■','◆'\]/);
  assert.match(page, /aria-label=\{`\$\{teamName\(i\)\} 1점 더하기`\}/);
  assert.match(page, /aria-label=\{`\$\{teamName\(i\)\} 1점 빼기`\}/);
  assert.match(page, /teamName=\(i:number\)=>teams===1\?'우리 반':TEAM_NAMES\[i\]/, 'a single team is read as 우리 반');
  // Rare actions live in the collapsed group; skip and end both ask once more before sending.
  const moreBlock = page.slice(page.indexOf('{more&&<div className="frp-more"'), page.indexOf('className="frp-sheet-backdrop"'));
  assert.match(moreBlock, /events\.map/);
  assert.match(moreBlock, /마지막 승부로/);
  assert.match(moreBlock, /끝내기/);
  assert.doesNotMatch(moreBlock, /send(Step)?\(\{type:'end'\}/, 'end is only sent from its confirm');
  assert.doesNotMatch(moreBlock, /send(Step)?\(\{type:'next'\}/, 'skip is only sent from its confirm');
  assert.match(page, /게임을 지금 끝내고 결과 발표로 갈까요\?[\s\S]*sendStep\(\{type:'end'\},'끝내기'\)/);
  assert.match(page, /마지막 승부로 넘어갈까요\?[\s\S]*sendStep\(\{type:'next'\},'마지막 승부로'\)/);
  // In main play there is no dead giant next button: a calm status keeps the same first slot (pause never moves up).
  assert.match(page, /inPlay\|\|result\?<div className="frp-next frp-next-wait" role="status">/);
  assert.doesNotMatch(css, /\.frp-pause\{order:-1\}/);
  // Boss-raid-only special attack is hidden in other games.
  assert.match(page, /hasSpecial&&<button/);
  // Status and feedback lines are kept.
  assert.match(page, /TV에서 확인 중이에요/);
  assert.match(page, /className="frp-sent"/);
  assert.match(page, /navigator\.vibrate\?\.\(30\)/);
  // The two big buttons fill about half of a tall phone and sit side by side when the phone is turned.
  assert.match(css, /\.frp-big :is\(button,\.frp-next-wait\)\{min-height:clamp\(104px,21dvh,200px\)/);
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:520px\)\{[\s\S]*\.frp-big\{grid-template-columns:1fr 1fr\}/);
});
