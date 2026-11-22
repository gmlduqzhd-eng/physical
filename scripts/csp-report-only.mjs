// index.html 안에 직접 적은 스크립트의 CSP 해시를 계산한다.
// vercel.json의 Content-Security-Policy-Report-Only 값을 맞출 때 쓴다:  node scripts/csp-report-only.mjs [index.html 경로]
// (scripts/csp-report-only.test.ts가 vercel.json과 index.html이 맞는지 확인한다.)
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** src가 없는 <script> 본문마다 'sha256-…' 값을 돌려준다. */
export function inlineScriptHashes(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map(match => `'sha256-${createHash('sha256').update(match[1], 'utf8').digest('base64')}'`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(inlineScriptHashes(readFileSync(process.argv[2] ?? new URL('../index.html', import.meta.url), 'utf8')).join(' '));
}
