import { useEffect, useId, useRef, useState } from 'react';
import { autoNickname, isAutoNickname } from '../../application/studentIdentity';
import './StudentNumberPad.css';

interface Props {
  number: string;
  nickname: string;
  onNumberChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  /** 이미 다른 기기가 쓰고 있다고 확인된 번호. 누를 수 없게 막는다. */
  taken?: ReadonlySet<number>;
  /** 번호판 바로 위에 띄우는 짧은 안내(예: 번호가 이미 있을 때). 바뀌면 번호판이 화면에 보이게 올린다. */
  notice?: string;
}

const FIRST = 30;
const LAST = 99;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

/**
 * 학생 입장: 큰 번호판에서 내 번호를 한 번 누르면 끝. 글자를 적지 않아도 된다.
 * 별명은 따로 정하지 않으면 '12번'처럼 번호로 보인다. 원하면 '별명 바꾸기'를 눌러 적는다(실명은 쓰지 않는다).
 * 1~30번을 먼저 보여 주고, 더 큰 번호는 '더 보기'로 연다.
 */
export function StudentNumberPad({ number, nickname, onNumberChange, onNicknameChange, taken, notice }: Props) {
  const picked = /^(?:[1-9]|[1-9]\d)$/.test(number) ? Number(number) : 0;
  const custom = !isAutoNickname(nickname);
  const [more, setMore] = useState(() => picked > FIRST);
  const [editName, setEditName] = useState(false);
  // 별명 칸은 적는 그대로 보여 준다('1번타자'처럼 'N번'으로 시작해도, 한글을 조합하는 중이어도 지우지 않는다).
  // 'N번'만 적었거나 비웠으면 제출할 때 자동 별명으로 본다(validateStudentIdentity).
  const [draft, setDraft] = useState(() => (custom ? nickname : ''));
  // 바깥에서 별명을 바꿨을 때(예: '다른 학생으로 들어가기'로 비움)만 칸을 따라 맞춘다.
  const [seen, setSeen] = useState(nickname);
  if (seen !== nickname) { setSeen(nickname); if (nickname !== draft) setDraft(custom ? nickname : ''); }
  const titleId = useId();
  const gridId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (!notice) return;
    // 막힌 번호와 안내가 함께 보이게 번호판 위쪽을 화면 안으로 올린다.
    rootRef.current?.scrollIntoView({ block: 'start' });
    noticeRef.current?.focus({ preventScroll: true });
  }, [notice]);
  const shown = range(1, more ? LAST : FIRST);
  const showName = editName || custom;
  return <div className="snp" ref={rootRef}>
    <p className="snp-title" id={titleId}>내 번호를 눌러요</p>
    {notice
      ? <p className="snp-notice" role="alert" tabIndex={-1} ref={noticeRef}>{notice}</p>
      : <p className="snp-hint" aria-live="polite">{picked ? `${picked}번을 골랐어요.${custom ? ` 별명: ${nickname.trim()}` : ''}` : '번호를 한 번만 누르면 돼요.'}</p>}
    <div className="snp-grid" id={gridId} role="group" aria-labelledby={titleId}>
      {shown.map(value => {
        const isTaken = taken?.has(value) ?? false;
        return <button key={value} type="button" className="snp-num" data-number={value} aria-pressed={picked === value} disabled={isTaken}
          aria-label={isTaken ? `${value}번 (이미 있어요)` : `${value}번`} onClick={() => onNumberChange(String(value))}>
          {value}{isTaken && <small aria-hidden="true">찼어요</small>}
        </button>;
      })}
    </div>
    <div className="snp-tools">
      {/* 누른 단추가 사라지면 키보드·화면 읽기 사용자의 위치가 처음으로 돌아가므로, 단추를 남겨 두고 펼치기·접기로 쓴다. */}
      <button type="button" className="snp-more" aria-expanded={more} aria-controls={gridId} onClick={() => setMore(value => !value)}>{more ? '30번까지만 보기' : '31번부터 더 보기'}</button>
      {showName
        ? <label className="snp-nickname">별명 (2~12자)
            <input type="text" autoComplete="off" minLength={2} maxLength={12} placeholder={picked ? `비우면 ${autoNickname(picked)}으로 보여요` : '실명은 쓰지 않아요'} value={draft} onChange={event => { setEditName(true); setDraft(event.target.value); onNicknameChange(event.target.value); }} />
          </label>
        : <button type="button" className="snp-rename" onClick={() => setEditName(true)}>별명 바꾸기 (안 해도 돼요)</button>}
    </div>
  </div>;
}
