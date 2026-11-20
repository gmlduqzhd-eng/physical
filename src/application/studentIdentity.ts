import { readStorage, writeStorage } from './browserStorage';

export interface StudentIdentity { number: number; nickname: string }

export function savedStudentIdentity(): {number: string; nickname: string} {
  const number = readStorage('physical_student_number') || '';
  const nickname = readStorage('physical_student_name') || '';
  return {
    number: /^(?:[1-9]|[1-9]\d)$/.test(number) ? number : '',
    nickname: nickname === '익명 원정대원' ? '' : nickname.slice(0,12),
  };
}

/** 별명을 따로 정하지 않으면 '12번'처럼 번호를 그대로 별명으로 쓴다(2~12자 규칙도 맞는다). */
export const autoNickname = (number: number | string) => `${number}번`;
/** 비어 있거나 '12번'처럼 번호로만 된 별명은 자동 별명으로 본다(번호를 바꾸면 따라 바뀐다). */
export const isAutoNickname = (nickname: string) => !nickname.trim() || /^[1-9]\d?번$/.test(nickname.trim());

export function validateStudentIdentity(numberText: string, nicknameText: string): StudentIdentity {
  if (!/^(?:[1-9]|[1-9]\d)$/.test(numberText)) throw new Error('내 번호를 눌러 주세요.');
  const nickname = isAutoNickname(nicknameText) ? autoNickname(numberText) : nicknameText.trim();
  if (nickname.length < 2 || nickname.length > 12 || [...nickname].some(char => char === '<' || char === '>' || char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) {
    throw new Error('별명은 2~12자로 입력해주세요.');
  }
  return {number:Number(numberText),nickname};
}

export function rememberStudentIdentity(identity: StudentIdentity) {
  writeStorage('physical_student_number', String(identity.number));
  writeStorage('physical_student_name', identity.nickname);
  writeStorage('physical_student_role', 'novice');
}
