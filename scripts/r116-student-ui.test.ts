import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path: string) => readFileSync(path, 'utf8');

test('student and shared screens use the unified button classes with token fallbacks', () => {
  const css = read('src/presentation/StudentUi.css');
  for (const cls of ['ui-btn--primary', 'ui-btn--secondary', 'ui-btn--danger', 'ui-btn--lg', 'ui-card--focus']) assert.match(css, new RegExp(`\\.${cls}`), cls);
  assert.match(css, /min-height:64px/, 'large buttons are 64px');
  assert.match(css, /var\(--ui-action,var\(--forest-action,#566d4d\)\)/, 'tokens fall back to the forest palette');
  assert.doesNotMatch(css, /--ui-[a-z0-9-]+\s*:/, 'this file never defines tokens');
});

test('one primary per student screen, help is secondary', () => {
  const mobile = read('src/presentation/MobileMissionView.tsx');
  const guided = mobile.slice(mobile.indexOf('student-guided-room'), mobile.indexOf('if (myGroup?.is_hacked)'));
  assert.equal((guided.match(/ui-btn--primary/g) ?? []).length, 1, 'only 게임 시작 is primary');
  assert.match(guided, /student-guided-help ui-btn ui-btn--secondary/);
  assert.doesNotMatch(mobile, /bg-cyan-700 text-white rounded-2xl/);
  for (const file of ['src/presentation/QuickJoin.tsx', 'src/presentation/Lobby.tsx', 'src/presentation/BoardEntry.tsx', 'src/presentation/KioskRelayView.tsx']) assert.match(read(file), /ui-btn--primary ui-btn--lg/, file);
});

test('no 9-13px text on the student and shared screens touched here', () => {
  for (const file of ['src/presentation/TeacherRemote.tsx', 'src/presentation/KioskRelayView.tsx', 'src/presentation/ScoreBoard.tsx']) assert.doesNotMatch(read(file), /text-xs\b|text-\[(9|10|11|12|13)px\]/, file);
  assert.doesNotMatch(read('src/presentation/IntroLandingPage.css'), /font-size:\s*(9|10|11|12|13)px/);
});
