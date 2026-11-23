import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('skip link always has a target and sits inside a landmark', () => {
  const src = readFileSync('src/presentation/components/RouteTitle.tsx', 'utf8');
  assert.match(src, /if\(!main\.id\)main\.id='main'/);
  assert.match(src, /new MutationObserver/);
  assert.match(src, /<nav className="skip-nav" aria-label="바로 가기"><a className="skip-link" href="#main"/);
});
test('every screen has one main landmark (play collection, connection notice) and named asides', () => {
  assert.match(readFileSync('src/presentation/GameHub.tsx', 'utf8'), /<main className="hub-page /);
  assert.match(readFileSync('src/App.tsx', 'utf8'), /const SupabaseRequired = \(\) => \(\n {2}<main className=/);
  const manual = readFileSync('src/presentation/Manual.tsx', 'utf8');
  assert.match(manual, /aria-label="처음 쓰는 선생님 안내"/);
  assert.match(manual, /aria-label="AI 수업 준비 안내"/);
});
test('far islands keep readable text (only stamps are dimmed)', () => {
  const css = readFileSync('src/presentation/ClassJourney.css', 'utf8');
  assert.doesNotMatch(css, /\.journey-island\[data-state=ahead\]\{opacity/);
  assert.match(css, /\.journey-island\[data-state=ahead\]>:not\(\.journey-head\):not\(p\)\{opacity:\.62\}/);
});
test('first screen does not wait for fonts (no font preloads; fonts swap in)', () => {
  assert.doesNotMatch(readFileSync('index.html', 'utf8'), /rel="preload"[^>]*as="font"/);
  assert.match(readFileSync('src/presentation/fontFaces.css', 'utf8'), /font-display:swap/);
});
