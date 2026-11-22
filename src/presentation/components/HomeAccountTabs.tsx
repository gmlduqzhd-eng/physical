import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {readStorage} from '../../application/browserStorage';
// Supabase(약 50KB)는 이 탭에 로그인 정보가 남아 있을 때만 받는다. 처음 온 사람의 홈 화면에는 필요 없다.
const loadSupabase=()=>import('../../data/supabase');
export function HomeAccountTabs(){
 const [role,setRole]=useState<'teacher'|'admin'|null>(null);const [error,setError]=useState('');
 useEffect(()=>{if(!readStorage('physical_supabase_auth','session'))return;let active=true;let stop=()=>{};const update=async()=>{const {supabase}=await loadSupabase();const session=await supabase.auth.getSession();if(!session.data.session||session.data.session.user.is_anonymous){if(active)setRole(null);return;}const account=await supabase.rpc('teacher_account');if(active)setRole(!account.error&&account.data?.enabled?account.data.role:null);};void update().catch(()=>{});void loadSupabase().then(({supabase})=>{if(!active)return;const watcher=supabase.auth.onAuthStateChange(()=>{queueMicrotask(()=>{if(active)void update().catch(()=>{});});});stop=()=>watcher.data.subscription.unsubscribe();}).catch(()=>{});return()=>{active=false;stop();};},[]);
 // 로그인한 선생님에게만 보인다(내 수업·회원 관리·로그아웃). 처음 화면의 입구는 카드 세 개가 맡는다.
 return <>{role&&<nav className="home-account-tabs" aria-label="선생님 메뉴"><Link to="/teacher/manage">내 수업</Link><Link to="/teacher">수업 준비</Link>{role==='admin'&&<Link className="member-tab" to="/teacher/members">회원 관리</Link>}<button type="button" onClick={async()=>{try{const {endClassroomSession}=await loadSupabase();await endClassroomSession();await fetch('/api/teacher?action=logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});setRole(null);}catch{setError('로그아웃 연결을 확인하고 공용 기기 정보 지우기를 사용해 주세요.');}}}>로그아웃</button></nav>}{error&&<p role="status">{error}</p>}</>;
}
