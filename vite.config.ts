import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Main and teacher dev servers must never overwrite each other's dep cache.
  cacheDir: 'node_modules/.vite-main',
  optimizeDeps: { include: ['qrcode'] },
  plugins: [react()],
  server: { proxy: { '/api/teacher': 'http://127.0.0.1:8787', '/api/health': 'http://127.0.0.1:8787' } },
})
