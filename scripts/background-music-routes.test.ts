import test from 'node:test';
import assert from 'node:assert/strict';
import { allowsBackgroundMusic } from '../src/application/backgroundMusicRoutes';

test('shared music follows teacher and student entry journeys', () => {
  for (const route of ['/', '/teacher', '/teacher/setup', '/teacher/room/room-1', '/lobby', '/solo', '/records']) {
    assert.equal(allowsBackgroundMusic(route), true, route);
    if (route !== '/') assert.equal(allowsBackgroundMusic(`${route}/`), true, `${route}/`);
  }
});

test('activity sounds remain separate from the shared background track', () => {
  for (const route of ['/play/reaction', '/solo/play/phone-play-001', '/mobile/room-1/group-1', '/board/room-1', '/kiosk']) {
    assert.equal(allowsBackgroundMusic(route), false, route);
  }
});

test('unknown nested paths do not inherit a music permission from a prefix', () => {
  for (const route of ['/teacher/unknown', '/teacher/room', '/teacher/room/room-1/extra', '/lobby/unknown', '/solo/play']) {
    assert.equal(allowsBackgroundMusic(route), false, route);
  }
});
