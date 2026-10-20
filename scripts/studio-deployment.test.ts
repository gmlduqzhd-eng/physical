import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomBytes, scryptSync } from 'node:crypto';
import handler from '../server/studioHandler.js';
import { newSession } from '../server/teacherSession.js';

test('online studio enforces adult auth, scoped sessions, origin, size and server-managed keys', async () => {
  const original = { ...process.env };
  const salt = randomBytes(16).toString('hex');
  process.env.TEACHER_ACCESS_HASH = salt + ':' + scryptSync('synthetic-teacher-code', salt, 64).toString('hex');
  process.env.TEACHER_SESSION_SECRET = randomBytes(40).toString('hex');
  process.env.GEMINI_API_KEY = 'synthetic-test-never-sent';
  process.env.GEMINI_MODEL = 'synthetic-model';
  process.env.GEMINI_PUBLIC_DATA_REVIEWED = 'true';
  process.env.NODE_ENV = 'production';
  delete process.env.VERCEL_URL;
  const server = createServer((req, res) => { void handler(req, res); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.env.STUDIO_ORIGIN = url;
  const post = (action: string, body: unknown, token?: string, origin = url) => fetch(url + '/api/studio?action=' + action, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Cookie: 'physical_studio=' + token } : {}) }, body: JSON.stringify(body),
  });
  try {
    const status = await fetch(url + '/api/studio?action=status');
    assert.deepEqual(await status.json(), { authenticated: false, configured: true, aiReady: true, model: 'synthetic-model', localSetup: false });
    assert.equal(status.headers.get('cache-control'), 'no-store');
    assert.equal((await post('generate', {})).status, 401);
    assert.equal((await post('generate', {}, newSession())).status, 401);
    assert.equal((await post('generate', {}, newSession('physical_studio'), 'https://untrusted.example')).status, 403);
    assert.equal((await post('login', { code: 'synthetic-teacher-code', adultTeacher: false })).status, 422);
    assert.equal((await post('login', { code: 'incorrect-test-code', adultTeacher: true })).status, 401);
    const login = await post('login', { code: 'synthetic-teacher-code', adultTeacher: true });
    assert.equal(login.status, 200);
    assert.match(login.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict; Path=\/api; Max-Age=7200; Secure/);
    const token = newSession('physical_studio');
    assert.equal((await post('configure', { apiKey: 'must-never-be-saved' }, token)).status, 404);
    assert.equal((await post('generate', { studentName: 'synthetic-private-field' }, token)).status, 422);
    assert.equal((await post('generate', { notes: 'x'.repeat(9000) }, token)).status, 413);
    const logout = await post('logout', {}, token);
    assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});
