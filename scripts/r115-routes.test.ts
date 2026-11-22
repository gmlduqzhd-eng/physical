import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { routeTitle } from '../src/domain/routeTitles';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const app = read('src/App.tsx');

test('수업 전 확인은 한 화면(/checks)이고 예전 주소는 맞는 갈래로 이어진다', () => {
  assert.match(app, /path="\/checks" element=\{<ChecksPage\/>\}/);
  for (const [path, tab] of [['/device-check', 'device'], ['/sound-check', 'sound'], ['/display-check', 'display']])
    assert.ok(app.includes(`<Route path="${path}" element={<MovedTo to="/checks" set={{tab:'${tab}'}}/>} />`), path);
  // 옮겨 갈 때 붙어 있던 ?값과 #자리표를 버리지 않는다.
  assert.match(app, /function MovedTo[\s\S]{0,400}new URLSearchParams\(search\)[\s\S]{0,300}\$\{hash\}/);
  const page = read('src/presentation/ChecksPage.tsx');
  for (const name of ['DeviceCheck', 'SoundCheckPage', 'DisplayCheckPage']) assert.match(page, new RegExp(`lazyWithRetry\\(\\(\\) => import\\('\\./${name}'\\)`), name + '는 고를 때만 받아요');
  assert.match(page, /aria-current=\{tab === item\.id \? 'page' : undefined\}/);
  assert.equal(routeTitle('/checks'), routeTitle('/checks?tab=sound'));
  assert.ok(routeTitle('/checks').startsWith('수업 전 확인'));
});

test('기록·즐겨찾기 모음은 /hub/extras이고 /hub/tools는 이어 준다(수업 도구 /tools와 헷갈리지 않게)', () => {
  assert.match(app, /<Route path="\/hub\/extras" element=\{<GameHub \/>\} \/>/);
  assert.match(app, /<Route path="\/hub\/tools" element=\{<MovedTo to="\/hub\/extras"\/>\} \/>/);
  assert.equal(routeTitle('/hub/extras'), routeTitle('/hub/tools'));
  assert.match(read('src/application/backgroundMusicRoutes.ts'), /'\/hub\/extras'/);
});

test('놀이 모음의 갈래 줄은 탭 역할을 쓰고 화살표 키로 옮긴다', () => {
  const hub = read('src/presentation/GameHub.tsx');
  assert.match(hub, /role="tablist" aria-label="놀이 모음 메뉴"/);
  assert.match(hub, /role="tab" id=\{`hub-tab-\$\{tab\.id\}`\} aria-selected=\{activeTab === tab\.id\} tabIndex=\{activeTab === tab\.id \? 0 : -1\}/);
  assert.match(hub, /ArrowRight[\s\S]{0,200}ArrowLeft[\s\S]{0,200}Home[\s\S]{0,120}End/);
  assert.equal((hub.match(/role="tabpanel"/g) ?? []).length, 3);
  assert.doesNotMatch(hub, /aria-pressed=\{activeTab/);
  assert.match(read('src/presentation/GameHub.css'), /\.hub-tabs button\[aria-selected=true\]/);
});

test('지금 화면과 맞지 않던 수동 점검 스크립트는 지우고, 가벼운 점검을 CI에 넣었다', () => {
  for (const gone of ['expedition-guards.cjs', 'lifecycle-classroom-regressions.cjs', 'solo-mode-smoke.cjs', 'mobile-device-audit.mjs'])
    assert.equal(existsSync(new URL('../scripts/' + gone, import.meta.url)), false, gone);
  const scripts = JSON.parse(read('package.json')).scripts as Record<string, string>;
  for (const command of Object.values(scripts)) for (const file of command.match(/scripts\/[\w.-]+\.(?:cjs|mjs|ts)/g) ?? [])
    assert.ok(existsSync(new URL('../' + file, import.meta.url)), `package.json이 없는 파일을 가리켜요: ${file}`);
  assert.match(scripts['verify:release'], /npm run test:workflows/);
  assert.match(read('.github/workflows/checks.yml'), /npm run test:mobile:ci/);
  // 점수 보관함은 탭 저장소(sessionStorage)에 있다. 실제 DB 점검 스크립트도 그곳을 본다.
  assert.doesNotMatch(read('scripts/classroom-ui-regressions.mjs'), /Object\.keys\(localStorage\)\.filter\(key => key\.startsWith\('physical_sync_action_'\)/);
});
