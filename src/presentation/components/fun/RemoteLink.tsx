import {useEffect,useRef,useState} from 'react';
import type {FunCommandBus} from '../../../application/funCommandBus';
import {createTvTransport,generateRoomCode,openRemoteChannel,remoteConfigured,remoteUrl,type RemoteStatus} from '../../../application/funRemote';
import {LocalQRCode} from '../LocalQRCode';

const STATUS_TEXT:Record<RemoteStatus,string>={idle:'연결 전',connecting:'연결하는 중…',connected:'리모컨을 기다려요',unavailable:'이 기기에서는 리모컨을 쓸 수 없어요',error:'연결이 끊겼어요 · TV 버튼으로 계속할 수 있어요'};

/**
 * TV 화면의 '📱 휴대폰 리모컨' 버튼. 처음 열 때 방 코드를 만들고 명령 버스에 원격 전송을 붙인다.
 * 연결이 안 되거나 끊겨도 TV 버튼·키보드는 그대로 쓴다.
 */
export function RemoteLink({bus}:{bus:FunCommandBus}){
 const [open,setOpen]=useState(false);
 const [code,setCode]=useState('');
 const [status,setStatus]=useState<RemoteStatus>('idle');
 const [seenAt,setSeenAt]=useState(0);
 const [now,setNow]=useState(()=>Date.now());
 const detach=useRef<(()=>void)|null>(null);
 useEffect(()=>()=>{detach.current?.();detach.current=null;},[]);
 useEffect(()=>{if(!seenAt)return;const id=window.setInterval(()=>setNow(Date.now()),5000);return ()=>window.clearInterval(id);},[seenAt]);
 const start=()=>{
  setOpen(true);
  if(detach.current)return;
  let room:string;
  try{room=generateRoomCode();}catch{setStatus('unavailable');return;}
  const channel=openRemoteChannel(room);
  setCode(room);
  if(!channel){setStatus('unavailable');return;}
  detach.current=bus.attach(createTvTransport(channel,{onStatus:setStatus,onRemoteSeen:()=>{const t=Date.now();setSeenAt(t);setNow(t);}}));
 };
 const remoteLive=seenAt>0&&now-seenAt<60_000;
 const url=code?remoteUrl(window.location.origin,code):'';
 return <>
  <button type="button" className="fun-remote-btn" aria-expanded={open} data-linked={remoteLive||undefined} onClick={()=>open?setOpen(false):start()}>{remoteLive?'📱 리모컨 연결됨':'📱 휴대폰 리모컨'}</button>
  {open&&<div className="fun-remote-panel" role="dialog" aria-label="휴대폰 리모컨 연결">
   <h2>📱 휴대폰으로 진행하기</h2>
   {code?<>
    <p>휴대폰 카메라로 QR을 찍거나 주소를 열고, 방 코드를 확인해요.</p>
    <div className="fun-remote-qr">{url&&<LocalQRCode value={url} alt={`리모컨 주소 QR, 방 코드 ${code}`} size={180}/>}</div>
    <p className="fun-remote-code" aria-label={`방 코드 ${code.split('').join(' ')}`}>{code}</p>
    <p className="fun-remote-url">{url}</p>
   </>:null}
   <p role="status" className="fun-remote-status" data-status={status}>{remoteLive?'✅ 휴대폰 리모컨이 연결됐어요':STATUS_TEXT[status]}</p>
   {!remoteConfigured()&&<p className="fun-note">이 사이트는 실시간 연결이 설정되지 않아, 같은 기기의 다른 창에서만 리모컨이 동작해요.</p>}
   <button type="button" className="fun-secondary" onClick={()=>setOpen(false)}>닫기 · 게임으로</button>
  </div>}
 </>;
}
