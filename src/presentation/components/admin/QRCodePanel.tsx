import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { supabase } from '../../../data/supabase';
import type { GameRoom, RoomGroup } from '../../../domain/types';
import { joinAddress } from '../../../application/joinAddress';
import './QRCodePanel.css';

interface Props {
  currentRoom: GameRoom; roomGroups: RoomGroup[]; appUrl?: string;
  /** 수업방을 막 만든 뒤처럼, 열리자마자 학생 입장 화면을 크게 띄운다(전체화면 권한 없이 화면을 덮는다). */
  autoPresent?: boolean;
  /** 크게 보여 주는 화면 안에 '수업 시작' 단추를 함께 둔다. */
  onStart?: () => void; startLabel?: string; startDisabled?: boolean;
}
interface JoinCard { group_name:string; code:string; short_pin:string; image:string }
interface RosterMember { group_id:string; student_number:number; nickname:string }

export const QRCodePanel = ({currentRoom,roomGroups,appUrl,autoPresent=false,onStart,startLabel='수업 시작',startDisabled=false}:Props) => {
  const [deviceCodes,setDeviceCodes]=useState<{board_code:string;recovery_code:string}|null>(null);
  const [cards,setCards]=useState<JoinCard[]>([]);
  const [roster,setRoster]=useState<RosterMember[]>([]);
  const [error,setError]=useState('');
  const [rosterError,setRosterError]=useState('');
  const [isFullscreen,setIsFullscreen]=useState(false);
  // 전체화면 권한이 없거나(자동으로 열 때) 거절돼도 화면을 덮어 크게 보여 준다.
  const [isOverlay,setIsOverlay]=useState(autoPresent);
  const presenting=isFullscreen||isOverlay;
  const [showRoster,setShowRoster]=useState(false);
  const [releasing,setReleasing]=useState(false);
  const presentationRef=useRef<HTMLDivElement>(null);
  const roomIdRef=useRef(currentRoom.id);
  useEffect(()=>{roomIdRef.current=currentRoom.id;},[currentRoom.id]);

  const refreshRoster=useCallback(async()=>{
    const requestedRoom=currentRoom.id;
    const {data,error:readError}=await supabase.rpc('get_classroom_roster',{room_uuid:requestedRoom});
    if(roomIdRef.current!==requestedRoom)return;
    if(readError || !Array.isArray(data)) {
      setRosterError('입장 명단을 갱신하지 못했습니다. 연결과 교사 권한을 확인해주세요.');
      return;
    }
    setRoster(data.filter((member): member is RosterMember =>
      member && typeof member.group_id==='string' && Number.isInteger(member.student_number)
      && member.student_number>=1 && member.student_number<=99
      && typeof member.nickname==='string' && member.nickname.trim().length>=2 && member.nickname.length<=12));
    setRosterError('');
  },[currentRoom.id]);

  useEffect(()=>{
    let active=true;
    setCards([]);setDeviceCodes(null);setRoster([]);setError('');setRosterError('');setShowRoster(false);
    void (async()=>{
      const [invites,codes]=await Promise.all([
        supabase.rpc('get_classroom_invites',{room_uuid:currentRoom.id}),
        supabase.rpc('get_classroom_device_codes',{room_uuid:currentRoom.id}),
      ]);
      if(codes.error) throw new Error('교사 기기 코드 발급 실패');
      if(invites.error || !Array.isArray(invites.data)) throw new Error('모둠 참여 정보를 불러오지 못했습니다. 교사 권한을 확인하세요.');
      const items=await Promise.all((invites.data as Omit<JoinCard,'image'>[]).map(async item=>{
        const url=new URL('/join',appUrl||window.location.origin);
        url.searchParams.set('room',currentRoom.id);
        url.searchParams.set('group',item.group_name);
        url.hash=new URLSearchParams({code:item.code}).toString();
        return {...item,image:await QRCode.toDataURL(url.toString(),{width:480,margin:2})};
      }));
      if(active){setDeviceCodes(codes.data);setCards(items);}
    })().catch(cause=>{if(active)setError(cause instanceof Error?cause.message:'QR 생성 실패');});
    return()=>{active=false;};
  },[currentRoom.id,appUrl]);

  useEffect(()=>{
    let active=true;
    const load=()=>{if(active && document.visibilityState!=='hidden')void refreshRoster();};
    load();
    const timer=window.setInterval(load,5000);
    document.addEventListener('visibilitychange',load);
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',load);};
  },[refreshRoster]);

  useEffect(()=>{
    const update=()=>setIsFullscreen(document.fullscreenElement===presentationRef.current);
    document.addEventListener('fullscreenchange',update);
    return()=>document.removeEventListener('fullscreenchange',update);
  },[]);

  const enterFullscreen=async()=>{
    setShowRoster(false);
    try {await presentationRef.current?.requestFullscreen();setIsOverlay(false);}
    catch {setIsOverlay(true);}
  };
  const leaveFullscreen=async()=>{
    setIsOverlay(false);
    if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
  };
  useEffect(()=>{
    if(!isOverlay)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape')setIsOverlay(false);};
    window.addEventListener('keydown',close);
    // 덮은 화면 뒤의 본문이 함께 스크롤되지 않게 한다.
    const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    return()=>{window.removeEventListener('keydown',close);document.body.style.overflow=previousOverflow;};
  },[isOverlay]);
  const hasCards=cards.length>0;
  useEffect(()=>{
    if(!isOverlay||!hasCards)return;
    // 화면 이동 직후 본문으로 옮겨 가는 초점보다 늦게, 크게 띄운 화면의 첫 단추로 초점을 옮긴다.
    const focusTimer=window.setTimeout(()=>presentationRef.current?.querySelector<HTMLButtonElement>('.classroom-presentation-start:not(:disabled),.classroom-presentation-actions button')?.focus({preventScroll:true}),120);
    return()=>window.clearTimeout(focusTimer);
  },[isOverlay,hasCards]);
  const address=joinAddress(appUrl||window.location.origin);
  const size=cards.length<=1?'one':cards.length===2?'few':cards.length<=4?'some':'many';
  const releaseNumber=async(number:number)=>{
    if(releasing || !window.confirm(`${number}번의 기존 기기 참여 권한을 종료할까요? 새 기기에서 모둠 PIN 또는 QR로 다시 입장할 수 있습니다.`))return;
    setReleasing(true);setRosterError('');
    try {
      const {data, error:releaseError}=await supabase.rpc('release_classroom_number',{room_uuid:currentRoom.id,number_value:number});
      if(releaseError || !data)throw new Error('번호를 비우지 못했습니다. 교사 권한을 확인해주세요.');
      await refreshRoster();
    } catch(cause){setRosterError(cause instanceof Error?cause.message:'번호 해제 실패');}
    finally{setReleasing(false);}
  };

  return <section className="classroom-qr-panel bg-cyan-50 border border-cyan-200 rounded-xl p-4">
    <div className="flex flex-wrap items-center justify-between gap-3 mb-3 print:hidden">
      <div><h2 className="font-bold text-lg">모둠별 입장 PIN · QR</h2><p className="text-sm">학생에게 자기 모둠의 4자리 PIN 또는 QR을 보여주세요.</p></div>
      <div className="classroom-qr-toolbar flex gap-2"><button type="button" onClick={()=>void enterFullscreen()} className="border rounded-lg p-3 bg-white font-bold">크게 보여 주기</button><button type="button" onClick={()=>window.print()} className="border rounded-lg p-3 bg-white">인쇄하기</button></div>
    </div>
    {error&&<p role="alert" className="text-red-700">{error}</p>}
    <div ref={presentationRef} className={`classroom-presentation${presenting?' is-presenting':''}${isOverlay?' is-overlay':''}`} data-size={size} aria-label="학생 입장 발표 화면" role={isOverlay?'dialog':undefined} aria-modal={isOverlay||undefined}>
      <header className="classroom-presentation-head">
        <div><p className="text-sm font-bold">땀방울 원정대 · 학생 참여</p><h2>{currentRoom.name}</h2><p className="classroom-presentation-guide">휴대폰으로 우리 모둠 QR을 찍어요.</p><p className="classroom-presentation-guide is-sub">또는 주소에 들어가 비밀번호를 눌러요: <strong className="classroom-join-address">{address}</strong></p></div>
        <div className="classroom-presentation-actions"><strong className="classroom-total-count" aria-live="polite">입장 완료 {roster.length}명</strong><button type="button" onClick={()=>setShowRoster(value=>!value)} aria-expanded={showRoster}>{showRoster?'명단 접기':'명단 보기'}</button>{onStart&&<button type="button" className="classroom-presentation-start" disabled={startDisabled} onClick={onStart}>▶ {startLabel}</button>}{presenting&&<button type="button" onClick={()=>void leaveFullscreen()}>크게 보기 닫기</button>}</div>
      </header>
      {rosterError&&<p role="alert" className="text-red-700 p-3">{rosterError}</p>}
      <div className="classroom-qr-grid">{cards.map(card=>{
        const groupId=roomGroups.find(group=>group.group_name===card.group_name)?.id;
        const members=roster.filter(member=>member.group_id===groupId);
        return <article key={card.group_name} className="classroom-qr-card">
          <h3>{card.group_name}</h3>
          <strong className="classroom-group-count">입장 {members.length}명</strong>
          <p className="classroom-group-pin" aria-label={card.group_name+' 입장 PIN '+card.short_pin}>{card.short_pin||'발급 중'}</p>
          <img src={card.image} alt={card.group_name+' 입장 QR'}/>
          {showRoster&&<div className="classroom-roster" aria-label={card.group_name+' 입장 명단'}>{members.length ? <ul>{members.map(member=><li key={member.student_number}><span>{member.student_number}번 {member.nickname}</span><button type="button" disabled={releasing} onClick={()=>void releaseNumber(member.student_number)}>번호 해제</button></li>)}</ul> : <p>아직 입장한 학생이 없어요.</p>}</div>}
        </article>;
      })}</div>
    </div>
    {deviceCodes&&<div className="mt-4 text-sm print:hidden"><p>전광판 전용 코드 (읽기만 허용): <code>{deviceCodes.board_code}</code></p><details className="mt-3 rounded-xl bg-white border p-3"><summary className="font-bold cursor-pointer">교사 전용 복구 정보 · 학생에게 공유 금지</summary><p>수업 복구 PIN: <code>{currentRoom.pin_code}</code></p><p>복구키는 기기를 바꾸기 전에 따로 보관하세요.</p><code>{deviceCodes.recovery_code}</code></details></div>}
  </section>;
};
