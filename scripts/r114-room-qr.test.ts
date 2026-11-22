import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { joinAddress } from '../src/application/joinAddress';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('짧은 입장 주소는 도메인/lobby 형태로 보여 준다', () => {
  assert.equal(joinAddress('https://physical-pi.vercel.app'), 'physical-pi.vercel.app/lobby');
  assert.equal(joinAddress('http://127.0.0.1:5173/'), '127.0.0.1:5173/lobby');
  assert.equal(joinAddress('not a url'), '/lobby');
});

test('수업방을 만들면 학생 입장 QR을 바로 크게 띄우고, 그 안에서 수업을 시작할 수 있다', () => {
  const setup = read('src/presentation/GuidedClassroom.tsx');
  assert.match(setup, /justCreated:true/);
  const room = read('src/presentation/GuidedClassroomControl.tsx');
  assert.match(room, /autoPresent=\{justCreated && room\.status === 'waiting'\}/);
  assert.match(room, /onStart=\{room\.status === 'waiting'/);
  // 기다리는 동안에는 QR을 소개 바로 아래(맨 위)에 둔다.
  assert.ok(room.indexOf("{room.status === 'waiting' && joinPanel}") < room.indexOf('guided-overview'));
  // 새로고침하면 다시 뜨지 않게 표시를 지운다.
  assert.match(room, /delete rest\.justCreated/);
  const panel = read('src/presentation/components/admin/QRCodePanel.tsx');
  assert.match(panel, /useState\(autoPresent\)/);
  assert.match(panel, /classroom-presentation-start/);
  assert.match(panel, /휴대폰으로 우리 모둠 QR을 찍어요/);
  assert.match(panel, /classroom-join-address/);
  const css = read('src/presentation/components/admin/QRCodePanel.css');
  assert.match(css, /\[data-size="one"\] \.classroom-qr-card img\{width:min\(100%,50vh\)\}/);
  assert.match(css, /\.classroom-presentation\.is-overlay\{position:fixed;inset:0/);
});

test('목록을 받는 동안 "없음"을 먼저 보여 주지 않는다', () => {
  const ops = read('src/presentation/ClassroomOperations.tsx');
  assert.match(ops, /수업방 목록을 불러오는 중…/);
  assert.match(ops, /!loaded\?/);
  const members = read('src/presentation/TeacherMembers.tsx');
  assert.match(members, /회원 목록을 불러오는 중…/);
  assert.match(members, /loaded&&!members\.length/);
  const admin = read('src/presentation/AdminControlPanel.tsx');
  assert.match(admin, /방 목록을 불러오는 중…/);
  // 방 카드는 키보드로 고를 수 있는 단추다.
  assert.match(admin, /<button type="button" onClick=\{\(\) => setSelectedRoomId\(r\.id\)\}/);
  assert.doesNotMatch(admin, /<div onClick=\{\(\) => setSelectedRoomId/);
});

test('화면 파일은 모두 다시 받을 수 있게 불러오고, 불러오는 동안 테마 바탕색을 쓴다', () => {
  const app = read('src/App.tsx');
  assert.doesNotMatch(app, /[^\w]lazy\(/);
  assert.doesNotMatch(app, /bg-slate-950 text-white">화면을 불러오는 중/);
  assert.match(app, /var\(--forest-bg/);
});

test('모둠 기기 수업 첫 안내는 따로 저장하고 한 번만 보여 준다', () => {
  const guide = read('src/presentation/components/TeacherRoomGuide.tsx');
  assert.match(guide, /physical_teacher_room_guide_seen_v1/);
  assert.match(guide, /writeStorage\(ROOM_GUIDE_KEY, '1'\)/);
  assert.match(read('src/presentation/TeacherHome.tsx'), /<TeacherRoomGuide \/>/);
});
