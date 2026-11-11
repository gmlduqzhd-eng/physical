import {useCallback,useEffect,useState} from 'react';
import {FLAGSHIPS,FLAGSHIP_SAFETY,type FlagshipId} from '../../domain/flagship';
import {BOSS_ROUTES,DEFAULT_WORKSHOP,groupWorkshop,LEVEL_NAMES,settingsOf,type WorkshopSettings} from '../../domain/expeditionWorkshop';
import {RoleRotation,ExpeditionTutorial,WorkshopEditor,LessonSchedule,BossContribution} from './WorkshopPanels';
import {DeviceReporting} from './DeviceReporting';
import {useExpedition} from '../../application/useExpedition';
import {MapGame} from './MapGame';
import {ShipGame} from './ShipGame';
import {LoopGame} from './LoopGame';
import {RescueGame} from './RescueGame';
import {ShadowGame} from './ShadowGame';
import type {GameResultDetails} from '../../domain/gameResultDetails';
import './flagship.css';
import {expeditionNextStep} from '../../domain/expeditionGuidance';
import '../components/minigames/common/ActivityProgress.css';

export function FlagshipActivity({game,room=null,group=null,onFinish,embedded=false,practiceSettings}:{practiceSettings?:WorkshopSettings;game:FlagshipId;room?:string|null;group?:string|null;onFinish:(details:GameResultDetails)=>void;embedded?:boolean}){
 const {snapshot:s,practice,missing,error,busy,stale,refresh,action}=useExpedition(room,game,group);
 const [ready,setReady]=useState(embedded),[safety,setSafety]=useState(false),[solved,setSolved]=useState(false),[mode,setMode]=useState('assisted'),[confirmed,setConfirmed]=useState(false),[submitted,setSubmitted]=useState(false),[practicePhase,setPracticePhase]=useState(0);
 useEffect(()=>{if(practice&&practiceSettings)void action('settings',{settings:practiceSettings});},[practice,practiceSettings,action]);
 const resetSolved=useCallback(()=>setSolved(false),[]),markSolved=useCallback(()=>setSolved(true),[]),nextPractice=useCallback(()=>setPracticePhase(n=>Math.min(3,n+1)),[]);
 const meta=FLAGSHIPS.find(g=>g.id===game)!,me=s?.groups.find(g=>g.id===s.groupId)??s?.groups[0];
 const suspended=stale||s?.status!=='playing',disabled=busy||suspended;
 const bossPhase=practice?practicePhase:s?.phase??0;
 const complete=game==='expedition-boss'?bossPhase>=3:['expedition-rescue','expedition-shadow'].includes(game)?solved:!!me?.done;
 const level=me&&s?groupWorkshop(me,s).level:'normal',config=s?settingsOf(s):DEFAULT_WORKSHOP;
 const progressKey=s?.runId+':'+level+':'+config.route;
 const guidance=s?expeditionNextStep(s,game):null;
 useEffect(()=>{setSolved(false);setConfirmed(false);setSubmitted(false);setPracticePhase(0);},[progressKey]);
 const finish=async()=>{if(!confirmed||!complete||submitted||disabled)return;
  if(['expedition-rescue','expedition-shadow'].includes(game)&&!await action('complete',{mode,movementConfirmed:true}))return;
  setSubmitted(true);onFinish({metrics:{활동:`${meta.name} 완료`,'참여 방식':practice?'본 기기 연습':'수업방 모둠 원정','입력 구분':game==='expedition-boss'?'관문별 조작 · 모둠 수행 확인':game==='expedition-rescue'||game==='expedition-shadow'?mode==='camera'?'기기 안의 손목 추정':'터치 연습 · 자동 동작 측정 아님':game==='expedition-loop'?'박자 입력 · 동작은 짝 확인':game==='expedition-ship'?me?.mode==='sensor'?'기기 기울기':'보조 조작':'지점 코드 · 동작은 짝 확인','활동 확인':'참여 모둠이 직접 확인 · 교사 최종 검토'},selfReflection:'서로의 신호를 어떻게 연결했는지 이야기해요.'});
 };
 return <DeviceReporting send={s?.workshop&&!practice&&s.groupId&&s.status!=='finished'?action:null}><section className={`flagship ${embedded?'flagship-embedded':''}`} data-game-color="true"><header className="flagship-title"><span>{meta.emoji}</span><div><p className="flagship-kicker">{practice?'본 기기 연습 · 다른 기기와 연결되지 않음':'우리 수업의 공동 원정'}</p><h2>{meta.name}</h2></div></header>
 {!embedded&&<ExpeditionTutorial game={game}/>} {!ready?<>{practice&&s&&<WorkshopEditor value={config} onChange={settings=>void action('settings',{settings})}/>}<p>{meta.desc}</p><p>권장: {meta.device} · {meta.minutes}분 · 한 라운드마다 역할 교대</p><ul>{FLAGSHIP_SAFETY.map(v=><li key={v}>{v}</li>)}</ul><p>앉아서도 작은 팔·손 동작과 길 짚기로 같은 역할을 맡을 수 있어요. 카메라와 센서는 해당 기능의 켜기 버튼을 누를 때만 시작해요.</p><label className="flagship-check"><input type="checkbox" checked={safety} onChange={e=>setSafety(e.target.checked)}/><span>주변 공간·기기 거치·참여 의사를 함께 확인했어요.</span></label><button className="flagship-primary" disabled={!safety} onClick={()=>setReady(true)}>원정 준비 완료</button></>:<>
 {error&&<div role="alert" className="flagship-note"><p>{error}</p><button onClick={()=>void refresh()}>연결 다시 확인</button></div>}
 {room&&missing?<p role="status">선생님이 수업방의 ‘대표 원정 진행’에서 이 게임을 열면 연결돼요. 다른 게임을 진행 중이면 선생님께 알려 주세요.</p>:!s?<p role="status">원정 상태 연결 중…</p>:<>
 {!embedded&&<LessonSchedule snapshot={s} send={action}/>}<p className="flagship-kicker">{LEVEL_NAMES[level]} 코스 · 가상 게임 규칙 조절</p>{guidance&&<section className="flagship-note" aria-label="지금 할 일"><h3>{guidance.title}</h3><p>{guidance.instruction}</p></section>}{me&&game!=='expedition-boss'&&<RoleRotation snapshot={s} group={me} send={action} disabled={disabled}/>} {s.status!=='playing'&&<p role="status" className="flagship-note">{s.status==='waiting'?'선생님의 수업 시작을 기다려요.':s.status==='finished'?'수업이 종료되어 입력을 마감했어요.':'수업을 잠시 멈췄어요. 화면 입력을 멈추고 선생님을 보세요.'}</p>}
 {game==='expedition-map'&&<MapGame key={s.runId+level} snapshot={s} send={action} practice={practice} disabled={disabled} onRefresh={refresh}/>}
 {game==='expedition-ship'&&<ShipGame key={s.runId+level} snapshot={s} send={action} practice={practice} disabled={suspended} pending={busy}/>}
 {game==='expedition-loop'&&<LoopGame key={s.runId+level} snapshot={s} send={action} disabled={disabled}/>}
 {game==='expedition-rescue'&&<RescueGame key={s.runId+level} level={level} disabled={disabled} onSolved={markSolved} onReset={resetSolved} onMode={setMode}/>}
 {game==='expedition-shadow'&&<ShadowGame key={s.runId+level} level={level} disabled={disabled} onReset={resetSolved} onSolved={markSolved} onMode={setMode}/>}
 {game==='expedition-boss'&&<><div className="flagship-boss"><span aria-hidden="true">🏰</span><h3>{bossPhase>=3?'원정대의 힘으로 기지 복원!':`${bossPhase+1}관문 · ${(config.route==='rescue'?['비밀길 연결','구조 작전','리듬 발전']:config.route==='shadow'?['비밀길 연결','공동 운반','그림자 복원']:['비밀길 연결','공동 운반','리듬 발전'])[bossPhase]}`}</h3><progress value={bossPhase} max={3} aria-label="공동 관문 개방"/><BossContribution snapshot={s}/></div>{bossPhase<3&&<FlagshipActivity key={`${s.runId}:${bossPhase}`} embedded game={BOSS_ROUTES[config.route][bossPhase]} practiceSettings={practice?config:undefined} room={room} group={group} onFinish={practice?nextPractice:()=>void refresh()}/>}</>}
 {complete&&!submitted&&<div className="flagship-finish"><h3>원정을 마쳤어요!</h3><label className="flagship-check"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/><span>모두 역할을 바꾸어 참여했고, 수행과 결과를 함께 확인했어요.</span></label><button className="flagship-primary" disabled={!confirmed||disabled} onClick={()=>void finish()}>{embedded?'관문 참여 확인':'활동 마치고 결과 제출'}</button><p>자동 측정으로 확인할 수 없는 동작은 교사가 최종 확인해요.</p></div>}{submitted&&<p role="status">참여 결과를 전달했어요.{game==='expedition-boss'?'':' 다른 모둠이 끝날 때까지 작은 동작으로 정리하며 기다려요.'}</p>}
 </>}
 </>}
 </section></DeviceReporting>;
}
