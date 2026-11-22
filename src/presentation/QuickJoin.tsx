import {useEffect,useRef,useState,type FormEvent} from 'react';
import {useNavigate,useSearchParams} from 'react-router-dom';
import {joinStudentByQr,classroomError,getMyClassroomProfile,isNumberTakenError} from '../data/classroomRepository';
import {lastEntryFor,rememberLastEntry,resumeLabel,switchToAnotherStudent} from '../application/lastStudentEntry';
import {rememberStudentIdentity,savedStudentIdentity,takenNumberNotice,validateStudentIdentity} from '../application/studentIdentity';
import {StudentNumberPad} from './components/StudentNumberPad';
import {FlowShell} from './FlowShell';
export const QuickJoin=()=>{
 const [params]=useSearchParams();const navigate=useNavigate();const roomId=params.get('room')??'';const groupName=params.get('group')??'';
 const [code,setCode]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('code')??'');const [loading,setLoading]=useState(false);const [error,setError]=useState('');
 const [studentNumber,setStudentNumber]=useState(()=>savedStudentIdentity().number);
 const [nickname,setNickname]=useState(()=>savedStudentIdentity().nickname);
 const [taken,setTaken]=useState<ReadonlySet<number>>(()=>new Set());
 // 번호가 이미 있으면 번호판 바로 위에 알린다(막힌 번호가 화면에 그대로 보이게).
 const [padNotice,setPadNotice]=useState('');
 const pickNumber=(value:string)=>{setStudentNumber(value);setPadNotice('');};
 const errorRef=useRef<HTMLParagraphElement>(null);
 // 이 창으로 4시간 안에 이 수업·이 모둠에 들어온 적이 있으면, 번호를 다시 적지 않고 그대로 이어 간다(같은 번호로 다시 들어오다 막히는 일을 줄인다).
 // 누구로 이어 가는지 단추에 적고, 같은 기기를 쓰는 다른 학생은 '다른 학생으로 들어가기'로 빈 칸부터 적는다.
 const [last,setLast]=useState(()=>lastEntryFor(roomId,groupName));
 const lastGroup=last?.group??null;
 const otherStudent=()=>{setLast(null);setStudentNumber('');setNickname('');setError('');void switchToAnotherStudent();};
 const resume=async()=>{if(loading||!lastGroup)return;setLoading(true);setError('');try{const profile=await getMyClassroomProfile(roomId);if(!profile||profile.group_id!==lastGroup||!profile.student_number||!profile.nickname)throw new Error('이어 갈 기록을 찾지 못했어요. 아래에서 내 번호를 눌러 들어와요.');rememberStudentIdentity({number:profile.student_number,nickname:profile.nickname});navigate('/mobile/'+roomId+'/'+lastGroup);}catch(cause){setError(classroomError(cause,'이어 가지 못했어요. 아래에서 내 번호를 눌러 들어와요.'));}finally{setLoading(false);}};
 useEffect(()=>{
   if(!error)return;
   errorRef.current?.focus({preventScroll:true});
   errorRef.current?.scrollIntoView({block:'nearest'});
 },[error]);
 useEffect(()=>{if(window.location.hash)window.history.replaceState(null,'',window.location.pathname+window.location.search);},[]);
 const join=async(e:FormEvent)=>{e.preventDefault();if(loading)return;setLoading(true);setError('');setPadNotice('');try{const identity=validateStudentIdentity(studentNumber,nickname);const entry=await joinStudentByQr(roomId,groupName,code,identity);rememberStudentIdentity(identity);rememberLastEntry(entry);setCode('');navigate('/mobile/'+entry.room_id+'/'+entry.group_id);}catch(cause){if(isNumberTakenError(cause)&&studentNumber){const n=Number(studentNumber);setTaken(prev=>new Set(prev).add(n));setStudentNumber('');setPadNotice(takenNumberNotice(n,false));}else setError(classroomError(cause,'입장에 실패했습니다.'));}finally{setLoading(false);}};
 return <FlowShell utilities studentMode back="/lobby" backLabel="학생 입장으로"><section className="max-w-sm w-full mx-auto my-6 bg-white p-6 border rounded-2xl shadow-xl"><h1 className="text-3xl font-black text-cyan-700">땀방울 원정대</h1>{!roomId||!groupName?<><p>잘못된 QR입니다. 교사에게 새 모둠 QR을 요청하세요.</p><button onClick={()=>navigate('/lobby')}>비밀번호로 입장하기</button></>:<form onSubmit={join}><h2 className="font-bold my-4">{groupName} 참여</h2>{last&&<div className="notice" data-resume><button type="button" disabled={loading} onClick={resume} className="w-full bg-cyan-700 text-white rounded-xl p-4 font-bold">▶ {resumeLabel(last)} 학생으로 이어가기</button><button type="button" disabled={loading} onClick={otherStudent} className="w-full border rounded-xl p-3 font-bold mt-2" data-other-student>다른 학생으로 들어가기</button></div>}<p>{last?'내가 아니면 ‘다른 학생으로 들어가기’를 누르고 내 번호를 눌러요.':'내 번호를 누르고 아래 입장 버튼을 눌러요.'}</p>{!code&&<label>모둠 참여 코드<input type="password" autoComplete="off" maxLength={12} value={code} onChange={e=>setCode(e.target.value)} className="block w-full border rounded p-3"/></label>}<StudentNumberPad number={studentNumber} nickname={nickname} onNumberChange={pickNumber} onNicknameChange={setNickname} taken={taken} notice={padNotice}/><button disabled={loading} data-ready={studentNumber?"":undefined} className="snp-submit w-full bg-cyan-700 text-white rounded-xl p-4 font-bold my-4">{loading?'확인 중…':'우리 모둠으로 입장'}</button>{error&&<p ref={errorRef} tabIndex={-1} role="alert" className="error student-entry-error">{error}</p>}</form>}<a href="/privacy" className="underline text-sm">개인정보와 기기 정보 관리</a></section></FlowShell>;
};
