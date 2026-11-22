import { useState } from 'react';
import { readStorage, writeStorage } from '../../application/browserStorage';
import './TeacherRoomGuide.css';

/** 이 기기에서 '모둠 기기 수업(QR 입장)' 첫 안내를 봤는지. TV 한 대 수업 안내(physical_teacher_guide_seen_v1)와 따로 센다. */
export const ROOM_GUIDE_KEY = 'physical_teacher_room_guide_seen_v1';

const STEPS = [
  { title: '활동과 모둠을 골라요', text: '‘수업 준비 시작’에서 활동, 모둠 수, 시간을 정해요.' },
  { title: 'QR을 크게 보여 줘요', text: '모둠별 QR과 비밀번호가 TV에 크게 떠요. 학생은 휴대폰으로 찍고 자기 번호를 눌러요.' },
  { title: '모두 들어오면 시작해요', text: '입장한 학생 수를 확인하고 ‘수업 시작’을 눌러요.' },
] as const;

/**
 * 처음 온 선생님에게 모둠 기기 수업(QR 입장) 흐름을 세 줄로 알려 주는 안내 카드.
 * 화면을 막지 않고 소개 바로 아래(첫 화면 안)에 작게 한 번 보여 주며, '알겠어요'를 누르면 이 기기에서는 다시 뜨지 않는다.
 */
export function TeacherRoomGuide() {
  const [open, setOpen] = useState(() => readStorage(ROOM_GUIDE_KEY) !== '1');
  if (!open) return null;
  const close = () => { writeStorage(ROOM_GUIDE_KEY, '1'); setOpen(false); };
  return <section className="teacher-room-guide" aria-labelledby="teacher-room-guide-title">
    <p className="teacher-room-guide-eyebrow">처음 쓰는 선생님 · 모둠 기기 수업</p>
    <h2 id="teacher-room-guide-title">학생 휴대폰으로 하는 수업은 이렇게 해요</h2>
    <button type="button" className="primary teacher-room-guide-close" onClick={close}>알겠어요</button>
    <ol>{STEPS.map((step, index) => <li key={step.title}><b aria-hidden="true">{index + 1}</b><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
    <p className="teacher-room-guide-note">TV 한 대로 반 전체가 하는 수업은 ‘오늘 수업’에서 바로 시작해요.</p>
  </section>;
}
