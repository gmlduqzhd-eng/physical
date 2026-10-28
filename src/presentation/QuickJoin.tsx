import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {joinStudentByQr,classroomError} from '../data/classroomRepository';
import {writeStorage} from '../application/browserStorage';
import {rememberStudentIdentity,savedStudentIdentity,validateStudentIdentity} from '../application/studentIdentity';
import {StudentIdentityFields} from './components/StudentIdentityFields';
import {FlowShell} from './FlowShell';
export const QuickJoin=()=>{
 const [params]=useSearchParams();const navigate=useNavigate();const roomId=params.get('room')??'';const groupName=params.get('group')??'';
 const [code,setCode]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('code')??'');const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 const [studentNumber,setStudentNumber]=useState(()=>savedStudentIdentity().number);
 const [nickname,setNickname]=useState(()=>savedStudentIdentity().nickname);
 const errorRef=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{
   if(!error)return;
   errorRef.current?.focus({preventScroll:true});
   errorRef.current?.scrollIntoView({block:'nearest'});
 },[error]);
 useEffect(()=>{if(window.location.hash)window.history.replaceState(null,'',window.location.pathname+window.location.search);},[]);
 const join=async(e:FormEvent)=>{e.preventDefault();if(loading)return;setLoading(true);setError('');try{const identity=validateStudentIdentity(studentNumber,nickname);const entry=await joinStudentByQr(roomId,groupName,code,identity);rememberStudentIdentity(identity);writeStorage('physical_last_room',entry.room_id);writeStorage('physical_last_group',entry.group_id);writeStorage('physical_last_group_name',entry.group_name);setCode('');navigate('/mobile/'+entry.room_id+'/'+entry.group_id);}catch(cause){setError(classroomError(cause,'입장에 실패했습니다.'));}finally{setLoading(false);}};
 return <FlowShell utilities back="/lobby" backLabel="학생 입장으로"><section className="max-w-sm w-full mx-auto my-6 bg-white p-6 border rounded-2xl shadow-xl"><h1 className="text-3xl font-black text-cyan-700">땀방울 원정대</h1>{!roomId||!groupName?<><p>잘못된 QR입니다. 교사에게 새 모둠 QR을 요청하세요.</p><button onClick={()=>navigate('/lobby')}>PIN 입장으로 이동</button></>:<form onSubmit={join}><h2 className="font-bold my-4">{groupName} 참여</h2><p>학생 번호와 별명을 적어 우리 모둠에 참여해요.</p>{!code&&<label>모둠 참여 코드<input type="password" autoComplete="off" maxLength={12} value={code} onChange={e=>setCode(e.target.value)} className="block w-full border rounded p-3"/></label>}<StudentIdentityFields number={studentNumber} nickname={nickname} onNumberChange={setStudentNumber} onNicknameChange={setNickname}/><button disabled={loading} className="w-full bg-cyan-700 text-white rounded-xl p-4 font-bold my-4">{loading?'확인 중…':'우리 모둠으로 입장'}</button>{error&&<p ref={errorRef} tabIndex={-1} role="alert" className="error student-entry-error">{error}</p>}</form>}<a href="/privacy" className="underline text-sm">개인정보와 기기 정보 관리</a></section></FlowShell>;
};
