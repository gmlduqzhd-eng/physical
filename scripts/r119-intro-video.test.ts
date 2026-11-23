import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';

test('home shows the intro video button inside the sky banner', () => {
  const home = readFileSync('src/presentation/UnifiedHomePage.tsx', 'utf8');
  assert.match(home, /className="home-sky-text"><h1 id="home-title">무엇을 할까요\?<\/h1><p>[^<]+<\/p><IntroVideo\/><\/div>/);
});
test('intro video loads only when opened, and stops when closed', () => {
  const src = readFileSync('src/presentation/components/IntroVideo.tsx', 'utf8');
  assert.match(src, /preload="none"/);
  assert.match(src, /onClose=\{\(\) => video\.current\?\.pause\(\)\}/);
  assert.match(src, /aria-label="소개 영상 닫기"/);
});
test('video files exist, are web-sized, and are not precached by the service worker', () => {
  for (const f of ['public/media/intro.mp4', 'public/media/intro-poster.jpg']) assert.ok(existsSync(f), f);
  assert.ok(statSync('public/media/intro.mp4').size < 20 * 1024 * 1024);
  const sw = readFileSync('public/sw.js', 'utf8');
  assert.doesNotMatch(sw, /\/media\//);
});
