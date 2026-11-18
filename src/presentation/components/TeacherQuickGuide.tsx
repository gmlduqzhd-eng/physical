import {useCallback,useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Link} from 'react-router-dom';
import {guideSeen,markGuideSeen} from '../../application/todayLessonStore';
import {useModalDialog} from '../../application/useModalDialog';
import './TeacherQuickGuide.css';

/**
 * '처음 쓰는 선생님' 1분 안내: TV에 띄우기 → 휴대폰 리모컨 연결 → 시작·다음·점수.
 * 그림은 그림 파일 없이 SVG로 그린다. 처음 한 번은 저절로 뜨고, 이용 안내에서 다시 볼 수 있다.
 */
const STEPS=[
 {title:'TV에 띄워요',text:'교실 TV나 프로젝터에 이 화면을 크게 띄워요. 학생들은 TV를 보고 몸으로 따라 해요.',art:'tv'},
 {title:'휴대폰 리모컨을 연결해요',text:'게임 화면의 📱 휴대폰 리모컨을 누르고, 휴대폰 카메라로 QR을 찍어요. 휴대폰과 TV에 나온 확인 번호가 같으면 ‘허용’을 눌러요.',art:'phone'},
 {title:'시작 · 다음 · 점수',text:'▶ 시작으로 시범과 연습 판이 나와요. 게임 안의 ‘다음’ 버튼(키보드 Space)은 게임을 한 단계씩 넘겨요. 팀 점수는 +1 버튼(또는 휴대폰)으로 줘요. ‘오늘 수업’ 중이면 맨 위 막대는 다음 활동으로 넘어갈 때만 눌러요.',art:'buttons'},
] as const;

function Art({kind}:{kind:typeof STEPS[number]['art']}){
 if(kind==='tv')return <svg viewBox="0 0 120 80" aria-hidden="true" className="tqg-art"><rect x="8" y="6" width="104" height="58" rx="6" fill="#1e293b" stroke="#f59e0b" strokeWidth="3"/><rect x="16" y="13" width="88" height="44" rx="3" fill="#0f172a"/><text x="60" y="41" textAnchor="middle" fontSize="16" fill="#fde68a" fontWeight="700">팔 벌려!</text><rect x="50" y="64" width="20" height="6" fill="#475569"/><rect x="38" y="70" width="44" height="4" rx="2" fill="#475569"/></svg>;
 if(kind==='phone')return <svg viewBox="0 0 120 80" aria-hidden="true" className="tqg-art"><rect x="42" y="4" width="36" height="72" rx="7" fill="#1e293b" stroke="#38bdf8" strokeWidth="3"/><rect x="50" y="16" width="20" height="20" fill="#f8fafc"/><rect x="52" y="18" width="6" height="6" fill="#0f172a"/><rect x="62" y="18" width="6" height="6" fill="#0f172a"/><rect x="52" y="28" width="6" height="6" fill="#0f172a"/><rect x="62" y="28" width="3" height="3" fill="#0f172a"/><rect x="48" y="44" width="24" height="9" rx="3" fill="#f59e0b"/><text x="60" y="51" textAnchor="middle" fontSize="6" fill="#1c1917" fontWeight="700">허용</text><text x="60" y="66" textAnchor="middle" fontSize="7" fill="#cbd5e1">7DF 6UR</text></svg>;
 return <svg viewBox="0 0 120 80" aria-hidden="true" className="tqg-art"><rect x="6" y="24" width="34" height="30" rx="6" fill="#f59e0b"/><text x="23" y="44" textAnchor="middle" fontSize="11" fill="#1c1917" fontWeight="700">▶ 시작</text><rect x="44" y="24" width="34" height="30" rx="6" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2"/><text x="61" y="44" textAnchor="middle" fontSize="11" fill="#f8fafc" fontWeight="700">다음</text><rect x="82" y="24" width="32" height="30" rx="6" fill="#2563eb"/><text x="98" y="44" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">+1</text></svg>;
}

/** 안내 내용(페이지와 창에서 같이 쓴다). */
export function TeacherQuickGuideBody({compact=false}:{compact?:boolean}){
 return <ol className="tqg-steps" data-compact={compact||undefined}>
  {STEPS.map((s,i)=><li key={s.title} className="tqg-step"><Art kind={s.art}/><div><p className="tqg-step-no">{i+1}단계</p><h3>{s.title}</h3><p>{s.text}</p></div></li>)}
 </ol>;
}

/**
 * 처음 한 번 저절로 뜨는 안내 창. force면 이미 봤어도 띄운다.
 * 공용 useModalDialog로 초점을 창 안에 가두고, 뒤 화면 스크롤을 막고, 닫으면 원래 초점으로 돌려놓는다.
 */
export function TeacherQuickGuide({force=false,onClose}:{force?:boolean;onClose?:()=>void}){
 const [open,setOpen]=useState(()=>force||!guideSeen());
 const close=useCallback(()=>{markGuideSeen();setOpen(false);onClose?.();},[onClose]);
 const dialogRef=useModalDialog(open,close);
 // Esc는 창만 닫고 게임 단축키 쪽으로 새지 않게 capture 단계에서 멈춘다.
 useEffect(()=>{
  if(!open)return;
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();e.preventDefault();close();}};
  window.addEventListener('keydown',key,true);return ()=>window.removeEventListener('keydown',key,true);
 },[open,close]);
 if(!open)return null;
 const node=<div className="tqg-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)close();}}>
  <section ref={dialogRef as React.RefObject<HTMLElement>} tabIndex={-1} className="tqg-dialog" role="dialog" aria-modal="true" aria-labelledby="tqg-title">
   <p className="tqg-eyebrow">처음 쓰는 선생님 · 1분 안내</p>
   <h2 id="tqg-title">세 가지만 알면 바로 수업할 수 있어요</h2>
   <TeacherQuickGuideBody compact/>
   <div className="tqg-actions">
    <button type="button" className="tqg-primary" onClick={close}>알겠어요 · 시작하기</button>
    <Link to="/print/signature-cards" onClick={close}>🖨 규칙 카드·QR 안내 인쇄</Link>
   </div>
  </section>
 </div>;
 return typeof document==='undefined'?node:createPortal(node,document.body);
}
