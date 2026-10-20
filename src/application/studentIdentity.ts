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

export function validateStudentIdentity(numberText: string, nicknameText: string): StudentIdentity {
  const nickname = nicknameText.trim();
  if (!/^(?:[1-9]|[1-9]\d)$/.test(numberText)) throw new Error('학생 번호는 1~99 사이 숫자로 입력해주세요.');
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
