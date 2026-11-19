import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseCountdownSaved, parseRaceSaved, STALE_RACE_MS, withRo } from '../src/domain/classTools';
import { routeTitle } from '../src/domain/routeTitles';
import { printSet } from '../src/domain/printSets';
import { lastEntryFor, lastRoomFor, rememberLastEntry, RESUME_WINDOW_MS, switchToAnotherStudent } from '../src/application/lastStudentEntry';
import { rememberStudentIdentity, savedStudentIdentity } from '../src/application/studentIdentity';
import { readStorage } from '../src/application/browserStorage';

const read = (file: string) => readFileSync(file, 'utf8');

test('로/으로 follows the final consonant of the countdown label', () => {
  assert.equal(withRo('30초'), '30초로');
  assert.equal(withRo('1분'), '1분으로');
  assert.equal(withRo('3분'), '3분으로');
  assert.equal(withRo('5분'), '5분으로');
  assert.equal(withRo('교실'), '교실로', 'ㄹ받침 takes 로');
  assert.equal(withRo('5:00'), '5:00로', 'non-Hangul ending falls back to 로');
  const tools = read('src/presentation/ClassTools.tsx');
  assert.doesNotMatch(tools, /\$\{label\(pending\)\}로/, 'no fixed 로 after a preset label');
  assert.match(tools, /withRo\(label\(pending\)\)/);
});

test('countdown asks before replacing a paused remaining time, keeps focus usable and hides the start button while running', () => {
  const tools = read('src/presentation/ClassTools.tsx');
  assert.match(tools, /if\(running\|\|\(!fresh&&!done\)\)\{setPending\(seconds\);return;\}/);
  assert.match(tools, /멈춰 둔 남은 시간이 지워져요/);
  assert.match(tools, /focusNext\.current='start-soft'/, 'time running out moves focus back to 시작');
  assert.match(tools, /requestAnimationFrame\(\(\)=>focusStart\(\)\)/, '처음으로 while paused keeps focus on a control');
  assert.match(tools, /disabled=\{running\} hidden=\{running\}/);
});

test('a restored record keeps its original save time so reloads do not extend the keep window', () => {
  const tools = read('src/presentation/ClassTools.tsx');
  assert.match(tools, /const stamp=useRef\(saved\?\.savedAt\?\?Date\.now\(\)\),staleKept=useRef\(!!saved\?\.stale\),firstWrite=useRef\(true\)/);
  assert.match(tools, /if\(!restoring\|\|running\)\{stamp\.current=Date\.now\(\);staleKept\.current=false;\}/);
  assert.match(tools, /savedAt:stamp\.current,\.\.\.\(staleKept\.current\?\{stale:true\}:\{\}\)/);
  assert.doesNotMatch(tools, /savedAt:Date\.now\(\)/);
  const now = Date.UTC(2026, 10, 19, 3, 0, 0);
  const lanes = Array(8).fill(null);
  // A stale race restored once is written back stopped with stale:true; reloading must still say it was stale.
  const first = parseRaceSaved({ lanes: 4, times: lanes, ms: 5000, running: true, savedAt: now - STALE_RACE_MS - 1 }, now);
  assert.equal(first?.stale, true);
  assert.equal(first?.running, false);
  const again = parseRaceSaved({ lanes: 4, times: lanes, ms: 5000, running: false, savedAt: first!.savedAt, stale: true }, now + 1000);
  assert.equal(again?.stale, true, 'stale notice survives a reload until the teacher acts');
  const touched = parseRaceSaved({ lanes: 4, times: lanes, ms: 5000, running: false, savedAt: now }, now + 1000);
  assert.equal(touched?.stale, undefined);
  // Countdown records still expire one hour after the original save, not after the latest reload.
  assert.equal(parseCountdownSaved({ total: 180, left: 90, running: false, endAt: null, savedAt: now - 60 * 60 * 1000 - 1 }, now), null);
});

test('hub ignores unknown grade and device values in the address', () => {
  const lib = read('src/presentation/ActivityLibrary.tsx');
  assert.match(lib, /\(GRADE_OPTIONS as readonly string\[\]\)\.includes\(raw\)\?raw:'전체'/);
  assert.match(lib, /\(DEVICE_OPTIONS as readonly string\[\]\)\.includes\(raw\)\?raw:'전체'/);
  assert.doesNotMatch(lib, /params\.get\('grade'\)\|\|'전체'/);
});

test('lobby resume respects the 4-hour window and another student starts clean', async () => {
  const now = Date.now();
  rememberStudentIdentity({ number: 7, nickname: '바람' });
  rememberLastEntry({ room_id: 'room-9', group_id: 'g-9', group_name: '3모둠' }, now);
  assert.deepEqual(lastRoomFor(undefined, undefined, now + 1000), { room: 'room-9', group: 'g-9', groupName: '3모둠' });
  assert.equal(lastRoomFor(undefined, undefined, now + RESUME_WINDOW_MS + 1), null, 'older than the class session');
  await switchToAnotherStudent();
  assert.equal(lastRoomFor(undefined, undefined, now + 1000), null);
  assert.equal(lastEntryFor(undefined, undefined, now + 1000), null);
  assert.deepEqual(savedStudentIdentity(), { number: '', nickname: '' }, 'student A number and nickname are gone');
  assert.equal(readStorage('physical_student_role'), null);
  const lobby = read('src/presentation/Lobby.tsx');
  assert.match(lobby, /useState\(\(\)=>lastRoomFor\(\)\)/);
  assert.match(lobby, /다른 학생으로 들어가기/);
  assert.doesNotMatch(lobby, /readStorage\('physical_last_room'\)/);
  const entry = read('src/application/lastStudentEntry.ts');
  assert.match(entry, /supabase\.auth\.signOut\(\{ scope: 'local' \}\)/, 'the anonymous class connection is dropped so student B never inherits A');
  assert.match(read('src/presentation/QuickJoin.tsx'), /void switchToAnotherStudent\(\)/);
});

test('music never stays "blocked" where it is not supposed to play', () => {
  const music = read('src/application/BackgroundMusicContext.tsx');
  assert.match(music, /if \(!eligibleRef\.current \|\| suppressedRef\.current \|\| lessonPausedRef\.current \|\| document\.hidden\) \{\n\s+setBlocked\(false\);/);
  assert.match(music, /if \(value\) \{ audioRef\.current\?\.pause\(\); setBlocked\(false\); \}/);
  assert.match(music, /blocked: enabled && eligible && blocked/);
});

test('tab titles name the tool, the print page and the admin panel', () => {
  assert.equal(routeTitle('/tools', undefined, '?tool=race'), '레이스 시계 · 수업 도구 · 땀방울 원정대');
  assert.equal(routeTitle('/tools', undefined, '?tool=timer'), '카운트다운 · 수업 도구 · 땀방울 원정대');
  assert.equal(routeTitle('/tools', undefined, '?tool=nope'), '수업 도구 · 땀방울 원정대');
  assert.equal(routeTitle('/tools'), '수업 도구 · 땀방울 원정대');
  assert.equal(routeTitle('/print/signature-cards'), '대표 게임 규칙 카드 인쇄 · 땀방울 원정대');
  assert.equal(routeTitle('/print'), '인쇄 자료 · 땀방울 원정대');
  assert.equal(routeTitle('/admin'), '교사 제어 패널 · 땀방울 원정대');
  assert.match(read('src/presentation/components/RouteTitle.tsx'), /routeTitle\(pathname,undefined,search\)/);
});

test('the two number-marker print sets say what each one is for', () => {
  assert.match(printSet('numbers9')!.title, /^번호 표식 1~9 · 막힌 길 피해 가기용/);
  assert.match(printSet('numbers6')!.title, /^번호 표식 1~6 · 숫자 암호 우편·빈 섬 탐사대용/);
  assert.match(read('src/presentation/PrintCards.tsx'), /printSet\(id\)!\.note/);
});

test('dark mode makes the forest, river and tower squares and visited ones stand out', () => {
  const css = read('src/presentation/flagship/flagship.css');
  assert.match(css, /html\.dark-theme \.cooperative-map \.map-route span\{border-color:#a3acb4;color:#f2f1ec\}/);
  assert.match(css, /html\.dark-theme \.cooperative-map \.map-route \[data-visited=true\]\{background:#1f4d36;border-color:#7fd1a1;color:#f2f1ec\}/);
});
