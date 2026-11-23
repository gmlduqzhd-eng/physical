import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// 대표 게임 시작 화면의 '팀 수' 단추: TV 모드에서 "4팀 (청팀·홍팀·황팀·녹팀)"이 단추 밖으로 넘치던 오류.
test('team-count buttons wrap the team names instead of overflowing', () => {
  const css = readFileSync('src/presentation/components/fun/fun.css', 'utf8');
  const tv = css.split('\n').find(l => l.includes('html[data-tv-mode="on"] .fun-intro .fun-choice button')) ?? '';
  assert.ok(!tv.includes('nowrap'), 'TV-mode team buttons must not force one line');
  assert.match(css, /\.fun-choice button small\{/);
  const tsx = readFileSync('src/presentation/components/minigames/signature/SignaturePlay.tsx', 'utf8');
  assert.match(tsx, /<strong>\{n\}팀<\/strong><small>\{TEAM_NAMES\.slice\(0,n\)\.join\('·'\)\}<\/small>/);
});
