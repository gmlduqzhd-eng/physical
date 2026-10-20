import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), { name: 'deny-environment-files', configureServer(server) {
    server.middlewares.use((req, res, next) => {
      let path: string; try { path = decodeURIComponent((req.url ?? '').split('?')[0]); } catch { res.statusCode = 400; res.end(); return; }
      if (/(?:^|\/)\.env(?:\.|\/|$)/i.test(path)) { res.statusCode = 403; res.end('Forbidden'); return; }
      next();
    });
  } }], envDir: false,
  server: { host: '127.0.0.1', port: 5174, strictPort: true, proxy: { '/api/studio': 'http://127.0.0.1:8788' }, fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**'] } },
  build: { outDir: '../dist-teacher', emptyOutDir: true },
});
