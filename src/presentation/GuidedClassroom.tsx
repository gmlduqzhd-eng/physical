import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ActivityPicker } from './ActivityLibrary';
import { FlowShell } from './FlowShell';
import './ClassroomSetup.css';
import {AVAILABLE_GAMES,type GameDef} from '../domain/gamesData';
import {parseLessonTransfer} from '../domain/publicLessonTransfer';
import {DEFAULT_WORKSHOP,LESSON_PACKAGES,LESSON_STEPS,type WorkshopSettings} from '../domain/expeditionWorkshop';
import {isFlagship} from '../domain/flagship';
import { lessonPresets, type LessonPreset } from '../domain/lessonPresets';
import { supabase, ensureClassroomTeacher } from '../data/supabase';
import { classroomError } from '../data/classroomRepository';
import { RecoverClassroom } from './components/admin/RecoverClassroom';
import type { GameRoom, MissionTemplate } from '../domain/types';

export function ClassroomSetup() {
  const [params]=useSearchParams();
  const [transfer]=useState(()=>parseLessonTransfer(window.location.hash));
  const requestedPackage=[10,20,40].includes(Number(params.get('package')))?Number(params.get('package')) as 10|20|40:null;
  const requestedGame=AVAILABLE_GAMES.find(g=>g.type===(transfer?.activityId??params.get('game')??(requestedPackage?(requestedPackage===10?'expedition-map':'expedition-boss'):'')));
  const [packageMinutes,setPackageMinutes]=useState<WorkshopSettings['packageMinutes']>(requestedPackage);
  useEffect(()=>{if(window.location.hash.startsWith('#lesson='))window.history.replaceState(window.history.state,'',window.location.pathname+window.location.search);},[]);
  const [step, setStep] = useState(requestedGame?2:1); const [game, setGame] = useState<GameDef | null>(requestedGame||null);
  const [groups, setGroups] = useState(6); const [minutes, setMinutes] = useState(transfer?.minutes??requestedPackage??40);
  const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [rooms, setRooms] = useState<GameRoom[]>([]); const [createdId, setCreatedId] = useState('');
  const [presets, setPresets] = useState<LessonPreset[]>([]);
  const navigate = useNavigate(); const creating = useRef(false);
  useEffect(() => { let active = true; void (async()=>{
    const user=await supabase.auth.getUser();
    if(user.error||!user.data.user)throw Error('교사 수업 목록을 확인하지 못했습니다.');
    const r=await supabase.from('game_rooms').select('*').eq('teacher_id',user.data.user.id).order('created_at',{ascending:false});
    if(r.error)throw Error('수업 목록을 불러오지 못했습니다.');
    if(!active||!r.data)return;
    setRooms(r.data);
    const templateIds=[...new Set(r.data.map(room=>room.template_id).filter((id):id is string=>Boolean(id)))];
    if(!templateIds.length)return;
    const [templates, roomGroups]=await Promise.all([
      supabase.from('mission_templates').select('id,name,buttons').in('id',templateIds),
      supabase.from('room_groups').select('id,room_id').in('room_id',r.data.map(room=>room.id)),
    ]);
    if(templates.error||roomGroups.error)throw Error('이전 수업 설정을 불러오지 못했습니다.');
    if(active)setPresets(lessonPresets(r.data, (templates.data||[]) as MissionTemplate[], roomGroups.data||[]));
  })().catch(cause=>{if(active)setError(classroomError(cause,'목록 확인 실패'));});return()=>{active=false;};}, []);
  const choosePreset = (preset: LessonPreset) => {
    setPackageMinutes(null);setGame(preset.game); setGroups(preset.groups); setMinutes(preset.minutes ?? 40);
    setChecked(false); setStep(preset.minutes === null ? 2 : 3); window.scrollTo({top:0,behavior:'smooth'});
  };
  const create = async () => {
    if (!game || creating.current || !checked || createdId) return;
    creating.current = true; setBusy(true); setError('');
    try {
      await ensureClassroomTeacher();
      const { data: room, error: createError } = await supabase.rpc('create_guided_classroom', {
        room_name: game.name, game_type: game.type, group_count: groups,
        // Retain the legacy RPC argument until older clients are retired.
        lesson_minutes: minutes, target_percent: 75,
      });
      if (createError || !room?.id) throw new Error('수업방을 만들지 못했습니다. 연결과 교사 인증을 확인하고 다시 시도해 주세요.');
      setCreatedId(room.id);
      if(isFlagship(game.type)&&packageMinutes){
        const initialized=await supabase.rpc('expedition_action',{p_room:room.id,p_game:game.type,p_action:'start',p_data:{settings:{...DEFAULT_WORKSHOP,packageMinutes}}});
        if(initialized.error||!initialized.data?.workshop){
          navigate('/teacher/room/'+room.id,{state:{setupNotice:'수업방은 만들었지만 꾸러미 설정을 저장하지 못했습니다. 대표 원정 편집기에서 설정을 확인해 주세요.'}});
          return;
        }
      }
      navigate('/teacher/room/'+room.id);
    } catch (cause) {setError(classroomError(cause,'수업을 만들지 못했습니다.'));} finally {creating.current=false;setBusy(false);}
  };
  return <FlowShell utilities className="classroom-setup" back="/teacher" backLabel="교사 시작 화면"><p className="eyebrow">선생님 수업 준비실</p><h1>새 수업 준비</h1><ol className="steps" aria-label="수업 준비 단계">{['활동 선택','모둠·시간','학생 참여'].map((s,i)=><li key={s} aria-current={step===i+1?'step':undefined}>{i+1}. {s}</li>)}</ol>
    {transfer&&requestedGame&&<section className="notice"><strong>AI 준비실에서 교사가 채택한 활동·공개 조건</strong><p>{transfer.grade} · {transfer.goal} · {transfer.place} · {transfer.device} · {transfer.minutes}분</p><p>AI 초안·학생 기록·인증 정보는 가져오지 않았습니다. 아래에서 모둠·시간·안전을 확인한 뒤 수업방을 만드세요.</p></section>}
    {step===1&&<section className="card"><h2>시간으로 먼저 고르기</h2><p>도입 → 준비·연습 → 모둠 원정 → 정리·회고까지 한 활동으로 이어갑니다. 보스 원정은 관문별 활동으로 이어져요.</p><div className="row">{([10,20,40] as const).map(n=><button key={n} onClick={()=>{setPackageMinutes(n);setMinutes(n);setGame(AVAILABLE_GAMES.find(g=>g.type===(n===10?'expedition-map':'expedition-boss'))!);setStep(2);setChecked(false);}}><strong>{n}분 꾸러미</strong><br/>{LESSON_PACKAGES[n].map((m,i)=>LESSON_STEPS[i].split('·')[0]+' '+m+'분').join(' / ')}</button>)}</div></section>}
    {!!rooms.length && <details open={new URLSearchParams(window.location.search).has('resume')}><summary>이 기기에서 만든 수업 이어가기 ({rooms.length})</summary><div className="stack" style={{marginTop:16}}>{rooms.map(r=><Link key={r.id} to={'/teacher/room/'+r.id}>{r.name} · {r.status==='finished'?'종료':'열기'}</Link>)}</div></details>}
    <RecoverClassroom onRecovered={id=>navigate('/teacher/room/'+id)}/>
    {!!presets.length && step===1 && <section className="lesson-presets" aria-label="지난 수업 설정 다시 사용"><h2>지난 수업 설정으로 빠르게 준비</h2><p>활동·모둠·시간을 불러온 뒤 확인하고 새 수업방을 만들어요.</p><div className="lesson-preset-list">{presets.map(preset=><button type="button" key={preset.roomId} onClick={()=>choosePreset(preset)}><strong>{preset.game.name}</strong><span>{preset.groups}모둠 · {preset.minutes === null ? '시간 확인 필요' : `${preset.minutes}분`}</span><b>이 설정 사용 →</b></button>)}</div></section>}
    {error&&step!==3&&<p role="alert" className="error">{error}</p>}{step===1 ? <><p className="notice">오늘 할 활동 하나를 선택하세요. ‘규칙·안전·교육과정 보기’에서 자세한 내용을 볼 수 있습니다.</p><ActivityPicker onSelect={selected=>{setPackageMinutes(null);setGame(selected);setStep(2);setChecked(false);window.scrollTo({top:0});}}/></> : <section className="card"><span className="pill">선택한 활동</span><h2 style={{marginTop:12}}>{game?.name}</h2>{step===2 ? <><div className="grid"><label>모둠 수<select value={groups} onChange={e=>setGroups(Number(e.target.value))}>{[1,2,3,4,5,6,7,8].map(n=><option value={n} key={n}>{n}모둠</option>)}</select></label><label>활동 시간 (분)<input type="number" min={5} max={90} value={minutes} onChange={e=>{setMinutes(Number(e.target.value));setPackageMinutes(null);}}/></label></div>{game&&isFlagship(game.type)&&<label>수업 꾸러미<select value={packageMinutes??0} onChange={e=>{const n=Number(e.target.value);setPackageMinutes(n===0?null:n as 10|20|40);if(n)setMinutes(n);}}><option value={0}>시간만 직접 정하기</option>{[10,20,40].map(n=><option key={n} value={n}>{n}분 단계별 꾸러미</option>)}</select></label>}<div className="row"><button onClick={()=>setStep(1)}>활동 다시 선택</button><button className="primary" disabled={!Number.isInteger(minutes)||minutes<5||minutes>90} onClick={()=>setStep(3)}>참여 안내 준비</button></div></> : <><p>{groups}모둠 · {minutes}분으로 준비합니다. 아래 버튼을 누르면 실제 수업방이 만들어집니다.</p><div className="notice"><strong>학생에게 안내할 미션</strong><p>{game?.name} 게임 종료 → 점수는 교사 확인 후 반영 · 완료 현황은 별도 기록</p><p>활동 규칙과 안전 안내는 <Link to={'/play/'+game?.type} target="_blank" rel="noopener noreferrer">활동 화면을 새 탭에서 열어</Link> 확인하세요. 확인 후 새 탭을 닫으면 이 화면에서 이어서 준비할 수 있습니다.</p></div><label className="check"><input type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>활동 규칙·장소·기기·안전과 참여 의사를 확인했습니다.</label><div className="row"><button disabled={busy||!!createdId} onClick={()=>setStep(2)}>모둠·시간 수정</button><button className="primary" disabled={busy||!checked||!!createdId} onClick={()=>void create()}>{busy?'수업 준비 중…':'수업방 만들고 참여 QR 보기'}</button></div>{createdId&&<Link to={'/teacher/room/'+createdId}>만들어진 수업 열기</Link>}{error&&<p role="alert" className="error">{error}</p>}</>}</section>}
  </FlowShell>;
}

export { GuidedClassroom } from './GuidedClassroomControl';
