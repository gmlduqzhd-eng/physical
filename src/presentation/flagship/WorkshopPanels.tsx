import {useEffect,useRef,useState} from 'react';
import type {ExpeditionSnapshot,GroupProgress} from '../../domain/flagship';
import {BOSS_ROUTES,DEFAULT_WORKSHOP,LESSON_PACKAGES,LESSON_STEPS,LEVEL_NAMES,LEVELS,MOVES,OBSERVATION_TAGS,ROUTE_NAMES,SHIP_COURSES,expeditionReport,groupWorkshop,readinessLabel,roleSeats,settingsOf,workshopSchema,type WorkshopSettings} from '../../domain/expeditionWorkshop';
import type {ExpeditionAction} from './MapGame';

function useServerClock(s:ExpeditionSnapshot){
 const offset=useRef(s.serverTime-Date.now());
 useEffect(()=>{offset.current=s.serverTime-Date.now();},[s.serverTime]);
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 return now+offset.current;
}

export function ExpeditionWorld({snapshot:s}:{snapshot:ExpeditionSnapshot}){
 const now=useServerClock(s),active=s.game==='expedition-boss'?BOSS_ROUTES[settingsOf(s).route][Math.min(2,s.phase)]:s.game,beat=s.status==='playing'?((Math.floor((now-s.startedAt)/600)%8)+8)%8:-1;
 const done=s.groups.filter(g=>g.done).length;
 const gates=s.game==='expedition-map'||s.game==='expedition-boss'?s.phase:Math.floor(done/Math.max(1,s.groups.length)*3);
 return <section className="expedition-world" aria-label="학급 공동 원정 전광판"><div className="world-heading"><div><p className="flagship-kicker">모두의 기여가 모이는 곳</p><h3>우리 반 원정 세계</h3></div><strong>{gates} / 3 관문</strong></div>
  <div className="world-gates">{['탐사 기지','협력 다리','빛나는 도시'].map((label,i)=><div key={label} data-open={i<gates}><span aria-hidden="true">{i<gates?'✦':'◇'}</span><b>{label}</b><small>{i<gates?'함께 열었어요':'힘을 모으는 중'}</small></div>)}</div>
  {active==='expedition-ship'&&<svg className="world-space" viewBox="0 0 110 110" role="img" aria-label="서버에서 받은 모든 모둠 우주선의 현재 위치"><rect width="110" height="110" rx="8" fill="#193c3c"/>{SHIP_COURSES[settingsOf(s).shipCourse].map((t,i)=><g key={i}><circle cx={t.x+5} cy={t.y+5} r="5" fill="#dfbd68"/><text x={t.x+5} y={t.y+7} textAnchor="middle" fontSize="5" fill="#193c3c">{i+1}</text></g>)}{s.groups.map((g,i)=><g key={g.id} transform={`translate(${g.ship.x+5},${g.ship.y+5})`}><circle r="3.5" fill={['#bcd8ad','#f0ca8b','#b7d8ef','#e7bad8'][i%4]} stroke="#fff" strokeWidth=".6"/><text y="1.5" textAnchor="middle" fontSize="3.5" fill="#193c3c">{i+1}</text></g>)}</svg>}
  {active==='expedition-loop'&&<div className="world-city" aria-label="우리 반의 리듬 발전 상태">{s.groups.map((g,i)=><div key={g.id} data-lit={g.done} data-beat={g.loop[beat]===1}><b>모둠 {i+1}</b><span aria-hidden="true">{g.loop[beat]?'♫':'·'}</span><small>{g.quality}%</small></div>)}</div>}
  <div className="world-fleet">{s.groups.map((g,i)=><div className="world-lane" key={g.id}><b>{g.name}</b><div className="world-track"><span style={{left:`${Math.min(94,g.ship.checkpoint*26+g.visited.length*6+(g.done?16:2))}%`}} aria-hidden="true">{g.done?'✦':'◆'}</span></div><small>{g.done?'참여 완료':s.game==='expedition-ship'?`정거장 ${g.ship.checkpoint}/3`:s.game==='expedition-loop'?`리듬 ${g.quality}%`:`모둠 ${i+1} 기여 중`}</small></div>)}</div>
  <p>{done}/{s.groups.length}모둠 참여 완료 · 순위 경쟁 없이 함께 완성해요.</p><p className="flagship-kicker">기지·다리·도시는 진행을 표현한 그림입니다. 세부 기록은 아래에서 확인해요.</p>
 </section>;
}

export function RoleRotation({snapshot:s,group:g,send,disabled}:{snapshot:ExpeditionSnapshot;group:GroupProgress;send:ExpeditionAction;disabled:boolean}){
 const now=useServerClock(s),w=groupWorkshop(g,s),config=settingsOf(s),due=now-w.roleAt>=config.roleEvery*60000;
 return <section className="workshop-roles" aria-label="모둠 역할 교대"><h3>모두의 차례 · {w.roleRound+1}라운드</h3><p>처음에 자리 1~{w.members}을 정해요. 자리 번호는 사람이나 계정에 연결하지 않아요.</p><div className="role-seats">{roleSeats(w.members,w.roleRound).map(r=><p key={r.seat}><b>자리 {r.seat}</b><span>{r.role}</span></p>)}</div><p role="status">{due?'역할을 바꿀 시간이에요. 기기를 내려놓고 조작 역할부터 바꿔요.':`${config.roleEvery}분마다 또는 한 라운드 뒤 역할을 바꿔요.`}</p><button disabled={disabled||!s.workshop} onClick={()=>void send('rotate')}>기기를 내려놓고 역할 교대했어요</button><small>교대 버튼 기록 {w.roleSwaps}회 · 버튼만으로 실제 참여를 판단하지 않아요.</small></section>;
}

export function ReadinessBoard({snapshot:s}:{snapshot:ExpeditionSnapshot}){
 const now=useServerClock(s),active=s.game==='expedition-boss'?BOSS_ROUTES[settingsOf(s).route][Math.min(2,s.phase)]:s.game;
 return <section><h3>모둠 기기 준비 상태</h3><p>기기가 보고한 최근 상태입니다. 권한 허용과 실제 신호 수신을 구분합니다. 같은 종류의 보고는 마지막 상태로 갱신하며 모든 기기를 검사한 결과는 아닙니다. 영상·좌표·기기 식별자는 보내지 않아요.</p><div className="flagship-team-grid">{s.groups.map(g=>{const w=groupWorkshop(g,s);return <article key={g.id}><strong>{g.name}</strong>{active==='expedition-ship'&&<p>현재 조종 축 {g.axes.filter(a=>a.claimed&&now-a.at<10000).length}/2</p>}{w.devices.length?w.devices.map((r,i)=><p key={i}>{r.kind==='camera'?'카메라':r.kind==='tilt'?'기울기':'터치'}: {readinessLabel(r,now)}</p>):<p>아직 수신된 준비 신호 없음</p>}</article>;})}</div></section>;
}

export function TeacherRoles({snapshot:s,send,busy}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;busy:boolean}){
 return <details><summary>역할 교대·모둠 자리 수</summary><p>이름 없이 모둠 안에서 자리만 정합니다. 인원 변경은 대기·일시정지 중에, 역할 교대는 진행 중에 할 수 있어요.</p><div className="flagship-team-grid">{s.groups.map(g=>{const w=groupWorkshop(g,s);return <article key={g.id}><h3>{g.name}</h3><label>자리 수<select disabled={busy||!s.workshop||!['waiting','paused'].includes(s.status)} value={w.members} onChange={e=>void send('members',{target:g.id,members:Number(e.target.value)})}>{[2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label><p>{w.roleRound+1}라운드 · 교대 버튼 {w.roleSwaps}회</p><button disabled={busy||!s.workshop||s.status!=='playing'||s.game==='expedition-boss'&&s.phase>=3} onClick={()=>void send('rotate',{target:g.id})}>이 모둠 역할 교대</button></article>;})}</div></details>;
}

export function LessonSchedule({snapshot:s,send,editable=false,busy=false}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;editable?:boolean;busy?:boolean}){
 const duration=settingsOf(s).packageMinutes,step=s.workshop?.lessonStep??0;
 if(!duration)return null;
 const minutes=LESSON_PACKAGES[duration];
 return <section className="workshop-schedule"><h3>{duration}분 수업 꾸러미</h3><ol>{LESSON_STEPS.map((label,i)=><li key={label} aria-current={step===i?'step':undefined}><b>{label}</b><span>{minutes[i]}분</span></li>)}</ol><p>{LESSON_STEPS[step]} · {s.status==='playing'?'권장 '+minutes[step]+'분':'수업 정지·대기 중'} · 단계는 교사가 넘겨요.</p>{step===0&&<p>주변 공간과 걷기 동선을 확인하고 기기는 거치해요.</p>}{step===1&&<p>편안한 범위의 작은 팔·손 동작으로 준비하고 체험 안내를 연습해요.</p>}{step===3&&<p>기기를 내려놓고 편안하게 정리해요. “친구의 어떤 신호가 도움이 됐나요?”</p>}{editable&&<button disabled={busy||step>=3||s.status!=='playing'} onClick={()=>void send('lesson-step',{step:step+1})}>다음 수업 단계로</button>}</section>;
}

export function WorkshopEditor({value,onChange,disabled=false}:{value:WorkshopSettings;onChange:(s:WorkshopSettings)=>void;disabled?:boolean}){
 const [message,setMessage]=useState('');
 const update=(patch:Partial<WorkshopSettings>)=>onChange({...value,...patch});
 return <details className="workshop-editor"><summary>원정 편집기 · 난이도·역할·관문·리듬</summary><p>다음에 여는 새 원정에 적용합니다. 사람 이름·개인 기록은 입력하지 않아요.</p><div className="flagship-fields"><label>기본 코스<select disabled={disabled} value={value.level} onChange={e=>update({level:e.target.value as WorkshopSettings['level']})}>{LEVELS.map(l=><option key={l} value={l}>{LEVEL_NAMES[l]}</option>)}</select></label><label>모둠당 자리 수<select disabled={disabled} value={value.members} onChange={e=>update({members:Number(e.target.value)})}>{[2,3,4,5,6].map(n=><option key={n}>{n}</option>)}</select></label><label>교대 알림 주기 (분)<select disabled={disabled} value={value.roleEvery} onChange={e=>update({roleEvery:Number(e.target.value)})}>{[1,2,3,4,5].map(n=><option key={n}>{n}</option>)}</select></label><label>수업 꾸러미<select disabled={disabled} value={value.packageMinutes??0} onChange={e=>update({packageMinutes:Number(e.target.value)===0?null:Number(e.target.value) as 10|20|40})}><option value={0}>사용하지 않음</option>{[10,20,40].map(n=><option key={n} value={n}>{n}분</option>)}</select></label><label>보스 원정 분기<select disabled={disabled} value={value.route} onChange={e=>update({route:e.target.value as WorkshopSettings['route']})}>{Object.entries(ROUTE_NAMES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>우주선 정거장 배치<select disabled={disabled} value={value.shipCourse} onChange={e=>update({shipCourse:e.target.value as WorkshopSettings['shipCourse']})}><option value="orbit">삼각 궤도</option><option value="zigzag">지그재그 궤도</option></select></label><label>탐사 길<select disabled={disabled} value={value.stationOrder} onChange={e=>update({stationOrder:e.target.value as WorkshopSettings['stationOrder']})}><option value="auto">원정마다 두 경로 중 결정</option><option value="river-tower-forest">강 → 탑 → 숲</option><option value="tower-forest-river">탑 → 숲 → 강</option></select></label><label>우리 반 몸 리듬<select disabled={disabled} value={value.move} onChange={e=>update({move:e.target.value as WorkshopSettings['move']})}>{MOVES.map(v=><option key={v}>{v}</option>)}</select></label></div><p>우리 반 8박자: 누를 박자를 2~6개 골라요. 움직임 크기는 모두 편안한 범위에서 정해요.</p><div className="workshop-pattern">{value.rhythm.map((v,i)=><button type="button" key={i} disabled={disabled||(v===1?value.rhythm.filter(Boolean).length<=2:value.rhythm.filter(Boolean).length>=6)} aria-pressed={v===1} onClick={()=>update({rhythm:value.rhythm.map((n,j)=>i===j?1-n:n)})}>{i+1} {v?'●':'·'}</button>)}</div><p>쉬움: 큰 도착 영역·넉넉한 박자 / 도전: 작은 도착 영역·정밀한 박자. 안전 기준이나 학생 능력 평가가 아닙니다.</p><div className="flagship-row"><button disabled={disabled} onClick={()=>{try{localStorage.setItem('physical-workshop-v1',JSON.stringify(workshopSchema.parse(value)));setMessage('개인정보 없는 원정 설정만 이 기기에 저장했어요.');}catch{setMessage('이 기기에 저장하지 못했어요.');}}}>이 설정 저장</button><button disabled={disabled} onClick={()=>{try{const data=workshopSchema.parse(JSON.parse(localStorage.getItem('physical-workshop-v1')??'null'));onChange(data);setMessage('저장한 설정을 불러왔어요. 새 원정 전에 확인하세요.');}catch{setMessage('불러올 수 있는 설정이 없어요.');}}}>저장한 설정 불러오기</button><button disabled={disabled} onClick={()=>{try{localStorage.removeItem('physical-workshop-v1');onChange(structuredClone(DEFAULT_WORKSHOP));setMessage('저장한 설정을 지웠어요.');}catch{setMessage('저장소 삭제를 확인하지 못했어요.');}}}>저장한 설정 지우기</button></div>{message&&<p role="status">{message}</p>}
 </details>;
}

export function GroupAdjustments({snapshot:s,send,busy}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;busy:boolean}){
 return <details><summary>모둠별 코스 조절</summary><p>대기·일시정지 상태에서만 바꿉니다. 선택한 모둠의 해당 게임 진행과 제출 전 완료 상태를 초기화합니다. 지도·보스는 첫 관문이 열린 뒤에는 새 원정을 여세요. 기존 수업 점수는 유지돼요.</p>{s.groups.map(g=><label key={g.id}>{g.name}<select disabled={busy||!s.workshop||!['waiting','paused'].includes(s.status)||(s.game==='expedition-map'||s.game==='expedition-boss')&&s.phase>0} value={groupWorkshop(g,s).level} onChange={e=>{if(window.confirm('이 모둠의 현재 게임 진행을 초기화하고 코스를 바꿀까요?'))void send('difficulty',{target:g.id,level:e.target.value});}}>{LEVELS.map(l=><option key={l} value={l}>{LEVEL_NAMES[l]}</option>)}</select></label>)}</details>;
}

export function ExpeditionReport({snapshot:s,send,busy}:{snapshot:ExpeditionSnapshot;send:ExpeditionAction;busy:boolean}){
 const [draft,setDraft]=useState(''),[reviewed,setReviewed]=useState(false),[message,setMessage]=useState('');
 const download=()=>{if(!reviewed||!draft)return;const url=URL.createObjectURL(new Blob([draft],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='원정-수업결과-교사검토본.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return <details className="workshop-report"><summary>수업 결과 한 장 · 교사 검토·수정</summary><p>모둠별 사실과 교사가 고른 관찰 태그로 정리합니다. AI 호출이나 개인별 성취 추정은 없습니다.</p>{s.groups.map(g=><fieldset key={g.id} disabled={busy||!s.workshop}><legend>{g.name} 관찰</legend>{OBSERVATION_TAGS.map(tag=><label className="flagship-check" key={tag}><input type="checkbox" checked={s.workshop?.observations[g.id]?.includes(tag)??false} onChange={e=>{const old=s.workshop?.observations[g.id]??[];setReviewed(false);void send('observe',{target:g.id,tags:e.target.checked?[...old,tag]:old.filter(v=>v!==tag)});}}/><span>{tag}</span></label>)}</fieldset>)}<button disabled={busy} onClick={()=>{setDraft(expeditionReport(s));setReviewed(false);setMessage('현재 상태로 초안을 만들었어요. 이후 변경은 다시 불러와야 반영돼요.');}}>현재 기록으로 초안 만들기</button>{draft&&<><label>교사 검토본<textarea maxLength={10000} value={draft} onChange={e=>{setDraft(e.target.value);setReviewed(false);}}/></label><div className="workshop-print">{draft}</div><p>수정 내용은 이 화면 메모리에만 있습니다. 개인 이름은 쓰지 마세요. 길게 수정하면 여러 장으로 인쇄될 수 있어요.</p><label className="flagship-check"><input type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/><span>기록과 실제 관찰을 구분해 검토했습니다.</span></label><button disabled={!reviewed} onClick={download}>채택본 내려받기</button><button disabled={!reviewed} onClick={()=>window.print()}>요약 인쇄</button><button onClick={()=>{setDraft('');setReviewed(false);}}>초안 지우기</button></>}{message&&<p role="status">{message}</p>}</details>;
}

export function ExpeditionTutorial({game}:{game:string}){
 const [step,setStep]=useState(0),[done,setDone]=useState(false),[value,setValue]=useState(0);
 return <details className="workshop-tutorial"><summary>처음인가요? 30초 체험 안내</summary><p>체험 입력은 실제 원정·점수·센서에 연결되지 않아요.</p><ol><li aria-current={step===0?'step':undefined}>주변 공간을 보고 기기를 내려놓아요.</li><li aria-current={step===1?'step':undefined}>작은 동작 뒤 화면 신호를 연결해요.</li><li aria-current={step===2?'step':undefined}>친구에게 역할을 넘겨요.</li></ol>{step===0&&<button onClick={()=>setStep(1)}>기기 거치·주변 공간 확인했어요</button>}{step===1&&<><p>{game==='expedition-map'?'몸짓으로 강·탑·숲 중 한 길을 알려 주고 신호를 눌러요.':game==='expedition-ship'?'제자리에서 작은 손 동작 뒤 연습 조종 값을 바꿔요.':game==='expedition-loop'?'작은 손뼉을 한 번 친 뒤 박자 신호를 눌러요.':'편안하게 오른손을 움직인 뒤 신호를 눌러요.'}</p><button onClick={()=>setValue(n=>n+1)}>몸 동작 후 체험 신호 연결 {value>0?'✓':''}</button><button disabled={!value} onClick={()=>setStep(2)}>다음</button></>}{step===2&&<button onClick={()=>setDone(true)}>친구에게 역할을 넘겼어요</button>}{done&&<p role="status">준비됐어요! 실제 원정에서는 모둠이 함께 확인해요.</p>}<button onClick={()=>{setStep(0);setDone(false);setValue(0);}}>체험 처음부터</button></details>;
}

export function BossContribution({snapshot:s}:{snapshot:ExpeditionSnapshot}){
 const route=BOSS_ROUTES[settingsOf(s).route];
 return <p>선택한 경로 {ROUTE_NAMES[settingsOf(s).route]} · 현재 {Math.min(3,s.phase+1)}/{route.length}관문. 모둠마다 조작·탐사·신호·확인 역할을 나누고 모두의 기여가 모이면 열려요.</p>;
}
