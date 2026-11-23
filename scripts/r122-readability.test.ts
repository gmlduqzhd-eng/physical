import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/presentation/Readability.css', 'utf8');
test('wide screens (TV) enlarge the content boxes, not the game screens', () => {
  assert.match(css, /@media \(min-width:1600px\)\{\s*html body :is\(\.flow\.activity-tools-scope \.flow-wrap,\.unified-home>\.shell,\.hub-page\)\{zoom:1\.2\}/);
  assert.match(css, /@media \(min-width:2300px\)\{[^}]*zoom:1\.5/);
  assert.match(readFileSync('src/main.tsx', 'utf8'), /import '\.\/presentation\/Readability\.css'/);
});
test('small text is lifted to 14px and tap targets to 44px', () => {
  assert.match(css, /html body \.forest-brand-name small\{font-size:14px\}/);
  assert.match(css, /html body \.unified-home footer \.ys-credit\{font-size:14px\}/);
  assert.match(css, /html body \.hub-page \.hub-tabs button\{min-height:48px;font-size:16px\}/);
  assert.match(css, /html body \.flow input\[type=checkbox\],html body \.flow input\[type=radio\]\{width:24px;height:24px\}/);
});
test('headers look the same: no tagline in the flow header, brand + 처음으로 in the play collection', () => {
  assert.match(readFileSync('src/presentation/FlowShell.tsx', 'utf8'), /<ForestBrand\/>/);
  const hub = readFileSync('src/presentation/GameHub.tsx', 'utf8');
  assert.match(hub, /className="hub-brand activity-brand" aria-label="땀방울 원정대 처음으로"><ForestBrand\/>/);
  assert.match(hub, /title="처음으로" onClick=\{\(\) => navigate\('\/'\)\}><Home aria-hidden="true"\/><span>처음으로<\/span>/);
});
test('phone situation buttons are all visible (two columns, no sideways scroll)', () => {
  const lib = readFileSync('src/presentation/ActivityLibrary.css', 'utf8');
  assert.match(lib, /\.hub-quick-picks \.quick-picks-situations\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\);width:100%\}/);
  assert.doesNotMatch(lib, /quick-picks-situations\{flex-wrap:nowrap;overflow-x:auto/);
});
test('unknown activity address offers a way forward', () => {
  const play = readFileSync('src/presentation/GamePlayPage.tsx', 'utf8');
  assert.match(play, /data-game-not-found>이 활동을 찾을 수 없어요/);
  assert.match(play, /활동 고르기에서 찾기/);
  assert.match(play, /FEATURED_GAMES\.slice\(0, 4\)/);
});
