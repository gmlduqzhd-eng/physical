import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('remote waiting card is a light card with dark text (readable on the dark stage)', () => {
  const css = readFileSync('src/presentation/FunRemotePage.css', 'utf8');
  assert.match(css, /\.frp-next-wait\{background:var\(--ui-paper,#fffefa\);color:var\(--ui-ink,#303d35\)/);
});
test('big cue words wrap by word, not mid-word', () => {
  const css = readFileSync('src/presentation/components/minigames/common/PhonePlay.css', 'utf8');
  assert.match(css, /word-break:keep-all/);
});
