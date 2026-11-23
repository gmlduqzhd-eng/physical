import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('water-drop friends pictures exist and are small', () => {
  for (const n of ['main', 'ball', 'jump']) assert.ok(existsSync(`public/images/mascot-${n}.webp`), n);
});
test('friends appear on the student entry, the empty favorites box and the unknown activity screen', () => {
  assert.match(readFileSync('src/presentation/Lobby.tsx', 'utf8'), /<MascotHello name="jump">번호만 누르면 같이 출발!<\/MascotHello>/);
  assert.match(readFileSync('src/presentation/GameHub.tsx', 'utf8'), /<MascotBadge name="ball" className="mx-auto mb-3"\/>/);
  assert.match(readFileSync('src/presentation/GamePlayPage.tsx', 'utf8'), /<MascotBadge name="main" className="mb-4"\/>\s*<h1[^>]*data-game-not-found/);
});
test('pictures are decorative (hidden from screen readers) and theme-aware', () => {
  assert.match(readFileSync('src/presentation/components/MascotBadge.tsx', 'utf8'), /alt="" aria-hidden="true"/);
  assert.match(readFileSync('src/presentation/components/MascotBadge.css', 'utf8'), /border:4px solid var\(--ui-paper\)/);
});
