import { useId, useState } from 'react';
import { autoNickname, isAutoNickname } from '../../application/studentIdentity';
import './StudentNumberPad.css';

interface Props {
  number: string;
  nickname: string;
  onNumberChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
  /** 이미 다른 기기가 쓰고 있다고 확인된 번호. 누를 수 없게 막는다. */
  taken?: ReadonlySet<number>;
}

const FIRST = 30;
const LAST = 99;
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => from + index);

/**
 * 학생 입장: 큰 번호판에서 내 번호를 한 번 누르면 끝. 글자를 적지 않아도 된다.
 * 별명은 따로 정하지 않으면 '12번'처럼 번호로 보인다. 원하면 '별명 바꾸기'를 눌러 적는다(실명은 쓰지 않는다).
 * 1~30번을 먼저 보여 주고, 더 큰 번호는 '더 보기'로 연다.
 */
export function StudentNumberPad({ number, nickname, onNumberChange, onNicknameChange, taken }: Props) {
  const picked = /^(?:[1-9]|[1-9]\d)$/.test(number) ? Number(number) : 0;
  const custom = !isAutoNickname(nickname);
  const [more, setMore] = useState(() => picked > FIRST);
  const [editName, setEditName] = useState(false);
  const titleId = useId();
  const shown = range(1, more ? LAST : FIRST);
  return <div className="snp">
    <p className="snp-title" id={titleId}>내 번호를 눌러요</p>
    <p className="snp-hint" aria-live="polite">{picked ? `${picked}번을 골랐어요.${custom ? ` 별명: ${nickname.trim()}` : ''}` : '번호를 한 번만 누르면 돼요.'}</p>
    <div className="snp-grid" role="group" aria-labelledby={titleId}>
      {shown.map(value => {
        const isTaken = taken?.has(value) ?? false;
        return <button key={value} type="button" className="snp-num" data-number={value} aria-pressed={picked === value} disabled={isTaken}
          aria-label={isTaken ? `${value}번 (이미 있어요)` : `${value}번`} onClick={() => onNumberChange(String(value))}>
          {value}{isTaken && <small aria-hidden="true">이미 있어요</small>}
        </button>;
      })}
    </div>
    <div className="snp-tools">
      {!more && <button type="button" className="snp-more" onClick={() => setMore(true)}>31번부터 더 보기</button>}
      {editName || custom
        ? <label className="snp-nickname">별명 (2~12자)
            <input type="text" autoComplete="off" minLength={2} maxLength={12} placeholder={picked ? `비우면 ${autoNickname(picked)}으로 보여요` : '실명은 쓰지 않아요'} value={custom ? nickname : ''} onChange={event => { setEditName(true); onNicknameChange(event.target.value); }} />
          </label>
        : <button type="button" className="snp-rename" onClick={() => setEditName(true)}>별명 바꾸기 (안 해도 돼요)</button>}
    </div>
  </div>;
}
