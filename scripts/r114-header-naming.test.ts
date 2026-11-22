import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { routeTitle } from '../src/domain/routeTitles';
import { SCREEN, screenNameFor } from '../src/domain/glossary';
import { loadVoicePrefs, LEGACY_VOICE_COACH_KEY } from '../src/application/voicePrefs';
import { SPEECH_PREFS_KEY } from '../src/application/speechAnnouncer';
import { isStudentRoute } from '../src/application/audience';

const read = (path: string) => readFileSync(path, 'utf8');

test('같은 화면은 탭 제목·뒤로 가기에서 같은 이름으로 부른다', () => {
  assert.equal(routeTitle('/teacher'), `${SCREEN.teacher} · 땀방울 원정대`);
  assert.equal(routeTitle('/teacher-ai'), '수업 준비실 · 땀방울 원정대');
  assert.equal(routeTitle('/board/abc'), 'TV 점수판 · 땀방울 원정대');
  assert.equal(routeTitle('/kiosk/r1'), '공용 패드 화면 · 땀방울 원정대');
  assert.equal(routeTitle('/lessons'), '수업 꾸러미 · 땀방울 원정대');
  // 교사용 리모컨(/remote)을 '모둠 기기'라고 부르던 잘못을 고쳤다. 모둠 기기는 /mobile뿐이다.
  assert.equal(routeTitle('/remote/r1'), '모둠 수업 리모컨 · 땀방울 원정대');
  assert.equal(routeTitle('/mobile/r1/g1'), '모둠 기기 · 땀방울 원정대');
  assert.equal(screenNameFor('/teacher'), '수업 준비');
  assert.equal(screenNameFor('/hub?collection=phone'), '활동 고르기');
  assert.equal(screenNameFor('/nowhere'), undefined);
  // 뒤로 가기 이름을 적지 않으면 용어 사전 이름을 쓴다.
  for (const shell of ['src/presentation/FlowShell.tsx', 'src/presentation/LessonShell.tsx'])
    assert.match(read(shell), /givenBackLabel \?\? \(back === '\/' \? '[^']+' : screenNameFor\(back\)/, shell);
  for (const file of ['src/presentation/GuidedClassroom.tsx', 'src/presentation/ClassroomOperations.tsx', 'src/presentation/DeviceCheck.tsx', 'src/presentation/GuidedClassroomControl.tsx', 'src/presentation/components/TeacherAuthGuard.tsx'])
    assert.doesNotMatch(read(file), /교사 시작 화면/, file);
  // 404 화면도 '게임 허브' 대신 '활동 고르기'라고 부른다.
  assert.doesNotMatch(read('src/App.tsx'), /게임 허브로|개인 게임 열기/);
});

test('음성 안내 켜기·끄기는 하나: 예전 음성 코칭 설정을 한 번 옮겨 온다', () => {
  const store = (entries: Record<string, string>) => (key: string) => entries[key] ?? null;
  assert.equal(loadVoicePrefs(store({})).on, true);
  assert.equal(loadVoicePrefs(store({ [LEGACY_VOICE_COACH_KEY]: 'false' })).on, false);
  assert.equal(loadVoicePrefs(store({ [LEGACY_VOICE_COACH_KEY]: 'true' })).on, true);
  // 새 설정이 있으면 예전 값은 보지 않는다.
  assert.equal(loadVoicePrefs(store({ [SPEECH_PREFS_KEY]: JSON.stringify({ on: true, rate: 'slow', volume: 'normal' }), [LEGACY_VOICE_COACH_KEY]: 'false' })).on, false);
  assert.equal(loadVoicePrefs(store({ [SPEECH_PREFS_KEY]: JSON.stringify({ on: false, rate: 'normal', volume: 'soft' }) })).volume, 'soft');
  // 두 음성 훅이 같은 설정을 쓴다.
  const coach = read('src/application/useVoiceCoach.ts');
  assert.match(coach, /useVoicePrefs\(\)\.on/);assert.doesNotMatch(coach, /voice_coach_enabled/);
  const tv = read('src/application/useTvVoice.ts');
  assert.match(tv, /setVoicePrefs\(next\)/);assert.match(tv, /subscribeVoicePrefs\(/);
  assert.match(read('src/presentation/SoundCheckPage.tsx'), /<VoiceGuideButton\/>/);
});

test("머리말: '화면·소리' 하나에 화면·소리 설정을 모으고, 공유·설치는 '더보기'로", () => {
  const util = read('src/presentation/components/HeaderUtilities.tsx');
  assert.match(util, /<TextScaleButton\/><TvModeButton\/><ThemeButton\/>/);
  assert.match(util, /<VoiceGuideButton\/><BackgroundMusicButton\/>/);
  assert.match(util, /<span>화면·소리<\/span>/);
  assert.match(util, /label="더보기"/);assert.match(util, /share\.shareLink\(\)/);assert.match(util, /app\.install\(\)/);
  // 설치 안내 창은 메뉴가 닫혀도 남게 메뉴 바깥에 그린다.
  assert.match(util, /<\/HeaderPopover>\n {4}\{app\.guide\}/);
  const toolbar = read('src/presentation/components/HeaderToolbar.tsx');
  assert.doesNotMatch(toolbar, /toggleTheme|AppInstallButton/);
  assert.match(toolbar, /\{children\}\n[^\n]*\n {4}<HeaderMoreMenu\/>/);
  // 학생 화면 여부는 주소로 판단하고(studentMode 기본값), 따로 적으면 그 값이 이긴다.
  assert.match(toolbar, /if \(studentMode \?\? isStudentRoute\(pathname, search\)\) return <nav/);
  assert.doesNotMatch(toolbar, /data-audience/);
  // 넓은 화면에서는 '화면·소리'와 뒤로 가기에 글자도 보인다.
  const css = read('src/presentation/components/HeaderToolbar.css');
  assert.match(css, /@media\(min-width:1024px\) \{[^@]*\.settings-trigger,:has\(>\.lucide-arrow-left,>\.lucide-house\)\)>span \{\s*position:static/);
  // 허브 메뉴에 따로 있던 밝기·음성 코칭 단추는 머리말 설정으로 옮겼다.
  const hub = read('src/presentation/GameHub.tsx');
  assert.doesNotMatch(hub, /toggleTheme|toggleVoice|음성 코칭/);
});

test('밝기: 처음에는 기기 설정을 따르고, 직접 고르면 이 기기에 기억한다', () => {
  const theme = read('src/application/ThemeContext.tsx');
  assert.match(theme, /const theme = chosen \?\? system;/);
  assert.match(theme, /matchMedia\?\.\(darkQuery\)/);
  assert.match(theme, /localStorage\.setItem\(themeKey, next\)/);
  assert.match(theme, /physical-device-cleared/);
});

test('학생 화면인지 한 곳에서 판단한다', () => {
  assert.equal(isStudentRoute('/lobby'), true);
  assert.equal(isStudentRoute('/join'), true);
  assert.equal(isStudentRoute('/mobile/r/g'), true);
  assert.equal(isStudentRoute('/play/sig-boss-raid', '?guided=1&room=r'), true);
  assert.equal(isStudentRoute('/play/sig-boss-raid'), false);
  // 수업방 정보가 붙은 놀이(청백 배틀)와, 모둠 화면에서 넘어온 기록도 학생 화면이다.
  assert.equal(isStudentRoute('/play/x', '?room=r&group=g'), true);
  assert.equal(isStudentRoute('/play/x', '?room=r'), false);
  assert.equal(isStudentRoute('/records', '?returnTo=%2Fmobile%2Fr%2Fg'), true);
  assert.equal(isStudentRoute('/records'), false);
  assert.equal(isStudentRoute('/records', '?returnTo=%2Fhub'), false);
  assert.equal(isStudentRoute('/teacher'), false);
  assert.equal(isStudentRoute('/lobbyist'), false);
});

test('쓰지 않던 화면 파일을 지웠다', () => {
  for (const file of ['src/presentation/TeacherAi.tsx', 'src/presentation/RoleLandingPage.tsx', 'src/presentation/RoleLandingPage.css'])
    assert.equal(existsSync(file), false, file);
  assert.equal(existsSync('src/presentation/TeacherAi.css'), true, '수업 준비실 입구가 아직 쓰는 스타일');
});

test('수업 준비실 배포 묶음에 화면이 쓰는 파일이 모두 들어 있다', () => {
  const script = read('scripts/prepare-studio-deploy.mjs');
  const allow = new Set([...script.split('const files = [')[1].split('];')[0].matchAll(/'([^']+)'/g)].map(m => m[1]));
  const listed = execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--listFilesOnly', '-p', 'tsconfig.studio.json'], { encoding: 'utf8' })
    .split('\n').map(line => line.trim()).filter(line => line && !line.includes('node_modules'))
    .map(line => line.replace(process.cwd() + '/', ''));
  const missing = new Set<string>();
  for (const file of listed) {
    if (!allow.has(file)) missing.add(file);
    for (const [, css] of read(file).matchAll(/import\s+['"](\.[^'"]+\.css)['"]/g)) {
      const path = new URL(css, 'file:///' + file).pathname.slice(1);
      if (!allow.has(path)) missing.add(path);
    }
  }
  assert.deepEqual([...missing], []);
});
