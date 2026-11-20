/** 학생 번호 숫자판: 1~99만 만들 수 있게 누른 키를 번호 글자에 반영한다(순수 함수). */
export type PadKey = '0'|'1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'back'|'clear';
export const PAD_KEYS: readonly PadKey[] = ['1','2','3','4','5','6','7','8','9','clear','0','back'];

/** 손으로 친 글자도 같은 규칙으로 다듬는다: 숫자만, 앞자리 0 없음, 두 자리까지. */
export function cleanStudentNumber(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '').slice(0, 2);
}

export function pressPadKey(current: string, key: PadKey): string {
  const now = cleanStudentNumber(current);
  if (key === 'clear') return '';
  if (key === 'back') return now.slice(0, -1);
  // 두 자리가 찬 뒤 또 누르면 새 번호를 적기 시작한 것으로 본다(지우기를 찾지 않아도 되게).
  if (now.length >= 2) return key === '0' ? now : key;
  return cleanStudentNumber(now + key);
}

export function padKeyLabel(key: PadKey): string {
  return key === 'back' ? '한 글자 지우기' : key === 'clear' ? '모두 지우기' : `${key}`;
}
