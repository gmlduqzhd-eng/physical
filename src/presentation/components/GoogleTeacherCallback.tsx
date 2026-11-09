import {useEffect,useState} from 'react';
import {finishTeacherGoogle} from '../../application/teacherGoogle';
import {takePublicSetupReturn} from '../../domain/publicLessonTransfer';
export function GoogleTeacherCallback({endpoint}:{endpoint:'teacher'|'studio'}){
 const [error,setError]=useState('');
 useEffect(()=>{let active=true;void finishTeacherGoogle(endpoint).then(()=>{if(active)location.replace(endpoint==='teacher'?(takePublicSetupReturn()??'/teacher'):'/');}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Google 로그인 확인에 실패했습니다.');});return()=>{active=false;};},[endpoint]);
 return <section className="ai-form"><h1>Google 로그인 확인</h1>{error?<><p role="alert">{error}</p><a href={endpoint==='teacher'?'/teacher/manage':'/'}>로그인 화면으로 돌아가기</a></>:<p role="status">Google 계정과 회원 정보를 확인하고 있어요…</p>}</section>;
}
