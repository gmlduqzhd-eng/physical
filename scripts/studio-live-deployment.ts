import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { config } from 'dotenv';
import { newSession } from '../server/teacherSession.js';

config({ path: ['.env.teacher.local', '.env.gemini.local', '.env.studio-production.local'], override: true, quiet: true });
const target = process.argv[2];
assert.match(target ?? '', /^https:\/\/physical-teacher-studio(?:-[a-z0-9]+)?-gmlduqzhd-engs-projects\.vercel\.app$/);
const cli = process.env.VERCEL_CLI_ENTRY; assert.ok(cli, 'Set VERCEL_CLI_ENTRY to an installed Vercel CLI entry');
const token = newSession('physical_studio');
const cfg = resolve('.studio-request.local'); const dataFile = resolve('.studio-body.local');
const results: { check: string; status: number }[] = [];
async function request(action: string, body?: unknown, auth = false, origin = target) {
  const headers = [`Origin: ${origin}`, 'Content-Type: application/json', ...(auth ? [`Cookie: physical_studio=${token}`] : [])];
  await writeFile(cfg, headers.map(header => `header = "${header}"`).join('\n'), { mode: 0o600 });
  if (body !== undefined) await writeFile(dataFile, JSON.stringify(body));
  const r = spawnSync(process.execPath, [cli!, '--scope', 'team_YZHSWFgCb4NEhjCA9nORvfin', 'curl', '/api/studio?action=' + action, '--deployment', target, '--', '--silent', '--show-error', '--ssl-revoke-best-effort', '--config', cfg, '--write-out', '\n%{http_code}', ...(body === undefined ? [] : ['--request', 'POST', '--data-binary', '@' + dataFile])], { cwd: '.studio-deploy', encoding: 'utf8', timeout: 150000 });
  assert.equal(r.status, 0, 'Vercel HTTPS request failed');
  const output = r.stdout.trim(); const split = output.lastIndexOf('\n');
  const status = Number(output.slice(split + 1)); const raw = output.slice(0, split); const json = JSON.parse(raw);
  for (const secret of [process.env.GEMINI_API_KEY, process.env.TEACHER_ACCESS_HASH, process.env.TEACHER_SESSION_SECRET]) if (secret) assert.equal(raw.includes(secret), false, 'Secret reflected in response');
  return { status, json };
}
async function expect(name: string, action: string, expected: number, body?: unknown, auth = false, origin = target) {
  const r = await request(action, body, auth, origin); assert.equal(r.status, expected, name); results.push({ check: name, status: r.status }); return r.json;
}
try {
  const state = await expect('configured public status', 'status', 200); assert.equal(state.aiReady, true); assert.equal(state.localSetup, false);
  await expect('unauthenticated generation denied', 'generate', 401, {});
  await expect('foreign origin denied', 'generate', 403, {}, true, 'https://untrusted.example');
  const authenticated = await expect('studio scoped cookie accepted', 'status', 200, undefined, true); assert.equal(authenticated.authenticated, true);
  await expect('remote key configuration unavailable', 'configure', 404, {}, true);
  await expect('private fields rejected', 'generate', 422, { studentName: 'synthetic-forbidden-field' }, true);
  const input = { task: 'reflection', activityId: 'space-occupier', grade: '3~4학년군', goal: '협동과 소통', place: '체육관', device: '태블릿 PC', deviceCount: '모둠별 1대', minutes: 40, groupSize: 6, classSize: 24, consent: true, adultTeacher: true };
  const generated = await expect('real Gemini reflection validated', 'generate', 200, input, true);
  assert.equal(generated.model, process.env.GEMINI_MODEL); assert.equal(generated.result.sections.length, 1);
  const destination = resolve('../../outputs/교사도구-온라인-생성결과.json'); await writeFile(destination, JSON.stringify(generated, null, 2));
  await writeFile(resolve('../../outputs/교사도구-온라인-검증.json'), JSON.stringify({ target, model: generated.model, results, inputUsesSyntheticPublicConditions: true }, null, 2));
  console.log(JSON.stringify({ passed: results.length, target, realModel: generated.model }));
} finally {
  await rm(cfg, { force: true }); await rm(dataFile, { force: true });
}
