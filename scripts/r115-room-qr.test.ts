import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sharedLimiterConfigured } from '../server/studioRateLimit';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('크게 보여 주는 입장 화면은 글씨 확대(zoom)를 되돌려 화면 밖으로 잘리지 않는다', () => {
  const css = read('src/presentation/components/admin/QRCodePanel.css');
  assert.match(css, /html\[data-text-scale="large"\] main \.classroom-presentation\.is-presenting\{zoom:calc\(1\/1\.125\)\}/);
  assert.match(css, /html\[data-text-scale="xlarge"\] main \.classroom-presentation\.is-presenting\{zoom:\.8\}/);
  // 글씨 확대 배율이 바뀌면 여기도 함께 바꿔야 한다.
  const scale = read('src/presentation/components/DisplayButtons.css');
  assert.match(scale, /data-text-scale="large"[^}]*\{zoom:1\.125\}/);
  assert.match(scale, /data-text-scale="xlarge"[^}]*\{zoom:1\.25\}/);
});

test('닫은 입장 화면은 같은 수업방에서 다시 저절로 뜨지 않고, 초점을 가두며 수업 시작 단추가 먼저다', () => {
  const panel = read('src/presentation/components/admin/QRCodePanel.tsx');
  assert.match(panel, /const autoPresentedRooms=new Set<string>\(\)/);
  assert.match(panel, /if\(autoPresent\)autoPresentedRooms\.add\(currentRoom\.id\)/);
  assert.match(panel, /useModalDialog\(isOverlay,\(\)=>setIsOverlay\(false\)\)/);
  // 수업 시작 단추가 명단 보기보다 앞(초점이 먼저 가는 자리)에 있다.
  assert.ok(panel.indexOf('primary classroom-presentation-start" disabled') < panel.indexOf("'명단 접기':'명단 보기'"));
  assert.match(panel, /querySelector<HTMLButtonElement>\('\.classroom-presentation-start:not\(:disabled\)'\)/);
});

test('모둠 다섯·여섯은 3칸 2줄로, 넷은 비밀번호가 칸 안에 들어오게 한다', () => {
  const panel = read('src/presentation/components/admin/QRCodePanel.tsx');
  assert.match(panel, /cards\.length<=6\?'many':'lots'/);
  const css = read('src/presentation/components/admin/QRCodePanel.css');
  assert.match(css, /\[data-size="many"\] \.classroom-qr-grid\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css, /\[data-size="some"\] \.classroom-group-pin\{font-size:clamp\(3rem,7vw,6rem\)/);
});

test('선생님 화면도 학생이 듣는 말(비밀번호 · TV 점수판)로 부른다', () => {
  const panel = read('src/presentation/components/admin/QRCodePanel.tsx');
  assert.match(panel, /모둠별 입장 비밀번호 · QR/);
  assert.doesNotMatch(panel, /입장 PIN|모둠 PIN|4자리 PIN|전광판/);
  assert.doesNotMatch(read('src/presentation/components/admin/QuickStart.tsx'), /입장 PIN|모둠 PIN/);
  for (const file of ['src/presentation/BoardEntry.tsx', 'src/presentation/components/BoardAccess.tsx', 'src/presentation/GuidedClassroomControl.tsx'])
    assert.doesNotMatch(read(file), /전광판/, file);
});

test('첫 안내 카드는 수업 준비 칸보다 위(첫 화면 안)에 둔다', () => {
  const home = read('src/presentation/TeacherHome.tsx');
  assert.ok(home.indexOf('<TeacherRoomGuide />') < home.indexOf('teacher-workspace'));
  assert.equal(home.split('<TeacherRoomGuide />').length, 2);
});

test('AI 생성은 공유 요청 제한이 설정된 배포에서만 그것도 함께 쓴다', () => {
  const keys = ['STUDIO_LIMIT_URL', 'STUDIO_LIMIT_KEY', 'STUDIO_LIMIT_SECRET'] as const;
  const saved = keys.map(key => process.env[key]);
  try {
    for (const key of keys) delete process.env[key];
    assert.equal(sharedLimiterConfigured(), false);
    process.env.STUDIO_LIMIT_URL = 'https://limit.example'; process.env.STUDIO_LIMIT_KEY = 'k'; process.env.STUDIO_LIMIT_SECRET = 'short';
    assert.equal(sharedLimiterConfigured(), false);
    process.env.STUDIO_LIMIT_SECRET = 'x'.repeat(32);
    assert.equal(sharedLimiterConfigured(), true);
  } finally { keys.forEach((key, index) => { if (saved[index] === undefined) delete process.env[key]; else process.env[key] = saved[index]; }); }
  const api = read('api/teacher.ts');
  assert.match(api, /if \(!sharedLimiterConfigured\(\)\) return send\(200, await generateAdvice\(body\)\)/);
  assert.match(api, /studioLimit\('release', nonce, admission\.token\)/);
});

test('상태 확인 API는 정상 응답만 CDN에 잠깐 보관한다', () => {
  const health = read('api/health.ts');
  assert.match(health, /res\.setHeader\('Cache-Control','no-store'\)/);
  assert.match(health, /'public, max-age=0, s-maxage=15'\);\n\s*res\.statusCode=200/);
});
