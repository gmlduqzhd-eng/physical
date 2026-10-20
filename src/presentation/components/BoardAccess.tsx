import {useEffect,useState,type ReactNode} from 'react';
import {useParams} from 'react-router-dom';
import {joinClassroomBoard} from '../../data/classroomRepository';
export function BoardAccess({children}:{children:ReactNode}){
 const {roomId}=useParams();const [code]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('code'));const [ready,setReady]=useState(!code);const [error,setError]=useState('');
 useEffect(()=>{if(!code||!roomId)return;let active=true;window.history.replaceState(null,'',window.location.pathname+window.location.search);void joinClassroomBoard(roomId,code).then(()=>{if(active)setReady(true);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'전광판 인증 실패');});return()=>{active=false};},[code,roomId]);
 return ready?<>{children}</>:<main className="min-h-screen bg-slate-900 text-white p-8"><p role="status">{error||'전광판 읽기 권한을 확인하는 중…'}</p>{error&&<a href="/board">전광판 코드로 다시 입장</a>}</main>;
}
