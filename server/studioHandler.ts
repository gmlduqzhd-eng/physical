import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { authConfigured, cookie, newSession, rateLimit, session, verifyCode } from './teacherSession.js';
import { defaultGeminiModel, geminiReady, generateStudioAdvice } from './geminiStudio.js';

export const maxDuration = 120;
const scope = 'physical_studio';
let inFlight = false;
type Request = IncomingMessage & { body?: unknown };

// Deployed only in the separate teacher project. No key-setting, file or DB route.
export default async function handler(req: Request, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status: number, data: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
  const action = new URL(req.url ?? '/', 'http://localhost').searchParams.get('action');
  const nonce = session(req, scope);
  if (req.method === 'GET' && action === 'status') return send(200, { authenticated: !!nonce, configured: authConfigured(), aiReady: geminiReady(), model: process.env.GEMINI_MODEL ?? defaultGeminiModel, localSetup: false });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(405, { error: 'POST 요청이 필요합니다.' }); }
  const allowed = [process.env.STUDIO_ORIGIN, process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined].filter(Boolean);
  if (!req.headers.origin || !allowed.includes(req.headers.origin)) return send(403, { error: '교사 전용 도구에서만 요청할 수 있습니다.' });
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415, { error: 'JSON만 허용합니다.' });
  try {
    let body = req.body;
    if (body === undefined) {
      const chunks: Buffer[] = []; let length = 0;
      for await (const chunk of req) { length += chunk.length; if (length > 8000) return send(413, { error: '입력이 너무 깁니다.' }); chunks.push(Buffer.from(chunk)); }
      body = JSON.parse(Buffer.concat(chunks).toString());
    } else if (typeof body === 'string') body = JSON.parse(body);
    if (Buffer.byteLength(JSON.stringify(body) ?? '') > 8000) return send(413, { error: '입력이 너무 깁니다.' });
    if (action === 'login') {
      if (!authConfigured()) return send(503, { error: '서버의 교사 인증 설정이 필요합니다.' });
      const address = req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? 'unknown';
      if (!rateLimit('studio-login:' + address, 8, 900000)) return send(429, { error: '시도가 많습니다. 15분 후 다시 시도하세요.' });
      const login = z.object({ code: z.string().min(12).max(128), adultTeacher: z.literal(true) }).strict().parse(body);
      if (!verifyCode(login.code)) return send(401, { error: '기존에 설정한 교사 접근 코드를 확인하세요.' });
      res.setHeader('Set-Cookie', cookie(newSession(scope), false, scope)); return send(200, { authenticated: true });
    }
    if (action === 'logout') { res.setHeader('Set-Cookie', cookie('', true, scope)); return send(200, { authenticated: false }); }
    if (!nonce) return send(401, { error: '성인 교사 인증이 필요합니다.' });
    if (action !== 'generate') return send(404, { error: '없는 기능입니다. 키 설정은 서버에서만 관리합니다.' });
    if (!rateLimit('studio-ai:' + nonce, 3, 60000) || !rateLimit('studio-all', 3, 60000) || inFlight) return send(429, { error: '한 번에 하나씩, 분당 3회까지 요청합니다. 잠시 후 다시 시도하세요.' });
    inFlight = true;
    try { return send(200, await generateStudioAdvice(body)); } finally { inFlight = false; }
  } catch (error) {
    // Never log/return provider payloads, prompts, credentials or stack traces.
    let current: unknown = error;
    for (let i = 0; i < 4 && current && typeof current === 'object'; i++) {
      const item = current as { statusCode?: number; cause?: unknown; name?: string };
      if (item.statusCode === 429) return send(429, { error: 'Gemini 요청 한도에 도달했습니다. 자동 유료 전환이나 재시도는 하지 않습니다.' });
      if (item.statusCode === 401 || item.statusCode === 403) return send(502, { error: '서버 Gemini 키의 유효성·API 권한·지역 지원을 확인하세요.' });
      if (item.statusCode === 404) return send(502, { error: '설정한 Gemini 모델에 접근할 수 없습니다.' });
      if (item.name === 'TimeoutError' || item.name === 'AbortError') return send(504, { error: '생성 시간이 초과되었습니다. 잠시 후 다시 시도하세요.' });
      current = item.cause;
    }
    if (error instanceof z.ZodError) return send(422, { error: '공개 수업 조건만 입력할 수 있습니다. 학생 정보·자유 메모·추가 필드는 받지 않습니다.' });
    const message = error instanceof Error ? error.message : '';
    const safe = ['Gemini 키와', '조건에 맞는', '활동을 먼저', '적합한 활동', '원문과 일치', '목록에 없는', '근거가 없는', '필수 수업', '수업 시간', '검증되지 않은', '잘못된', '검증할 수 없는'].some(prefix => message.startsWith(prefix));
    return send(422, { error: safe ? message : '입력 또는 AI 결과를 검증하지 못해 표시하지 않았습니다.' });
  }
}
