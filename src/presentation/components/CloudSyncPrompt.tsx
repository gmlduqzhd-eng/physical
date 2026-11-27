import {useState} from 'react';
import {dismissPrompt,keepThisDevice,useSyncPrompt} from '../../application/cloudAutoSync';
import {applyBackup,loadFromAccount} from '../../application/classCloudStore';
import {backupSummary} from '../../domain/classBackup';
import './ClassSwitcher.css';

const when=(at:string|null)=>at?new Date(at).toLocaleString('ko-KR'):'';

/** 계정 자동 보관이 멈춘 이유를 묻는 한 줄: 다른 기기에서 더 최근에 올렸거나, 이 기기가 비어 있을 때. */
export function CloudSyncPrompt(){
 const prompt=useSyncPrompt();
 const [busy,setBusy]=useState(false),[note,setNote]=useState('');
 const [preview,setPreview]=useState<string|null>(null);
 if(!prompt)return note?<p className="class-switcher-note" role="status" data-cloud-sync-note>{note}</p>:null;
 const takeAccount=async()=>{
  setBusy(true);const r=await loadFromAccount();
  if(r.status==='found'){
   if(!preview){setPreview(backupSummary(r.parsed));setBusy(false);return;}
   setNote(applyBackup(r.parsed)?'계정의 기록을 이 기기로 가져왔어요.':'이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.');
   dismissPrompt();
  }else setNote('지금은 계정에서 가져올 수 없어요. 잠시 뒤 다시 해 보세요.');
  setBusy(false);setPreview(null);
 };
 const keep=async()=>{setBusy(true);setNote(await keepThisDevice()?'이 기기의 기록을 계정에 올렸어요.':'지금은 계정에 올릴 수 없어요. 잠시 뒤 다시 해 보세요.');setBusy(false);};
 const conflict=prompt.kind==='conflict';
 return <div className="class-switcher-confirm" role="alert" data-cloud-sync-prompt={prompt.kind}>
  <p>{conflict
   ?`다른 기기에서 ${when(prompt.serverAt)}에 계정에 올린 기록이 이 기기 기록과 달라요. 어느 쪽을 남길까요? 정할 때까지 자동 보관은 멈춰 있어요.`
   :`선생님 계정에 ${when(prompt.serverAt)}에 올린 기록이 있어요. 이 기기로 가져올까요?`}</p>
  {preview&&<p className="class-switcher-note">계정의 기록 · {preview}{conflict?' — 가져오면 이 기기의 지금 기록은 덮어써요.':''}</p>}
  <button type="button" className="primary" onClick={()=>{void takeAccount();}} disabled={busy} data-cloud-sync-load>{preview?'네, 가져와요':'☁ 계정 기록 가져오기'}</button>
  {conflict&&<button type="button" onClick={()=>{void keep();}} disabled={busy} data-cloud-sync-keep>이 기기 기록으로 계정 덮어쓰기</button>}
  <button type="button" onClick={()=>{setPreview(null);dismissPrompt();}} disabled={busy} data-cloud-sync-later>나중에</button>
 </div>;
}
