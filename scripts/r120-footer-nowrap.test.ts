import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('home footer links never break mid-phrase; a link that does not fit moves whole to the next line', () => {
  const css = readFileSync('src/presentation/UnifiedHomePage.css', 'utf8');
  assert.match(css, /\.unified-home footer nav\{flex-wrap:wrap;/);
  assert.match(css, /\.unified-home footer nav a,\.unified-home footer \.ys-credit a\{white-space:nowrap\}/);
});
