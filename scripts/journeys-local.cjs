// 수업방 흐름 검사(선생님이 방을 만들고 학생이 들어오는 흐름)를 내 컴퓨터에서 한 번에 돌린다.
// CI와 같은 방법: 가짜 Supabase 주소로 따로 빌드(dist-journeys)하고, 그 빌드를 띄운 뒤 scripts/classroom-journeys.ts를 돌린다.
// 모든 응답은 검사 안의 가짜 응답이라 실제 데이터베이스에는 아무것도 닿지 않는다.
const { spawn, spawnSync } = require('node:child_process');
const http = require('node:http');
const PORT = Number(process.env.JOURNEYS_PORT || 4174), BASE = `http://127.0.0.1:${PORT}`;
const env = { ...process.env, VITE_SUPABASE_URL: 'https://fixture.supabase.co', VITE_SUPABASE_ANON_KEY: 'fixture-anon' };
const run = (cmd, args, extra = {}) => spawnSync(cmd, args, { stdio: 'inherit', env, ...extra }).status ?? 1;
const up = () => new Promise(resolve => { const req = http.get(BASE + '/', res => { res.resume(); resolve(res.statusCode === 200); }); req.on('error', () => resolve(false)); req.setTimeout(1000, () => { req.destroy(); resolve(false); }); });

(async () => {
  if (run('npx', ['vite', 'build', '--outDir', 'dist-journeys']) !== 0) process.exit(1);
  const preview = spawn('npx', ['vite', 'preview', '--outDir', 'dist-journeys', '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', env });
  let code = 1;
  try {
    let ready = false;
    for (let i = 0; i < 40 && !ready; i++) { ready = await up(); if (!ready) await new Promise(r => setTimeout(r, 500)); }
    if (!ready) { console.error(`미리보기 서버(${BASE})가 뜨지 않았어요. ${PORT}번 포트를 다른 프로그램이 쓰는지 확인해 주세요.`); }
    else code = run('npx', ['tsx', 'scripts/classroom-journeys.ts', BASE]);
  } finally { preview.kill(); }
  process.exit(code);
})();
