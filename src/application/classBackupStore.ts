import {MAX_BACKUP_BYTES,buildBackup,parseBackup} from '../domain/classBackup';
import {classStorageKey} from '../domain/classRoster';
import {CLASS_DATA_KEYS,getRoster,replaceRoster} from './classRosterStore';

const [PROGRESS,JOURNEY]=CLASS_DATA_KEYS;
const readJson=(key:string):unknown=>{try{const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):null;}catch{return null;}};

/** 지금 기기의 모든 반 기록을 보관 파일 글로 만든다. */
export function exportBackupText(now=new Date()):string{
 return JSON.stringify(buildBackup(getRoster(),id=>({progress:readJson(classStorageKey(PROGRESS,id)),journey:readJson(classStorageKey(JOURNEY,id))}),now.toISOString()));
}
export function downloadBackup(now=new Date()){
 const blob=new Blob([exportBackupText(now)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=`땀방울원정대-기록-${now.toISOString().slice(0,10)}.json`;document.body.append(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}
/** 파일 글을 읽어 걸러 낸다. 우리 파일이 아니거나 너무 크면 null. */
export function readBackupText(text:string){
 if(text.length>MAX_BACKUP_BYTES)return null;
 try{return parseBackup(JSON.parse(text));}catch{return null;}
}
/** 보관 파일의 내용으로 이 기기의 반 목록과 기록을 바꾼다(지금 기록은 덮어쓴다). */
export function applyBackup(parsed:NonNullable<ReturnType<typeof readBackupText>>):boolean{
 try{
  // 파일에 없는 반의 기록은 지운다(반 목록과 기록이 어긋나지 않게).
  for(const c of getRoster().classes)if(!parsed.data.has(c.id))[PROGRESS,JOURNEY].forEach(base=>window.localStorage.removeItem(classStorageKey(base,c.id)));
  for(const [id,d] of parsed.data){
   window.localStorage.setItem(classStorageKey(PROGRESS,id),JSON.stringify(d.progress));
   window.localStorage.setItem(classStorageKey(JOURNEY,id),JSON.stringify(d.journey));
  }
 }catch{return false;}
 replaceRoster(parsed.roster);
 return true;
}
