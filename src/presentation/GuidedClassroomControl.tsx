import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useGameLogic } from '../application/useGameLogic';
import { useGameTimer } from '../application/useGameTimer';
import { timeOffset } from '../application/timeSync';
import { supabase } from '../data/supabase';
import { classroomError, openClassroomBoard } from '../data/classroomRepository';
import { GAMES } from '../domain/gamesData';
import { GUIDED_REFLECTIONS, reflectionLabel } from '../domain/guidedReflection';
import { guidedGoal } from '../domain/guidedGoal';
import { resolveGuidedGameType } from '../domain/guidedMission';
import { QRCodePanel } from './components/admin/QRCodePanel';
import { LessonShell } from './LessonShell';
import './GuidedClassroom.css';

export function GuidedClassroom() {
  const { roomId } = useParams();
  const { gameRoom: room, scores, template, loading, error, refresh } = useGameLogic(roomId);
  const { mins, secs, timeLeft } = useGameTimer(room);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const missions = template && Array.isArray(template.buttons) ? template.buttons : [];
  const helpRequests = scores.filter(group => group.help_requested_at).sort((a, b) => String(a.help_requested_at).localeCompare(String(b.help_requested_at)));
  const pending = scores.flatMap(group => (group.pending_missions || []).map(missionId => ({
    key: `${group.id}:${missionId}`, groupId: group.id, groupName: group.group_name,
    missionId, title: missions.find(button => button.id === missionId)?.title || '활동',
    alreadyCompleted: group.completed_missions?.includes(missionId) || false,
  })));
  const selectedPending = pending.filter(item => selected.includes(item.key) && !item.alreadyCompleted);

  const mutate = async (updates: Record<string, unknown>) => {
    if (!room || busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await supabase.from('game_rooms').update(updates).eq('id', room.id).select('id');
      if (result.error || !result.data?.length) throw Error('수업 상태를 바꾸지 못했습니다. 인증과 연결을 확인하세요.');
      refresh();
    } catch (cause) { setMessage(classroomError(cause, '수업 변경 실패')); }
    finally { setBusy(false); }
  };

  const review = async (items: typeof pending, approve: boolean) => {
    if (busy || !items.length) return;
    setBusy(true); setMessage('');
    let reviewed = 0;
    try {
      for (const item of items) {
        if (approve && item.alreadyCompleted) throw Error(`${item.groupName}의 활동은 이미 확인됐습니다. 중복 요청을 반려해 주세요.`);
        const result = await supabase.rpc('review_classroom_mission', { row_id: item.groupId, mission_id: item.missionId, approve });
        if (result.error || result.data !== true) throw Error(`${item.groupName}의 완료 요청을 처리하지 못했습니다. 목록을 새로 확인해 주세요.`);
        reviewed += 1;
      }
      setSelected(current => current.filter(key => !items.some(item => item.key === key)));
      setMessage(`${reviewed}건을 ${approve ? '확인' : '반려'}했습니다.`);
    } catch (cause) { setMessage(classroomError(cause, `${reviewed}건 처리 후 중단됐습니다.`)); }
    finally { refresh(); setBusy(false); }
  };

  const resolveHelp = async (groupId: string) => {
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      const result = await supabase.rpc('set_classroom_help', { row_id: groupId, requesting: false });
      if (result.error || result.data !== true) throw Error('도움 요청을 처리하지 못했습니다. 다시 시도해 주세요.');
      refresh();
    } catch (cause) { setMessage(classroomError(cause, '도움 요청 처리 실패')); }
    finally { setBusy(false); }
  };

  const status = room?.status === 'waiting' ? '학생 참여 안내' : room?.status === 'paused' ? '잠시 멈춤' : room?.status === 'finished' ? '수업 종료' : '수업 진행 중';
  const game = GAMES.find(item => item.type === missions[0]?.gameType) || GAMES.find(item => item.name === room?.name);
  const reviewable = pending.filter(item => !item.alreadyCompleted);
  const allSelected = reviewable.length > 0 && reviewable.every(item => selected.includes(item.key));
  const guidedMissionIds = new Set(missions.filter(button => resolveGuidedGameType(room?.name, template?.name, missions, button.id)).map(button => button.id));
  const isGuidedLesson = guidedMissionIds.size > 0;
  const goal = guidedGoal(scores, [...guidedMissionIds], room?.goal_percent ?? 75);
  const completed = scores.flatMap(group => (group.completed_missions || []).filter(id => guidedMissionIds.has(id)).map(id => ({ group, missionId: id })));
  const reflections = scores.flatMap(group => Object.entries(group.stats?.guided_reflections || {}).filter(([id, choice]) => guidedMissionIds.has(id) && reflectionLabel(choice)).map(([id, choice]) => ({ group, missionId: id, choice: String(choice) })));

  return <LessonShell audience="teacher" className="guided-classroom" back="/teacher" backLabel="교사 시작 화면">
    {loading ? <p role="status">수업을 불러오는 중…</p> : error || !room ? <div role="alert" className="error">{error || '수업을 찾지 못했습니다.'}<button onClick={refresh}>다시 확인</button></div> : <>
      <div className="guided-intro"><p className="eyebrow">{status}</p><h1>{room.name}</h1><p>모둠의 참여와 활동 시간을 한눈에 살펴보세요.</p></div>
      <div className="grid guided-overview">
        <section className="card guided-action-card">
          <h2>수업 조작</h2>
          <p>{room.status === 'waiting' ? '학생에게 아래의 우리 모둠 QR을 보여 주세요.' : room.status === 'finished' ? '오늘의 활동을 함께 돌아보세요.' : '활동을 진행하고 완료 요청을 확인하세요.'}</p>
          <p className="muted">등록된 모둠 {scores.length}개 · 확인 대기 {pending.length}건</p>
          <div className="guided-quick-actions">
            {['waiting', 'playing', 'paused'].includes(room.status) && <button className="primary" disabled={busy} onClick={() => void mutate(room.status === 'playing' ? { status: 'paused', started_at: null, global_time_modifier: timeLeft - 300 } : { status: 'playing', started_at: new Date(Date.now() + timeOffset).toISOString() })}>{room.status === 'waiting' ? '수업 시작' : room.status === 'playing' ? '일시정지' : '수업 이어가기'}</button>}
            {room.status !== 'finished' && <button disabled={busy} onClick={() => void mutate({ global_time_modifier: room.global_time_modifier + 60 })}>+1분</button>}
          </div>
        </section>
        <section className="card guided-time-card"><h2>남은 활동 시간</h2><p className="big-number" aria-live="off">{mins}:{secs}</p><p>현재 미션: {missions[0]?.title || '선택한 활동 참여'}</p><Link className="guided-text-link" to={game ? `/play/${game.type}` : '/hub'}>활동 규칙 확인 →</Link></section>
      </div>

      {isGuidedLesson && room.status !== 'finished' && <section className="card guided-help" aria-label="도움 요청"><div className="guided-review-heading"><div><h2>도움 요청 <span className="guided-count">{helpRequests.length}</span></h2><p>먼저 요청한 모둠부터 살펴보세요.</p></div></div>{helpRequests.length ? <div className="guided-review-list">{helpRequests.map(group => <div className="guided-review-row" key={group.id}><strong>{group.group_name}</strong><button disabled={busy} onClick={() => void resolveHelp(group.id)}>도움 완료</button></div>)}</div> : <p className="muted">도움이 필요한 모둠이 없어요.</p>}</section>}

      {isGuidedLesson && <section className="card guided-goal" aria-label="학급 공동 목표"><div className="guided-review-heading"><div><h2>학급 공동 목표</h2><p>{goal.achieved ? '🎉 우리 반 목표를 함께 달성했어요!' : `${goal.target}개 모둠이 활동을 마치면 목표 달성!`}</p></div><strong>{goal.completed} / {goal.total}모둠</strong></div><div className="guided-goal-track" role="progressbar" aria-label="학급 공동 목표 진행률" aria-valuemin={0} aria-valuemax={goal.target || 1} aria-valuenow={Math.min(goal.completed,goal.target || 1)}><span style={{width:`${goal.progress}%`}}/></div>{room.status !== 'finished' && <label className="guided-goal-setting">목표 기준 <select disabled={busy} value={goal.percent} onChange={event=>void mutate({goal_percent:Number(event.target.value)})}><option value={50}>절반</option><option value={75}>75%</option><option value={100}>모든 모둠</option></select></label>}<p className="muted">선생님이 확인한 활동만 반영돼요.</p></section>}

      <section className="card guided-groups" aria-label="완료 확인 대기">
        <div className="guided-review-heading"><div><h2>완료 확인 대기 <span className="guided-count">{pending.length}</span></h2><p>화면 게임 뒤 짝이 기록한 요청입니다. 기기에서 신체 활동을 측정한 결과가 아니므로 실제 참여를 살펴본 뒤 확인해 주세요.</p></div><button disabled={busy} onClick={refresh}>새로고침</button></div>
        {pending.length ? <>
          <div className="guided-review-bulk"><label><input type="checkbox" checked={allSelected} onChange={event => setSelected(event.target.checked ? reviewable.map(item => item.key) : [])}/>전체 선택</label><button disabled={busy || !selectedPending.length || room.status === 'finished'} onClick={() => void review(selectedPending, true)}>선택 {selectedPending.length}건 확인</button></div>
          <div className="guided-review-list">{pending.map(item => <div className="guided-review-row" key={item.key}><label><input type="checkbox" disabled={item.alreadyCompleted} checked={selected.includes(item.key)} onChange={event => setSelected(current => event.target.checked ? [...current, item.key] : current.filter(key => key !== item.key))}/><span><strong>{item.groupName}</strong><small>{item.title}{item.alreadyCompleted ? ' · 이미 확인된 중복 요청' : ''}</small></span></label><div className="row"><button disabled={busy || room.status === 'finished' || item.alreadyCompleted} onClick={() => void review([item], true)}>확인</button><button disabled={busy || room.status === 'finished'} onClick={() => void review([item], false)}>반려</button></div></div>)}</div>
        </> : <p className="muted">아직 확인할 요청이 없어요.</p>}
      </section>

      {isGuidedLesson && room.status === 'finished' && <section className="card guided-closeout" aria-label="수업 마무리"><h2>오늘 수업 한눈에</h2><div className="guided-closeout-numbers"><p><strong>{scores.length}</strong><span>등록 모둠</span></p><p><strong>{new Set(completed.map(item => item.group.id)).size}</strong><span>활동 확인 모둠</span></p><p><strong>{completed.length}</strong><span>완료 승인</span></p><p><strong>{reflections.length}</strong><span>회고 응답</span></p></div><p className="muted">{pending.length ? `확인되지 않은 요청 ${pending.length}건이 남아 있어요.` : '확인 대기 요청이 없어요.'}</p><div className="guided-reflection-counts">{GUIDED_REFLECTIONS.map(choice => <p key={choice.value}>{choice.label} <strong>{reflections.filter(item => item.choice === choice.value).length}</strong></p>)}</div></section>}

      {isGuidedLesson && <details className="guided-reflections"><summary>모둠별 오늘의 회고 ({reflections.length})</summary>{reflections.length ? <div className="guided-reflection-list">{scores.map(group => { const answers = reflections.filter(item => item.group.id === group.id); return <p key={group.id}><strong>{group.group_name}</strong><span>{answers.length ? answers.map(item => `${missions.find(button => button.id === item.missionId)?.title || '활동'}: ${reflectionLabel(item.choice)}`).join(' · ') : '아직 응답 없음'}</span></p>; })}</div> : <p className="muted">아직 도착한 회고가 없어요.</p>}</details>}

      {room.status !== 'finished' && <details open={room.status === 'waiting'}><summary>학생 참여 QR 보여 주기</summary><QRCodePanel currentRoom={room} roomGroups={scores}/></details>}
      <details><summary>모둠 점수와 추가 도구</summary><div className="guided-score-list">{scores.map(group => <p key={group.id}><strong>{group.group_name}</strong><span>{group.score}점</span></p>)}</div><div className="row">{room.status !== 'finished' && <button disabled={busy} onClick={() => void mutate({ announcement: room.announcement === 'WHISTLE' ? null : 'WHISTLE' })}>{room.announcement === 'WHISTLE' ? '집중 안내 해제' : '잠깐 집중 안내'}</button>}<button onClick={() => void openClassroomBoard(room.id)}>전광판 열기</button><Link to={`/admin?room=${room.id}`}>상세 제어·리포트</Link></div>{room.status !== 'finished' && (!confirmEnd ? <button onClick={() => setConfirmEnd(true)}>수업 종료하기</button> : <div className="notice"><p>종료하면 학생의 점수 제출을 마감합니다.</p><div className="row"><button onClick={() => setConfirmEnd(false)}>계속 진행</button><button disabled={busy} onClick={() => void mutate({ status: 'finished', started_at: null, global_time_modifier: timeLeft - 300 })}>수업 종료 확정</button></div></div>)}</details>
      {message && <p role="status" className="notice">{message}</p>}
    </>}
  </LessonShell>;
}
