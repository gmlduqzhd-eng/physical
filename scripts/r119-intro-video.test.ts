import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

test('home shows the intro video next to the title', () => {
  const home = readFileSync('src/presentation/UnifiedHomePage.tsx', 'utf8');
  assert.match(home, /className="entry-head has-intro"[^]*<IntroVideo\/>/);
});
test('intro video loads only when opened, and stops when closed', () => {
  const src = readFileSync('src/presentation/components/IntroVideo.tsx', 'utf8');
  assert.match(src, /preload="none"/);
  assert.match(src, /onClose=\{\(\) => video\.current\?\.pause\(\)\}/);
  assert.match(src, /aria-label="소개 영상 닫기"/);
});
test('phone shows a single button instead of the card', () => {
  const css = readFileSync('src/presentation/components/IntroVideo.css', 'utf8');
  assert.match(css, /@media\(max-width:900px\)\{[^}]*\.entry-head\.has-intro\{grid-template-columns:1fr\}\s*\.entry-head \.intro-video-card\{display:none\}\s*\.entry-head \.intro-video-link\{display:inline-flex/);
});
test('video files exist, are web-sized, and are not precached by the service worker', () => {
  for (const f of ['public/media/intro.mp4', 'public/media/intro-poster.jpg']) assert.ok(existsSync(f), f);
  assert.ok(statSync('public/media/intro.mp4').size < 20 * 1024 * 1024);
  const sw = readFileSync('public/sw.js', 'utf8');
  assert.doesNotMatch(sw, /\/media\//);
});
