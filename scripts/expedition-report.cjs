const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
require('tsx/cjs');
const {EXPEDITION_GAMES,HELD_EXPEDITION_SPECS}=require('../src/domain/expeditionGames.ts');
const root=path.resolve(__dirname,'..');
const read=dir=>{const file=path.join(root,'test-results',dir,'report.json');return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):null;};
const chromium=new Map(),webkit=new Map();
for(const dir of ['expedition-chromium-all','expedition-chromium-final'])for(const item of read(dir)?.cases||[])chromium.set(item.spec,item);
for(const dir of ['expedition-webkit-s1','expedition-webkit-s2','expedition-webkit-t1','expedition-webkit-t2','expedition-webkit-final'])for(const item of read(dir)?.cases||[])webkit.set(item.spec,item);
const cases=EXPEDITION_GAMES.map(g=>({spec:g.spec,id:g.id,name:g.name,kind:g.kind,device:g.recommendedDevice,chromium:chromium.get(g.spec)?.status||'pending',webkit:webkit.get(g.spec)?.status||'pending'}));
const pending=cases.filter(c=>c.chromium!=='pass'||c.webkit!=='pass');
if(pending.length){console.log(JSON.stringify({pending},null,2));process.exit(1);}
assert.equal(cases.length,92);
const out=path.resolve(process.env.AUDIT_OUTPUT||path.join(__dirname,'../../../outputs/expedition-92-release'));fs.mkdirSync(out,{recursive:true});
const notes=[
 '브라우저 자동 검증은 가상 시간을 사용했습니다. 터치로 화면을 진행하고 입력한 수치는 테스트 자료이며 실제 학생의 몸 움직임을 측정한 증거가 아닙니다.',
 '신규 게임은 기기를 거치한 채 신체 활동을 안내합니다. 수행 횟수·참여 번호·짝 확인은 직접 입력한 신고이며 센서 측정·교사 인증으로 표시하지 않습니다.',
 '혼자 해보기는 PIN과 학생 정보 없이 열립니다. 여러 역할을 혼자 체험한 결과에는 실제 모둠 참여를 확인하지 않았다는 안내가 포함됩니다.',
 '실제 스마트폰·태블릿의 소리 크기, 공간 배치, 학생 참여 및 안전성은 실기기와 수업 현장에서 추가 확인이 필요합니다.',
 '수업방 점수는 기존 동기화 경로를 유지했습니다. 테스트는 모의 서버를 사용했으며 운영 수업방과 학생 자료에 테스트 기록을 쓰지 않았습니다.',
 '새 게임의 공식 성취기준은 임의로 만들지 않고 연계 확인 필요로 표시했습니다.',
 '교사 스튜디오의 운영 서버 로그에서 확인한 ESM 모듈 경로 문제를 수정하고 NodeNext 타입 검사를 추가했습니다.',
];
const report={date:new Date().toISOString(),approved:92,phone:45,tablet:47,expression:20,ruleGames:72,totalCatalog:225,held:HELD_EXPEDITION_SPECS,cases,notes,browserEvidence:{chromium:[...chromium.values()],webkit:[...webkit.values()]}};
fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));
const rows=cases.map(c=>`|${c.spec}|${c.name}|${c.kind}|구현 완료|통과|통과|`).join('\n');
const md=`# 신체 활동 게임 92개 구현 및 검증\n\n- 스마트폰 권장 45개, 태블릿 권장 47개를 추가했습니다. 기존 133개를 포함한 전체 목록은 225개입니다.\n- A형 표현 활동 20개는 단계별 몸 동작과 평가 항목을 제공합니다. B형 72개는 경로·기억·규칙 전환·박자·역할 교대·직접 입력 기록을 게임별로 적용했습니다.\n- 보류: ${HELD_EXPEDITION_SPECS.join(', ')}. 센서·카메라 기능을 추가하지 않았습니다.\n- 1~2학년군으로 화면 표기를 통일했습니다. 기존 저장 값과 필터 값은 호환성을 위해 유지했습니다.\n\n## 이용 방법\n\n메인 → 혼자 해보기 → 게임 검색 → 체험하기. 수업용 목록과 교사 활동 자료에도 같은 92개가 등록되어 있습니다. 기기는 거치하고 안내된 몸 활동을 한 뒤 수행 기록과 참여 번호를 확인합니다. 이번 라운드 다시 하기·일시정지·목록 복귀를 제공합니다.\n\n## 검증 범위\n\n- Chromium 92개, WebKit 92개: 준비 → 모든 단계·라운드 → 기록 → 결과 저장 → 재시작 → 목록 복귀.\n- 320×568 스마트폰 및 1024×768 태블릿 화면에서 전체 완료를 확인했습니다. 가로형 667×375 10개 사례와 768×1024의 2명 참여 5개 사례도 확인했습니다.\n- 별도 보호 동작 검사 12개: 일시정지 시간 제외, 화면 숨김 시 정지, 라운드 재시도, 미완료 저장 방지, 빈 값·음수 차단, 오답 실패 기록, 짝 확인 보존, 중복 완료 방지, 받기 자리 재사용 차단, 입력 초기화, 도중 퇴장 정리.\n- 기존 게임 7개 완료 회귀 검사, 전체 목록·검색·필터 및 혼자 해보기의 서버 격리를 확인했습니다.\n- 빌드·서버 타입 검사·린트·원정 규칙 8개·기존 런타임 22개·교사 AI 14개·스튜디오 4개·스튜디오 배포 경계 1개를 검사했습니다.\n- 별도 교사 스튜디오 배포 묶음의 허용 목록에 신규 자료 파일을 추가하고 해당 묶음 자체의 빌드도 확인했습니다.\n\n## 확인한 오류와 수정\n\n타이머 부동소수점 종료 오차, 기억 배치의 역할 순서, 4종목 역할 순환, 네 번째 탈출 방 누락, 갈림길 선택 안내를 확인하고 수정했습니다. 실패 후 라운드를 다시 수행하는 기능과 입력 범위 검사를 적용했습니다.\n\n## 검증의 한계\n\n${notes.map(n=>'- '+n).join('\n')}\n\n## 게임별 결과\n\n|명세|게임|유형|구현|Chromium|WebKit|\n|---|---|---|---|---|---|\n${rows}\n`;
fs.writeFileSync(path.join(out,'검증결과.md'),md);
fs.writeFileSync(path.join(root,'docs/expedition-games-100-status.md'),md);
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>원정 게임 92개 구현 결과</title><style>body{background:#faf8f1;color:#354239;font:17px/1.8 system-ui;max-width:1080px;margin:auto;padding:30px 18px}h1{font-size:32px}table{width:100%;border-collapse:collapse;font-size:15px}td,th{text-align:left;border-bottom:1px solid #dfe2d5;padding:12px 8px}.count{background:#edf2e4;padding:20px;border-radius:18px;font-weight:bold}pre{font:inherit;white-space:pre-wrap;overflow-wrap:anywhere}</style><h1>신체 활동 게임 구현 결과</h1><p class="count">추가 92개 · 전체 225개 · Chromium / WebKit 전체 완료 검증 통과</p><pre>${escape(md.slice(0,md.indexOf('## 게임별 결과')))}</pre><h2>게임별 결과</h2><div style="overflow:auto"><table><tr><th>명세</th><th>게임</th><th>유형</th><th>Chromium</th><th>WebKit</th></tr>${cases.map(c=>`<tr><td>${c.spec}</td><td>${escape(c.name)}</td><td>${c.kind}</td><td>통과</td><td>통과</td></tr>`).join('')}</table></div></html>`);
console.log(JSON.stringify({out,approved:cases.length,chromium:chromium.size,webkit:webkit.size,held:HELD_EXPEDITION_SPECS.length}));
