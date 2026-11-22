import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadVoicePrefs, mergeVoicePrefs, LEGACY_VOICE_COACH_KEY } from '../src/application/voicePrefs';
import { SPEECH_PREFS_KEY } from '../src/application/speechAnnouncer';
import { SCREEN } from '../src/domain/glossary';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const store = (values: Record<string, string>) => (key: string) => values[key] ?? null;

test('voice: a legacy "off" survives even when the TV voice value already exists', () => {
  const tv = JSON.stringify({ on: true, rate: 'slow', volume: 'normal' });
  const merged = loadVoicePrefs(store({ [SPEECH_PREFS_KEY]: tv, [LEGACY_VOICE_COACH_KEY]: 'false' }));
  assert.equal(merged.on, false);
  assert.equal(merged.rate, 'slow');
  assert.equal(loadVoicePrefs(store({ [SPEECH_PREFS_KEY]: tv, [LEGACY_VOICE_COACH_KEY]: 'true' })).on, true);
  assert.equal(loadVoicePrefs(store({ [SPEECH_PREFS_KEY]: tv })).on, true);
});

test('voice: a stale tab only writes the field it changed', () => {
  const stored = { on: false, rate: 'normal', volume: 'normal' } as const;
  const staleBefore = { on: true, rate: 'normal', volume: 'normal' } as const;
  // 오래된 탭(켜짐으로 알고 있음)이 속도만 바꾼다: 다른 탭에서 꺼 둔 값은 그대로다.
  assert.deepEqual(mergeVoicePrefs({ ...stored }, { ...staleBefore }, { ...staleBefore, rate: 'slow' }), { on: false, rate: 'slow', volume: 'normal' });
  assert.deepEqual(mergeVoicePrefs({ ...stored }, { ...staleBefore }, { ...staleBefore, on: false }), { ...stored });
  const src = read('src/application/voicePrefs.ts');
  assert.match(src, /addEventListener\?\.\('storage'/);
});

test('theme: follows other tabs and only inherits a legacy "dark" tab choice', () => {
  const src = read('src/application/ThemeContext.tsx');
  assert.match(src, /addEventListener\?\.\('storage'/);
  assert.match(src, /getItem\(legacyTabKey\) === 'dark' \? 'dark' : null/);
});

test('remote: status slot shares the button height rule, banners sit below the big buttons, toast hides itself', () => {
  const css = read('src/presentation/FunRemotePage.css');
  assert.equal((css.match(/\.frp-big :is\(button,\.frp-next-wait\)\{min-height/g) ?? []).length, 4);
  assert.doesNotMatch(css, /\.frp-next-wait\{min-height/);
  assert.match(css, /\.frp-sent:not\(:empty\)\{position:fixed[^}]*pointer-events:none/);
  const tsx = read('src/presentation/FunRemotePage.tsx');
  assert.ok(tsx.indexOf('className="frp-big"') < tsx.indexOf('className="frp-paused"'), 'banner must come after the big buttons');
  assert.match(tsx, /setTimeout\(\(\)=>setSent\(null\),sent\.tone==='ok'\?2500:6000\)/);
  assert.match(tsx, /inPlay\|\|result\?<div className="frp-next frp-next-wait"/);
  assert.doesNotMatch(tsx, /frp-done/);
});

test('remote has one name everywhere', () => {
  assert.equal(SCREEN.funRemote, '휴대폰 리모컨');
  const tsx = read('src/presentation/FunRemotePage.tsx');
  assert.doesNotMatch(tsx, /대표 게임 리모컨|TV 리모컨 창/);
  assert.match(tsx, /<h1>📱 휴대폰 리모컨<\/h1>/);
});

test('today: the day key is refreshed when the tab comes back, and reshuffle counts under the current day', () => {
  const src = read('src/presentation/TodayLesson.tsx');
  assert.match(src, /addEventListener\('visibilitychange',sync\)/);
  assert.match(src, /const next=\(today===day\?shuffle:loadTodayShuffle\(now\)\)\+1/);
});

test('settings popover: closes when focus leaves, studio gets absolute check links, readable music text', () => {
  assert.match(read('src/presentation/components/HeaderPopover.tsx'), /document\.addEventListener\('focusin', focusLeft\)/);
  const util = read('src/presentation/components/HeaderUtilities.tsx');
  assert.match(util, /export function setHeaderCheckLinkBase/);
  assert.match(util, /aria-disabled=\{share\.sharing \|\| undefined\}/);
  assert.match(read('teacher-studio/main.tsx'), /setHeaderCheckLinkBase\(/);
  assert.match(read('src/presentation/components/HeaderUtilities.css'), /\.header-settings-popover \.background-music-title small\{font-size:13px\}/);
});

test('class screens: no 9–11px text, 44px targets, one word for a task, Esc leaves', () => {
  for (const file of ['common/ExpressionActivityLayout.tsx', 'common/YouTubeExpressionPlayer.tsx', 'EmotionThermometer.tsx', 'common/PhysicalActivityLayout.tsx'])
    assert.doesNotMatch(read(`src/presentation/components/minigames/${file}`), /text-\[(9|10|11)px\]/, file);
  assert.match(read('src/presentation/components/minigames/common/ExpressionActivity.css'), /\.expression-now-pause\{min-height:44px/);
  assert.match(read('src/presentation/components/TodayLessonBar.css'), /\[data-mode="playing"\] :is\(\.today-bar-next,\.today-bar-skip\)::after/);
  const cls = read('src/presentation/components/minigames/common/PhonePlayClass.tsx');
  assert.match(cls, /e\.key==='Escape'/);
  assert.doesNotMatch(cls, /\/\$\{p\.rounds\.length\}단계/);
  assert.match(read('src/presentation/components/minigames/common/ExpressionActivityLayout.tsx'), /useModalDialog\(showAchievementModal/);
  assert.doesNotMatch(read('src/presentation/components/minigames/common/PhonePlay.css'), /line-through;outline:none/);
  assert.doesNotMatch(read('src/presentation/DisplayCheckPage.tsx'), /backLabel="이용 안내"/);
});
