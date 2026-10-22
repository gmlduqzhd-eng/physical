const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const vm = require('node:vm');
const ts = require('typescript');
const { groups } = require('./game-review-decisions.cjs');
const repo = path.resolve(__dirname, '..');
const baseline = '97f95df24cce741b48dc54658d34173db9149848';
const sources = new Map(), modules = new Map();
function source(file) {
  if (!sources.has(file)) sources.set(file, cp.execFileSync('git', ['show', `${baseline}:${file}`], { cwd: repo, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
  return sources.get(file);
}
function load(file) {
  if (modules.has(file)) return modules.get(file);
  const exports = {}; modules.set(file, exports);
  vm.runInNewContext(ts.transpileModule(source(file), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, require(name) { if (name.startsWith('.')) return load(path.posix.normalize(path.posix.join(path.posix.dirname(file), name.replace(/\.js$/, '') + '.ts'))); throw Error(name); },
  }, { filename: file });
  return exports;
}
const games = load('src/domain/gamesData.ts').GAMES;
const expressions = load('src/presentation/components/minigames/expression/expressionGamesData.ts').EXPRESSION_GAMES;
const expeditions = load('src/domain/expeditionGames.ts').EXPEDITION_GAMES;
const decisions = new Map();
for (const [decision, target, ids, reason, next] of groups) for (const id of ids) {
  if (decisions.has(id)) throw Error('Duplicate decision: ' + id);
  decisions.set(id, { decision, target, reason, next });
}
const missing = games.filter(g => !decisions.has(g.type));
const extra = [...decisions.keys()].filter(id => !games.some(g => g.type === id));
if (missing.length || extra.length) throw Error(JSON.stringify({ missing: missing.map(g => g.type), extra }));
for (const [id, decision] of decisions) if (decision.target && (!decisions.has(decision.target) || decisions.get(decision.target).decision === '통합' || decisions.get(decision.target).decision === '삭제' || id === decision.target)) throw Error('Invalid merge target: ' + id);
const play = source('src/presentation/GamePlayPage.tsx'), router = source('src/presentation/components/minigames/curriculum/CurriculumGameRouter.tsx');
const imports = new Map(), components = new Map();
for (const [code, parent] of [[play,'src/presentation'], [router,'src/presentation/components/minigames/curriculum']]) {
  for (const m of code.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) for (const name of m[1].split(',').map(n => n.trim())) imports.set(name, path.posix.normalize(path.posix.join(parent, m[2])) + '.tsx');
  for (const m of code.matchAll(/case ['"]([^'"]+)['"]:\s*return\s*<?\(?\s*<([A-Z]\w+)/g)) components.set(m[1], m[2]);
}
const locate = (file, needle) => { const text = source(file), index = text.indexOf(needle); if (index < 0) throw Error('Missing evidence: ' + needle); return { file, line: text.slice(0, index).split('\n').length }; };
function evidence(game) {
  const exp = expeditions.find(g => g.id === game.type);
  if (exp) {
    const file = exp.kind === 'B' ? 'src/domain/expeditionRules.ts' : 'src/domain/expeditionGames.ts';
    const point = locate(file, exp.kind === 'B' ? `case '${exp.spec}'` : `"id": "${game.type}"`);
    return { ...point, control: exp.kind === 'B' ? '기기 거치 → 시간별 활동 안내 → 횟수·번호·확인 직접 입력' : `표현 ${exp.expressionSteps.length}단계 → 자기/짝 평가`,
      observation: exp.kind === 'B' ? exp.desc : exp.expressionSteps.map(s => s.title + ': ' + s.guide).join(' / '), movement: exp.family, spec: exp.spec };
  }
  const expression = expressions.find(g => g.id === game.type);
  if (expression) return { ...locate('src/presentation/components/minigames/expression/expressionGamesData.ts', `id: '${game.type}'`), control: `표현 ${expression.steps.length}단계 → ${expression.rubric.length}개 항목 평가`,
    observation: expression.steps.map(s => s.title + ': ' + s.guide).join(' / '), movement: expression.subCategory };
  const component = components.get(game.type), file = imports.get(component);
  if (!file) throw Error('Unmapped source: ' + game.type);
  const raw = source(file), sf = ts.createSourceFile(file, raw, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration;
  function visit(n) { if (ts.isVariableDeclaration(n) && n.name.getText(sf) === component) declaration = n; ts.forEachChild(n, visit); } visit(sf);
  if (!declaration) throw Error('No component body: ' + component);
  const body = declaration.getText(sf), cues = [];
  function collect(n) { if ((ts.isJsxText(n) || ts.isStringLiteral(n)) && /[가-힣]/.test(n.text)) { const text = n.text.trim().replace(/\s+/g, ' '); if (text.length > 5 && !cues.includes(text)) cues.push(text); } ts.forEachChild(n, collect); } collect(declaration);
  return { file, line: sf.getLineAndCharacterOfPosition(declaration.getStart(sf)).line + 1,
    control: `${/devicemotion|deviceorientation/.test(body) ? '기기 센서 + ' : ''}${/onClick|onPointer|onTouch/.test(body) ? '화면 입력' : '단계 안내'}${/setInterval|setTimeout|scheduleTimeout/.test(body) ? ' · 시간/지연 진행' : ''}`,
    observation: cues.slice(0, 6).join(' / '), movement: game.subCategory };
}
const pilots = { zigzag: '갈림길 보급 작전', 'dribble-rhythm': '리듬 배송 공장', 'pass-gate-rescue': '빈자리 패스 구조대' };
const rows = games.map(game => ({ id: game.type, name: game.name, revisedName: pilots[game.type] || null, domain: game.domain, grades: game.grades,
  ...decisions.get(game.type), targetName: games.find(g => g.type === decisions.get(game.type).target)?.name || null,
  scope: pilots[game.type] ? '대표 개편 구현 완료 · 학생 수업 검증 전' : decisions.get(game.type).decision === '유지' ? '핵심 규칙 유지 판단' : '분류·후속 설계 완료 · 이관/삭제 미실행',
  evidence: evidence(game) }));
const counts = Object.fromEntries(['유지','개편','통합','삭제'].map(d => [d, rows.filter(r => r.decision === d).length]));
const report = { reviewedAt: '2026-10-22', baseline, total: rows.length, counts,
  method: '225개 전 항목의 목록·단계별 규칙·컴포넌트 입력·완료/기록 구조를 소스 기준으로 검토. 통합은 활동 소재를 버리지 않고 기본 게임 안의 선택 변형으로 옮기는 후속 설계이며 아직 링크를 이동하지 않음.',
  limits: '학생의 이해도·흥미·활동량·안전성을 실측한 결과가 아님. 브라우저 검증은 대표 개편의 조작·진행·저장 경로 검증이며 학생의 실제 움직임이나 모둠 참여의 증거가 아님.',
  rubric: ['짧은 설명과 첫 시범으로 시작 가능한가', '신체 움직임이 목표 달성에 직접 연결되는가', '선택·조정·협동·재도전의 의미가 있는가', '화면 입력과 대기보다 실제 참여에 시간을 쓰는가', '학년·공간·도구·대체 동작을 구별할 수 있는가'], rows };
const docs = path.join(repo,'docs'); fs.mkdirSync(docs, { recursive: true });
fs.writeFileSync(path.join(docs,'game-review-225-2026-10-22.json'), JSON.stringify(report, null, 2));
const markdown = ['# 전체 225개 게임 구조 점검 및 분류', '', `기준 버전: ${baseline}`, '', `유지 ${counts.유지} · 개편 ${counts.개편} · 통합 ${counts.통합} · 삭제 ${counts.삭제}`, '', report.method, '', report.limits, '', '## 적용 범위', '', '대표 3개만 실제 개편. 통합·삭제 대상은 후속 이관 계획이며 기존 게임·기록·수업 링크는 그대로 유지한다. 학급 활성 미니게임과 수업 추천 목록까지 이전한 뒤 기존 ID에는 안내를 남긴다.', '', '## 판단 기준', '', ...report.rubric.map(s => '- '+s), '', '## 전 항목', '', '| ID | 현재 이름 | 분류 | 통합 대상 | 근거 및 다음 작업 | 소스 |', '|---|---|---|---|---|---|', ...rows.map(r => `| ${r.id} | ${r.name}${r.revisedName?' → '+r.revisedName:''} | ${r.decision} | ${r.target||'—'} | ${r.reason} ${r.next} | ${r.evidence.file}:${r.evidence.line} |`)];
fs.writeFileSync(path.join(docs,'game-review-225-2026-10-22.md'), markdown.join('\n'));
if (process.argv[2]) {
  const dest = path.resolve(process.argv[2]); fs.mkdirSync(dest, { recursive: true });
  fs.writeFileSync(path.join(dest,'전체게임_분류표.json'), JSON.stringify(report,null,2));
  const data = JSON.stringify(report).replace(/</g, '\\u003c');
  fs.writeFileSync(path.join(dest,'전체게임_분류표.html'), `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>땀방울 원정대 · 전체 게임 점검</title><style>body{font:16px/1.7 system-ui,sans-serif;background:#f6f7f0;color:#163d35;margin:0}main{max-width:1080px;margin:auto;padding:36px 20px}h1{font-size:32px}h2{font-size:21px}header p{max-width:850px}nav{display:flex;flex-wrap:wrap;gap:10px;position:sticky;top:0;background:#f6f7f0;padding:12px 0}button,input,select{font:inherit;padding:10px 14px;border:1px solid #afc0b0;border-radius:10px;background:white;color:#163d35;min-height:46px}input{flex:1;min-width:150px}button{cursor:pointer}.card{border:1px solid #d1dbcb;background:white;padding:20px;border-radius:16px;margin:14px 0}.badge{padding:5px 12px;border-radius:20px;background:#e4edd9;font-weight:700}.meta{color:#576e62;font-size:14px}details{border-top:1px solid #e2e8de;padding-top:10px}summary{cursor:pointer}a{color:#176b5b}</style><main><header><p>땀방울 원정대 / 2026.10.22 / 소스·진행 구조 점검</p><h1>게임은 줄이고, 움직임은 더 의미 있게</h1><h2>225개 전체 분류 · 대표 3개 개편</h2><p>유지 ${counts.유지}개 · 개편 ${counts.개편}개 · 통합 ${counts.통합}개 · 삭제 ${counts.삭제}개</p><p>${report.method}</p><p><strong>검증의 범위</strong> ${report.limits}</p><p>통합·삭제는 후속 이관 계획입니다. 이번 구현에서는 대표 3개를 개편하고 기존 225개 ID와 수업 연결을 보존했습니다.</p></header><nav><input id="search" type="search" aria-label="게임 검색" placeholder="이름·ID·통합 대상으로 검색"><select id="filter" aria-label="분류"><option>전체</option>${Object.keys(counts).map(d=>'<option>'+d+'</option>').join('')}</select><button id="pilots">대표 개편 3개</button><button id="all">전체 보기</button></nav><p id="count" role="status"></p><section id="list"></section></main><script>const report=${data};const search=document.querySelector('#search'),filter=document.querySelector('#filter'),list=document.querySelector('#list');let pilots=false;const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function draw(){const term=search.value.toLowerCase();const rows=report.rows.filter(r=>(!pilots||r.revisedName)&&(filter.value==='전체'||r.decision===filter.value)&&[r.name,r.id,r.revisedName,r.targetName,r.target].join(' ').toLowerCase().includes(term));document.querySelector('#count').textContent=rows.length+'개 항목';list.innerHTML=rows.map(r=>'<article class="card"><span class="badge">'+esc(r.decision)+'</span><h2>'+esc(r.name)+(r.revisedName?' → '+esc(r.revisedName):'')+'</h2><p class="meta">'+esc(r.id)+' · '+esc(r.domain)+' · '+esc(r.grades.join(' / '))+'</p><p>'+esc(r.reason)+'</p>'+(r.target?'<p><strong>통합 대상</strong> '+esc(r.targetName)+' ('+esc(r.target)+')</p>':'')+'<p><strong>실행 방향</strong> '+esc(r.next)+'</p><p class="meta">'+esc(r.scope)+'</p><details><summary>실제 구현 근거 보기</summary><p>'+esc(r.evidence.file)+':'+r.evidence.line+'</p><p>'+esc(r.evidence.control)+'</p><p>'+esc(r.evidence.observation)+'</p></details></article>').join('');}search.addEventListener('input',draw);filter.addEventListener('change',draw);document.querySelector('#pilots').onclick=()=>{pilots=true;filter.value='전체';search.value='';draw();};document.querySelector('#all').onclick=()=>{pilots=false;filter.value='전체';search.value='';draw();};draw();</script></html>`);
}
console.log(JSON.stringify({ total: rows.length, counts, mappedSources: sources.size, pilots: Object.keys(pilots) }));
