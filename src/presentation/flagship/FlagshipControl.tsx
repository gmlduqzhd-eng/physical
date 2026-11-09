import {useEffect,useRef,useState} from 'react';
import QRCode from 'qrcode';
import {FLAGSHIPS,STATIONS,STATION_NAMES,type FlagshipId} from '../../domain/flagship';
import {useExpedition} from '../../application/useExpedition';
import {DEFAULT_WORKSHOP,settingsOf} from '../../domain/expeditionWorkshop';
import {ExpeditionWorld,ReadinessBoard,WorkshopEditor,GroupAdjustments,ExpeditionReport,LessonSchedule,TeacherRoles} from './WorkshopPanels';
import './flagship.css';
function StationSheet({room,codes}:{room:string;codes:Record<string,string>}){
 const [images,setImages]=useState<Record<string,string>>({});
 useEffect(()=>{let active=true;void Promise.all(STATIONS.map(async id=>[id,await QRCode.toDataURL(`physical-expedition:${room}:${codes[id]}`,{width:320,margin:2})] as const)).then(rows=>{if(active)setImages(Object.fromEntries(rows));});return()=>{active=false;};},[codes,room]);
 return <div className="flagship-station-sheet"><h3>탐사 지점 안내판 · 이 원정에서만 사용</h3><p>세 안내판을 교사가 정한 걷기 동선에 배치해요. 학생은 멈춘 상태에서 스캔해요. 새 원정을 열면 이전 QR은 사용할 수 없어요.</p><div className="flagship-stations">{STATIONS.map(id=><article key={id}><h3>{STATION_NAMES[id]}</h3>{images[id]&&<img src={images[id]} alt={`${STATION_NAMES[id]} 탐사 지점 QR`}/>}<code>{codes[id]}</code><p>걷기 → 멈춰 스캔 → 모둠으로 귀환</p></article>)}</div><button onClick={()=>window.print()}>탐사 안내판 인쇄</button></div>;
}
export function FlagshipControl({roomId,game,readOnly=false}:{roomId:string;game:FlagshipId;readOnly?:boolean}){
 const {snapshot:s,error,busy,missing,refresh,action}=useExpedition(roomId,game,null),meta=FLAGSHIPS.find(g=>g.id===game)!;
 const [confirm,setConfirm]=useState(false),[showCodes,setShowCodes]=useState(false);
 const [settings,setSettings]=useState(()=>structuredClone(DEFAULT_WORKSHOP));
 const editedRun=useRef<string|null>(null);
 useEffect(()=>{if(s?.workshop&&editedRun.current!==s.runId){editedRun.current=s.runId;setSettings(structuredClone(settingsOf(s)));}},[s]);
 const map=useExpedition(game==='expedition-boss'?roomId:null,'expedition-map',null);
 const codes=game==='expedition-boss'?map.snapshot?.codes:s?.codes;
 return <section className="flagship flagship-control" data-game-color="true"><h2>{readOnly?'우리 반 공동 원정':'대표 원정 진행'} · {meta.name}</h2><p>{meta.desc}</p>{error&&<p role="alert">{error}</p>}{s&&(!s.workshop||s.workshop.version===0)&&<p className="flagship-note">이 수업방은 기존 원정 형식입니다. 새 확장 DB 적용 후 새 원정을 열면 역할·준비 상태·꾸러미 기능을 사용할 수 있어요.</p>}{!readOnly&&<><WorkshopEditor value={settings} onChange={setSettings} disabled={busy}/>{s?.workshop&&<button disabled={busy} onClick={()=>setSettings(structuredClone(settingsOf(s)))}>현재 원정 설정을 편집기로 불러오기</button>}<p>학생 참여 QR은 기존 수업방의 모둠 QR을 사용해요. 우주선은 같은 모둠으로 기기 2대가 참여해야 해요. 진행 중인 방의 모둠 구성을 바꿨다면 새 원정을 열어요.</p>{!confirm?<button disabled={busy||s?.status==='finished'} onClick={()=>setConfirm(true)}>{s?'새 원정 열기':'원정 열기'}</button>:<div className="flagship-note"><p>편집기 설정으로 길·조종·리듬·역할 기록이 새로 시작돼요. 수업 점수와 기존 제출 결과는 유지돼요.</p><button disabled={busy} onClick={async()=>{if(await action('start',{settings})){setConfirm(false);void map.refresh();}}}>새 원정 시작 확정</button><button onClick={()=>setConfirm(false)}>취소</button></div>}
 {game==='expedition-boss'&&s&&settingsOf(s).route!=='rescue'&&<div className="flagship-row">{([['calm','바람 잔잔하게'],['crosswind','옆바람 보내기'],['slow','천천히 조종하기']] as const).map(([event,label])=><button disabled={busy||s.status!=='playing'} key={event} onClick={()=>void action('event',{event})}>{label}</button>)}<small>교사 이벤트는 원정당 세 번까지 · 우주선 조종에 적용</small></div>}
 {codes&&<><button aria-expanded={showCodes} onClick={()=>setShowCodes(v=>!v)}>탐사 지점 안내판 {showCodes?'접기':'열기'}</button>{showCodes&&<StationSheet room={roomId} codes={codes}/>}</>}</>}
 {missing?<p>아직 원정을 열지 않았어요.</p>:!s?<p role="status">원정 상태를 확인하고 있어요…</p>:<><p className="flagship-progress">{game==='expedition-map'?`공동 관문 ${s.phase}/3`:game==='expedition-boss'?`보스 관문 ${s.phase}/3`:`참여 완료 ${s.groups.filter(g=>g.done).length}/${s.groups.length} 모둠`} · {s.status==='playing'?'진행 중':s.status==='paused'?'일시정지':s.status==='finished'?'종료':'수업 시작 대기'}</p><div className="flagship-team-grid">{s.groups.map(g=><article key={g.id}><strong>{g.name}</strong><p>{game==='expedition-ship'?`정거장 ${g.ship.checkpoint}/3`:game==='expedition-loop'?`박자 ${g.quality}%`:g.done?'참여 완료':g.vote?'다음 길 선택':`${g.visited.length}개 지점`}</p></article>)}</div></>}
 {s&&<><ExpeditionWorld snapshot={s}/><ReadinessBoard snapshot={s}/><LessonSchedule snapshot={s} send={action} editable={!readOnly} busy={busy}/>{!readOnly&&s.owner&&<><TeacherRoles snapshot={s} send={action} busy={busy}/><GroupAdjustments snapshot={s} send={action} busy={busy}/><ExpeditionReport key={s.runId} snapshot={s} send={action} busy={busy}/></>}</>}
 <button disabled={busy} onClick={()=>void refresh()}>진행 다시 확인</button></section>;
}
