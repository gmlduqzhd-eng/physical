import { PAD_KEYS, cleanStudentNumber, isNumberFull, padKeyLabel, pressPadKey } from '../../application/studentNumberPad';
import './StudentNumberPad.css';

interface Props {
  number: string;
  nickname: string;
  onNumberChange: (value: string) => void;
  onNicknameChange: (value: string) => void;
}

/**
 * 학생 입장: 번호와 별명을 한 화면에서 적는다. 번호는 큰 숫자판으로 누르고(자판을 띄우지 않아도 된다),
 * 고른 번호를 크게 보여 준다. 번호 칸은 그대로 글자 칸이라 자판으로 적어도 된다.
 */
export function StudentNumberPad({ number, nickname, onNumberChange, onNicknameChange }: Props) {
  const full = isNumberFull(number);
  return <div className="snp">
    <label className="snp-number">학생 번호 (1~99)
      <input className="snp-display" type="text" inputMode="none" autoComplete="off" required maxLength={2} pattern="(?:[1-9]|[1-9][0-9])" placeholder="번호" value={number} onChange={event => onNumberChange(cleanStudentNumber(event.target.value))} />
    </label>
    <p className="snp-hint" aria-live="polite">{full ? `${number}번이 맞나요? 바꾸려면 ⌫를 눌러요.` : ''}</p>
    <div className="snp-keys" role="group" aria-label="번호 숫자판">
      {PAD_KEYS.map(key => <button key={key} type="button" className="snp-key" data-key={key} aria-label={padKeyLabel(key)} disabled={(key === 'back' || key === 'clear') ? !number : full} onClick={() => onNumberChange(pressPadKey(number, key))}>
        {key === 'back' ? '⌫' : key === 'clear' ? '지우기' : key}
      </button>)}
    </div>
    <label className="snp-nickname">별명 (2~12자)
      <input type="text" autoComplete="off" required minLength={2} maxLength={12} placeholder="친구에게 보일 별명" value={nickname} onChange={event => onNicknameChange(event.target.value)} />
    </label>
  </div>;
}
