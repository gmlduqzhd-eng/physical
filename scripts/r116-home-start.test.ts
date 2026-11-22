import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CHANGE_METHOD_PATH, LESSON_METHOD_PATH, START_LESSON_PATH, lessonStartPath, parseLessonMethod } from '../src/application/lessonStartPrefs';
import { SCREEN, screenNameFor } from '../src/domain/glossary';
import { routeTitle } from '../src/domain/routeTitles';

const read = (path: string) => readFileSync(path, 'utf8');

test('수업 시작: 지난번 방식이 있으면 그 화면으로, 없으면 방식 고르기로', () => {
  assert.equal(lessonStartPath(null), START_LESSON_PATH);
  assert.equal(lessonStartPath('tv'), '/today');
  assert.equal(lessonStartPath('room'), '/teacher/setup');
  assert.equal(parseLessonMethod('tv'), 'tv');
  assert.equal(parseLessonMethod('room'), 'room');
  for (const bad of [null, undefined, '', 'TV', 'phone', 1]) assert.equal(parseLessonMethod(bad), null);
  assert.equal(CHANGE_METHOD_PATH, '/start-lesson?choose=1');
  // '기기 정보 지우기'가 지우는 이름(physical_ 로 시작)이어야 한다.
  assert.match(read('src/application/lessonStartPrefs.ts'), /const KEY='physical_lesson_method_v1'/);
  assert.match(read('src/application/browserStorage.ts'), /\^\(physical_\|/);
});

test('처음 화면: 입구는 세 개, 주 버튼은 화면에 하나(넓은 화면 수업 시작 · 폰 학생 참여)', () => {
  const home = read('src/presentation/UnifiedHomePage.tsx');
  assert.equal(home.split('className="entry-card"').length - 1, 3);
  for (const entry of ['lesson', 'student', 'find']) assert.match(home, new RegExp(`data-entry="${entry}"`));
  assert.ok(home.indexOf('data-entry="lesson"') < home.indexOf('data-entry="student"'));
  assert.ok(home.indexOf('data-entry="student"') < home.indexOf('data-entry="find"'));
  for (const gone of ['<QuickPicks', 'ENCYCLOPEDIA', 'className="roles"', '<details', '<picture']) assert.ok(!home.includes(gone), gone);
  assert.match(home, /지난번에 한 활동/);
  const css = read('src/presentation/EntryCards.css');
  assert.match(css, /\.home-entries \.entry-card\[data-entry="lesson"\] \.entry-btn\{background:var\(--e-action\);color:var\(--e-on-action\)\}/);
  // 폰: 학생 참여가 맨 위로 올라와 주 버튼이 되고, 수업 시작은 보조 버튼으로 돌아간다.
  const phone = css.slice(css.indexOf('.home-entries .entry-card[data-entry="student"]{order:-1'));
  assert.match(phone, /\[data-entry="student"\] \.entry-btn\{background:var\(--e-action\)/);
  assert.match(phone, /\[data-entry="lesson"\] \.entry-btn\{background:var\(--e-paper\)/);
  // 공용 토큰 이름을 쓰되(없으면 숲 테마 값), 여기서 다시 정하지는 않는다. 14px보다 작은 글씨는 없다.
  assert.match(css, /--e-action:var\(--ui-action,var\(--forest-action,#566d4d\)\)/);
  assert.doesNotMatch(css, /(^|[;{\s])--ui-[a-z0-9-]+\s*:/m);
  assert.doesNotMatch(css, /font-size:(?:[0-9]|1[0-3])px/);
  assert.match(css, /\.entry-btn\{[^}]*min-height:64px/);
});

test('수업 시작 화면: 두 방식 · 3단계 안내 · 다른 준비 방법 · 고른 방식 기억', () => {
  const page = read('src/presentation/StartLesson.tsx');
  assert.match(read('src/App.tsx'), /<Route path="\/start-lesson" element=\{<StartLesson \/>\} \/>/);
  for (const text of ['TV 한 대로 해요', '모둠마다 폰을 써요', '다른 준비 방법', '지난번에 고른 방식', '하던 수업 이어가기']) assert.ok(page.includes(text), text);
  assert.equal(page.split('<ol className="entry-steps">').length - 1, 2);
  for (const to of ['/lessons', '/teacher-ai', '/manual?tab=lesson', '/teacher/setup?resume=1']) assert.ok(page.includes(`to="${to}"`), to);
  assert.match(page, /to=\{LESSON_METHOD_PATH\.tv\} onClick=\{pick\('tv'\)\}/);
  assert.match(page, /to=\{LESSON_METHOD_PATH\.room\} onClick=\{pick\('room'\)\}/);
  assert.equal(LESSON_METHOD_PATH.tv, '/today');
  // 주 버튼은 하나: 지난번 방식(처음이면 TV 한 대) 카드만 강조한다.
  assert.match(page, /const focus: LessonMethod = last \?\? 'tv'/);
  // 바로 들어온 화면에는 '수업 방식 바꾸기'가 있다(그 방식을 기억하고 있을 때만).
  assert.match(read('src/presentation/TodayLesson.tsx'), /<LessonMethodLink method="tv"\/>/);
  assert.match(read('src/presentation/GuidedClassroom.tsx'), /<LessonMethodLink method="room"\/>/);
  assert.match(read('src/presentation/components/LessonMethodLink.tsx'), /if\(loadLessonMethod\(\)!==method\)return null/);
});

test('이름: 수업 시작 화면은 어디서나 같은 이름', () => {
  assert.equal(SCREEN.startLesson, '수업 시작');
  assert.equal(screenNameFor('/start-lesson?choose=1'), '수업 시작');
  assert.equal(routeTitle('/start-lesson'), '수업 시작 · 땀방울 원정대');
  assert.equal(routeTitle('/'), '땀방울 원정대');
  assert.equal(routeTitle('/start'), '땀방울 원정대');
});
