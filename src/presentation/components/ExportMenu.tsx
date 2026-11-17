import {useState} from 'react';
import {downloadBytes,exportFileName,exportHwpx,exportText,exportXlsx,printTable,type ExportTable} from '../../application/documentExport';
import './ExportMenu.css';

/** 표 하나를 텍스트·엑셀·한글·PDF로 내보내는 버튼 묶음. 학생 이름 없이 팀·번호만 담긴 표를 받는다. */
export function ExportMenu({table,disabled=false}:{table:()=>ExportTable;disabled?:boolean}){
 const [status,setStatus]=useState('');
 const run=async(kind:'text'|'xlsx'|'hwpx'|'pdf')=>{
  const t=table();
  try{
   if(kind==='text'){await navigator.clipboard.writeText(exportText(t));setStatus('텍스트를 복사했어요. 원하는 곳에 붙여 넣으세요.');}
   if(kind==='xlsx'){downloadBytes(await exportXlsx(t),exportFileName(t,'xlsx'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');setStatus('엑셀 파일을 내려받았어요.');}
   if(kind==='hwpx'){downloadBytes(await exportHwpx(t),exportFileName(t,'hwpx'),'application/hwp+zip');setStatus('한글 파일을 내려받았어요.');}
   if(kind==='pdf')setStatus(printTable(t)?'인쇄 창에서 ‘PDF로 저장’을 고르세요.':'새 창이 막혔어요. 팝업을 허용한 뒤 다시 눌러 주세요.');
  }catch{setStatus(kind==='text'?'복사하지 못했어요. 엑셀이나 한글로 내려받아 주세요.':'내보내지 못했어요. 잠시 뒤 다시 시도해 주세요.');}
 };
 return <div className="export-menu" role="group" aria-label="기록 내보내기">
  <span className="export-menu-label">내보내기</span>
  <button type="button" disabled={disabled} onClick={()=>void run('text')}>📋 텍스트 복사</button>
  <button type="button" disabled={disabled} onClick={()=>void run('xlsx')}>📊 엑셀</button>
  <button type="button" disabled={disabled} onClick={()=>void run('hwpx')}>📄 한글</button>
  <button type="button" disabled={disabled} onClick={()=>void run('pdf')}>📕 PDF</button>
  <p className="export-menu-status" role="status">{status}</p>
 </div>;
}
