import { LessonShell } from './LessonShell';
import { StudentQrScanner } from './components/StudentQrScanner';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { joinStudentByPin, getMyClassroomProfile, completeStudentProfile, classroomError } from '../data/classroomRepository';
import { readStorage, writeStorage, removeStorage } from '../application/browserStorage';
import { rememberStudentIdentity, savedStudentIdentity, validateStudentIdentity } from '../application/studentIdentity';
import { StudentIdentityFields } from './components/StudentIdentityFields';
import { ArrowRight, BookOpen, Hash, QrCode, RotateCcw } from 'lucide-react';


export const Lobby = () => {
  const [pinCode, setPinCode] = useState(() => {
    const pin = new URLSearchParams(window.location.search).get('pin') || '';
    return /^\d{4}$/.test(pin) ? pin : '';
  });
  const [studentNumber,setStudentNumber]=useState(()=>savedStudentIdentity().number);
  const [nickname,setNickname]=useState(()=>savedStudentIdentity().nickname);
  const [resumePending,setResumePending]=useState(false);
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

  // 이전 접속 정보 확인
  const lastRoom = readStorage('physical_last_room');
  const lastGroup = readStorage('physical_last_group');
  const lastGroupName = readStorage('physical_last_group_name');

  const handleResume = async () => {
    if (lastRoom && lastGroup) {
      if (loading) return;
      setLoading(true); setError('');
      try {
        const profile = await getMyClassroomProfile(lastRoom);
        if (!profile || profile.group_id!==lastGroup) {
          ['physical_last_room', 'physical_last_group', 'physical_last_group_name','physical_student_number','physical_student_name'].forEach(key => removeStorage(key));
          throw new Error('이전 수업이 삭제되었습니다. 새 PIN으로 입장해주세요.');
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
    } catch(cause) { setError(classroomError(cause,'학생 정보를 저장하지 못했습니다.')); }
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
    setError('');

    try {
      const identity=validateStudentIdentity(studentNumber,nickname);
      const entry = await joinStudentByPin(pinCode,identity);
      rememberStudentIdentity(identity);
      writeStorage('physical_last_room', entry.room_id);
      writeStorage('physical_last_group', entry.group_id);
      writeStorage('physical_last_group_name', entry.group_name);
      navigate(`/mobile/${entry.room_id}/${entry.group_id}`);
    } catch (cause) { setError(classroomError(cause, '입장에 실패했습니다. 다시 시도해주세요.')); }
    finally { setLoading(false); }
  };

  return <LessonShell audience="student"><section className="lesson-intro"><p className="lesson-eyebrow">함께하는 우리들의 체육 시간</p><h1>우리 모둠으로,<br/>함께 들어가요.</h1><p>선생님이 보여주신 QR이나 코드로 참여해요.<br/>학생 번호와 별명을 적으면 준비 완료!</p></section>
    {lastRoom&&lastGroup&&<p className="student-resume"><button disabled={loading} onClick={()=>void handleResume()}><RotateCcw size={18}/>이전 수업 이어가기 ({lastGroupName})</button></p>}
    {resumePending&&<form className="card" onSubmit={handleResumeProfile}><h2>이전 수업의 학생 정보를 입력해요</h2><p>입장 정보가 없는 기기입니다. 번호와 별명을 적으면 이어서 참여할 수 있어요.</p><StudentIdentityFields number={studentNumber} nickname={nickname} onNumberChange={setStudentNumber} onNicknameChange={setNickname}/><button className="primary button-wide" disabled={loading}>정보 저장하고 이어가기</button></form>}
    <div className="student-choices" role="group" aria-label="수업 참여 방법"><button type="button" className="student-choice" aria-pressed={mode==='qr'} aria-controls="student-entry-panel" disabled={loading} onClick={()=>setMode('qr')}><span className="lesson-icon"><QrCode aria-hidden="true"/></span><strong>QR로 참여해요</strong><span>선생님 화면의 우리 모둠 QR을 비춰요.</span><span className="student-choice-action">QR 참여 선택 <ArrowRight aria-hidden="true"/></span></button><button type="button" className="student-choice" aria-pressed={mode==='code'} aria-controls="student-entry-panel" disabled={loading} onClick={()=>setMode('code')}><span className="lesson-icon"><Hash aria-hidden="true"/></span><strong>코드로 참여해요</strong><span>선생님이 알려주신 코드를 입력해요.</span><span className="student-choice-action">코드 참여 선택 <ArrowRight aria-hidden="true"/></span></button></div><div id="student-entry-panel" className="student-entry-panel">
    {mode==='qr'&&<StudentQrScanner/>}
    {mode==='code'&&<form onSubmit={handleJoin} className="card"><h2>선생님이 알려준 모둠 PIN을 입력해요</h2><label>모둠 PIN (4자리)<input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={4} required pattern="[0-9]{4}" placeholder="4자리 숫자" value={pinCode} onChange={e=>setPinCode(e.target.value.replace(/\D/g,'').slice(0,4))}/></label><StudentIdentityFields number={studentNumber} nickname={nickname} onNumberChange={setStudentNumber} onNicknameChange={setNickname}/><button className="primary button-wide" disabled={loading}>{loading?'우리 모둠 확인 중…':'우리 모둠으로 입장'}</button></form>}
    </div>{error&&<p ref={errorRef} tabIndex={-1} role="alert" className="error student-entry-error">{error}</p>}<nav className="student-help" aria-label="다른 이용 방법"><Link to="/hub"><BookOpen aria-hidden="true"/>혼자 활동하기</Link><Link to="/demo">참여 방법 미리 보기 ↗</Link></nav><details className="lesson-more"><summary>다른 참여 방법·도움말</summary><div className="quiet-links"><Link to="/board">TV 전광판 연결</Link><Link to="/manual">이용 안내</Link></div><p className="small muted">교사용 수업 준비와 공용 패드 설정은 홈 화면의 ‘교사로 시작하기’에서 이용해요.</p></details>
  </LessonShell>;
};
