import {useEffect,useRef,useState} from 'react';
import type {FunCommandBus} from '../../../application/funCommandBus';
import {createTvTransport,forgetTvKeys,formatConfirmCode,generateRoomCode,isValidRoomCode,loadTvKeys,MAX_REMOTES,normalizeRoomCode,openRemoteChannel,remoteConfigured,remotePin,remoteUrl,type RemoteDevice,type RemoteStatus,type TvRemoteControls} from '../../../application/funRemote';
import {LocalQRCode} from '../LocalQRCode';
import './RemoteLink.css';

const STATUS_TEXT:Record<RemoteStatus,string>={idle:'연결 전',connecting:'연결하는 중…',connected:'휴대폰을 기다려요',unavailable:'이 기기에서는 리모컨을 쓸 수 없어요',error:'연결이 끊겼어요 · TV 버튼으로 계속할 수 있어요'};
/** 새 요청이 와도 패널을 다시 여는 것은 이 간격에 한 번까지(요청이 쏟아져도 게임 화면을 계속 가리지 않게). */
const AUTO_OPEN_GAP_MS=5_000;
/** 쓰고 있는 방 코드의 기한을 이 간격마다 늘린다(2시간 넘게 써도 새로고침에 끊기지 않게). */
const ROOM_TOUCH_MS=10*60*1000;

/** 허용한 휴대폰(공개키 지문)을 방 코드와 함께 이 탭에 기억한다(새로고침해도 같은 코드면 다시 묻지 않게). */
const approvedKey=(code:string)=>`fun-remote:approved:${code}`;
const readApproved=(code:string):string[]=>{
 try{
  const v=JSON.parse(sessionStorage.getItem(approvedKey(code))??'[]') as unknown;
  return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&/^[A-F0-9]{16}$/.test(x)).slice(0,MAX_REMOTES):[];
 }catch{return [];}
};
const writeApproved=(code:string,ids:string[])=>{
 try{if(ids.length)sessionStorage.setItem(approvedKey(code),JSON.stringify(ids));else sessionStorage.removeItem(approvedKey(code));}catch{/* 저장 못 해도 동작은 그대로 */}
};

/**
 * TV 화면의 '📱 휴대폰 리모컨' 버튼. 처음 열 때 방 코드와 TV 키를 만들고 명령 버스에 원격 전송을 붙인다.
 * 방 코드는 화면에 크게 보이므로, 휴대폰이 연결을 요청하면 선생님이 확인 번호를 맞춰 보고 '허용'을 한 번 눌러야 조작할 수 있다(최대 2대).
 * 휴대폰·TV가 주고받는 메시지는 모두 서명된다(방 코드를 알아도 허용된 휴대폰을 흉내 낼 수 없다).
 * '모두 끊기'는 연결된 휴대폰을 모두 내보내고 새 방 코드(새 TV 키)를 만든다.
 * 연결이 안 되거나 끊겨도 TV 버튼·키보드는 그대로 쓴다.
 *
 * initialCode: 게임 화면이 기억해 둔 방 코드(새로고침 뒤 같은 코드로 다시 열기). 있으면 화면이 뜨자마자 다시 연결하고,
 *   그 코드로 전에 허용한 휴대폰은 다시 묻지 않는다.
 * onCodeChange: 방 코드를 새로 만들거나 바꿀 때 알린다(게임 화면이 기억하도록).
 */
export function RemoteLink({bus,initialCode,onCodeChange}:{bus:FunCommandBus;initialCode?:string;onCodeChange?:(code:string)=>void}){
 const [open,setOpen]=useState(false);
 const [code,setCode]=useState('');
 const [tvCode,setTvCode]=useState('');
 const [pin,setPin]=useState('');
 const [status,setStatus]=useState<RemoteStatus>('idle');
 const [devices,setDevices]=useState<RemoteDevice[]>([]);
 const detach=useRef<(()=>void)|null>(null);
 const controls=useRef<TvRemoteControls|null>(null);
 const seenPending=useRef(new Set<string>());
 const codeRef=useRef('');
 const autoOpenedAt=useRef(-Infinity);
 /** 선생님이 요청이 있는 패널을 한 번 닫으면, 이 화면에서는 더 이상 저절로 열지 않는다(배지로만 알린다). */
 const autoOpenOff=useRef(false);
 const attempt=useRef(0);
 const connect=(reuse?:string)=>{
  const keep=reuse?normalizeRoomCode(reuse):'';
  let room:string;
  if(isValidRoomCode(keep))room=keep;
  else{try{room=generateRoomCode();}catch{setStatus('unavailable');return;}}
  const channel=openRemoteChannel(room);
  const mine=++attempt.current;
  codeRef.current=room;setCode(room);setDevices([]);setTvCode('');setPin('');seenPending.current.clear();
  // 새 코드는 저장하고, 다시 쓰는 코드는 기한을 늘린다(같은 알림으로 게임 화면이 저장한다).
  onCodeChange?.(room);
  if(!channel){setStatus('unavailable');return;}
  setStatus('connecting');
  // TV 키(방 코드마다 하나, 이 탭에 기억)를 준비한 뒤에 붙는다. 그 사이 새 코드로 바뀌었으면 버린다.
  void loadTvKeys(room).then(keys=>{
   if(mine!==attempt.current)return;
   const transport=createTvTransport(channel,{
    room,keys,
    onStatus:setStatus,
    preapproved:room===keep?readApproved(room):[],
    onDevices:list=>{
     setDevices(list);
     writeApproved(room,list.filter(d=>d.state==='approved').map(d=>d.device));
     // 새 연결 요청이 오면 패널을 열어 '허용'을 바로 누를 수 있게 한다(너무 자주 열지 않고, 닫은 직후에는 열지 않는다).
     const fresh=list.some(d=>d.state==='pending'&&!seenPending.current.has(d.device));
     const t=Date.now();
     if(fresh&&!autoOpenOff.current&&t-autoOpenedAt.current>AUTO_OPEN_GAP_MS){autoOpenedAt.current=t;setOpen(true);}
     for(const d of list)seenPending.current.add(d.device);
    },
   });
   controls.current=transport;setTvCode(transport.code);
   // QR 주소에 TV 키 전체 지문을 넣는다: 휴대폰은 이 TV의 메시지만 믿는다(먼저 끼어든 가짜 TV에 붙지 않는다).
   void remotePin(keys.pub).then(p=>{if(mine===attempt.current)setPin(p);}).catch(()=>{});
   detach.current=bus.attach(transport);
  }).catch(()=>{if(mine===attempt.current)setStatus('unavailable');});
 };
 const connectRef=useRef(connect);
 connectRef.current=connect;
 useEffect(()=>()=>{attempt.current++;detach.current?.();detach.current=null;controls.current=null;},[]);
 const codeChangeRef=useRef(onCodeChange);
 codeChangeRef.current=onCodeChange;
 useEffect(()=>{if(!code)return;const id=window.setInterval(()=>codeChangeRef.current?.(code),ROOM_TOUCH_MS);return ()=>window.clearInterval(id);},[code]);
 // 새로고침 뒤 같은 방 코드로 돌아오면, 패널을 열지 않아도 바로 다시 연결해 휴대폰이 이어지게 한다(처음 한 번만).
 const initialRef=useRef(initialCode);
 useEffect(()=>{const first=initialRef.current;if(first&&isValidRoomCode(normalizeRoomCode(first))&&!detach.current)connectRef.current(first);},[]);
 // 페이지를 닫거나 새로고침할 때 휴대폰에 '잠시 끊김'을 알리고, 뒤로 가기 캐시로 돌아오면 되살린다.
 // TV 탭이 가려지면(다른 창) 휴대폰에 알리고, 다시 보이면 바로 살아 있음 신호를 보낸다.
 useEffect(()=>{
  const bye=()=>controls.current?.notifyReload();
  const back=(e:PageTransitionEvent)=>{if(e.persisted)controls.current?.resumeAfterReload();};
  const vis=()=>controls.current?.setHidden(document.visibilityState==='hidden');
  window.addEventListener('pagehide',bye);window.addEventListener('pageshow',back);document.addEventListener('visibilitychange',vis);
  return ()=>{window.removeEventListener('pagehide',bye);window.removeEventListener('pageshow',back);document.removeEventListener('visibilitychange',vis);};
 },[]);
 const start=()=>{setOpen(true);if(!detach.current&&!codeRef.current)connect(initialCode);};
 const close=()=>{setOpen(false);if(devices.some(d=>d.state==='pending'))autoOpenOff.current=true;};
 const rotate=()=>{
  if(codeRef.current){writeApproved(codeRef.current,[]);forgetTvKeys(codeRef.current);}
  controls.current?.disconnectAll('rotated');
  detach.current?.();detach.current=null;controls.current=null;
  connect();
 };
 const approved=devices.filter(d=>d.state==='approved');
 const pending=devices.filter(d=>d.state==='pending');
 const full=approved.length>=MAX_REMOTES;
 // 같은 확인 번호를 가진 요청이 둘 이상이면(가짜 휴대폰 의심) 어느 쪽도 허용하지 못하게 한다.
 const twins=new Set(pending.filter(d=>pending.filter(x=>x.name===d.name).length>1).map(d=>d.name));
 const url=code&&pin?remoteUrl(window.location.origin,code,pin):'';
 const label=approved.length?`📱 리모컨 ${approved.length}대 연결됨`:'📱 휴대폰 리모컨';
 return <>
  <button type="button" className="fun-remote-btn" aria-expanded={open} data-linked={approved.length>0||undefined} data-pending={pending.length>0||undefined} onClick={()=>open?close():start()}>
   {label}{pending.length>0&&<span className="fun-remote-badge" aria-label={`허용 기다리는 휴대폰 ${pending.length}대`}>{pending.length}</span>}
  </button>
  {open&&<div className="fun-remote-panel" role="dialog" aria-label="휴대폰 리모컨 연결">
   <h2>📱 휴대폰으로 진행하기</h2>
   {pending.length>0&&<section className="fun-remote-requests" aria-label="연결 요청">
    {pending.map(d=><div key={d.device} className="fun-remote-request" data-twin={twins.has(d.name)||undefined}>
     <p>휴대폰이 연결하려고 해요. 휴대폰 화면의 확인 번호가 <b className="fun-remote-pin">{formatConfirmCode(d.name)}</b> 인가요?</p>
     <div className="fun-remote-request-actions">
      <button type="button" className="fun-primary" disabled={full||twins.has(d.name)} onClick={()=>controls.current?.approve(d.device)}>✅ {formatConfirmCode(d.name)} 휴대폰 허용</button>
      <button type="button" className="fun-secondary" onClick={()=>controls.current?.reject(d.device)}>거절</button>
     </div>
    </div>)}
    {twins.size>0&&<p className="fun-remote-warn" role="alert">⚠️ 같은 확인 번호의 요청이 여러 개예요. 다른 기기가 선생님 휴대폰인 척하고 있을 수 있어요. 모두 거절하고 ‘모두 끊기 · 새 코드 만들기’를 눌러요.</p>}
    {full&&<p className="fun-note">휴대폰은 {MAX_REMOTES}대까지 연결할 수 있어요. 한 대를 끊고 허용해요.</p>}
    <p className="fun-note">번호가 다르면 거절해요. 선생님 휴대폰만 허용해요.</p>
   </section>}
   {code?<>
    <p>휴대폰 카메라로 QR을 찍거나 주소를 열어요. 연결 요청이 오면 휴대폰의 확인 번호를 보고 ‘허용’을 눌러요.</p>
    <div className="fun-remote-qr">{url&&<LocalQRCode value={url} alt={`리모컨 주소 QR, 방 코드 ${code}`} size={180}/>}</div>
    <p className="fun-remote-code" aria-label={`방 코드 ${code.split('').join(' ')}`}>{code}</p>
    {url&&<p className="fun-remote-url"><a href={url} target="_blank" rel="noreferrer">🔗 리모컨 주소(QR과 같아요)</a></p>}
    <p className="fun-note">QR로 연결하는 것이 가장 안전해요. 코드만 넣어 연결하면 휴대폰에 뜨는 TV 확인 번호를 아래 번호와 맞춰 봐요.</p>
    {tvCode&&<p className="fun-remote-tvcode">TV 확인 번호 <b>{formatConfirmCode(tvCode)}</b></p>}
   </>:null}
   <p role="status" className="fun-remote-status" data-status={status}>{approved.length?`✅ 연결된 휴대폰 ${approved.length}/${MAX_REMOTES}대`:STATUS_TEXT[status]}</p>
   {approved.length>0&&<ul className="fun-remote-devices" aria-label="연결된 휴대폰">
    {approved.map(d=><li key={d.device}><span aria-hidden="true">📱</span>{formatConfirmCode(d.name)} 연결됨 <button type="button" className="fun-link" onClick={()=>controls.current?.reject(d.device)}>끊기</button></li>)}
   </ul>}
   {!remoteConfigured()&&<p className="fun-note">이 사이트는 실시간 연결이 설정되지 않아, 같은 기기의 다른 창에서만 리모컨이 동작해요.</p>}
   {code&&<button type="button" className="fun-secondary" onClick={rotate}>모두 끊기 · 새 코드 만들기</button>}
   <button type="button" className="fun-secondary" onClick={close}>닫기 · 게임으로</button>
  </div>}
 </>;
}
