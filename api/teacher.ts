import { activeTeacherSession, googleTeacherLogin, googleOAuthConfiguration, TeacherAccountError, teacherAccountId, sharedTeacherLoginAttempt } from '../server/teacherAccounts.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ABSOLUTE_SECONDS, authConfigured, codeConfigured, cookie, newSession, rateLimit, session, sessionDetails, verifyCode } from '../server/teacherSession.js';
import { generateAdvice } from '../server/aiService.js';
import { publicAiError } from '../server/aiErrors.js';
import { authorizeClassroomTeacher, ClassroomReconnectError } from '../server/classroomBridge.js';

export const maxDuration = 60;
type Request = IncomingMessage & { body?: unknown };
export default async function handler(req: Request, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  const started=Date.now();
  const send = (status: number, data: unknown) => { console.info(JSON.stringify({event:'teacher_request',status,durationMs:Date.now()-started})); res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(data)); };
  const action = new URL(req.url ?? '/', 'http://localhost').searchParams.get('action');
  let nonce = session(req) ?? session(req, 'physical_studio');
  try { if (!await activeTeacherSession(nonce)) nonce=null; } catch { return send(503, { error: '교사 계정 서버에 연결하지 못했습니다.' }); }
  if(req.method==='GET'&&action==='oauth-config'){try{return send(200,await googleOAuthConfiguration());}catch{return send(503,{error:'Google 로그인 연결 설정을 확인하지 못했습니다.'});}}
  const localSetup = process.env.NODE_ENV !== 'production' && process.env.LOCAL_TEACHER_SETUP === 'true';
  if (req.method === 'GET' && action === 'status') {try{return send(200, { authenticated: !!nonce, configured: authConfigured(), localSetup, ...(localSetup ? { localCodeSet: codeConfigured() } : {}), aiReady: !!process.env.OPENAI_API_KEY && !!process.env.OPENAI_MODEL && process.env.AI_PRIVACY_REVIEWED === 'true' });}catch{return send(503,{error:'교사 로그인 전환 상태를 확인하지 못했습니다.'});}}
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
    if (action === 'google-login') {
      const address = req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? 'unknown';
      if (!rateLimit('account:' + address, 8, 900000)) return send(429, { error: '시도가 많습니다. 15분 후 다시 시도하세요.' });
      const admission=await sharedTeacherLoginAttempt(String(address));
      if(!admission.allowed){res.setHeader('Retry-After',String(admission.retrySeconds));return send(429,{error:'시도가 많습니다. 15분 후 다시 시도하세요.'});}
      const account = await googleTeacherLogin(body);
      // "이 기기에서 30일 동안 로그인 유지": the cookie and the signed expiry both last 30 days.
      res.setHeader('Set-Cookie', cookie(newSession('physical_teacher', account.nonce, account.remember), false, 'physical_teacher', account.remember));return send(200,{authenticated:true});
    }
    // The old shared teacher code is retired. Only the loopback development server (scripts/dev-api.ts)
    // keeps a local code for developers without a Google project.
    if (action === 'login' || action === 'setup') {
      if (action === 'setup' || !localSetup) return send(410, { error: '예전 공유 코드 로그인은 없어졌어요. Google 계정으로 로그인해 주세요. 공유 코드로 만든 수업은 복구키로 가져올 수 있어요.' });
      if (!codeConfigured()) return send(503, { error: '교사 인증을 먼저 설정하세요. 서버에서 npm run teacher:setup을 실행하세요.' });
      const address = req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? 'unknown';
      if (!rateLimit('login:' + address, 8, 15 * 60 * 1000)) return send(429, { error: '시도가 많습니다. 15분 후 다시 시도하세요.' });
      const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : undefined;
      if (typeof code !== 'string' || !verifyCode(code)) return send(401, { error: '교사 접근 코드가 일치하지 않습니다.' });
      res.setHeader('Set-Cookie', cookie(newSession())); return send(200, { authenticated: true });
    }
    if (action === 'logout') { res.setHeader('Set-Cookie', [cookie('', true), cookie('', true, 'physical_studio')]); return send(200, { authenticated: false }); }
    if (!nonce) return send(401, { error: '교사 인증이 필요하거나 만료되었습니다. 다시 로그인하세요.' });
    if (action === 'classroom-authorize') {
      if (!rateLimit('classroom-auth:' + nonce, 6, 60000)) return send(429, { error: '교사 권한 확인 요청이 많습니다.' });
      const authorized = await authorizeClassroomTeacher((body as { accessToken?: unknown })?.accessToken, teacherAccountId(nonce));
      // Sliding renewal: an active classroom keeps the same signed identity for another full period,
      // but never past 30 days after the first login (the signed `issued` time is carried over).
      // Google accounts only. A teacher who chose 30-day login keeps the 30-day period on renewal.
      const current = sessionDetails(req);
      if (current?.nonce === nonce && teacherAccountId(nonce)) {
        const left = (current.issued + ABSOLUTE_SECONDS * 1000 - Date.now()) / 1000;
        res.setHeader('Set-Cookie', cookie(newSession('physical_teacher', nonce, current.remember, current.issued), false, 'physical_teacher', current.remember, left));
      }
      return send(200, authorized);
    }
    if (action !== 'generate') return send(404, { error: '없는 기능입니다.' });
    if (!rateLimit('ai:' + nonce, 12, 60 * 1000)) return send(429, { error: '생성 요청이 많습니다. 잠시 후 다시 시도하세요.' });
    const data = await generateAdvice(body);
    return send(200, data);
  } catch (error) {
    if (error instanceof TeacherAccountError) return send(error.status, { error: error.message });
    // The server login is still valid but this tab has no (or another) Google connection: ask to reconnect.
    if (error instanceof ClassroomReconnectError) return send(409, { error: error.message, reconnect: true });
    const providerError = publicAiError(error);
    if (providerError) return send(providerError.status, { error: providerError.error });
    // Never return provider payloads, prompt bodies, authentication data or stack traces.
    const message = error instanceof Error ? error.message : '';
    const safe = ['수업방', '활동을 먼저', 'AI 설정이 필요', '관찰 항목을', '모둠별 5명', '조건에 맞는', '원문과 일치', '목록에 없는', '근거가 없는', '적합한 활동', '필수 수업', '수업 시간', '검증되지 않은', '잘못된 결과', '잘못된 시간', '검증할 수 없는'].some(prefix => message.startsWith(prefix));
    return send(safe ? (message.startsWith('AI 설정') ? 503 : 422) : 400, { error: safe ? message : '입력 또는 AI 응답을 검증하지 못했습니다. 개인정보가 없는 입력인지 확인하고 다시 시도하세요.' });
  }
}
