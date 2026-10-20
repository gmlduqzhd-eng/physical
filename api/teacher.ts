import type { IncomingMessage, ServerResponse } from 'node:http';
import { authConfigured, cookie, newSession, rateLimit, session, verifyCode } from '../server/teacherSession.js';
import { generateAdvice } from '../server/aiService.js';
import { publicAiError } from '../server/aiErrors.js';
import { authorizeClassroomTeacher } from '../server/classroomBridge.js';

export const maxDuration = 60;
type Request = IncomingMessage & { body?: unknown };
export default async function handler(req: Request, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status: number, data: unknown) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
  const action = new URL(req.url ?? '/', 'http://localhost').searchParams.get('action');
  const nonce = session(req) ?? session(req, 'physical_studio');
  if (req.method === 'GET' && action === 'status') return send(200, { authenticated: !!nonce, configured: authConfigured(), localSetup: process.env.NODE_ENV !== 'production' && process.env.LOCAL_TEACHER_SETUP === 'true', aiReady: !!process.env.OPENAI_API_KEY && !!process.env.OPENAI_MODEL && process.env.AI_PRIVACY_REVIEWED === 'true' });
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return send(405, { error: '허용하지 않는 요청입니다.' }); }
  const origin = req.headers.origin;
  const allowed = process.env.APP_ORIGIN ?? (process.env.NODE_ENV === 'production' ? undefined : 'http://127.0.0.1:5173');
  const deploymentOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;
  if (!allowed || !origin || (origin !== allowed && origin !== deploymentOrigin)) return send(403, { error: '허용되지 않은 출처입니다. 서버 APP_ORIGIN을 확인하세요.' });
  if (!(req.headers['content-type'] ?? '').startsWith('application/json')) return send(415, { error: 'JSON 요청만 허용합니다.' });
  try {
    let body = req.body;
    if (body === undefined) {
      const chunks: Buffer[] = []; let length = 0;
      for await (const chunk of req) { length += chunk.length; if (length > 12000) return send(413, { error: '입력 크기를 초과했습니다.' }); chunks.push(Buffer.from(chunk)); }
      body = JSON.parse(Buffer.concat(chunks).toString());
    } else if (typeof body === 'string') body = JSON.parse(body);
    if (Buffer.byteLength(JSON.stringify(body)) > 12000) return send(413, { error: '입력 크기를 초과했습니다.' });
    if (action === 'login') {
      if (!authConfigured()) return send(503, { error: '교사 인증을 먼저 설정하세요. 서버에서 npm run teacher:setup을 실행하세요.' });
      const address = req.socket.remoteAddress ?? 'unknown';
      if (!rateLimit('login:' + address, 8, 15 * 60 * 1000)) return send(429, { error: '시도가 많습니다. 15분 후 다시 시도하세요.' });
      const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : undefined;
      if (typeof code !== 'string' || !verifyCode(code)) return send(401, { error: '교사 접근 코드가 일치하지 않습니다.' });
      res.setHeader('Set-Cookie', cookie(newSession())); return send(200, { authenticated: true });
    }
    if (action === 'logout') { res.setHeader('Set-Cookie', [cookie('', true), cookie('', true, 'physical_studio')]); return send(200, { authenticated: false }); }
    if (!nonce) return send(401, { error: '교사 인증이 필요하거나 만료되었습니다. 다시 로그인하세요.' });
    if (action === 'classroom-authorize') {
      if (!rateLimit('classroom-auth:' + nonce, 6, 60000)) return send(429, { error: '교사 권한 확인 요청이 많습니다.' });
      return send(200, await authorizeClassroomTeacher((body as { accessToken?: unknown })?.accessToken));
    }
    if (action !== 'generate') return send(404, { error: '없는 기능입니다.' });
    if (!rateLimit('ai:' + nonce, 12, 60 * 1000)) return send(429, { error: '생성 요청이 많습니다. 잠시 후 다시 시도하세요.' });
    const data = await generateAdvice(body);
    return send(200, data);
  } catch (error) {
    const providerError = publicAiError(error);
    if (providerError) return send(providerError.status, { error: providerError.error });
    // Never return provider payloads, prompt bodies, authentication data or stack traces.
    const message = error instanceof Error ? error.message : '';
    const safe = ['수업방', '활동을 먼저', 'AI 설정이 필요', '관찰 항목을', '모둠별 5명', '조건에 맞는', '원문과 일치', '목록에 없는', '근거가 없는', '적합한 활동', '필수 수업', '수업 시간', '검증되지 않은', '잘못된 결과', '잘못된 시간', '검증할 수 없는'].some(prefix => message.startsWith(prefix));
    return send(safe ? (message.startsWith('AI 설정') ? 503 : 422) : 400, { error: safe ? message : '입력 또는 AI 응답을 검증하지 못했습니다. 개인정보가 없는 입력인지 확인하고 다시 시도하세요.' });
  }
}
