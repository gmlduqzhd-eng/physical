import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FEATURE_SHORTCUTS, matchShortcuts } from '../src/domain/featureShortcuts';
import { LESSON_HELPERS, LESSON_HELPER_LINKS } from '../src/domain/lessonHelpers';
import { CLASS_TOOLS } from '../src/domain/classTools';
import { ENCYCLOPEDIA } from '../src/domain/encyclopedia';
import { routeTitle } from '../src/domain/routeTitles';

const read = (p: string) => readFileSync(p, 'utf8');

test('role swap and 8-beat fold for the TV, each with its own body class', () => {
  const tools = read('src/presentation/ClassTools.tsx');
  for (const id of ['rope-relay', 'role-swap', 'beat-moves']) assert.match(tools, new RegExp(`classList\\.toggle\\('tools-focus-${id}',focus\\)`));
  assert.doesNotMatch(tools, /toggle\('tools-focus',/, 'one shared class would let a hidden tool undo another');
  assert.match(tools, /data-swap-settings>⚙ 설정 열기/);
  assert.match(tools, /const focus=mode\?\.kind==='show';/);
  const css = read('src/presentation/ClassTools.css');
  assert.match(css, /body\.tools-focus-role-swap \.class-tools\[data-tool="role-swap"\]>\.tools-tabs/);
  assert.match(css, /body\.tools-focus-beat-moves \.class-tools\[data-tool="beat-moves"\]>h1/);
});

test('search shortcuts reach tools, safety and series that are not activities', () => {
  const titles = (q: string) => matchShortcuts(q).map(s => s.title);
  assert.deepEqual(titles('줄넘기'), ['모둠 이어 넘기']);
  assert.deepEqual(titles('수영'), ['수영장 가기 전']);
  assert.deepEqual(titles('배드민턴'), ['배드민턴 3차시']);
  assert.ok(titles('배구').includes('보자기 배구 3차시'));
  assert.ok(titles('비').includes('비 오는 날 실내로 바꾸기'));
  assert.deepEqual(titles(''), []);
  assert.deepEqual(titles('ㅋ'), [], 'one letter matches only an exact keyword');
  assert.ok(matchShortcuts('차시').length <= 4);
  assert.equal(new Set(FEATURE_SHORTCUTS.map(s => s.id)).size, FEATURE_SHORTCUTS.length);
  assert.ok(CLASS_TOOLS.every(t => FEATURE_SHORTCUTS.some(s => s.to === `/tools?tool=${t.id}`)), 'every tool can be found');
  assert.match(read('src/presentation/ActivityLibrary.tsx'), /data-search-shortcuts/);
});

test('manual, first-time guide, encyclopedia and tab title know the new features', () => {
  assert.equal(LESSON_HELPERS.length, 6);
  for (const h of LESSON_HELPERS) assert.equal(h.steps.length, 3);
  assert.match(read('src/presentation/Manual.tsx'), /<ManualLessonHelpers\/>/);
  assert.match(read('src/presentation/TeacherGuidePage.tsx'), /LESSON_HELPER_LINKS\.map/);
  assert.deepEqual(LESSON_HELPER_LINKS.map(l => l.to), ['/tools?tool=rope-relay', '/tools?tool=role-swap', '/tools?tool=beat-moves', '/today', '/week', '/safety/pool']);
  const tools = ENCYCLOPEDIA.find(e => e.id === 'tools')!;
  assert.match(tools.summary, /모둠 이어 넘기/); assert.match(tools.summary, new RegExp(`${CLASS_TOOLS.length}가지`));
  assert.equal(routeTitle('/safety/pool'), '수영장 가기 전 · 땀방울 원정대');
  assert.equal(routeTitle('/safety'), '안전 교실 · 땀방울 원정대');
});
