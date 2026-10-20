import { FlowShell } from './FlowShell';
import { StudentQrScanner } from './components/StudentQrScanner';
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../data/supabase';
import { findRoomByPin, joinClassroomGroup, classroomError } from '../data/classroomRepository';
import { readStorage, writeStorage, removeStorage } from '../application/browserStorage';
import { RotateCcw } from 'lucide-react';


export const Lobby = () => {
  const [pinCode, setPinCode] = useState(() => new URLSearchParams(window.location.search).get('pin') || '');
  const studentName = '익명 원정대원';
  const [inviteCode, setInviteCode] = useState('');
  const [groupName, setGroupName] = useState('1모둠');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [mode,setMode]=useState<'qr'|'code'|null>(()=>new URLSearchParams(window.location.search).has('pin')?'code':null);

  // 이전 접속 정보 확인
  const lastRoom = readStorage('physical_last_room');
  const lastGroup = readStorage('physical_last_group');
  const lastGroupName = readStorage('physical_last_group_name');
  const lastName = readStorage('physical_student_name');

  const handleResume = async () => {
    if (lastRoom && lastGroup) {
      if (loading) return;
      setLoading(true); setError('');
      try {
        const { data, error: lookupError } = await supabase.from('room_groups').select('id').eq('room_id', lastRoom).eq('id', lastGroup).maybeSingle();
        if (lookupError) throw new Error('이전 수업을 확인할 수 없습니다. 연결 상태를 확인해주세요.');
        if (!data) {
          ['physical_last_room', 'physical_last_group', 'physical_last_group_name'].forEach(key => removeStorage(key));
          throw new Error('이전 수업이 삭제되었습니다. 새 PIN으로 입장해주세요.');
        }
        navigate(`/mobile/${lastRoom}/${lastGroup}`);
      } catch (cause) { setError(classroomError(cause, '이전 수업 접속에 실패했습니다.')); }
      finally { setLoading(false); }
    }
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
      const room = await findRoomByPin(pinCode);
      const groupId = await joinClassroomGroup(room.id, groupName, inviteCode);
      writeStorage('physical_student_name', studentName.trim());
      writeStorage('physical_student_role', 'novice');
      writeStorage('physical_last_room', room.id);
      writeStorage('physical_last_group', groupId);
      writeStorage('physical_last_group_name', groupName);
      navigate(`/mobile/${room.id}/${groupId}`);
    } catch (cause) { setError(classroomError(cause, '입장에 실패했습니다. 다시 시도해주세요.')); }
    finally { setLoading(false); }
  };

  return <FlowShell><p className="eyebrow">학생 수업 참여</p><h1>우리 모둠으로 들어가요</h1><p className="muted">선생님이 보여주신 QR이나 알려주신 코드로 참여해요. 이름은 쓰지 않아요.</p>
    {lastRoom&&lastGroup&&lastName&&<p><button disabled={loading} onClick={()=>void handleResume()}><RotateCcw size={18}/>이전 수업 이어가기 ({lastGroupName})</button></p>}
    <div className="grid"><button className={mode==='qr'?'primary card':'card'} onClick={()=>setMode('qr')}>📷 QR로 참여</button><button className={mode==='code'?'primary card':'card'} onClick={()=>setMode('code')}>🔢 코드로 참여</button></div>
    {mode==='qr'&&<div style={{marginTop:20}}><StudentQrScanner/></div>}
    {mode==='code'&&<form onSubmit={handleJoin} className="card" style={{marginTop:20,maxWidth:560}}><h2>선생님이 알려준 코드를 입력해요</h2><label>수업 PIN (8자리)<input type="text" inputMode="numeric" maxLength={8} required pattern="[0-9]{8}" placeholder="8자리 숫자" value={pinCode} onChange={e=>setPinCode(e.target.value.replace(/\D/g,''))}/></label><label>우리 모둠<select value={groupName} onChange={e=>setGroupName(e.target.value)}>{[1,2,3,4,5,6,7,8].map(n=><option key={n}>{n}모둠</option>)}</select></label><label>모둠 참여 코드<input type="password" autoComplete="off" required maxLength={12} minLength={12} value={inviteCode} onChange={e=>setInviteCode(e.target.value.trim())} placeholder="선생님이 알려준 12자리 코드"/></label><button className="primary button-wide" disabled={loading}>{loading?'우리 모둠 확인 중…':'우리 모둠으로 입장'}</button></form>}
    {error&&<p role="alert" className="error">{error}</p>}<div className="quiet-links"><Link to="/hub">혼자 활동하기</Link><Link to="/demo">참여 방법 미리 보기</Link></div><details><summary>다른 참여 방법·도움말</summary><div className="quiet-links"><Link to="/board">TV 전광판 연결</Link><Link to="/manual">이용 안내</Link></div><p className="small muted">교사용 수업 준비와 공용 패드 설정은 첫 화면의 ‘선생님이에요’에서 이용해요.</p></details>
  </FlowShell>;
};
