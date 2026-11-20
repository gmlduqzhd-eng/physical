import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PAD_KEYS, cleanStudentNumber, padKeyLabel, pressPadKey } from '../src/application/studentNumberPad';
import { validateStudentIdentity } from '../src/application/studentIdentity';

const read = (file: string) => readFileSync(file, 'utf8');

test('number pad builds only student numbers 1 to 99', () => {
  assert.equal(pressPadKey('', '0'), '', 'a leading zero is ignored');
  assert.equal(pressPadKey('', '7'), '7');
  assert.equal(pressPadKey('7', '0'), '70');
  assert.equal(pressPadKey('1', '2'), '12');
  assert.equal(pressPadKey('12', 'back'), '1');
  assert.equal(pressPadKey('1', 'back'), '');
  assert.equal(pressPadKey('', 'back'), '');
  assert.equal(pressPadKey('45', 'clear'), '');
  // After two digits, another digit starts a new number so the child need not find the erase key.
  assert.equal(pressPadKey('12', '3'), '3');
  assert.equal(pressPadKey('12', '0'), '12');
  // Whatever sequence is pressed, the result is empty or passes the same validation the join uses.
  let value = '';
  for (const key of ['0', '0', '9', '9', '9', '0', 'back', '5', 'clear', '3', '0'] as const) {
    value = pressPadKey(value, key);
    assert.match(value, /^(?:|[1-9]|[1-9]\d)$/);
    if (value) assert.equal(validateStudentIdentity(value, '바람').number, Number(value));
  }
});

test('typed numbers are cleaned the same way and every key has a spoken name', () => {
  assert.equal(cleanStudentNumber('012'), '12');
  assert.equal(cleanStudentNumber('a3b'), '3');
  assert.equal(cleanStudentNumber('1234'), '12');
  assert.equal(cleanStudentNumber('00'), '');
  assert.equal(PAD_KEYS.length, 12);
  assert.deepEqual([...PAD_KEYS].filter(key => /^\d$/.test(key)).sort(), ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
  assert.equal(padKeyLabel('back'), '한 글자 지우기');
  assert.equal(padKeyLabel('clear'), '모두 지우기');
  assert.equal(padKeyLabel('5'), '5');
});

test('student join shows the number pad on one screen and keeps resume and switch-student', () => {
  const pad = read('src/presentation/components/StudentNumberPad.tsx');
  // The labels stay the same so existing journeys can still find the fields.
  assert.match(pad, /학생 번호 \(1~99\)/);
  assert.match(pad, /별명 \(2~12자\)/);
  assert.match(pad, /aria-label="번호 숫자판"/);
  assert.match(pad, /inputMode="none"/, 'the on-screen pad replaces the system keyboard for the number');
  const join = read('src/presentation/QuickJoin.tsx');
  assert.match(join, /<StudentNumberPad /);
  assert.match(join, /학생으로 이어가기/);
  assert.match(join, /다른 학생으로 들어가기/);
  assert.match(join, /우리 모둠으로 입장/);
  assert.equal((join.match(/bg-cyan-700 text-white rounded-xl p-4 font-bold my-4/g) ?? []).length, 1, 'one primary enter button in the form');
  const lobby = read('src/presentation/Lobby.tsx');
  assert.equal((lobby.match(/<StudentNumberPad /g) ?? []).length, 2, 'PIN join and resume-profile forms both use the pad');
  assert.match(lobby, /다른 학생으로 들어가기/);
  assert.doesNotMatch(join + lobby, /StudentIdentityFields/);
});

test('phone remote puts next and pause first, teams in a shape-coded grid, and rare actions behind more', () => {
  const page = read('src/presentation/FunRemotePage.tsx');
  const css = read('src/presentation/FunRemotePage.css');
  const big = page.indexOf('className="frp-big"');
  const teams = page.indexOf('className="frp-teams"');
  const more = page.indexOf('className="frp-more-toggle"');
  assert.ok(big > 0 && teams > big && more > teams, 'order: big buttons, teams, more');
  assert.match(page, /className="frp-next"[^>]*onClick=\{\(\)=>send\(\{type:'next'\},'다음'\)\}/);
  assert.match(page, /className="frp-pause"/);
  assert.match(page, /TEAM_SHAPES=\['●','▲','■','◆'\]/);
  assert.match(page, /aria-label=\{`\$\{TEAM_NAMES\[i\]\} 1점 더하기`\}/);
  assert.match(page, /aria-label=\{`\$\{TEAM_NAMES\[i\]\} 1점 빼기`\}/);
  // Rare actions live in the collapsed group; skip and end both ask once more before sending.
  const moreBlock = page.slice(page.indexOf('{more&&<div className="frp-more"'), page.indexOf('{confirmSkip&&'));
  assert.match(moreBlock, /events\.map/);
  assert.match(moreBlock, /마지막 승부로/);
  assert.match(moreBlock, /끝내기/);
  assert.doesNotMatch(moreBlock, /send\(\{type:'end'\}/, 'end is only sent from its confirm');
  assert.doesNotMatch(moreBlock, /send\(\{type:'next'\}/, 'skip is only sent from its confirm');
  assert.match(page, /aria-label="게임 끝내기"[\s\S]*send\(\{type:'end'\},'끝내기'\)/);
  assert.match(page, /aria-label="마지막 승부로 건너뛰기"[\s\S]*send\(\{type:'next'\},'마지막 승부로'\)/);
  // In main play the big next button rests: the round moves on by itself and skipping needs the confirm.
  assert.match(page, /disabled=\{!live\|\|result\|\|paused\|\|inPlay\}/);
  // Status and feedback lines are kept.
  assert.match(page, /TV에서 확인 중이에요/);
  assert.match(page, /className="frp-sent"/);
  assert.match(page, /navigator\.vibrate\?\.\(30\)/);
  // The two big buttons fill about half of a tall phone and sit side by side when the phone is turned.
  assert.match(css, /\.frp-big button\{min-height:clamp\(104px,21dvh,200px\)/);
  assert.match(css, /@media \(orientation:landscape\) and \(max-height:520px\)\{[\s\S]*\.frp-big\{grid-template-columns:1fr 1fr\}/);
});
