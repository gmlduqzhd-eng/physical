/** 학생 번호 숫자판: 1~99만 만들 수 있게 누른 키를 번호 글자에 반영한다(순수 함수). */
export type PadKey = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'back'|'clear';
export const PAD_KEYS: readonly PadKey[] = ['1','2','3','4','5','6','7','8','9','clear','0','back'];

/** 전각 숫자(１２)는 보통 숫자로 바꾼다(일부 자판·붙여넣기). */
function toAsciiDigits(text: string): string {
  return text.replace(/[\uFF10-\uFF19]/g, d => String.fromCharCode(d.charCodeAt(0) - 0xFF10 + 48));
}

/** 손으로 친 글자도 같은 규칙으로 다듬는다: 숫자만, 앞자리 0 없음, 두 자리까지. */
export function cleanStudentNumber(text: string): string {
  return toAsciiDigits(text).replace(/\D/g, '').replace(/^0+/, '').slice(0, 2);
}

/** 두 자리가 다 찼는지(더 누른 숫자는 무시하고 지우기만 받는다). */
export function isNumberFull(current: string): boolean {
  return cleanStudentNumber(current).length >= 2;
}

export function pressPadKey(current: string, key: PadKey): string {
  const now = cleanStudentNumber(current);
  if (key === 'clear') return '';
  if (key === 'back') return now.slice(0, -1);
  // 두 자리가 찬 뒤 숫자를 또 누르면 무시한다. 마지막 숫자를 두 번 눌러도 다른 친구 번호로 바뀌지 않게
  // (예: 12번이 2를 한 번 더 눌러 2번으로 들어가지 않게). 바꾸려면 ⌫나 지우기를 누른다.
  if (now.length >= 2) return now;
  return cleanStudentNumber(now + key);
}

export function padKeyLabel(key: PadKey): string {
  return key === 'back' ? '한 글자 지우기' : key === 'clear' ? '모두 지우기' : `${key}`;
}
