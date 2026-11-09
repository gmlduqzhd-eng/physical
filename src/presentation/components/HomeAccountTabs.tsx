import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {supabase,endClassroomSession} from '../../data/supabase';
export function HomeAccountTabs(){
 const [role,setRole]=useState<'teacher'|'admin'|null>(null);const [error,setError]=useState('');
 useEffect(()=>{let active=true;const update=async()=>{const session=await supabase.auth.getSession();if(!session.data.session||session.data.session.user.is_anonymous){if(active)setRole(null);return;}const account=await supabase.rpc('teacher_account');if(active)setRole(!account.error&&account.data?.enabled?account.data.role:null);};void update().catch(()=>{});const watcher=supabase.auth.onAuthStateChange(()=>{queueMicrotask(()=>{if(active)void update().catch(()=>{});});});return()=>{active=false;watcher.data.subscription.unsubscribe();};},[]);
 return <><nav className="home-account-tabs" aria-label="홈페이지 메뉴"><Link to="/" aria-current="page">홈</Link><Link to="/teacher">수업 준비</Link>{role?<Link to="/teacher/manage">내 수업</Link>:<Link to="/teacher/manage">Google 교사 로그인</Link>}{role==='admin'&&<Link className="member-tab" to="/teacher/members">회원 관리</Link>}{role&&<button type="button" onClick={async()=>{try{await endClassroomSession();await fetch('/api/teacher?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});setRole(null);}catch{setError('로그아웃 연결을 확인하고 공용 기기 정보 지우기를 사용해 주세요.');}}}>로그아웃</button>}</nav>{error&&<p role="status">{error}</p>}</>;
}
