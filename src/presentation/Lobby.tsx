import { LessonShell } from './LessonShell';
import { StudentQrScanner } from './components/StudentQrScanner';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { joinStudentByPin, getMyClassroomProfile, completeStudentProfile, classroomError, isNumberTakenError } from '../data/classroomRepository';
import { removeStorage } from '../application/browserStorage';
import { rememberStudentIdentity, savedStudentIdentity, takenNumberNotice, validateStudentIdentity } from '../application/studentIdentity';
import { StudentNumberPad } from './components/StudentNumberPad';
import { lastRoomFor, rememberLastEntry, resumeLabel, switchToAnotherStudent } from '../application/lastStudentEntry';
import { ArrowRight, BookOpen, Hash, QrCode, RotateCcw } from 'lucide-react';
import './Lobby.css';


export const Lobby = () => {
  const [pinCode, setPinCode] = useState(() => {
    const pin = new URLSearchParams(window.location.search).get('pin') || '';
    return /^\d{4}$/.test(pin) ? pin : '';
  });
  const [studentNumber,setStudentNumber]=useState(()=>savedStudentIdentity().number);
  const [nickname,setNickname]=useState(()=>savedStudentIdentity().nickname);
  const [resumePending,setResumePending]=useState(false);
  // 이미 다른 기기가 쓰고 있다고 확인된 번호(번호판에서 누를 수 없게 막는다). PIN이 바뀌면 다시 비운다.
  const [taken,setTaken]=useState<ReadonlySet<number>>(()=>new Set());
  // 번호가 이미 있으면 번호판 바로 위에 짧게 알린다(아래쪽 오류 상자로 내려가면 막힌 번호가 화면 밖으로 밀려난다).
  const [padNotice,setPadNotice]=useState('');
  const markTaken=(cause:unknown,canResume:boolean)=>{if(!isNumberTakenError(cause)||!studentNumber)return false;const n=Number(studentNumber);setTaken(prev=>new Set(prev).add(n));setStudentNumber('');setPadNotice(takenNumberNotice(n,canResume));return true;};
  const pickNumber=(value:string)=>{setStudentNumber(value);setPadNotice('');};
  const [error, setError] = useState('');
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!error) return;
    errorRef.current?.focus({ preventScroll: true });
    errorRef.current?.scrollIntoView({ block: 'nearest' });
  }, [error]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [mode,setMode]=useState<'qr'|'code'|null>(()=>new URLSearchParams(window.location.search).has('pin')?'code':null);
  // '코드로 참여해요'를 누르면 PIN 칸으로 내려가 바로 적을 수 있게 한다(폰에서는 칸이 화면 맨 아래에 걸려 눌러도 변화가 없어 보였다).
  const [revealCode,setRevealCode]=useState(0);
  const codeFormRef=useRef<HTMLFormElement>(null);
  const pinRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    if(!revealCode)return;
    codeFormRef.current?.scrollIntoView({block:'start'});
    if(!pinRef.current?.value)pinRef.current?.focus({preventScroll:true});
  },[revealCode]);

  // 이전 접속 정보 확인
  // 4시간 안에 이 창으로 들어갔던 수업만 이어가기를 보여 준다(입장 연결도 4시간만 이어진다).
  const [lastEntry,setLastEntry]=useState(()=>lastRoomFor());
  const lastRoom = lastEntry?.room ?? null;
  const lastGroup = lastEntry?.group ?? null;
  const lastGroupName = lastEntry?.groupName ?? '';
  const otherStudent=()=>{setLastEntry(null);setResumePending(false);setStudentNumber('');setNickname('');setError('');void switchToAnotherStudent();};
  // 누구로 이어 가는지 단추에 함께 적는다(같은 기기를 쓰는 다른 학생이 잘못 누르지 않게).
  const lastIdentity = savedStudentIdentity();
  const lastWho = lastIdentity.number && lastIdentity.nickname ? resumeLabel(lastIdentity) : '';

  const handleResume = async () => {
    if (lastRoom && lastGroup) {
      if (loading) return;
      setLoading(true); setError('');
      try {
        const profile = await getMyClassroomProfile(lastRoom);
        if (!profile || profile.group_id!==lastGroup) {
          ['physical_last_room', 'physical_last_group', 'physical_last_group_name','physical_student_number','physical_student_name'].forEach(key => removeStorage(key));
          throw new Error('이전 수업이 삭제되었습니다. 새 비밀번호로 들어와요.');
        }
        if (!profile.student_number || !profile.nickname) { setResumePending(true); return; }
        rememberStudentIdentity({number:profile.student_number,nickname:profile.nickname});
        navigate(`/mobile/${lastRoom}/${lastGroup}`);
      } catch (cause) { setError(classroomError(cause, '이전 수업 접속에 실패했습니다.')); }
      finally { setLoading(false); }
    }
  };

  const handleResumeProfile = async (event:React.FormEvent) => {
    event.preventDefault();
    if(!lastRoom || !lastGroup || loading)return;
    setLoading(true);setError('');
    try {
      const identity=validateStudentIdentity(studentNumber,nickname);
      await completeStudentProfile(lastRoom,lastGroup,identity);
      rememberStudentIdentity(identity);
      navigate(`/mobile/${lastRoom}/${lastGroup}`);
    } catch(cause) { if(!markTaken(cause,false)) setError(classroomError(cause,'학생 정보를 저장하지 못했습니다.')); }
    finally {setLoading(false);}
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!pinCode) {
      setError('핀 번호를 입력해주세요.');
      return;
    }
    setLoading(true);
    setError('');setPadNotice('');

    try {
      const identity=validateStudentIdentity(studentNumber,nickname);
      const entry = await joinStudentByPin(pinCode,identity);
      rememberStudentIdentity(identity);
      rememberLastEntry(entry);
      navigate(`/mobile/${entry.room_id}/${entry.group_id}`);
    } catch (cause) { if(!markTaken(cause,!!(lastRoom&&lastGroup))) setError(classroomError(cause, '입장에 실패했습니다. 다시 시도해주세요.')); }
    finally { setLoading(false); }
  };

  return <LessonShell audience="student"><section className="lesson-intro"><p className="lesson-eyebrow">함께하는 우리들의 체육 시간</p><h1>우리 모둠으로,<br/>함께 들어가요</h1><p>선생님이 보여주신 QR이나 코드로 참여해요.<br/>내 번호만 누르면 준비 완료!</p></section>
    {lastRoom&&lastGroup&&<p className="student-resume" style={{display:'flex',flexWrap:'wrap',gap:10}}><button disabled={loading} onClick={()=>void handleResume()}><RotateCcw size={18}/>이전 수업 이어가기 ({lastGroupName}{lastWho?` · ${lastWho}`:''})</button><button type="button" className="student-resume-other" disabled={loading} onClick={otherStudent}>다른 학생으로 들어가기</button></p>}
    {resumePending&&<form className="card" onSubmit={handleResumeProfile}><h2>이전 수업의 내 번호를 눌러요</h2><p>이 기기에 번호 기록이 없어요. 내 번호를 누르면 이어서 참여할 수 있어요.</p><StudentNumberPad number={studentNumber} nickname={nickname} onNumberChange={pickNumber} onNicknameChange={setNickname} taken={taken} notice={padNotice}/><button className="primary button-wide snp-submit" data-ready={studentNumber?"":undefined} disabled={loading}>정보 저장하고 이어가기</button></form>}
    <div className="student-choices" role="group" aria-label="수업 참여 방법"><button type="button" className="student-choice" aria-pressed={mode==='qr'} aria-controls="student-entry-panel" disabled={loading} onClick={()=>setMode('qr')}><span className="lesson-icon"><QrCode aria-hidden="true"/></span><strong>QR로 참여해요</strong><span>선생님 화면의 우리 모둠 QR을 비춰요.</span><span className="student-choice-action">QR 참여 선택 <ArrowRight aria-hidden="true"/></span></button><button type="button" className="student-choice" aria-pressed={mode==='code'} aria-controls="student-entry-panel" disabled={loading} onClick={()=>{setMode('code');setRevealCode(value=>value+1);}}><span className="lesson-icon"><Hash aria-hidden="true"/></span><strong>코드로 참여해요</strong><span>선생님이 알려 주신 숫자 4개를 적어요.</span><span className="student-choice-action">코드 참여 선택 <ArrowRight aria-hidden="true"/></span></button></div><div id="student-entry-panel" className="student-entry-panel">
    {mode==='qr'&&<StudentQrScanner/>}
    {mode==='code'&&<form onSubmit={handleJoin} className="card" ref={codeFormRef}><h2>선생님이 알려준 모둠 비밀번호를 적어요</h2><label className="student-pin-label">모둠 비밀번호 (숫자 4개)<input className="student-pin-input" type="text" inputMode="numeric" enterKeyHint="next" autoComplete="one-time-code" maxLength={4} required pattern="[0-9]{4}" placeholder="____" aria-describedby="student-pin-help" value={pinCode} ref={pinRef} onChange={e=>{setPinCode(e.target.value.replace(/\D/g,'').slice(0,4));setTaken(new Set());setPadNotice('');}}/></label><p id="student-pin-help" className="student-pin-help">숫자 4개를 적으면 아래에서 내 번호를 눌러요.</p><StudentNumberPad number={studentNumber} nickname={nickname} onNumberChange={pickNumber} onNicknameChange={setNickname} taken={taken} notice={padNotice}/><button className="primary button-wide snp-submit" data-ready={studentNumber?"":undefined} disabled={loading}>{loading?'우리 모둠 확인 중…':'우리 모둠으로 입장'}</button></form>}
    </div>{error&&<p ref={errorRef} tabIndex={-1} role="alert" className="error student-entry-error">{error}</p>}<nav className="student-help" aria-label="다른 이용 방법"><Link to="/hub"><BookOpen aria-hidden="true"/>혼자 활동하기</Link><Link to="/demo">참여 방법 미리 보기 ↗</Link></nav><details className="lesson-more"><summary>다른 참여 방법·도움말</summary><div className="quiet-links"><Link to="/board">TV 점수판 연결</Link><Link to="/manual">이용 안내</Link></div><p className="small muted">교사용 수업 준비와 공용 패드 설정은 홈 화면의 ‘교사로 시작하기’에서 이용해요.</p></details>
  </LessonShell>;
};
