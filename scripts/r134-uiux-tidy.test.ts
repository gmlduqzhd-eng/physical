import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASS_TOOLS, TOOL_GROUPS } from '../src/domain/classTools';

const read = (p: string) => readFileSync(p, 'utf8');

test('tools are grouped by use, every tool exactly once, compact on phones', () => {
  assert.deepEqual(TOOL_GROUPS.map(g => g.label), ['모둠 활동', '시간 · 기록', '뽑기 · 나누기']);
  assert.deepEqual(TOOL_GROUPS.flatMap(g => g.tools).sort(), CLASS_TOOLS.map(t => t.id).sort());
  const tools = read('src/presentation/ClassTools.tsx');
  assert.match(tools, /data-tools-group=\{g\.id\}/);
  assert.ok(tools.indexOf('TOOL_GROUPS.map') < tools.indexOf('<OfflineReady compact/>'), 'the offline note sits below the tools');
  const css = read('src/presentation/ClassTools.css');
  assert.match(css, /@media\(max-width:640px\)\{[^]*\.tools-card \.tools-card-summary\{display:none\}/);
});

test('activity search comes first and the fit box folds on phones', () => {
  const src = read('src/presentation/ActivityLibrary.tsx');
  assert.ok(src.indexOf('activity-search-top') < src.indexOf('<QuickPicks'), 'search before the situation buttons');
  assert.equal(src.match(/type="search"/g)?.length, 1, 'one search box');
  assert.match(src, /data-fit-toggle/);
  const css = read('src/presentation/ActivityLibrary.css');
  assert.match(css, /\.activity-fit-toggle\{display:none\}/);
  assert.match(css, /@media\(max-width:700px\)\{[^]*\.activity-fit\[data-open="no"\]\{display:none\}/);
});

test('series chooser is cards; today links are buttons; tabs are green; phone header shows names', () => {
  assert.match(read('src/presentation/components/SportSeriesCard.tsx'), /className="week-series-pick"/);
  const today = read('src/presentation/TodayLesson.tsx');
  assert.match(today, /<nav className="today-shortcuts"/);
  assert.match(today, /today-guide-again/);
  const cp = read('src/presentation/ClassProgressPage.css');
  assert.match(cp, /\.cp-tabs button\[aria-current=page\]\{background:var\(--ui-action\);border-color:var\(--ui-action\);color:var\(--ui-on-action\)\}/);
  assert.match(read('src/presentation/ClassProgressPage.tsx'), /<p className="eyebrow">수업 도구 · 우리 반 기록<\/p>/);
  const header = read('src/presentation/components/HeaderToolbar.css');
  assert.match(header, /:not\(\.icon-toolbar-student\) :is\(\.music-trigger,\.share-trigger,\.icon-toolbar-action\)>span \{\s*position:static/);
});
