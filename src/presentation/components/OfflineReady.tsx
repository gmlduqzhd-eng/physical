import {useEffect,useState} from 'react';
import {offlineStatus,prepareOffline,type OfflineProgress,type OfflineStatus} from '../../application/offlineReady';
import './ClassSwitcher.css';

type View=OfflineStatus|'checking'|'working'|'failed';

/** 체육관처럼 와이파이가 없는 곳에 가기 전에 누르는 한 줄. 모든 화면을 이 기기에 받아 둔다. */
export function OfflineReady({compact=false}:{compact?:boolean}){
 const [view,setView]=useState<View>('checking');
 const [progress,setProgress]=useState<OfflineProgress>({done:0,total:0});
 useEffect(()=>{let alive=true;void offlineStatus().then(s=>{if(alive)setView(s);});return()=>{alive=false;};},[]);
 if(view==='checking'||view==='unsupported')return null;
 const start=async()=>{
  setView('working');setProgress({done:0,total:0});
  const r=await prepareOffline(setProgress);
  setView(r.failed?'failed':'ready');
 };
 if(view==='ready')return <p className={`offline-ready${compact?' offline-compact':''}`} role="status" data-offline-ready="ready">📶 인터넷 없이 쓸 준비가 되어 있어요. 체육관에서 와이파이가 끊겨도 모든 화면과 기록이 열려요.</p>;
 return <div className={`class-switcher-confirm offline-ready${compact?' offline-compact':''}`} role="status" data-offline-ready={view}>
  <p>{view==='working'
   ?`화면을 받는 중이에요… ${progress.total?`${progress.done} / ${progress.total}`:''}`
   :view==='failed'
    ?'다 받지 못했어요. 인터넷이 연결된 곳에서 다시 눌러 주세요.'
    :compact?'와이파이가 없는 곳에서 쓰려면 미리 받아 두세요(약 5MB).':'체육관에 와이파이가 없나요? 미리 눌러 두면 인터넷 없이도 모든 화면이 열려요(약 5MB, 한 번만).'}</p>
  <button type="button" className="primary" onClick={()=>void start()} disabled={view==='working'} data-offline-prepare>{view==='failed'?'다시 받기':'📶 인터넷 없이 쓰기 준비'}</button>
 </div>;
}
