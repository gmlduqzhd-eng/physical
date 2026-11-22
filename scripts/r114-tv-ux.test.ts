import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFunState, type FunState } from '../src/domain/funLoop';
import { bossRaid, bossRaidCue, BOSSES, bossesFor } from '../src/domain/signature/sig-boss-raid';
import { DEFAULT_TODAY, buildTodayPlan, localDayKey, parseTodaySettings, todaySeed } from '../src/domain/todayLesson';
import { REMOTE_NEXT_LABEL } from '../src/application/remoteLabels';

const read = (path: string) => readFileSync(path, 'utf8');
const ctxOf = (s: FunState, phase: 'play' | 'climax', index: number) => ({ phase, index, seed: 3, reversed: false, frozen: false, seated: false, teams: s.teams, state: s });

test('리모컨: 진행 칸은 늘 첫 자리이고, 이름은 TV의 진행 버튼과 같다', () => {
  const page = read('src/presentation/FunRemotePage.tsx');
  const css = read('src/presentation/FunRemotePage.css');
  assert.equal(REMOTE_NEXT_LABEL.demo, '연습 판 시작');
  assert.equal(REMOTE_NEXT_LABEL.tutorial, '본게임 시작');
  assert.equal(REMOTE_NEXT_LABEL.climax, '결과 발표');
  const sig = read('src/presentation/components/minigames/signature/SignaturePlay.tsx');
  assert.match(sig, /demo:'연습 판 시작',tutorial:'본게임 시작'/, 'TV 진행 버튼 이름과 같다');
  // 일시정지가 진행 칸 자리로 올라오지 않는다(같은 곳을 두 번 눌러 멈추는 일 방지).
  assert.doesNotMatch(css, /\.frp-pause\{order:-1\}/);
  assert.ok(page.indexOf('className="frp-next frp-next-wait"') < page.indexOf('className="frp-pause"'));
  // 본게임 중 상태 칸도 버튼과 같은 높이를 지켜 아래 버튼이 움직이지 않는다.
  assert.match(css, /\.frp-next-wait\{min-height:clamp\(104px,21dvh,200px\)/);
  // 보낸 명령은 큰 알림으로 보여 준다.
  assert.match(css, /\.frp-sent:not\(:empty\)\{font-size:1\.15rem;font-weight:900/);
  assert.match(page, /className="frp-sent-icon"/);
});

test('오늘 수업: 같은 날·같은 설정이면 같은 계획, 다른 활동으로를 눌러야 바뀐다', () => {
  const day = localDayKey(new Date(2026, 10, 22, 9).getTime());
  assert.equal(day, '2026-11-22');
  const a = buildTodayPlan(DEFAULT_TODAY, todaySeed(day, DEFAULT_TODAY, 0));
  const b = buildTodayPlan(DEFAULT_TODAY, todaySeed(day, DEFAULT_TODAY, 0));
  assert.deepEqual(a.stages.map(s => s.gameId), b.stages.map(s => s.gameId));
  assert.notEqual(todaySeed(day, DEFAULT_TODAY, 0), todaySeed(day, DEFAULT_TODAY, 1));
  assert.notEqual(todaySeed(day, DEFAULT_TODAY, 0), todaySeed('2026-11-23', DEFAULT_TODAY, 0));
  // 저장값 읽기: 알 수 없는 값은 기본값으로, 본게임 고르기는 저장하지 않는다.
  assert.deepEqual(parseTodaySettings({ grade: '1~2학년', space: 'x', minutes: 45, teams: 9, mainId: 'sig-boss-raid' }),
    { grade: '1~2학년', space: DEFAULT_TODAY.space, minutes: 45, teams: DEFAULT_TODAY.teams });
  assert.deepEqual(parseTodaySettings(null), { grade: DEFAULT_TODAY.grade, space: DEFAULT_TODAY.space, minutes: DEFAULT_TODAY.minutes, teams: DEFAULT_TODAY.teams });
  const page = read('src/presentation/TodayLesson.tsx');
  assert.doesNotMatch(page, /Math\.random/, '열 때마다 바뀌지 않는다');
  assert.match(page, /🔀 다른 활동으로/);
  // 학년·장소는 시작 버튼 위 한 줄에 있다.
  assert.ok(page.indexOf('className="today-quick"') < page.indexOf('▶ 오늘 수업 시작'));
  assert.match(page, /useState<TodaySettings>\(loadTodaySettings\)/, '마지막 학년을 기억한다');
});

test('보스전: 신호 도중 보스가 바뀌면 안내 줄과 아이콘은 지금 보스로, 동작은 그대로', () => {
  const s0 = createFunState({ teams: 1, timing: bossRaid.timing, seed: 3, skipDemo: true });
  const hp = bossesFor(1, bossRaid.timing);
  const before = bossRaidCue(ctxOf({ ...s0, phase: 'play', cueIndex: 0, cueHits: {} }, 'play', 0));
  const after = bossRaidCue(ctxOf({ ...s0, phase: 'play', cueIndex: 0, cueHits: { 'play:0': hp[0].hp } }, 'play', 0));
  assert.equal(after.text, before.text, '동작은 그대로');
  assert.match(before.sub ?? '', new RegExp(`${BOSSES[0].name}.*싫어하는 동작`));
  assert.doesNotMatch(after.sub ?? '', /싫어하는 동작이에요/);
  assert.match(after.sub ?? '', new RegExp(`${BOSSES[1].name} 등장`));
  assert.equal(after.icon, BOSSES[1].emoji);
  const all = bossRaidCue(ctxOf({ ...s0, phase: 'play', cueIndex: 0, cueHits: { 'play:0': hp[0].hp + hp[1].hp + hp[2].hp } }, 'play', 0));
  assert.match(all.sub ?? '', /모두 물리쳤어요/);
});

test('대표 게임: 넓은 화면 시작 화면은 위 막대를 숨기고, 끝내기는 차분한 점선 버튼', () => {
  const css = read('src/presentation/components/fun/fun.css');
  assert.match(css, /@media \(min-width:641px\)\{\n body:has\(main\.fun-intro\) \.gameplay-toolbar\{display:none\}\n \.fun-intro-top \.fun-exit\{display:inline-block\}/);
  assert.match(css, /\.fun-controls button\[data-command=end\]\{border-style:dashed;border-color:var\(--fun-line\);background:transparent;color:var\(--fun-muted\)\}/);
  const pp = read('src/presentation/components/minigames/common/PhonePlay.css');
  assert.match(pp, /html\[data-tv-mode="on"\] \.phone-play\[data-phase="intro"\]:not\(\.phone-class\)\{width:min\(90vw,1600px\)/);
});
