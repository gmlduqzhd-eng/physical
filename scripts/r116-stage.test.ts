import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fun = readFileSync('src/presentation/components/fun/fun.css', 'utf8');
const sig = readFileSync('src/presentation/components/minigames/signature/SignaturePlay.tsx', 'utf8');
const remote = readFileSync('src/presentation/FunRemotePage.css', 'utf8');
const play = readFileSync('src/presentation/GamePlayPage.tsx', 'utf8');
const phone = readFileSync('src/presentation/components/minigames/common/PhonePlay.css', 'utf8');

test('대표 게임 무대는 공용 무대 색을 쓰고, 주 버튼은 밝게 채운 버튼이다', () => {
  assert.match(fun, /--fun-bg:var\(--ui-stage,#171819\)/);
  assert.match(fun, /\.fun-primary\{background:var\(--fun-primary\)/);
  assert.match(fun, /\.fun-controls button\[data-tone=primary\]\{background:var\(--fun-primary\)/);
});

test('주황은 신호에만 쓴다: 시작·진행 버튼과 타이머는 주황이 아니다', () => {
  assert.doesNotMatch(fun, /\.fun-primary\{[^}]*--fun-accent/);
  assert.doesNotMatch(fun, /\.fun-timer\{[^}]*background:var\(--fun-accent\)/);
  assert.match(fun, /\.fun-signal\{[^}]*border:3px solid var\(--fun-accent\)/);
});

test('끝내기·기록 없이 나가기는 붉은 점선 버튼이다', () => {
  assert.match(fun, /button\[data-tone=danger\]\{border:2px dashed var\(--fun-danger\)/);
  assert.match(sig, /className="fun-secondary fun-danger"[^\n]{0,160}기록 없이 나가기/);
});

test('게임 화면에서 청록·보라 버튼 색을 쓰지 않는다', () => {
  assert.doesNotMatch(fun, /#0e7490|#a855f7/i);
  assert.doesNotMatch(remote, /#0891b2/i);
  assert.doesNotMatch(play, /cyan-/);
  assert.doesNotMatch(phone, /#0e7490|#076d63/i);
});
