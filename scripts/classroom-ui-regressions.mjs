import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

// This deliberately exercises a live database. Only this run's fixtures are removed.
if (process.env.CLASSROOM_LIVE_TEST !== '1') throw new Error('Set CLASSROOM_LIVE_TEST=1 to opt into live classroom fixture tests.');
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line.includes('=')).map(line => { const cut = line.indexOf('='); return [line.slice(0, cut), line.slice(cut + 1).replace(/^['"]|['"]$/g, '')]; }));
assert.equal(new URL(env.VITE_SUPABASE_URL).hostname, 'tjrrtgdhtjdkofwqnxnz.supabase.co');
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const must = result => { if (result.error) throw new Error(result.error.code + ': ' + result.error.message); return result.data; };
const base = process.env.AUDIT_URL || 'http://127.0.0.1:5173';
const rooms = [];
const templates = [];
const checks = [];
const errors = [];
let browser;
async function until(fn, description, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error('Timed out: ' + description);
}
async function createRoom(name, templateId, groupNames) {
  for (let retry = 0; retry < 20; retry++) {
    const result = await db.from('game_rooms').insert({ name, pin_code: String(Math.floor(1000 + Math.random() * 9000)), template_id: templateId, status: 'waiting' }).select('*').single();
    if (result.error?.code === '23505') continue;
    const room = must(result); rooms.push(room.id);
    const groups = must(await db.from('room_groups').insert(groupNames.map(group_name => ({ room_id: room.id, group_name }))).select('*'));
    return { room, groups };
  }
  throw new Error('Could not allocate fixture PIN');
}
const score = async id => must(await db.from('room_groups').select('score').eq('id', id).single()).score;
try {
  const mission = (id, title, amount, extra = {}) => ({ id, title, amount, cooldown: 1, desc: 'Generated verification activity', iconName: 'Activity', color: 'text-cyan-700', bg: 'bg-cyan-50', ...extra });
  const template = must(await db.from('mission_templates').insert({ name: 'Codex UI regression fixture', buttons: [mission('normal-test', '기본 검증 미션', 10), mission('review-test', '승인 검증 미션', 25, { requires_approval: true }), mission('hidden-test', '숨겨진 검증 미션', 10, { isHidden: true })] }).select('id').single());
  templates.push(template.id);
  const classroom = await createRoom('Codex UI regression fixture', template.id, ['1모둠', '2모둠']);
  const battle = await createRoom('Codex battle UI regression fixture', null, ['청팀', '백팀']);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const teacherContext = await browser.newContext({ viewport: { width: 1280, height: 850 } });
  const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await studentContext.addInitScript(() => { Object.defineProperty(window, 'DeviceMotionEvent', { value: undefined, configurable: true }); });
  const teacher = await teacherContext.newPage();
  const student = await studentContext.newPage();
  for (const page of [teacher, student]) page.on('pageerror', error => errors.push(error.message));

  await teacher.goto(base + '/admin');
  await teacher.getByPlaceholder('4자리 숫자 입력').fill('0000');
  await teacher.getByRole('button', { name: /잠금 해제/ }).click();
  await teacher.getByText('비밀번호(PIN)가 일치하지 않습니다.', { exact: true }).waitFor();
  await teacher.getByRole('button', { name: '교사 전용 PIN 번호 변경하기' }).click();
  await teacher.getByPlaceholder('현재 PIN 입력').fill('0000');
  await teacher.getByPlaceholder('새 PIN 입력').fill('5678');
  await teacher.getByRole('button', { name: '변경 저장' }).click();
  await teacher.getByText('현재 교사 PIN이 일치하지 않습니다.', { exact: true }).waitFor();
  await teacher.getByRole('button', { name: '취소', exact: true }).click();
  await teacher.getByPlaceholder('4자리 숫자 입력').fill('1234');
  await teacher.getByRole('button', { name: /잠금 해제/ }).click();
  await until(async () => !(await teacher.locator('body').innerText()).includes('교사용 화면 잠금'), 'single teacher lock unlock');
  checks.push('0000 bypass rejected; changing PIN requires existing PIN; one successful teacher lock');
  await teacher.goto(base + '/remote/' + classroom.room.id);
  await teacher.getByRole('button', { name: '수업 시작 / 재개' }).waitFor();

  await student.goto(base + '/lobby');
  await student.getByPlaceholder('예: 1234').fill(classroom.room.pin_code);
  await student.getByPlaceholder('예: 홍길동').fill('검증학생');
  await student.getByRole('button', { name: '입장하기', exact: true }).click();
  await student.waitForURL('**/mobile/**');
  assert(!(await student.locator('body').innerText()).includes('숨겨진 검증 미션'));
  checks.push('Student PIN join waits for teacher and does not reveal hidden missions');
  await teacher.getByRole('button', { name: '수업 시작 / 재개' }).click();
  const normalButton = student.getByRole('button').filter({ hasText: '기본 검증 미션' });
  await normalButton.waitFor();
  await normalButton.click();
  const group = classroom.groups.find(group => group.group_name === '1모둠');
  await until(async () => await score(group.id) === 10, 'normal mission saved');
  checks.push('Missing DeviceMotionEvent does not crash; normal mission awards exactly 10');

  await teacher.getByRole('button', { name: /일시 정지/ }).click();
  await until(async () => must(await db.from('game_rooms').select('status,started_at').eq('id', classroom.room.id).single()).status === 'paused', 'pause saved');
  const paused = must(await db.from('game_rooms').select('*').eq('id', classroom.room.id).single());
  assert.equal(paused.started_at, null);
  await student.getByText('수업 일시 정지', { exact: true }).waitFor();
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.equal(must(await db.from('game_rooms').select('global_time_modifier').eq('id', classroom.room.id).single()).global_time_modifier, paused.global_time_modifier);
  checks.push('Teacher pause freezes remaining duration and student mission screen');
  await teacher.getByRole('button', { name: '수업 시작 / 재개' }).click();
  await normalButton.waitFor();
  const resumed = must(await db.from('game_rooms').select('*').eq('id', classroom.room.id).single());
  assert.ok(resumed.started_at); assert.equal(resumed.global_time_modifier, paused.global_time_modifier);

  student.on('dialog', dialog => dialog.dismiss());
  await student.getByRole('button').filter({ hasText: '승인 검증 미션' }).click();
  await until(async () => must(await db.from('room_groups').select('pending_missions').eq('id', group.id).single()).pending_missions.includes('review-test'), 'approval pending');
  assert.equal(await score(group.id), 10);
  must(await db.rpc('review_classroom_mission', { row_id: group.id, mission_id: 'review-test', approve: true }));
  await until(async () => await score(group.id) === 35, 'approval score');
  checks.push('Approval request awards nothing until teacher review, then exactly 25');

  await studentContext.setOffline(true);
  await student.waitForTimeout(1400);
  await normalButton.click();
  const pending = await student.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('physical_sync_action_')).map(key => JSON.parse(localStorage.getItem(key))));
  assert.equal(pending.length, 1); const offlineAmount = pending[0].payload.amount;
  await studentContext.setOffline(false);
  await until(async () => await score(group.id) === 35 + offlineAmount, 'offline queued score restored');
  await until(async () => await student.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('physical_sync_action_')).length) === 0, 'ack removed persisted action');
  await student.reload();
  await normalButton.waitFor(); assert.equal(await score(group.id), 35 + offlineAmount);
  checks.push('Offline mission persists until acknowledgement; reconnect and reload do not duplicate points');

  const kiosk = await teacherContext.newPage(); kiosk.on('pageerror', error => errors.push(error.message));
  await kiosk.goto(base + '/kiosk');
  await kiosk.getByPlaceholder('PIN 번호').fill(classroom.room.pin_code);
  await kiosk.getByRole('button', { name: '스테이션 시작' }).click();
  await kiosk.getByRole('button', { name: /1모둠/ }).click();
  await teacher.getByRole('button', { name: /일시 정지/ }).click();
  await until(async () => await kiosk.getByRole('button').filter({ hasText: '기본 검증 미션' }).isDisabled(), 'paused kiosk disabled');
  await teacher.getByRole('button', { name: '수업 시작 / 재개' }).click();
  await until(async () => !(await kiosk.getByRole('button').filter({ hasText: '기본 검증 미션' }).isDisabled()), 'resumed kiosk enabled');
  await kiosk.getByRole('button').filter({ hasText: '기본 검증 미션' }).click();
  await until(async () => await score(group.id) === 65 + offlineAmount, 'kiosk 30 saved');
  await kiosk.getByText(/30점이 지급되었습니다/).waitFor();
  checks.push('Paused kiosk disabled; resumed kiosk displays success only after 30 points are saved');

  const quizPartner = await teacherContext.newPage();
  quizPartner.on('pageerror', error => errors.push(error.message));
  const group2 = classroom.groups.find(group => group.group_name === '2모둠');
  await quizPartner.goto(base + '/mobile/' + classroom.room.id + '/' + group2.id);
  await quizPartner.getByRole('button').filter({ hasText: '기본 검증 미션' }).waitFor();
  const beforeQuiz = await score(group.id) + await score(group2.id);
  const quiz = { type: 'quiz', question: '동시 정답 검증', options: ['정답 검증', '오답 검증'], answer: 0, reward: 123 };
  must(await db.from('game_rooms').update({ active_minigame: quiz }).eq('id', classroom.room.id));
  const answerA = student.getByRole('button', { name: '1. 정답 검증', exact: true });
  const answerB = quizPartner.getByRole('button', { name: '1. 정답 검증', exact: true });
  await Promise.all([answerA.waitFor(), answerB.waitFor()]);
  await Promise.allSettled([answerA.click(), answerB.click()]);
  await until(async () => await score(group.id) + await score(group2.id) === beforeQuiz + 123, 'single concurrent quiz winner');
  must(await db.from('game_rooms').update({ active_minigame: { ...quiz, question: '오답 뒤 다음 퀴즈 검증' } }).eq('id', classroom.room.id));
  await student.getByRole('button', { name: '2. 오답 검증', exact: true }).click();
  await until(async () => await student.getByRole('button', { name: '1. 정답 검증', exact: true }).isDisabled(), 'incorrect answer locks current quiz');
  must(await db.from('game_rooms').update({ active_minigame: { ...quiz, question: '새 퀴즈는 재응답 가능', reward: 77 } }).eq('id', classroom.room.id));
  await student.getByRole('heading', { name: '새 퀴즈는 재응답 가능', exact: true }).waitFor();
  await until(async () => !(await student.getByRole('button', { name: '1. 정답 검증', exact: true }).isDisabled()), 'replacement quiz clears old answer lock');
  await student.getByRole('button', { name: '1. 정답 검증', exact: true }).click();
  await until(async () => await score(group.id) + await score(group2.id) === beforeQuiz + 200, 'replacement quiz award');
  checks.push('Concurrent quiz answers claim one reward; an incorrect answer locks only its quiz and the next quiz resets');

  const blockedContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await blockedContext.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('physical_sync_action_')) throw new DOMException('quota denied', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const blocked = await blockedContext.newPage();
  blocked.on('pageerror', error => errors.push(error.message));
  await blocked.goto(base + '/hub');
  await blocked.getByRole('searchbox').waitFor();
  await blocked.evaluate(path => { history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }, '/mobile/' + classroom.room.id + '/' + group2.id);
  await blocked.getByRole('button').filter({ hasText: '기본 검증 미션' }).waitFor();
  const beforeBlocked = await score(group2.id);
  await blockedContext.setOffline(true);
  await blocked.getByRole('button').filter({ hasText: '기본 검증 미션' }).click();
  await blocked.getByText(/기기에 점수를 저장할 수 없습니다/).waitFor();
  await blocked.evaluate(() => { history.pushState({}, '', '/hub'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await blocked.getByRole('searchbox').waitFor();
  await blockedContext.setOffline(false);
  await blocked.evaluate(() => { history.pushState({}, '', '/play/stopwatch'); window.dispatchEvent(new PopStateEvent('popstate')); });
  await blocked.getByRole('button', { name: /보통/ }).waitFor();
  await until(async () => await score(group2.id) === beforeBlocked + 10, 'denied storage queue survives route change');
  checks.push('Denied persistent storage shows warning and retains pending score through SPA routes until reconnect');
  await blockedContext.close();

  const beforeRaid = await Promise.all(classroom.groups.map(group => score(group.id)));
  await teacher.getByRole('button', { name: /보스 레이드/ }).click();
  await until(async () => must(await db.from('game_rooms').select('status').eq('id', classroom.room.id).single()).status === 'boss_raid', 'remote started raid');
  // Keep this own-fixture raid brief while exercising the real remote and tap UI.
  must(await db.from('game_rooms').update({ boss_hp: 6, boss_max_hp: 6 }).eq('id', classroom.room.id));
  await student.getByRole('heading', { name: '보스 레이드 발동!', exact: true }).waitFor();
  for (let index = 0; index < 6; index++) await student.getByRole('heading', { name: '보스 레이드 발동!', exact: true }).click();
  await until(async () => must(await db.from('game_rooms').select('status').eq('id', classroom.room.id).single()).status === 'playing', 'remote-only boss completed');
  for (let index = 0; index < classroom.groups.length; index++) assert.equal(await score(classroom.groups[index].id), beforeRaid[index] + 2000);
  await until(async () => await student.getByRole('heading', { name: '보스 레이드 발동!', exact: true }).count() === 0, 'raid overlay dismissed');
  checks.push('Remote-only teacher control and six mobile taps finish the boss on the server; every group receives 2000 exactly once');

  const battleA = await teacherContext.newPage(); const battleB = await studentContext.newPage();
  for (const page of [battleA, battleB]) {
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '/hub?battle=1');
    await page.getByPlaceholder('4자리 숫자 입력').fill(battle.room.pin_code);
    await page.getByRole('button', { name: '방 입장하기', exact: true }).click();
    await page.getByText('#' + battle.room.pin_code, { exact: true }).waitFor();
  }
  await until(async () => (await battleA.locator('body').textContent()).includes('2명 참가중'), 'two remote battle participants');
  await battleA.getByRole('button', { name: /반응속도 \(결과 점수 반영\)/ }).click();
  await battleA.waitForURL('**/play/reaction?**');
  assert.equal(await score(battle.groups.find(group => group.group_name === '청팀').id), 0);
  await battleA.getByRole('button', { name: /보통/ }).click();
  await battleA.getByText('화면을 터치하면 시작됩니다', { exact: true }).waitFor({ timeout: 10000 });
  await battleA.getByText('화면을 터치하면 시작됩니다', { exact: true }).click();
  await battleA.getByRole('heading', { name: '지금!', exact: true }).waitFor({ timeout: 8000 });
  await battleA.getByRole('heading', { name: '지금!', exact: true }).click();
  await battleA.getByRole('button', { name: /다시 하기/ }).waitFor();
  const blue = battle.groups.find(group => group.group_name === '청팀');
  await until(async () => await score(blue.id) > 0, 'actual battle result saved');
  const earned = await score(blue.id);
  assert([100, 300, 500].includes(earned));
  await until(async () => (await battleB.locator('body').innerText()).includes('총 점수: ' + earned + '점'), 'second device observes result');
  await battleA.getByRole('button', { name: '홈으로', exact: true }).last().click();
  await battleA.getByText('#' + battle.room.pin_code, { exact: true }).waitFor();
  await until(async () => (await battleA.locator('body').innerText()).includes('총 점수: ' + earned + '점'), 'battle return restores score');
  assert.equal(await score(blue.id), earned);
  checks.push('Two independent browsers share battle presence/results; no start bonus; return restores same room without duplicate award');

  await student.goto(base + '/mobile/' + crypto.randomUUID() + '/' + crypto.randomUUID());
  await student.getByText('수업 방이 종료되었거나 삭제되었습니다.', { exact: true }).waitFor();
  checks.push('Removed or unknown room displays recovery controls');
  assert.deepEqual(errors, []);
  fs.mkdirSync('test-results', { recursive: true });
  fs.writeFileSync('test-results/classroom-ui-results.json', JSON.stringify({ base, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} finally {
  if (browser) await browser.close();
  for (const id of rooms) must(await db.from('game_rooms').delete().eq('id', id));
  for (const id of templates) must(await db.from('mission_templates').delete().eq('id', id));
  console.log('Only fixtures created by this verification run were removed.');
}
