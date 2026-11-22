import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MonitorPlay, Smartphone } from 'lucide-react';
import { FlowShell } from './FlowShell';
import { LESSON_METHOD_PATH, loadLessonMethod, saveLessonMethod, type LessonMethod } from '../application/lessonStartPrefs';
import { SCREEN } from '../domain/glossary';
import './EntryCards.css';

/**
 * 수업 시작: 수업 방식을 한 번 고른다(TV 한 대 / 모둠마다 폰).
 * 고른 방식은 이 기기에 기억해서 다음부터는 홈의 '수업 시작'이 그 화면으로 바로 간다.
 * 강조 카드(주 버튼)는 지난번에 고른 방식, 처음이면 TV 한 대.
 */
export function StartLesson() {
  const [last] = useState(loadLessonMethod);
  const focus: LessonMethod = last ?? 'tv';
  const pick = (method: LessonMethod) => () => saveLessonMethod(method);
  const badge = (method: LessonMethod) => last === method ? <p className="entry-badge">지난번에 고른 방식</p> : null;
  return <FlowShell utilities className="start-lesson entry-scope">
    <section aria-labelledby="start-lesson-title">
      <div className="entry-head"><h1 id="start-lesson-title">오늘은 어떻게 수업하나요?</h1><p>한 번만 고르면 돼요. 다음에는 지난번 방식을 기억해요.</p></div>
      <div className="entry-grid two">
        <article className={`entry-card${focus === 'tv' ? ' is-focus' : ''}`} data-method="tv">
          <div className="entry-card-title"><MonitorPlay aria-hidden="true" /><h2>TV 한 대로 해요</h2></div>
          {badge('tv')}
          <p className="entry-lead">반 전체가 TV를 보고 함께 움직여요. 준비물이 없어요.</p>
          <ol className="entry-steps"><li>학년과 장소를 골라요</li><li>오늘 수업 계획을 봐요</li><li>시작을 눌러요</li></ol>
          <Link className={`entry-btn ui-btn ui-btn--lg ${focus === 'tv' ? 'ui-btn--primary' : 'ui-btn--secondary'}`} to={LESSON_METHOD_PATH.tv} onClick={pick('tv')} data-start-method="tv">{SCREEN.today} 열기</Link>
          <p className="entry-note">선생님 휴대폰을 리모컨으로 쓸 수 있어요</p>
        </article>
        <article className={`entry-card${focus === 'room' ? ' is-focus' : ''}`} data-method="room">
          <div className="entry-card-title"><Smartphone aria-hidden="true" /><h2>모둠마다 폰을 써요</h2></div>
          {badge('room')}
          <p className="entry-lead">모둠이 폰으로 들어와 점수를 모아요. 선생님 로그인이 필요해요.</p>
          <ol className="entry-steps"><li>활동과 모둠 수를 골라요</li><li>TV에 QR과 비밀번호를 띄워요</li><li>학생이 들어오면 시작해요</li></ol>
          <Link className={`entry-btn ui-btn ui-btn--lg ${focus === 'room' ? 'ui-btn--primary' : 'ui-btn--secondary'}`} to={LESSON_METHOD_PATH.room} onClick={pick('room')} data-start-method="room">수업방 만들기</Link>
          <p className="entry-note"><Link to="/teacher/setup?resume=1" onClick={pick('room')} data-start-resume>하던 수업 이어가기 →</Link></p>
        </article>
      </div>
      <nav className="entry-strip plain" aria-label="다른 준비 방법"><p>다른 준비 방법</p>
        <ul>
          <li><Link className="entry-chip" to="/lessons">{SCREEN.lessons}</Link></li>
          <li><Link className="entry-chip" to="/teacher-ai">{SCREEN.teacherAi} (AI)</Link></li>
          <li><Link className="entry-chip" to="/manual?tab=lesson">지도안 만들기</Link></li>
          <li><Link className="entry-chip" to="/teacher">{SCREEN.teacher} 도구 모두 보기</Link></li>
        </ul>
      </nav>
    </section>
  </FlowShell>;
}
