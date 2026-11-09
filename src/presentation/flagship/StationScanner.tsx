import {useCallback,useEffect,useId,useRef,useState} from 'react';
import type {Html5Qrcode} from 'html5-qrcode';
export function StationScanner({onCode,disabled=false}:{onCode:(token:string)=>void;disabled?:boolean}){
 const id='station-'+useId().replace(/:/g,''),scanner=useRef<Html5Qrcode|null>(null),active=useRef(false),generation=useRef(0);
 const [running,setRunning]=useState(false),[error,setError]=useState('');
 const stop=useCallback(async()=>{generation.current++;const s=scanner.current;scanner.current=null;await s?.stop().catch(()=>{});if(active.current)setRunning(false);},[]);
 useEffect(()=>{active.current=true;const hide=()=>{if(document.hidden)void stop();};document.addEventListener('visibilitychange',hide);return()=>{active.current=false;document.removeEventListener('visibilitychange',hide);void stop();};},[stop]);
 useEffect(()=>{if(disabled)void stop();},[disabled,stop]);
 const start=async()=>{setError('');setRunning(true);const epoch=++generation.current;try{const {Html5Qrcode:Scanner}=await import('html5-qrcode');if(!active.current||generation.current!==epoch)return;const s=new Scanner(id,{verbose:false});scanner.current=s;await s.start({facingMode:'environment'},{fps:8,qrbox:180},text=>{const match=/^physical-expedition:[a-f0-9-]{36}:([a-f0-9]{24})$/.exec(text);if(match){onCode(match[1]);void stop();}else setError('이 수업의 탐사 지점 QR을 사용해 주세요.');},()=>{});if(!active.current||generation.current!==epoch)await s.stop().catch(()=>{});}catch{if(active.current&&generation.current===epoch){setRunning(false);setError('카메라를 열지 못했어요. 아래에 지점 코드를 직접 입력할 수 있어요.');}}};
 return <div><button disabled={disabled||running} onClick={()=>void start()}>탐사 지점 QR 읽기</button>{running&&<button onClick={()=>void stop()}>스캔 중지</button>}<div id={id} className="flagship-scanner"/>{error&&<p role="status">{error}</p>}</div>;
}
