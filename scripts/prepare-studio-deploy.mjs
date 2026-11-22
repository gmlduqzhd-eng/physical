import { lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

// Exact allowlist: never copy local environments, student API or classroom code.
const root = resolve('.studio-deploy');
const workspace=await realpath(process.cwd());
if(relative(workspace,root)!=='.studio-deploy')throw new Error('Unexpected deployment staging path');
const previous=await lstat(root).catch(()=>null);
if(previous?.isSymbolicLink())throw new Error('Deployment staging cannot be a symbolic link');
const link=await readFile(join(root,'.vercel/project.json'),'utf8').catch(()=>null);
if(link){const project=JSON.parse(link);if(project.projectId!=='prj_qjH9VLy1bhmDD2vX6LX6nYono9xB'||project.orgId!=='team_YZHSWFgCb4NEhjCA9nORvfin')throw new Error('Unexpected teacher deployment project');}
// This generated, verified workspace directory alone is replaced. Preserve only
// the non-secret project link; no old sources or pulled environment files survive.
await rm(root,{recursive:true,force:true});
if(link){await mkdir(join(root,'.vercel'),{recursive:true});await writeFile(join(root,'.vercel/project.json'),link);}
const files = [
  'scripts/verify-deploy.mjs', 'scripts/gemini-studio.test.ts', 'scripts/studio-recovery.test.ts', 'scripts/dev-studio-api.ts',
  'package.json', 'package-lock.json', 'tsconfig.app.json', 'tsconfig.studio.json',
  'tsconfig.server.json', 'tsconfig.vercel-server.json',
  'teacher-studio/AdvancedControls.tsx', 'teacher-studio/Studio.tsx', 'teacher-studio/domain.ts', 'teacher-studio/googleAuthClient.ts', 'teacher-studio/loginConditions.ts',
  'teacher-studio/index.html', 'teacher-studio/main.tsx', 'teacher-studio/studio.css', 'teacher-studio/vite.config.ts',
  'server/studioHandler.ts', 'server/geminiStudio.ts', 'server/aiService.ts', 'server/teacherSession.ts', 'server/studioRateLimit.ts', 'server/teacherAccounts.ts',
  'src/presentation/components/TeacherAccountForm.tsx', 'src/presentation/components/GoogleTeacherCallback.tsx', 'src/application/teacherGoogle.ts', 'src/presentation/components/TeacherAuthGuard.css',
  'teacher-studio/studioRequest.ts', 'teacher-studio/studioHandoff.ts', 'teacher-studio/localChallenge.ts',
  'src/domain/publicLessonTransfer.ts', 'src/domain/playRecipes.ts', 'src/domain/primaryExperiences.ts', 'src/domain/cooperativeMap.ts', 'src/domain/expeditionWorkshop.ts', 'src/domain/flagship.ts', 'src/domain/gamesData.ts', 'src/domain/teacherAi.ts', 'src/domain/participationCues.ts', 'src/data/lessonGameCatalog.ts',
  'src/domain/expeditionGames.ts', 'src/domain/expeditionCatalog.ts',
  'src/domain/gameLifecycle.ts', 'src/domain/safetyLessons.ts', 'src/domain/gameResultDetails.ts',
  'src/domain/expeditionRules.ts',
  'src/domain/movementQuests.ts', 'src/domain/extendedMovementQuests.ts',
  'src/domain/sportsMovementQuests.ts', 'src/domain/reflectionMovementQuests.ts',
  'src/domain/phonePlayCatalog.ts', 'src/domain/phoneTaskRules.ts', 'src/domain/phonePlayExpansion.ts', 'src/domain/phonePlayVisuals.ts',
  'src/presentation/components/minigames/expedition/expeditionExpressionData.ts',
  'src/presentation/TeacherAi.css', 'src/presentation/ApplicationPalette.css', 'src/application/ThemeContext.tsx',
  'src/application/BackgroundMusicContext.tsx', 'src/application/backgroundMusicRoutes.ts', 'src/application/browserStorage.ts', 'src/application/useModalDialog.ts',
  'src/assets/expedition-theme.mp3',
  'src/presentation/components/HeaderUtilities.tsx', 'src/presentation/components/HeaderUtilities.css',
  'src/presentation/components/HeaderToolbar.tsx', 'src/presentation/components/HeaderToolbar.css', 'src/presentation/components/HeaderPopover.tsx',
  'src/presentation/components/BackgroundMusicButton.tsx', 'src/presentation/components/BackgroundMusicButton.css',
  'src/presentation/components/LinkShareButton.tsx', 'src/presentation/components/LinkShareButton.css',
  'src/presentation/components/AppInstallButton.tsx',
  'teacher-studio/public/manifest.webmanifest', 'teacher-studio/public/studio-icon.png',
  'teacher-studio/public/fonts/Pretendard-Regular.woff2', 'teacher-studio/public/fonts/Pretendard-Bold.woff2',
  'teacher-studio/public/fonts/Pretendard-LICENSE.txt',
  'src/presentation/components/minigames/expression/expressionGamesData.ts',
  'src/presentation/components/minigames/curriculum/curriculumGamesMeta.ts',
  // 머리말(화면·소리 설정)·교사 로그인·대표 게임 목록이 함께 쓰는 파일. scripts/r114-header-naming.test.ts가 빠진 파일이 없는지 확인한다.
  'src/application/audience.ts', 'src/application/displayPrefs.ts', 'src/application/speechAnnouncer.ts',
  'src/application/speechText.ts', 'src/application/teacherLoginPrefs.ts', 'src/application/voicePrefs.ts',
  'src/data/supabase.ts', 'src/data/teacherAuthStorage.ts', 'src/domain/expeditionClarity.ts',
  'src/domain/funLoop.ts', 'src/domain/koreanParticle.ts', 'src/domain/peQuizBingo.ts',
  'src/domain/phonePlayClarity.ts', 'src/domain/phonePlayClassics.ts', 'src/domain/phonePlayClassicsMode.ts',
  'src/domain/phonePlayKid.ts', 'src/domain/questClarity.ts', 'src/domain/signature/define.ts',
  'src/domain/signature/sig-boss-raid.ts', 'src/domain/signature/sig-memory-relay.ts', 'src/domain/signature/sig-mirror-pair.ts',
  'src/domain/signature/sig-move-bingo.ts', 'src/domain/signature/sig-signal-captain.ts', 'src/domain/signature/sig-stage-show.ts',
  'src/domain/signature/types.ts', 'src/domain/signatureGames.ts', 'src/presentation/components/DisplayButtons.tsx',
  'src/presentation/components/TeacherStatusChip.tsx', 'src/presentation/components/minigames/expression/expressionClarity.ts', 'src/presentation/components/minigames/expression/expressionKidText.ts',
  'src/presentation/components/DisplayButtons.css', 'src/presentation/components/TeacherAccountForm.css',
];
for (const file of files) {
  await mkdir(join(root, file, '..'), { recursive: true });
  await writeFile(join(root, file), await readFile(file));
}
await mkdir(join(root, 'api'), { recursive: true });
await writeFile(join(root, 'api/studio.ts'), "export { default, maxDuration } from '../server/studioHandler.js';\n");
await writeFile(join(root, 'vercel.json'), JSON.stringify({
  framework: 'vite', buildCommand: 'npm run verify:studio-deploy', outputDirectory: 'dist-teacher',
  functions: { 'api/studio.ts': { maxDuration: 120 } },
  rewrites: [{ source: '/((?!api/).*)', destination: '/index.html' }],
  headers: [{ source: '/(.*)', headers: [
    { key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://tjrrtgdhtjdkofwqnxnz.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
  ] }],
}, null, 2));
// Keep any existing local configuration private when reusing the staging folder.
await writeFile(join(root, '.vercelignore'), '.env*\n**/.env*\n.vercel/**\nnode_modules/**\n**/node_modules/**\ndist-teacher/**\n');
console.log(`Prepared ${files.length + 3} allowlisted files in .studio-deploy (no secrets).`);
