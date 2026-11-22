import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { countRawHex, countSmallFontCss, countSmallFontTsx, loadAllowlist, regressions, scan, TOKEN_FILES } from './ui-guard';
import { buttonClass, cardClass } from '../src/presentation/components/common/uiClass';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const HOW = '줄였다면 `npx tsx scripts/ui-guard.ts --update` 로 허용 개수를 낮추고, 늘었다면 --ui-* 변수와 14px 이상 글씨로 바꿔요.';

test('ui guard: counters recognise small fonts and raw colours', () => {
  assert.equal(countSmallFontCss('.a{font-size:12px}.b{font-size:14px}.c{font-size:clamp(11px,2vw,16px)}.d{font:700 13px/1.2 X}/* font-size:9px */'), 3);
  assert.equal(countSmallFontCss('.a{font-size:var(--ui-text-1)}.b{font-size:1.4rem}.c{font:700 18px X}'), 0);
  assert.equal(countSmallFontTsx('<p className="text-[10px] text-[14px] text-[13px]" style={{ fontSize: 12 }} />'), 3);
  assert.equal(countRawHex('.a{color:#fff;background:#566d4d;border-color:var(--x,#0f172a80)}/* #000 */', true), 3);
  assert.equal(countRawHex('.a{color:var(--ui-ink)}#fun-dock-host{inset:0}', true), 0);
});

test('ui guard: no file has more text below 14px than its allowed count', () => {
  const now = scan();
  const allowed = loadAllowlist();
  assert.deepEqual(regressions(now.smallFontCss, allowed.smallFontCss), [], `CSS에 14px보다 작은 글씨가 늘었어요. ${HOW}`);
  assert.deepEqual(regressions(now.smallFontTsx, allowed.smallFontTsx), [], `TSX에 14px보다 작은 글씨(text-[..px])가 늘었어요. ${HOW}`);
});

test('ui guard: no screen file gains raw hex colours outside the token files', () => {
  const now = scan();
  const allowed = loadAllowlist();
  assert.deepEqual(regressions(now.rawHex, allowed.rawHex), [], `화면 파일에 직접 적은 색(#hex)이 늘었어요. ${HOW}`);
  for (const file of TOKEN_FILES) assert.equal(file in allowed.rawHex, false, `${file}은 색의 원본이라 세지 않아요`);
});

test('ui tokens: ui.css is the single source and the old names point at it', () => {
  const ui = read('src/presentation/ui.css');
  for (const [name, value] of Object.entries({
    bg: '#faf8f2', paper: '#fffefa', tint: '#e9efe3', line: '#d8d6cc', ink: '#303d35', muted: '#5d675f', action: '#566d4d', 'action-press': '#3f5238',
    'on-action': '#ffffff', signal: '#f59e0b', danger: '#9e3833', stage: '#171819', 'on-stage': '#f2f1ec', 'stage-card': '#2b2d30', 'stage-danger': '#f1aba4',
  })) assert.match(ui, new RegExp(`--ui-${name}: ${value};`), `--ui-${name}`);
  for (const [step, px] of [[1, 14], [2, 16], [3, 18], [4, 22], [5, 28], [6, 40], [7, 64]]) assert.match(ui, new RegExp(`--ui-text-${step}: ${px}px;`));
  for (const [name, value] of [['1', '8px'], ['2', '14px'], ['3', '20px'], ['pill', '999px']]) assert.match(ui, new RegExp(`--ui-radius-${name}: ${value};`));
  // TV 모드는 글씨 단계를 1.5배로.
  assert.match(ui, /html\[data-tv-mode="on"\] \{[^}]*--ui-text-1: 21px;[^}]*--ui-text-7: 96px;/);
  for (const selector of ['.ui-btn {', '.ui-btn--primary {', '.ui-btn--secondary {', '.ui-btn--danger {', '.ui-btn--lg {', '.ui-card {', '.ui-card--focus {', '.ui-stage {']) assert.ok(ui.includes(selector), selector);
  assert.match(ui, /\.ui-btn \{[^}]*min-height: 48px;/);
  assert.match(ui, /\.ui-btn--lg \{[^}]*min-height: 64px;/);
  assert.match(ui, /\.ui-btn--danger \{[^}]*border-style: dashed;/);
  assert.match(ui, /\.ui-btn:focus-visible \{/);

  const palette = read('src/presentation/ApplicationPalette.css');
  for (const [forest, token] of [['bg', 'bg'], ['paper', 'paper'], ['ink', 'ink'], ['muted', 'muted'], ['line', 'line'], ['action', 'action'], ['on', 'on-action'], ['tint', 'tint'], ['danger', 'danger']]) {
    assert.match(palette, new RegExp(`--forest-${forest}: var\\(--ui-${token}\\);`), `--forest-${forest}`);
  }
  // 원본보다 먼저 불러야 값이 이어진다(앱·수업 준비실 모두).
  for (const entry of ['src/main.tsx', 'teacher-studio/main.tsx']) {
    const source = read(entry);
    assert.ok(source.indexOf('presentation/ui.css') > 0 && source.indexOf('presentation/ui.css') < source.indexOf('presentation/ApplicationPalette.css'), entry);
  }
  assert.match(read('scripts/prepare-studio-deploy.mjs'), /'src\/presentation\/ui\.css'/);
});

test('ui tokens: every old primary-button class resolves to the unified look', () => {
  const ui = read('src/presentation/ui.css');
  for (const name of ['lesson-primary', 'today-primary', 'pp-primary', 'mq-primary', 'flagship-primary', 'expedition-primary', 'hub-dialog-primary', 'ai-primary',
    'app-error-primary', 'game-stage-primary', 'role-start-cta', 'flagship-start-button', '.flow .primary', 'fun-primary', 'tqg-primary', 'frp-primary']) {
    assert.ok(ui.includes(name), name);
  }
  // 어두운 무대의 주 버튼은 밝게 채우고, 주황은 신호에만.
  assert.match(ui, /:is\(\.fun-primary, \.tqg-primary\) \{[^}]*background: var\(--ui-on-stage\);[^}]*color: var\(--ui-stage\);/);
});

test('ui classes: Button and Card helpers emit the shared class names', () => {
  assert.equal(buttonClass(), 'ui-btn ui-btn--secondary');
  assert.equal(buttonClass({ variant: 'primary', size: 'lg', block: true, className: 'x' }), 'ui-btn ui-btn--primary ui-btn--lg ui-btn--block x');
  assert.equal(buttonClass({ variant: 'danger' }), 'ui-btn ui-btn--danger');
  assert.equal(cardClass(), 'ui-card');
  assert.equal(cardClass({ focus: true, className: 'y' }), 'ui-card ui-card--focus y');
});
