import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { z } from 'zod';
import { authConfigured, cookie, newSession, rateLimit, session, verifyCode } from '../server/teacherSession';
import { defaultGeminiModel, geminiReady, generateStudioAdvice } from '../server/geminiStudio';

// Standalone loopback trial server. This file is never a route in the student deployment.
const scope = 'physical_studio';
const origin = 'http://127.0.0.1:5174';
let inFlight = false;
// Keys are opaque credentials. New Google authorization keys can contain dots and
// be longer than legacy keys; do not assume the old AIza format or a 200-char cap.
const keySchema = z.object({ apiKey: z.string().min(20).max(4096).regex(new RegExp('^[A-Za-z0-9._~+/-]+=*$')), publicDataReviewed: z.literal(true), freeProjectConfirmed: z.literal(true) }).strict();
const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status: number, data: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
  if (new URL(req.url ?? '/', origin).pathname !== '/api/studio') return send(404, { error: '없는 경로입니다.' });
  const env: Record<string, string> = {};
  for (const file of ['.env.teacher.local', '.env.gemini.local']) Object.assign(env, await readFile(file, 'utf8').then(parse).catch(() => ({})));
  for (const key of ['TEACHER_ACCESS_HASH', 'TEACHER_SESSION_SECRET', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_PUBLIC_DATA_REVIEWED']) {
    if (env[key]) process.env[key] = env[key]; else delete process.env[key];
  }
  const action = new URL(req.url ?? '/', origin).searchParams.get('action');
  const nonce = session(req, scope);
  if (req.method === 'GET' && action === 'status') return send(200, { authenticated: !!nonce, configured: authConfigured(), aiReady: geminiReady(), model: process.env.GEMINI_MODEL ?? defaultGeminiModel });
  if (req.method !== 'POST') return send(405, { error: 'POST 요청이 필요합니다.' });
  if (req.headers.origin !== origin) return send(403, { error: '교사 전용 도구에서만 요청할 수 있습니다.' });
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415, { error: 'JSON만 허용합니다.' });
  try {
    let raw = ''; for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 8000) return send(413, { error: '입력이 너무 깁니다.' }); }
    const body: unknown = JSON.parse(raw);
    if (action === 'login') {
      if (!rateLimit('studio-login:' + req.socket.remoteAddress, 8, 900000)) return send(429, { error: '시도가 많습니다. 15분 후 다시 시도하세요.' });
      const login = z.object({ code: z.string().min(12).max(128), adultTeacher: z.literal(true) }).strict().parse(body);
      if (!verifyCode(login.code)) return send(401, { error: '기존에 설정한 교사 접근 코드를 확인하세요.' });
      res.setHeader('Set-Cookie', cookie(newSession(scope), false, scope)); return send(200, { authenticated: true });
    }
    if (action === 'logout') { res.setHeader('Set-Cookie', cookie('', true, scope)); return send(200, { authenticated: false }); }
    if (!nonce) return send(401, { error: '성인 교사 인증이 필요합니다.' });
    if (action === 'configure') {
      const checked = keySchema.safeParse(body);
      if (!checked.success) {
        if (checked.error.issues.some(issue => issue.path[0] === 'apiKey')) return send(400, { error: '실제 API 키 전체를 다시 복사해 붙여 넣어 주세요. 키 이름·공백·줄바꿈은 입력할 수 없습니다.' });
        return send(400, { error: '공개 자료 이용 조건과 무료 프로젝트 확인 항목을 모두 체크해 주세요.' });
      }
      const settings = checked.data;
      if (inFlight) return send(409, { error: '생성이 끝난 뒤 설정을 바꾸세요.' });
      await writeFile('.env.gemini.local', `GEMINI_API_KEY=${settings.apiKey}\nGEMINI_MODEL=${defaultGeminiModel}\nGEMINI_PUBLIC_DATA_REVIEWED=true\n`, { mode: 0o600 });
      return send(200, { saved: true });
    }
    if (action !== 'generate') return send(404, { error: '없는 기능입니다.' });
    if (!rateLimit('studio-ai:' + nonce, 3, 60000) || inFlight) return send(429, { error: '무료 시험은 한 번에 하나씩, 분당 3회까지 요청합니다. 잠시 후 다시 시도하세요.' });
    inFlight = true;
    try { return send(200, await generateStudioAdvice(body)); } finally { inFlight = false; }
  } catch (error) {
    // Never log or reflect provider payloads, request data, keys or stack traces.
    let current: unknown = error;
    for (let i = 0; i < 4 && current && typeof current === 'object'; i++) {
      const item = current as { statusCode?: number; cause?: unknown; name?: string };
      if (item.statusCode === 429) return send(429, { error: 'Gemini 무료 요청 한도에 도달했습니다. AI Studio의 프로젝트 한도를 확인하세요. 자동 유료 전환이나 재시도는 하지 않습니다.' });
      if (item.statusCode === 401 || item.statusCode === 403) return send(502, { error: 'Gemini 키의 유효성·Generative Language API 권한·지역 지원을 확인하세요.' });
      if (item.statusCode === 404) return send(502, { error: '설정한 Gemini 모델에 접근할 수 없습니다. 사용 가능한 모델을 확인하세요.' });
      if (item.name === 'TimeoutError' || item.name === 'AbortError') return send(504, { error: '생성 시간이 초과되었습니다. 잠시 후 다시 시도하세요.' });
      current = item.cause;
    }
    if (error instanceof z.ZodError) return send(422, { error: '공개 수업 조건만 입력할 수 있습니다. 학생 정보·자유 메모·추가 필드는 받지 않습니다.' });
    const message = error instanceof Error ? error.message : '';
    const safe = ['Gemini 키와', '조건에 맞는', '활동을 먼저', '적합한 활동', '원문과 일치', '목록에 없는', '근거가 없는', '필수 수업', '수업 시간', '검증되지 않은', '잘못된', '검증할 수 없는'].some(prefix => message.startsWith(prefix));
    return send(422, { error: safe ? message : 'AI 결과를 검증하지 못해 표시하지 않았습니다. 입력 조건을 확인하세요.' });
  }
});
server.listen(Number(process.env.STUDIO_API_PORT ?? 8788), '127.0.0.1', () => console.log(`Adult teacher studio API ready: http://127.0.0.1:${(server.address() as { port: number }).port} (no request bodies logged)`));
