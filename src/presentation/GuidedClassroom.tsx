import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ActivityPicker } from './ActivityLibrary';
import { FlowShell } from './FlowShell';
import { GAMES, type GameDef } from '../domain/gamesData';
import { supabase, ensureClassroomTeacher } from '../data/supabase';
import { createClassroom, classroomError, openClassroomBoard } from '../data/classroomRepository';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { timeOffset } from '../application/timeSync';
import { QRCodePanel } from './components/admin/QRCodePanel';
import type { GameRoom } from '../domain/types';

export function ClassroomSetup() {
  const [step, setStep] = useState(1); const [game, setGame] = useState<GameDef | null>(null);
  const [groups, setGroups] = useState(6); const [minutes, setMinutes] = useState(40);
  const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [rooms, setRooms] = useState<GameRoom[]>([]); const [createdId, setCreatedId] = useState('');
  const navigate = useNavigate(); const creating = useRef(false);
  useEffect(() => { let active = true; void (async()=>{const user=await supabase.auth.getUser();if(user.error||!user.data.user)throw Error('교사 수업 목록을 확인하지 못했습니다.');const r=await supabase.from('game_rooms').select('*').eq('teacher_id',user.data.user.id).order('created_at',{ascending:false});if(r.error)throw Error('수업 목록을 불러오지 못했습니다.');if(active&&r.data)setRooms(r.data);})().catch(cause=>{if(active)setError(classroomError(cause,'목록 확인 실패'));});return()=>{active=false;};}, []);
  const create = async () => {
    if (!game || creating.current || !checked || createdId) return;
    creating.current = true; setBusy(true); setError('');
    try {
      await ensureClassroomTeacher();
      const template = await supabase.from('mission_templates').insert({name:game.name,buttons:[{id:crypto.randomUUID(),title:game.name+' 활동 완료',desc:'활동 규칙에 따라 참여한 후 선생님에게 완료 확인을 요청하세요.',amount:10,cooldown:60,iconName:'Flag',color:'text-cyan-600',bg:'bg-cyan-50',requires_approval:true}]}).select('id').single();
      if (template.error || !template.data) throw new Error('수업 미션을 준비하지 못했습니다. 교사 인증을 다시 확인하세요.');
      const room = await createClassroom(game.name, template.data.id, Array.from({length:groups},(_,i)=>`${i+1}모둠`));
      setCreatedId(room.id);
      const update = await supabase.from('game_rooms').update({global_time_modifier:minutes*60-300}).eq('id',room.id).select('id');
      if (update.error || !update.data?.length) throw new Error('수업방은 만들어졌지만 시간을 저장하지 못했습니다. 만들어진 수업에서 시간을 확인하세요.');
      navigate('/teacher/room/'+room.id);
    } catch (cause) {setError(classroomError(cause,'수업을 만들지 못했습니다.'));} finally {creating.current=false;setBusy(false);}
  };
  return <FlowShell back="/teacher" backLabel="교사 시작 화면"><h1>새 수업 준비</h1><ol className="steps" aria-label="수업 준비 단계">{['활동 선택','모둠·시간','학생 참여'].map((s,i)=><li key={s} aria-current={step===i+1?'step':undefined}>{i+1}. {s}</li>)}</ol>
    {!!rooms.length && <details open={new URLSearchParams(window.location.search).has('resume')}><summary>이 기기에서 만든 수업 이어가기 ({rooms.length})</summary><div className="stack" style={{marginTop:16}}>{rooms.map(r=><Link key={r.id} to={'/teacher/room/'+r.id}>{r.name} · {r.status==='finished'?'종료':'열기'}</Link>)}</div></details>}
    {error&&step!==3&&<p role="alert" className="error">{error}</p>}{step===1 ? <><p className="notice">오늘 할 활동 하나를 선택하세요. ‘규칙·안전·교육과정 보기’에서 자세한 내용을 볼 수 있습니다.</p><ActivityPicker onSelect={selected=>{setGame(selected);setStep(2);setChecked(false);window.scrollTo({top:0});}}/></> : <section className="card"><span className="pill">선택한 활동</span><h2 style={{marginTop:12}}>{game?.name}</h2>{step===2 ? <><div className="grid"><label>모둠 수<select value={groups} onChange={e=>setGroups(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n=><option value={n} key={n}>{n}모둠</option>)}</select></label><label>활동 시간 (분)<input type="number" min={5} max={90} value={minutes} onChange={e=>setMinutes(Number(e.target.value))}/></label></div><div className="row"><button onClick={()=>setStep(1)}>활동 다시 선택</button><button className="primary" disabled={!Number.isInteger(minutes)||minutes<5||minutes>90} onClick={()=>setStep(3)}>참여 안내 준비</button></div></> : <><p>{groups}모둠 · {minutes}분으로 준비합니다. 아래 버튼을 누르면 실제 수업방이 만들어집니다.</p><div className="notice"><strong>학생에게 안내할 미션</strong><p>{game?.name} 활동 완료 → 교사 확인 후 10점 지급</p><p>활동 규칙과 안전 안내는 <Link to={'/play/'+game?.type}>기존 활동 화면</Link>에서 먼저 확인하세요.</p></div><label className="check"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>활동 규칙·장소·기기·안전과 참여 의사를 확인했습니다.</label><div className="row"><button disabled={busy||!!createdId} onClick={()=>setStep(2)}>모둠·시간 수정</button><button className="primary" disabled={busy||!checked||!!createdId} onClick={()=>void create()}>{busy?'수업 준비 중…':'수업방 만들고 참여 QR 보기'}</button></div>{createdId&&<Link to={'/teacher/room/'+createdId}>만들어진 수업 열기</Link>}{error&&<p role="alert" className="error">{error}</p>}</>}</section>}
  </FlowShell>;
}

export function GuidedClassroom() {
  const {roomId}=useParams();const {gameRoom:room,scores,template,loading,error,refresh}=useGameLogic(roomId);
  const {mins,secs,timeLeft}=useGameTimer(room);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');const [confirmEnd,setConfirmEnd]=useState(false);
  const mutate=async(updates:Record<string,unknown>)=>{if(!room||busy)return;setBusy(true);setMessage('');try{const r=await supabase.from('game_rooms').update(updates).eq('id',room.id).select('id');if(r.error||!r.data?.length)throw Error('수업 상태를 바꾸지 못했습니다. 인증과 연결을 확인하세요.');refresh();}catch(cause){setMessage(classroomError(cause,'수업 변경 실패'));}finally{setBusy(false);}};
  const approve=async(groupId:string,missionId:string)=>{if(busy)return;setBusy(true);setMessage('');try{const r=await supabase.rpc('review_classroom_mission',{row_id:groupId,mission_id:missionId,approve:true});if(r.error)throw Error('완료 확인에 실패했습니다. 다시 시도하세요.');refresh();}catch(cause){setMessage(classroomError(cause,'확인 실패'));}finally{setBusy(false);}};
  const status=room?.status==='waiting'?'학생 참여 안내':room?.status==='paused'?'잠시 멈춤':room?.status==='finished'?'수업 종료':'수업 진행 중';
  return <FlowShell back="/teacher" backLabel="교사 시작 화면">{loading?<p role="status">수업을 불러오는 중…</p>:error||!room?<div role="alert" className="error">{error||'수업을 찾지 못했습니다.'}<button onClick={refresh}>다시 확인</button></div>:<><p className="eyebrow">{status}</p><h1>{room.name}</h1><div className="grid"><section className="card"><h2>지금 할 일</h2><p>{room.status==='waiting'?'학생에게 아래의 우리 모둠 QR을 보여 주세요. 참여가 끝나면 수업을 시작하세요.':room.status==='finished'?'활동 결과를 함께 확인하고 오늘의 경험을 이야기해 보세요.':'모둠의 활동을 살펴보고 완료 확인 요청을 확인하세요.'}</p><p className="muted">등록된 모둠 {scores.length}개 · 완료 확인 대기 {scores.reduce((n,g)=>n+(g.pending_missions?.length||0),0)}건</p>{['waiting','playing','paused'].includes(room.status)&&<button className="primary" disabled={busy} onClick={()=>void mutate(room.status==='playing'?{status:'paused',started_at:null,global_time_modifier:timeLeft-300}:{status:'playing',started_at:new Date(Date.now()+timeOffset).toISOString()})}>{room.status==='waiting'?'수업 시작':room.status==='playing'?'잠시 멈추기':'수업 이어가기'}</button>}</section><section className="card"><h2>남은 활동 시간</h2><p className="big-number">{mins}:{secs}</p><p>현재 미션: {template?.buttons[0]?.title||'선택한 활동 참여'}</p><Link to={GAMES.some(g=>g.name===room.name)?'/play/'+GAMES.find(g=>g.name===room.name)!.type:'/hub'}>활동 규칙 확인</Link></section></div>
    {room.status!=='finished'&&<details open={room.status==='waiting'}><summary>학생 참여 QR 보여 주기</summary><QRCodePanel currentRoom={room} roomGroups={scores}/></details>}
    <section className="card" style={{marginTop:20}}><h2>모둠 활동 확인</h2><div className="stack">{scores.map(g=><div className="inline-title" key={g.id}><strong>{g.group_name} · {g.score}점</strong><div className="row">{g.pending_missions?.map(id=><button key={id} disabled={busy||room.status==='finished'} onClick={()=>void approve(g.id,id)}>{template?.buttons.find(b=>b.id===id)?.title||'미션'} 완료 확인</button>)}</div></div>)}</div></section>
    {message&&<p role="alert" className="error">{message}</p>}<details><summary>수업 조절·더 많은 도구</summary><div className="row" style={{marginTop:16}}>{room.status!=='finished'&&<><button disabled={busy} onClick={()=>void mutate({global_time_modifier:room.global_time_modifier+60})}>1분 더하기</button><button disabled={busy} onClick={()=>void mutate({announcement:room.announcement==='WHISTLE'?null:'WHISTLE'})}>{room.announcement==='WHISTLE'?'집중 안내 해제':'잠깐 집중 안내'}</button></>}<button onClick={()=>void openClassroomBoard(room.id)}>전광판 열기</button><Link to={'/admin?room='+room.id}>상세 제어·리포트·기존 도구</Link></div>{room.status!=='finished'&&(!confirmEnd?<button style={{marginTop:16}} onClick={()=>setConfirmEnd(true)}>수업 종료하기</button>:<div className="notice"><p>종료하면 학생의 점수 제출을 마감합니다.</p><div className="row"><button onClick={()=>setConfirmEnd(false)}>계속 진행</button><button disabled={busy} onClick={()=>void mutate({status:'finished',started_at:null,global_time_modifier:timeLeft-300})}>수업 종료 확정</button></div></div>)}</details>
  </>}</FlowShell>;
}
