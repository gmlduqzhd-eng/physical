import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { HOME_COUNTS } from '../src/domain/homeIndex.generated';

test('teacher screens used during class are precached, with final file names', () => {
  const cfg = readFileSync('vite.config.ts', 'utf8');
  assert.ok(cfg.includes('PRECACHE_ROUTES = /\\/src\\/presentation\\/(?:Lobby|QuickJoin|MobileMissionView|StartLesson|TodayLesson|ActivityLibrary|ClassTools|WeekPlanPage|ClassJourney|ClassProgressPage|GamePlayPage|components\\/TodayLessonBar)\\.tsx$/'));
  assert.match(cfg, /writeBundle\(options, bundle\)/);
  assert.doesNotMatch(cfg, /generateBundle\(_options, bundle\)/);
});
test('offline chunk failure says the internet is down and retries when back online', () => {
  const src = readFileSync('src/components/ErrorBoundary.tsx', 'utf8');
  assert.match(src, /navigator\.onLine === false/);
  assert.match(src, /인터넷이 끊겨서 이 화면을 아직 못 받았어요/);
  assert.match(src, /addEventListener\('online', this\.retryWhenOnline\)/);
});
test('share preview uses the current picture and the real activity count', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.ok(existsSync('public/share-friends-v1.jpg'));
  assert.match(html, /og:image" content="https:\/\/physical-pi\.vercel\.app\/share-friends-v1\.jpg"/);
  assert.match(html, new RegExp(`name="description" content="[^"]*활동 ${HOME_COUNTS.total}개`));
  assert.doesNotMatch(readFileSync('public/manifest.json', 'utf8'), /게임화 미션 플랫폼/);
});
