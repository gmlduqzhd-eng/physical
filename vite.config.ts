import { defineConfig, type Plugin } from 'vite'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import react from '@vitejs/plugin-react'

/**
 * 서비스워커가 설치될 때 미리 받아 둘 파일 목록(/sw-precache.json)을 만든다.
 * 예전에는 서비스워커가 스크립트 안의 파일 이름을 끝까지 따라가 앱 전체(약 4MB)를 받았다.
 * 이제는 첫 화면 묶음과 학생 화면(입장·모둠 폰)만 미리 받고, 나머지는 쓸 때 받아 둔다.
 */
// 미리 받는 화면: 학생이 들어오는 곳과 선생님이 수업 중에 자주 여는 곳(수업 시작 방식·오늘 수업·활동 고르기·수업 도구).
// 교실 와이파이가 끊겨도 처음 여는 이 화면들이 바로 떠야 한다.
export const PRECACHE_ROUTES = /\/src\/presentation\/(?:Lobby|QuickJoin|MobileMissionView|StartLesson|TodayLesson|ActivityLibrary|ClassTools|components\/TodayLessonBar)\.tsx$/
function swPrecacheList(): Plugin {
  return {
    name: 'sw-precache-list',
    apply: 'build',
    // 파일 이름(해시)이 모두 정해진 뒤(writeBundle)에 목록을 쓴다. generateBundle 단계에서는 이름이 아직
    // 바뀔 수 있어, 목록에 없는 파일 이름이 들어가 화면이 실제로는 미리 받아지지 않았다.
    writeBundle(options, bundle) {
      const chunks = new Map(Object.values(bundle).flatMap(item => item.type === 'chunk' ? [[item.fileName, item] as const] : []))
      const files = new Set<string>()
      const visit = (fileName: string) => {
        if (files.has(fileName)) return
        const chunk = chunks.get(fileName)
        if (!chunk) return
        files.add(fileName)
        chunk.viteMetadata?.importedCss.forEach(css => { if (css in bundle) files.add(css) })
        chunk.imports.forEach(visit)
      }
      for (const chunk of chunks.values()) if (chunk.isEntry || (chunk.facadeModuleId && PRECACHE_ROUTES.test(chunk.facadeModuleId))) visit(chunk.fileName)
      writeFileSync(join(options.dir ?? 'dist', 'sw-precache.json'), JSON.stringify([...files].sort().map(file => `/${file}`)))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // Main and teacher dev servers must never overwrite each other's dep cache.
  cacheDir: 'node_modules/.vite-main',
  optimizeDeps: { include: ['qrcode'] },
  plugins: [react(), swPrecacheList()],
  server: { proxy: { '/api/teacher': 'http://127.0.0.1:8787', '/api/health': 'http://127.0.0.1:8787' } },
})
