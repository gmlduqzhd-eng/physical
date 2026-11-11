import {stretchCompletion} from '../../../domain/fourthGameRules';
import {useActivityPause} from '../../../application/ActivityPauseContext';
import { useState, useEffect, useRef } from 'react';
import { sfxCoin, sfxSuccess } from '../../../application/soundEffects';
import './common/MovementQuest.css';

interface Props { groupId: string; enqueueAction: (a: any) => void; }

interface StretchPose {
  id: 'reach_sky' | 'side_stretch' | 'shoulder_roll';
  name: string;
  desc: string;
  duration: number;
}

const POSES: StretchPose[] = [
  { id: 'reach_sky', name: '기지개 켜기', desc: '두 팔을 하늘 높이 쭉 뻗어 온몸을 펴세요!', duration: 7 },
  { id: 'side_stretch', name: '옆구리 늘리기', desc: '한 손을 머리 위로 넘겨 상체를 옆으로 길게 늘리세요!', duration: 7 },
  { id: 'shoulder_roll', name: '어깨 돌리기', desc: '양손을 어깨에 올리고 팔꿈치로 원을 그리며 돌리세요!', duration: 7 },
];

const PoseIllustration = ({ poseId,seated=false }: { poseId: StretchPose['id'];seated?:boolean }) => {
  if(seated)return <svg viewBox="0 0 160 170" className="w-44 h-44 mx-auto" role="img" aria-label="앉은 작은 팔 동작 시범"><path d="M45 100H110V150M45 65V150" fill="none" stroke="#879477" strokeWidth="6"/><circle cx="80" cy="35" r="15" fill="#eac780"/><path d="M80 50V100H105V148" fill="none" stroke="#526c53" strokeWidth="10" strokeLinecap="round"/><path d={poseId==='reach_sky'?'M80 60L50 30M80 60L110 30':poseId==='side_stretch'?'M80 60L105 45L112 65M80 65L52 78':'M80 60L52 66L65 53M80 60L108 66L95 53'} fill="none" stroke="#526c53" strokeWidth="8" strokeLinecap="round"/><text x="80" y="166" textAnchor="middle" fontSize="10">편한 범위의 예시 · 모양을 똑같이 만들 필요 없어요</text></svg>;
  if (poseId === 'reach_sky') {
    // 기지개 켜기: 두 팔을 Y자로 하늘을 향해 높이 뻗고 몸통을 곧게 편 자세
    return (
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-2xl">
          {/* 부드러운 배경 원광 */}
          <circle cx="80" cy="80" r="70" fill="#0D9488" fillOpacity="0.25" />
          {/* 머리 */}
          <circle cx="80" cy="38" r="16" fill="#FDE047" />
          {/* 미소 */}
          <path d="M 75 42 Q 80 47 85 42" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* 눈 */}
          <circle cx="74" cy="36" r="2" fill="#713F12" />
          <circle cx="86" cy="36" r="2" fill="#713F12" />
          {/* 몸통 */}
          <line x1="80" y1="54" x2="80" y2="105" stroke="#38BDF8" strokeWidth="14" strokeLinecap="round" />
          {/* 왼팔 (위로 쭉 뻗음) */}
          <path d="M 80 62 L 44 20" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" />
          <circle cx="43" cy="18" r="6" fill="#FDE047" />
          {/* 오른팔 (위로 쭉 뻗음) */}
          <path d="M 80 62 L 116 20" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" />
          <circle cx="117" cy="18" r="6" fill="#FDE047" />
          {/* 양다리 */}
          <line x1="80" y1="105" x2="62" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          <line x1="80" y1="105" x2="98" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          {/* 하늘 방향 신장 가이드 화살표 */}
          <path d="M 80 18 L 80 4" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 74 10 L 80 4 L 86 10" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        </svg>
      </div>
    );
  }

  if (poseId === 'side_stretch') {
    // 옆구리 늘리기: 한 손은 허리에 올리고 다른 팔은 머리 위로 아치형으로 넘겨 옆구리를 늘린 정확한 자세
    return (
      <div className="relative flex items-center justify-center">
        <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-2xl">
          {/* 부드러운 배경 원광 */}
          <circle cx="80" cy="80" r="70" fill="#0EA5E9" fillOpacity="0.25" />
          {/* 머리 (상체 기울기에 맞춤) */}
          <circle cx="94" cy="42" r="16" fill="#FDE047" />
          <path d="M 89 45 Q 94 50 99 45" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="88" cy="40" r="2" fill="#713F12" />
          <circle cx="99" cy="40" r="2" fill="#713F12" />
          {/* 상체 (옆으로 휜 아치형) */}
          <path d="M 90 58 Q 84 82 76 105" stroke="#38BDF8" strokeWidth="14" strokeLinecap="round" fill="none" />
          {/* 왼팔 (손을 허리에 올림) */}
          <path d="M 88 66 L 66 78 L 72 92" stroke="#38BDF8" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="73" cy="93" r="5" fill="#FDE047" />
          {/* 오른팔 (머리 위로 포물선 아치를 그리며 시원하게 옆구리를 늘림) */}
          <path d="M 94 62 C 122 36, 92 8, 52 18" stroke="#F43F5E" strokeWidth="11" strokeLinecap="round" fill="none" />
          <circle cx="50" cy="19" r="6" fill="#FDE047" />
          {/* 양다리 (안정적인 지지) */}
          <line x1="76" y1="105" x2="56" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          <line x1="76" y1="105" x2="98" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
          {/* 옆구리 스트레치 효과선 */}
          <path d="M 52 64 Q 62 82 60 98" stroke="#FBBF24" strokeWidth="3" strokeDasharray="4 3" fill="none" />
          <text x="32" y="84" fill="#FBBF24" fontSize="10" fontWeight="900">옆구리 쭉~</text>
        </svg>
      </div>
    );
  }

  // 어깨 돌리기: 양손을 어깨에 올리고 팔꿈치를 둥글게 회전하는 모션 + 회전 화살표
  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-2xl">
        {/* 부드러운 배경 원광 */}
        <circle cx="80" cy="80" r="70" fill="#6366F1" fillOpacity="0.25" />
        {/* 머리 */}
        <circle cx="80" cy="38" r="16" fill="#FDE047" />
        <path d="M 75 42 Q 80 47 85 42" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="74" cy="36" r="2" fill="#713F12" />
        <circle cx="86" cy="36" r="2" fill="#713F12" />
        {/* 몸통 */}
        <line x1="80" y1="54" x2="80" y2="105" stroke="#38BDF8" strokeWidth="14" strokeLinecap="round" />
        {/* 왼팔 (손을 어깨에 올린 팔꿈치 자세) */}
        <path d="M 80 62 L 48 64 L 68 58" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="68" cy="58" r="5" fill="#FDE047" />
        {/* 오른팔 (손을 어깨에 올린 팔꿈치 자세) */}
        <path d="M 80 62 L 112 64 L 92 58" stroke="#38BDF8" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="92" cy="58" r="5" fill="#FDE047" />
        {/* 양다리 */}
        <line x1="80" y1="105" x2="62" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
        <line x1="80" y1="105" x2="98" y2="148" stroke="#818CF8" strokeWidth="12" strokeLinecap="round" />
        {/* 어깨 회전 궤적 화살표 좌/우 */}
        <path d="M 38 64 A 14 14 0 1 1 48 78" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 48 81 L 53 74 L 43 75" fill="#34D399" />
        <path d="M 122 64 A 14 14 0 1 0 112 78" stroke="#34D399" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M 112 81 L 107 74 L 117 75" fill="#34D399" />
      </svg>
    </div>
  );
};

export const StretchTimer = ({ groupId, enqueueAction }: Props) => {
  const classroomPaused=useActivityPause();
  const [seated,setSeated]=useState(false);
  const [poseIdx,setPoseIdx]=useState(0),[duration,setDuration]=useState(7),[timeLeft,setTimeLeft]=useState(7);
  const [phase,setPhase]=useState<'ready'|'active'|'confirm'>('ready'),[paused,setPaused]=useState(false),[confirmed,setConfirmed]=useState(false);
  const [records,setRecords]=useState<{performed:boolean;duration:number;seated:boolean}[]>([]);const finishedRef=useRef(false);const current=POSES[poseIdx];
  useEffect(()=>{const hide=()=>{if(document.hidden)setPaused(true);};document.addEventListener('visibilitychange',hide);return()=>document.removeEventListener('visibilitychange',hide);},[]);
  useEffect(()=>{if(phase!=='active'||paused||classroomPaused)return;const timer=setInterval(()=>{if(!document.hidden)setTimeLeft(t=>Math.max(0,t-1));},1000);return()=>clearInterval(timer);},[phase,paused,classroomPaused]);
  useEffect(()=>{if(phase==='active'&&timeLeft===0){setPhase('confirm');sfxCoin();}},[phase,timeLeft]);
  const next=(performed:boolean)=>{if(finishedRef.current)return;const values=[...records,{performed,duration,seated}];if(poseIdx<POSES.length-1){setRecords(values);setPoseIdx(n=>n+1);setConfirmed(false);setPhase('ready');return;}finishedRef.current=true;sfxSuccess();enqueueAction({id:crypto.randomUUID(),type:'INCREMENT_SCORE',payload:{id:groupId,amount:values.some(v=>v.performed)?100:0,details:{completion:stretchCompletion(values.map(v=>v.performed)),participation:values.some(v=>v.performed)?'performed':'rested',criteria:POSES.map(p=>p.name),metrics:{'수행 확인':values.map((v,i)=>POSES[i].name+': '+(v.performed?'직접 참여 확인':'쉬거나 건너뜀')+(v.seated?' · 앉은 자세':' · 기본 자세')).join(' / '),'기록 기준':'시간 경과로 수행을 판정하지 않아요. 직접 확인한 참여 기록이에요.','선택 시간':values.map((v,i)=>`${POSES[i].name} ${v.duration}초 안내`).join(' / ')} }},timestamp:Date.now()});};
  return <section className="movement-quest" aria-label="스트레칭 타이머"><header><p>준비·정리 도구 · 직접 참여 확인</p><h1>스트레칭 타이머</h1><p>{poseIdx+1} / {POSES.length} · {current.name}</p></header><PoseIllustration poseId={current.id} seated={seated}/><p>{seated?'앉은 채 손과 팔로 이 동작의 방향을 작고 편안하게 표현해요. 발은 바닥에 두어요.':current.desc}</p><p>서거나 앉아서 편한 범위로 작게 해요. 억지로 늘리거나 참지 않고 불편하면 멈춰요.</p>
  {phase==='ready'&&<><label><input type="checkbox" checked={seated} onChange={e=>setSeated(e.target.checked)}/>앉은 팔·손 동작으로 참여하기</label><label>내가 고르는 안내 시간<select value={duration} onChange={e=>setDuration(Number(e.target.value))}>{[7,12,20].map(n=><option key={n} value={n}>{n}초</option>)}</select></label><p>선택 시간은 화면 안내 시간이며 운동 처방이나 수행 기준이 아니에요.</p><button onClick={()=>{setTimeLeft(duration);setPaused(false);setPhase('active');}}>내 속도로 스트레칭 시작</button></>}
  {phase==='active'&&<><strong className="text-5xl">{timeLeft}초</strong><p role="status">{paused?'멈췄어요. 준비되면 이어가요.':'자기 속도로 동작을 살펴요.'}</p><button onClick={()=>setPaused(v=>!v)}>{paused?'이어서 하기':'잠깐 쉬기'}</button><button onClick={()=>setPhase('confirm')}>안내를 멈추고 수행 확인</button></>}
  {phase==='confirm'&&<><button onClick={()=>{setConfirmed(false);setTimeLeft(duration);setPhase('ready');}}>현재 동작 다시 해보기</button><p>{timeLeft===0?'선택한 안내 시간이 끝났어요.':'안내를 직접 멈췄어요.'} 실제 참여 여부를 직접 확인해요.</p><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>편한 범위에서 이 동작을 해 보았어요.</label><button disabled={!confirmed} onClick={()=>next(true)}>{poseIdx===2?'참여 확인하고 마치기':'참여 확인하고 다음 동작'}</button><button onClick={()=>next(false)}>쉬었어요 · {poseIdx===2?'마치기':'다음 동작'}</button></>}
  </section>;
};
