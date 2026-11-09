import {useState} from 'react';
import {beginTeacherGoogle} from '../../application/teacherGoogle';
export function TeacherAccountForm({endpoint}:{endpoint:'teacher'|'studio'}){
 const [teacher,setTeacher]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 return <section className="teacher-account-form" aria-label="Google 교사 로그인"><p>Google 계정으로 가입과 로그인을 한 번에 진행해요. 별도 교사 승인이나 앱 비밀번호가 필요하지 않습니다.</p><p><small>공유 코드로 만든 수업이 있다면 계정 전환 전에 복구키를 보관하세요. Google 이메일은 회원 관리에 사용하며 AI로 보내지 않습니다.</small></p><label className="ai-check"><input type="checkbox" checked={teacher} onChange={e=>setTeacher(e.target.checked)}/><span>교사이며 학생에게 이 계정을 제공하지 않습니다.</span></label><button type="button" disabled={busy||!teacher} onClick={async()=>{setBusy(true);setError('');try{await beginTeacherGoogle(endpoint);}catch(e){setError(e instanceof Error?e.message:'Google 로그인 연결을 확인해 주세요.');setBusy(false);}}}>{busy?'Google 로그인으로 이동 중…':'Google로 가입·로그인'}</button>{error&&<p role="alert">{error}</p>}</section>;
}
