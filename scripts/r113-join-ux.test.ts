import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { takenNumberNotice, validateStudentIdentity } from '../src/application/studentIdentity';

const read = (path: string) => readFileSync(path, 'utf8');

test('이미 있는 번호 안내는 짧고, 이어가기 단추가 있을 때만 그 단추를 말한다', () => {
  const plain = takenNumberNotice(12, false);
  assert.match(plain, /^12번은 벌써 누가 들어왔어요\./);
  assert.doesNotMatch(plain, /이전 수업 이어가기/);
  assert.ok(plain.length <= 45, plain);
  assert.match(takenNumberNotice(3, true), /이전 수업 이어가기/);
});

test('번호판: 안내는 번호판 바로 위에, 막힌 칸 글씨는 14px 이상이고 줄바꿈하지 않는다', () => {
  const pad = read('src/presentation/components/StudentNumberPad.tsx');
  const css = read('src/presentation/components/StudentNumberPad.css');
  assert.match(pad, /className="snp-notice" role="alert"/);
  assert.ok(pad.indexOf('snp-notice') < pad.indexOf('snp-grid'), 'notice sits above the grid');
  assert.match(pad, /rootRef\.current\?\.scrollIntoView\(\{ block: 'start' \}\)/);
  assert.match(css, /\.snp \.snp-num small\{font-size:14px;[^}]*white-space:nowrap/);
  // '더 보기'는 사라지지 않고 펼치기·접기로 남아 포커스를 잃지 않는다.
  assert.match(pad, /aria-expanded=\{more\}/);
  assert.doesNotMatch(pad, /\{!more && <button/);
  // 입장 버튼은 화면 아래에 붙는다.
  assert.match(css, /\.snp-submit\{position:sticky;/);
  for (const page of ['src/presentation/Lobby.tsx', 'src/presentation/QuickJoin.tsx']) assert.match(read(page), /snp-submit/, page);
});

test("별명 칸은 'N번'으로 시작하는 별명을 지우지 않고, 'N번'만이면 제출할 때 자동 별명이 된다", () => {
  const pad = read('src/presentation/components/StudentNumberPad.tsx');
  assert.match(pad, /value=\{draft\}/);
  assert.doesNotMatch(pad, /value=\{custom \? nickname : ''\}/);
  assert.equal(validateStudentIdentity('7', '1번타자').nickname, '1번타자');
  assert.equal(validateStudentIdentity('7', '1번').nickname, '7번');
});

test('PIN을 바꾸면 다른 수업에서 막힌 번호 표시를 지운다(청백 배틀 입장 포함)', () => {
  const quick = read('src/presentation/components/QuickPinClassroom.tsx');
  assert.match(quick, /setTaken\(new Set\(\)\); setPadNotice\(''\);\s*setInputPin/);
  assert.match(read('src/presentation/Lobby.tsx'), /setTaken\(new Set\(\)\);setPadNotice\(''\);/);
});

test("'코드로 참여해요'를 누르면 PIN 칸으로 내려가고, QR 입장 안내는 '입장 버튼'이라고 한다", () => {
  const lobby = read('src/presentation/Lobby.tsx');
  assert.match(lobby, /codeFormRef\.current\?\.scrollIntoView/);
  assert.match(read('src/presentation/QuickJoin.tsx'), /입장 버튼을 눌러요/);
  assert.doesNotMatch(read('src/presentation/QuickJoin.tsx'), /입장 단추/);
});

test('폰 첫 화면·대표 게임 시작 화면·뒤로 단추·시범 버튼', () => {
  const home = read('src/presentation/UnifiedHomePage.css');
  assert.match(home, /\.unified-home \.home-hero-art\{position:relative;inset:auto;z-index:0;height:140px;/);
  const fun = read('src/presentation/components/fun/fun.css');
  assert.match(fun, /body:not\(:has\(#fun-dock-host \.fun-dock\)\) \.fun-intro\{margin-top:10px\}/);
  assert.match(read('src/presentation/GamePlayPage.css'), /\.game-tools-layout:has\(\.gameplay-toolbar\) \.game-utilities-bar \.icon-toolbar-action\[title="활동 목록으로"\]\{display:none!important\}/);
  // 시범 화면의 '▶ 연습 판 시작'은 아래 선생님 버튼 줄에만 있다.
  assert.match(read('src/presentation/components/minigames/signature/SignaturePlay.tsx'), /<DemoLoop frames=\{game\.demo\} seated=\{seated\}\/>/);
});

test('누르는 칸 44px: 놀이 화면 도구, 음성 안내, 카드 제목·규칙 펼치기, 아래쪽 링크', () => {
  const voice = read('src/presentation/components/TvVoiceToggle.css');
  assert.match(voice, /\.tv-voice-toggle\{[^}]*min-height:44px/);
  assert.match(voice, /\.tv-voice-more\{min-width:44px;min-height:44px/);
  const fun = read('src/presentation/components/fun/fun.css');
  assert.match(fun, /\.fun-dock \.fun-remote-btn,\.fun-dock \.fun-exit\{min-height:44px/);
  assert.doesNotMatch(fun, /\.fun-dock \.fun-tv-btn\{[^}]*min-height:40px/);
  const lib = read('src/presentation/ActivityLibrary.css');
  assert.match(lib, /\.activity-name-link\{display:inline-flex;align-items:center;min-height:44px\}/);
  assert.match(read('src/presentation/SimpleFlow.css'), /\.flow footer a\{display:inline-flex;align-items:center;min-height:44px\}/);
});
