import {useCallback,useEffect,useId,useRef,useState} from 'react';
import type {Html5Qrcode} from 'html5-qrcode';
type ScanRun={scanner:Html5Qrcode;host:HTMLElement;opening:Promise<unknown>|null};
async function releaseScanner(run:ScanRun|null){
 if(!run)return;
 try{await run.opening;}catch{/* permission rejected */}
 const video=run.host.querySelector('video');
 // html5-qrcode resolves start before its unhandled video.play promise settles.
 // Removing that surface immediately aborts playback. Wait for this owned
 // surface to start (or fail) before closing it; never stop a newer scanner.
 if(video?.srcObject&&!video.paused&&video.readyState<2)await new Promise<void>(resolve=>{
  const done=()=>{clearTimeout(timer);video.removeEventListener('playing',done);video.removeEventListener('error',done);resolve();};
  const timer=setTimeout(done,1500);video.addEventListener('playing',done,{once:true});video.addEventListener('error',done,{once:true});
 });
 try{await run.scanner.stop();}catch{const stream=video?.srcObject;if(stream instanceof MediaStream)stream.getTracks().forEach(track=>track.stop());}
}
export function StationScanner({onCode,disabled=false}:{onCode:(token:string)=>void;disabled?:boolean}){
 const id='station-'+useId().replace(/:/g,''),scanner=useRef<ScanRun|null>(null),active=useRef(false),generation=useRef(0),closings=useRef(0);
 const [running,setRunning]=useState(false),[closing,setClosing]=useState(false),[error,setError]=useState('');
 const stop=useCallback(async()=>{generation.current++;const run=scanner.current;scanner.current=null;if(run)closings.current++;if(active.current){setRunning(false);setClosing(closings.current>0);}await releaseScanner(run);if(run)closings.current--;if(active.current)setClosing(closings.current>0);},[]);
 useEffect(()=>{active.current=true;const hide=()=>{if(document.hidden)void stop();};const leave=()=>void stop();document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',leave);return()=>{active.current=false;document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',leave);void stop();};},[stop]);
 useEffect(()=>{if(disabled)void stop();},[disabled,stop]);
 const start=async()=>{
  if(running||closing||disabled)return;setError('');setRunning(true);const epoch=++generation.current;let owned:ScanRun|null=null;
  try{
   const {Html5Qrcode:Scanner}=await import('html5-qrcode');if(!active.current||generation.current!==epoch)return;
   const host=document.getElementById(id);if(!host)throw Error('Missing scan surface');
   const s=new Scanner(id,{verbose:false});owned={scanner:s,host,opening:null};scanner.current=owned;
   owned.opening=s.start({facingMode:'environment'},{fps:8,qrbox:(width,height)=>{const side=Math.max(80,Math.min(180,width-30,height-30));return {width:side,height:side};}},text=>{
    if(!active.current||generation.current!==epoch)return;const match=/^physical-expedition:[a-f0-9-]{36}:([a-f0-9]{24})$/.exec(text);
    if(match){onCode(match[1]);void stop();}else setError('이 수업의 탐사 지점 QR을 사용해 주세요.');
   },()=>{});
   await owned.opening;
  }catch{
   if(scanner.current===owned){scanner.current=null;await releaseScanner(owned);}
   if(active.current&&generation.current===epoch){setRunning(false);setError('카메라를 열지 못했어요. 카메라를 쓰는 다른 앱·사이트 권한을 확인하거나 아래에 지점 코드를 직접 입력해 주세요.');}
  }
 };
 return <div><button disabled={disabled||running||closing} onClick={()=>void start()}>탐사 지점 QR 읽기</button>{running&&<button onClick={()=>void stop()}>스캔 중지</button>}{closing&&<p role="status">카메라 종료를 기다려요. 열려 있는 브라우저 권한 창에 응답해 주세요. 지점 코드는 직접 입력할 수 있어요.</p>}<div id={id} className="flagship-scanner"/>{error&&<p role="status">{error}</p>}</div>;
}
