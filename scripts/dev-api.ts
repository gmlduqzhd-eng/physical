import { createServer } from 'node:http';
import { parse } from 'dotenv';
import handler from '../api/teacher';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';
import { authConfigured, cookie, newSession, session } from '../server/teacherSession';
let configuring = false;
// Reload only server settings for each local request so editing .env.local takes effect.
// Production uses Vercel environment configuration and has no file-based reload.
const server = createServer(async (req, res) => {
  const env: Record<string, string> = {};
  for (const file of ['.env.local', '.env.ai.local', '.env.teacher.local', '.env.classroom.local']) {
    Object.assign(env, await readFile(file, 'utf8').then(parse).catch(() => ({})));
  }
  for (const key of ['OPENAI_API_KEY', 'OPENAI_MODEL', 'AI_PRIVACY_REVIEWED', 'TEACHER_ACCESS_HASH', 'TEACHER_SESSION_SECRET', 'APP_ORIGIN', 'CLASSROOM_TEACHER_BOOTSTRAP', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']) {
    if (env[key]) process.env[key] = env[key]; else delete process.env[key];
  }
  process.env.LOCAL_TEACHER_SETUP = 'true';
  if (new URL(req.url ?? '/', 'http://localhost').searchParams.get('action') === 'configure-ai') {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
    const fail = (status: number, error: string) => { res.statusCode = status; res.end(JSON.stringify({ error })); };
    if (req.method !== 'POST' || req.headers.origin !== 'http://127.0.0.1:5173' || !session(req)) return fail(403, '교사 인증 후 설정하세요.');
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return fail(415, 'JSON만 허용합니다.');
    try {
      let raw = ''; for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 2000) return fail(413, '입력이 너무 깁니다.'); }
      const body = JSON.parse(raw);
      if (Object.keys(body).some(k => !['apiKey', 'privacyReviewed'].includes(k)) || typeof body.apiKey !== 'string' || !/^sk-[A-Za-z0-9_-]{20,500}$/.test(body.apiKey) || typeof body.privacyReviewed !== 'boolean') return fail(400, '새 API 키를 정확히 붙여 넣어 주세요.');
      await writeFile('.env.ai.local', `OPENAI_API_KEY=${body.apiKey}\nOPENAI_MODEL=gpt-5.4-mini\nAI_PRIVACY_REVIEWED=${body.privacyReviewed}\n`, { mode: 0o600 });
      res.end(JSON.stringify({ saved: true }));
    } catch { fail(400, '로컬 설정을 저장하지 못했습니다. 파일 권한을 확인하세요.'); }
    return;
  }
  // First-use setup exists only in the loopback development server, never in api/teacher.ts.
  if (new URL(req.url ?? '/', 'http://localhost').searchParams.get('action') === 'setup') {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Content-Type', 'application/json');
    const fail = (status: number, message: string) => { res.statusCode = status; res.end(JSON.stringify({ error: message })); };
    if (req.method !== 'POST' || req.headers.origin !== 'http://127.0.0.1:5173' || authConfigured() || configuring) return fail(403, '초기 설정을 허용하지 않습니다.');
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return fail(415, 'JSON만 허용합니다.');
    configuring = true;
    try {
      let raw = ''; for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 1000) return fail(413, '입력이 너무 깁니다.'); }
      const body = JSON.parse(raw);
      if (Object.keys(body).length !== 1 || typeof body.code !== 'string' || body.code.length < 12 || body.code.length > 128) return fail(400, '교사 접근 코드는 12~128자로 설정해 주세요.');
      // Separate file avoids overwriting a teacher's concurrent edits to the AI key file.
      await readFile('.env.teacher.local').then(() => { throw new Error('exists'); }).catch(error => { if (error.code !== 'ENOENT') throw error; });
      const salt = randomBytes(16).toString('hex'); const hash = salt + ':' + scryptSync(body.code, salt, 64).toString('hex');
      const secret = randomBytes(48).toString('base64url');
      await writeFile('.env.teacher.local', `TEACHER_ACCESS_HASH=${hash}\nTEACHER_SESSION_SECRET=${secret}\nAPP_ORIGIN=http://127.0.0.1:5173\n`, { flag: 'wx', mode: 0o600 });
      process.env.TEACHER_ACCESS_HASH = hash; process.env.TEACHER_SESSION_SECRET = secret;
      res.setHeader('Set-Cookie', cookie(newSession())); res.end(JSON.stringify({ authenticated: true }));
    } catch { fail(400, '설정을 저장하지 못했습니다. 기존 교사 설정 파일 또는 저장 권한을 확인하세요.'); }
    finally { configuring = false; }
    return;
  }
  void handler(req, res);
});
server.listen(Number(process.env.DEV_API_PORT ?? 8787), '127.0.0.1', () => console.log(`Teacher API ready: http://127.0.0.1:${(server.address() as { port: number }).port} (no request bodies logged)`));
