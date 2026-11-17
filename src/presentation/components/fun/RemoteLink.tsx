import {useEffect,useRef,useState} from 'react';
import type {FunCommandBus} from '../../../application/funCommandBus';
import {createTvTransport,generateRoomCode,isValidRoomCode,MAX_REMOTES,normalizeRoomCode,openRemoteChannel,remoteConfigured,remoteUrl,type RemoteDevice,type RemoteStatus,type TvRemoteControls} from '../../../application/funRemote';
import {LocalQRCode} from '../LocalQRCode';
import './RemoteLink.css';

const STATUS_TEXT:Record<RemoteStatus,string>={idle:'연결 전',connecting:'연결하는 중…',connected:'휴대폰을 기다려요',unavailable:'이 기기에서는 리모컨을 쓸 수 없어요',error:'연결이 끊겼어요 · TV 버튼으로 계속할 수 있어요'};

/** 허용한 휴대폰 id를 방 코드와 함께 이 탭에 기억한다(새로고침해도 같은 코드면 다시 묻지 않게). */
const approvedKey=(code:string)=>`fun-remote:approved:${code}`;
const readApproved=(code:string):string[]=>{
 try{
  const v=JSON.parse(sessionStorage.getItem(approvedKey(code))??'[]') as unknown;
  return Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'&&/^[A-Z0-9]{6,24}$/.test(x)).slice(0,MAX_REMOTES):[];
 }catch{return [];}
};
const writeApproved=(code:string,ids:string[])=>{
 try{if(ids.length)sessionStorage.setItem(approvedKey(code),JSON.stringify(ids));else sessionStorage.removeItem(approvedKey(code));}catch{/* 저장 못 해도 동작은 그대로 */}
};

/**
 * TV 화면의 '📱 휴대폰 리모컨' 버튼. 처음 열 때 방 코드를 만들고 명령 버스에 원격 전송을 붙인다.
 * 방 코드는 화면에 크게 보이므로, 휴대폰이 연결을 요청하면 선생님이 '허용'을 한 번 눌러야 조작할 수 있다(최대 2대).
 * '모두 끊기'는 연결된 휴대폰을 모두 내보내고 새 방 코드를 만든다.
 * 연결이 안 되거나 끊겨도 TV 버튼·키보드는 그대로 쓴다.
 *
 * initialCode: 게임 화면이 기억해 둔 방 코드(새로고침 뒤 같은 코드로 다시 열기). 있으면 화면이 뜨자마자 다시 연결하고,
 *   그 코드로 전에 허용한 휴대폰은 다시 묻지 않는다.
 * onCodeChange: 방 코드를 새로 만들거나 바꿀 때 알린다(게임 화면이 기억하도록).
 */
export function RemoteLink({bus,initialCode,onCodeChange}:{bus:FunCommandBus;initialCode?:string;onCodeChange?:(code:string)=>void}){
 const [open,setOpen]=useState(false);
 const [code,setCode]=useState('');
 const [status,setStatus]=useState<RemoteStatus>('idle');
 const [devices,setDevices]=useState<RemoteDevice[]>([]);
 const detach=useRef<(()=>void)|null>(null);
 const controls=useRef<TvRemoteControls|null>(null);
 const seenPending=useRef(new Set<string>());
 const codeRef=useRef('');
 const connect=(reuse?:string)=>{
  const keep=reuse?normalizeRoomCode(reuse):'';
  let room:string;
  if(isValidRoomCode(keep))room=keep;
  else{try{room=generateRoomCode();}catch{setStatus('unavailable');return;}}
  const channel=openRemoteChannel(room);
  codeRef.current=room;setCode(room);setDevices([]);seenPending.current.clear();
  if(room!==keep)onCodeChange?.(room);
  if(!channel){setStatus('unavailable');return;}
  const transport=createTvTransport(channel,{
   onStatus:setStatus,
   preapproved:room===keep?readApproved(room):[],
   onDevices:list=>{
    setDevices(list);
    writeApproved(room,list.filter(d=>d.state==='approved').map(d=>d.device));
    // 새 연결 요청이 오면 패널을 열어 '허용'을 바로 누를 수 있게 한다.
    if(list.some(d=>d.state==='pending'&&!seenPending.current.has(d.device)))setOpen(true);
    for(const d of list)seenPending.current.add(d.device);
   },
  });
  controls.current=transport;
  detach.current=bus.attach(transport);
 };
 const connectRef=useRef(connect);
 connectRef.current=connect;
 useEffect(()=>()=>{detach.current?.();detach.current=null;controls.current=null;},[]);
 // 새로고침 뒤 같은 방 코드로 돌아오면, 패널을 열지 않아도 바로 다시 연결해 휴대폰이 이어지게 한다(처음 한 번만).
 const initialRef=useRef(initialCode);
 useEffect(()=>{const first=initialRef.current;if(first&&isValidRoomCode(normalizeRoomCode(first))&&!detach.current)connectRef.current(first);},[]);
 // 페이지를 닫거나 새로고침할 때 휴대폰에 '잠시 끊김'을 알린다.
 useEffect(()=>{const bye=()=>controls.current?.notifyReload();window.addEventListener('pagehide',bye);return ()=>window.removeEventListener('pagehide',bye);},[]);
 const start=()=>{setOpen(true);if(!detach.current)connect(initialCode);};
 const rotate=()=>{
  if(codeRef.current)writeApproved(codeRef.current,[]);
  controls.current?.disconnectAll('rotated');
  detach.current?.();detach.current=null;controls.current=null;
  connect();
 };
 const approved=devices.filter(d=>d.state==='approved');
 const pending=devices.filter(d=>d.state==='pending');
 const full=approved.length>=MAX_REMOTES;
 const url=code?remoteUrl(window.location.origin,code):'';
 const label=approved.length?`📱 리모컨 ${approved.length}대 연결됨`:'📱 휴대폰 리모컨';
 return <>
  <button type="button" className="fun-remote-btn" aria-expanded={open} data-linked={approved.length>0||undefined} data-pending={pending.length>0||undefined} onClick={()=>open?setOpen(false):start()}>
   {label}{pending.length>0&&<span className="fun-remote-badge" aria-label={`허용 기다리는 휴대폰 ${pending.length}대`}>{pending.length}</span>}
  </button>
  {open&&<div className="fun-remote-panel" role="dialog" aria-label="휴대폰 리모컨 연결">
   <h2>📱 휴대폰으로 진행하기</h2>
   {pending.length>0&&<section className="fun-remote-requests" aria-label="연결 요청">
    {pending.map(d=><div key={d.device} className="fun-remote-request">
     <p><span aria-hidden="true">{d.name}</span> 휴대폰이 연결하려고 해요. 선생님 휴대폰에도 같은 <b>{d.name}</b>가 보이나요?</p>
     <div className="fun-remote-request-actions">
      <button type="button" className="fun-primary" disabled={full} onClick={()=>controls.current?.approve(d.device)}>✅ 이 휴대폰 허용</button>
      <button type="button" className="fun-secondary" onClick={()=>controls.current?.reject(d.device)}>거절</button>
     </div>
    </div>)}
    {full&&<p className="fun-note">휴대폰은 {MAX_REMOTES}대까지 연결할 수 있어요. 한 대를 끊고 허용해요.</p>}
   </section>}
   {code?<>
    <p>휴대폰 카메라로 QR을 찍거나 주소를 열어요. 연결 요청이 오면 TV에서 ‘허용’을 눌러요.</p>
    <div className="fun-remote-qr">{url&&<LocalQRCode value={url} alt={`리모컨 주소 QR, 방 코드 ${code}`} size={180}/>}</div>
    <p className="fun-remote-code" aria-label={`방 코드 ${code.split('').join(' ')}`}>{code}</p>
    <p className="fun-remote-url">{url}</p>
   </>:null}
   <p role="status" className="fun-remote-status" data-status={status}>{approved.length?`✅ 연결된 휴대폰 ${approved.length}/${MAX_REMOTES}대`:STATUS_TEXT[status]}</p>
   {approved.length>0&&<ul className="fun-remote-devices" aria-label="연결된 휴대폰">
    {approved.map(d=><li key={d.device}><span aria-hidden="true">{d.name}</span> 연결됨 <button type="button" className="fun-link" onClick={()=>controls.current?.reject(d.device)}>끊기</button></li>)}
   </ul>}
   {!remoteConfigured()&&<p className="fun-note">이 사이트는 실시간 연결이 설정되지 않아, 같은 기기의 다른 창에서만 리모컨이 동작해요.</p>}
   {code&&<button type="button" className="fun-secondary" onClick={rotate}>모두 끊기 · 새 코드 만들기</button>}
   <button type="button" className="fun-secondary" onClick={()=>setOpen(false)}>닫기 · 게임으로</button>
  </div>}
 </>;
}
