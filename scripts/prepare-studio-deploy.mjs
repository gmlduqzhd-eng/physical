import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

// Exact allowlist: never copy local environments, student API or classroom code.
const root = resolve('.studio-deploy');
const files = [
  'package.json', 'package-lock.json', 'tsconfig.app.json', 'tsconfig.studio.json',
  'teacher-studio/AdvancedControls.tsx', 'teacher-studio/Studio.tsx', 'teacher-studio/domain.ts',
  'teacher-studio/index.html', 'teacher-studio/main.tsx', 'teacher-studio/studio.css', 'teacher-studio/vite.config.ts',
  'server/studioHandler.ts', 'server/geminiStudio.ts', 'server/aiService.ts', 'server/teacherSession.ts',
  'src/domain/gamesData.ts', 'src/domain/teacherAi.ts', 'src/data/lessonGameCatalog.ts',
  'src/presentation/TeacherAi.css',
  'src/application/BackgroundMusicContext.tsx', 'src/application/browserStorage.ts', 'src/application/useModalDialog.ts',
  'src/assets/expedition-theme.mp3',
  'src/presentation/components/HeaderUtilities.tsx', 'src/presentation/components/HeaderUtilities.css',
  'src/presentation/components/BackgroundMusicButton.tsx', 'src/presentation/components/BackgroundMusicButton.css',
  'src/presentation/components/LinkShareButton.tsx', 'src/presentation/components/LinkShareButton.css',
  'src/presentation/components/AppInstallButton.tsx',
  'teacher-studio/public/manifest.webmanifest', 'teacher-studio/public/studio-icon.png',
  'teacher-studio/public/fonts/Pretendard-Regular.woff2', 'teacher-studio/public/fonts/Pretendard-Bold.woff2',
  'teacher-studio/public/fonts/Pretendard-LICENSE.txt',
  'src/presentation/components/minigames/expression/expressionGamesData.ts',
  'src/presentation/components/minigames/curriculum/curriculumGamesMeta.ts',
];
for (const file of files) {
  await mkdir(join(root, file, '..'), { recursive: true });
  await writeFile(join(root, file), await readFile(file));
}
await mkdir(join(root, 'api'), { recursive: true });
await writeFile(join(root, 'api/studio.ts'), "export { default, maxDuration } from '../server/studioHandler.js';\n");
await writeFile(join(root, 'vercel.json'), JSON.stringify({
  framework: 'vite', buildCommand: 'npm run build:studio', outputDirectory: 'dist-teacher',
  functions: { 'api/studio.ts': { maxDuration: 120 } },
  rewrites: [{ source: '/((?!api/).*)', destination: '/index.html' }],
  headers: [{ source: '/(.*)', headers: [
    { key: 'X-Frame-Options', value: 'DENY' }, { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
  ] }],
}, null, 2));
console.log(`Prepared ${files.length + 2} allowlisted files in .studio-deploy (no secrets).`);
