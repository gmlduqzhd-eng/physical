import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// @ts-expect-error 형식 선언이 없는 작은 도우미(.mjs)다.
import { inlineScriptHashes } from './csp-report-only.mjs';

const read = (path: string) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const vercel = JSON.parse(read('vercel.json')) as { headers: { source: string; headers: { key: string; value: string }[] }[] };
const all = vercel.headers.find(rule => rule.source === '/(.*)')!.headers;
const header = (key: string) => all.find(item => item.key === key)?.value;

test('CSP는 아직 보고만 한다(Report-Only) — 막는 헤더는 두지 않는다', () => {
  assert.equal(header('Content-Security-Policy'), undefined, '막는 CSP를 켜려면 먼저 보고 결과를 확인해요');
  const csp = header('Content-Security-Policy-Report-Only');
  assert.ok(csp, 'Report-Only 헤더가 있어야 해요');
  const directives = new Map(csp!.split(';').map(part => part.trim().split(/\s+/)).map(([name, ...values]) => [name, values] as const));
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('base-uri'), ["'self'"]);
  assert.deepEqual(directives.get('frame-ancestors'), ["'self'"]);
  const script = directives.get('script-src')!;
  assert.ok(script.includes("'self'"));
  assert.ok(!script.includes("'unsafe-inline'") && !script.includes("'unsafe-eval'") && !script.includes('*'), '스크립트는 느슨하게 열지 않아요');
  const connect = directives.get('connect-src')!;
  assert.ok(connect.includes('https://*.supabase.co') && connect.includes('wss://*.supabase.co'), '수업방 연결(Supabase)과 실시간(wss)을 허용해요');
  assert.ok(directives.get('frame-src')!.includes('https://www.youtube-nocookie.com'), '표현 활동의 영상 틀을 허용해요');
});

test('index.html에 직접 적은 스크립트의 해시가 CSP에 모두 들어 있다(다르면 node scripts/csp-report-only.mjs)', () => {
  const csp = header('Content-Security-Policy-Report-Only')!;
  const hashes: string[] = inlineScriptHashes(read('index.html'));
  assert.equal(hashes.length, 2, '직접 적은 스크립트는 카카오 인앱 탈출과 서비스워커 등록 두 개예요');
  for (const hash of hashes) assert.ok(csp.includes(hash), `${hash}가 vercel.json에 없어요`);
  assert.equal((csp.match(/'sha256-/g) ?? []).length, hashes.length, '쓰지 않는 해시는 지워요');
});
