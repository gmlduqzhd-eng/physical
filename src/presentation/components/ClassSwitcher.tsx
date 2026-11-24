import {useRef,useState} from 'react';
import {MAX_CLASS_NAME,DEFAULT_CLASS_ID,canAddClass,cleanClassName,currentClass} from '../../domain/classRoster';
import {backupSummary} from '../../domain/classBackup';
import {chooseClass,createClass,deleteClass,renameClassTo,useClassRoster} from '../../application/classRosterStore';
import {applyBackup,downloadBackup,readBackupText} from '../../application/classBackupStore';
import './ClassSwitcher.css';

/**
 * 반 고르기 + 반 관리(추가·이름 바꾸기·지우기) + 기록 파일 보관·가져오기.
 * 기록(👍/👎, 원정 지도)은 고른 반에 쌓인다. 반 이름만 이 기기에 저장하고 학생 정보는 없다.
 */
export function ClassSwitcher({manage=true}:{manage?:boolean}){
 const roster=useClassRoster(),now=currentClass(roster);
 const [open,setOpen]=useState(false),[name,setName]=useState(''),[rename,setRename]=useState(''),[confirmDelete,setConfirmDelete]=useState(false);
 const [pending,setPending]=useState<ReturnType<typeof readBackupText>>(null),[note,setNote]=useState('');
 const file=useRef<HTMLInputElement>(null);
 const add=()=>{if(!cleanClassName(name))return;createClass(name);setName('');setNote('새 반을 만들고 그 반으로 바꿨어요.');};
 const pick=async(input:HTMLInputElement)=>{
  const f=input.files?.[0];input.value='';if(!f)return;
  const parsed=readBackupText(await f.text().catch(()=>''));
  if(!parsed){setPending(null);setNote('땀방울 원정대 기록 파일이 아니에요. ‘기록 파일로 보관’으로 받은 파일을 골라 주세요.');return;}
  setPending(parsed);setNote('');
 };
 // 관리 없이 고르기만 하는 자리(오늘 수업)는 반이 하나뿐이면 보이지 않는다.
 if(!manage&&roster.classes.length<2)return null;
 return <section className="class-switcher" aria-label="반 고르기" data-class-switcher>
  <label className="class-switcher-pick"><span>기록할 반</span>
   <select value={roster.current} onChange={e=>{chooseClass(e.target.value);setConfirmDelete(false);setNote('');}} data-class-select>
    {roster.classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
   </select></label>
  {manage&&<button type="button" className="class-switcher-toggle" aria-expanded={open} onClick={()=>{setOpen(!open);setRename(now.name);setConfirmDelete(false);setPending(null);setNote('');}}>{open?'닫기':'반 관리 · 기록 보관'}</button>}
  {manage&&open&&<div className="class-switcher-panel">
   <div className="class-switcher-row"><label>새 반 이름<input value={name} maxLength={MAX_CLASS_NAME} placeholder="예: 5학년 2반" onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')add();}} data-class-new/></label>
    <button type="button" onClick={add} disabled={!cleanClassName(name)||!canAddClass(roster)} data-class-add>반 추가</button></div>
   {!canAddClass(roster)&&<p className="class-switcher-note">반은 {roster.classes.length}개까지 만들 수 있어요.</p>}
   <div className="class-switcher-row"><label>지금 반 이름 바꾸기<input value={rename} maxLength={MAX_CLASS_NAME} onChange={e=>setRename(e.target.value)} data-class-rename/></label>
    <button type="button" onClick={()=>{renameClassTo(now.id,rename);setNote('반 이름을 바꿨어요.');}} disabled={!cleanClassName(rename)||cleanClassName(rename)===now.name}>이름 바꾸기</button>
    {now.id!==DEFAULT_CLASS_ID&&<button type="button" onClick={()=>setConfirmDelete(true)} data-class-delete>이 반 지우기</button>}</div>
   {confirmDelete&&<div className="class-switcher-confirm" role="alert"><p>‘{now.name}’ 반과 이 반의 기록(반응·원정 지도)을 모두 지울까요? 되돌릴 수 없어요.</p>
    <button type="button" onClick={()=>setConfirmDelete(false)}>그대로 두기</button><button type="button" className="primary" onClick={()=>{deleteClass(now.id);setConfirmDelete(false);setNote('반을 지웠어요.');}} data-class-delete-yes>네, 지워요</button></div>}
   <div className="class-switcher-row class-switcher-backup">
    <button type="button" onClick={()=>{downloadBackup();setNote('모든 반의 기록을 파일로 받았어요. 새 기기에서 ‘기록 파일 가져오기’로 이어 쓸 수 있어요.');}} data-class-backup>⬇ 기록 파일로 보관</button>
    <button type="button" onClick={()=>file.current?.click()} data-class-restore>⬆ 기록 파일 가져오기</button>
    <input ref={file} type="file" accept="application/json,.json" hidden onChange={e=>{void pick(e.currentTarget);}} data-class-file/></div>
   {pending&&<div className="class-switcher-confirm" role="alert"><p>파일의 기록으로 바꿀까요? 이 기기의 지금 기록은 파일 내용으로 덮어써요.</p><p className="class-switcher-note">{backupSummary(pending)}</p>
    <button type="button" onClick={()=>setPending(null)}>그대로 두기</button><button type="button" className="primary" onClick={()=>{setNote(applyBackup(pending)?'파일의 기록을 가져왔어요.':'이 기기에 저장하지 못했어요. 저장 공간을 확인해 주세요.');setPending(null);}} data-class-restore-yes>네, 가져와요</button></div>}
   {note&&<p className="class-switcher-note" role="status">{note}</p>}
   <p className="class-switcher-note">반 이름과 기록은 이 기기에만 저장돼요. 학생 이름이나 개인 기록은 담지 않아요.</p>
  </div>}
 </section>;
}
