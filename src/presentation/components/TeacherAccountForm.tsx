import {useState} from 'react';
import {beginTeacherGoogle} from '../../application/teacherGoogle';
import {rememberStaySignedIn, rememberTeacherConfirmed, staySignedInPreferred, teacherConfirmedOnDevice} from '../../application/teacherLoginPrefs';
import './TeacherAccountForm.css';

const CONFIRM_TEXT='교사이며 학생에게 이 계정을 제공하지 않습니다.';

/** 간단한 G 표시(상표 그림을 쓰지 않는 글자 표시). */
function GMark(){return <span className="taf-g" aria-hidden="true">G</span>;}

/**
 * 선생님 Google 로그인. 교사 확인은 이 기기에서 처음 한 번만 묻고, 그다음부터는 버튼 하나로 들어간다.
 * 서버에는 지금처럼 교사 확인(adultTeacher:true)이 함께 전달된다(teacherGoogle.finishTeacherGoogle).
 */
export function TeacherAccountForm({endpoint}:{endpoint:'teacher'|'studio'}){
 const [confirmedBefore]=useState(teacherConfirmedOnDevice);
 const [teacher,setTeacher]=useState(confirmedBefore);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 // 30일 유지는 교사 화면(반 만들기·관리)에만 있다. AI 수업 준비실은 지금처럼 짧게 유지한다.
 const canStay=endpoint==='teacher';
 const [stay,setStay]=useState(staySignedInPreferred);
 const go=async(chooseAccount=false)=>{setBusy(true);setError('');try{rememberTeacherConfirmed();if(canStay)rememberStaySignedIn(stay);await beginTeacherGoogle(endpoint,{chooseAccount,staySignedIn:canStay&&stay});}catch(e){setError(e instanceof Error?e.message:'Google 로그인 연결을 확인해 주세요.');setBusy(false);}};
 const notes=<><p>Google 계정 하나로 가입과 로그인을 한 번에 해요. 따로 교사 승인이나 앱 비밀번호는 필요 없어요.</p><p>예전 공유 코드로 만든 수업은 교사 관리 화면의 복구키로 가져올 수 있어요. Google 이메일은 회원 관리에만 쓰고 AI로 보내지 않아요.</p></>;
 return <section className="teacher-account-form" aria-label="Google 교사 로그인">
  {!confirmedBefore&&<label className="ai-check"><input type="checkbox" checked={teacher} onChange={e=>setTeacher(e.target.checked)}/><span>{CONFIRM_TEXT}</span></label>}
  {canStay&&<label className="ai-check taf-stay"><input type="checkbox" checked={stay} onChange={e=>setStay(e.target.checked)}/><span>이 기기에서 30일 동안 로그인 유지<small>여러 사람이 같이 쓰는 컴퓨터라면 체크를 꺼 주세요.</small></span></label>}
  <button type="button" className="taf-google" disabled={busy||!teacher} onClick={()=>void go(false)}><GMark/>{busy?'Google 로그인으로 이동 중…':'Google로 계속하기'}</button>
  {confirmedBefore&&<button type="button" className="taf-link" disabled={busy} onClick={()=>void go(true)}>다른 Google 계정으로 로그인</button>}
  <details className="taf-notes"><summary>{confirmedBefore?'확인한 내용 보기':'로그인 안내 더 보기'}</summary>{confirmedBefore&&<p><b>확인한 내용:</b> {CONFIRM_TEXT}</p>}{notes}</details>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
