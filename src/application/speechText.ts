/**
 * 음성 안내가 사람 말처럼 들리게 하는 글 다듬기(React와 상관없는 순수 함수).
 *
 * - 고유어 수: '3명'은 '삼 명'이 아니라 '세 명', '2번째'는 '두 번째'로 읽는다.
 *   '1번 과제'처럼 번호(이름표)로 쓴 '번'은 그대로 둔다: 뒤에 '씩·더·만·동안·째'가 붙거나, 바로 뒤에 '…요'·'…하기'가 올 때만 '횟수'로 본다.
 *   한 문장에 'N번'이 둘 넘게 나오면('1번 걷기 · 2번 팔 펴기') 모두 번호로 본다. 소수·범위('1.5바퀴', '3~5명')와 '개월'은 바꾸지 않는다.
 * - 같은 칭찬·넘어가기 말을 매번 똑같이 하지 않는다: 3~5가지 말 가운데 바로 앞과 다른 것을 고른다.
 * - 상황별 말투: 차분하게(준비·정리운동·안내) / 보통 / 신나게(마지막 승부·결과·깜짝 이벤트).
 */

const NATIVE: readonly string[] = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const ORDINAL: readonly string[] = ['', '첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
/** 늘 고유어 수로 읽는 단위(1~10). */
const COUNTERS = '명|개|바퀴|걸음|가지|줄|칸씩|사람|마리|발짝|군데';

/**
 * 수 앞에 오면 고유어로 바꾸지 않는 자리: 다른 숫자(10, 20…), 소수점·범위의 앞쪽('1.5바퀴', '3~5명', '3에서 5명').
 * (JS 정규식 뒤보기는 길이가 달라도 된다.)
 */
const NUM = String.raw`(?<!\d)(?<!\d[.~～\-–])(?<!\d\s?에서\s?)(\d{1,2})`;
/** 한 문장 안에 'N번'이 두 번 넘게 나오면 횟수가 아니라 번호(이름표)다: '1번 걷기 · 2번 팔 펴기'. */
const LABEL_BEON = /(?<!\d)\d{1,2}\s*번(?!\s*째)/g;

function native(n: string): string | null {
  const k = Number(n);
  return k >= 1 && k <= 10 ? NATIVE[k] : null;
}

/** 문장 하나에 고유어 규칙을 적용한다. */
function nativeSentence(sentence: string): string {
  let t = sentence;
  const labels = (t.match(LABEL_BEON) ?? []).length >= 2;
  // N번째 → 첫/두/세 번째
  t = t.replace(new RegExp(`${NUM}\\s*번\\s*째`, 'g'), (m, n: string) => {
    const k = Number(n);
    return k >= 1 && k <= 10 ? `${ORDINAL[k]} 번째` : m;
  });
  // N명·N개·N바퀴… → 한 명·두 개·세 바퀴… ('개월'은 '개'가 아니다)
  t = t.replace(new RegExp(`${NUM}\\s*(${COUNTERS})(?!월)`, 'g'), (m, n: string, unit: string) => {
    const w = native(n);
    return w ? `${w} ${unit}` : m;
  });
  if (labels) return t;
  // 횟수로 쓴 '번': 'N번씩/더/만', 또는 'N번 뛰어요·N번 하기'(뒤에 '…요'·'…하기'). '2번 주자'·'1번 보기'처럼 이름표는 그대로.
  t = t.replace(new RegExp(`${NUM}\\s*번(?=\\s*(씩|더|만|동안))`, 'g'), (m, n: string) => {
    const w = native(n);
    return w ? `${w} 번` : m;
  });
  t = t.replace(new RegExp(`${NUM}\\s*번\\s+([가-힣]+요|[가-힣]*하기)(?=[\\s,.!?]|$)`, 'g'), (m, n: string, verb: string) => {
    const w = native(n);
    return w ? `${w} 번 ${verb}` : m;
  });
  return t;
}

/** 작은 수 + 단위를 고유어 수로 바꾼다. 다른 수는 그대로 둔다. 문장(. ! ?)마다 따로 본다. */
export function nativeCounts(text: string): string {
  return text.split(/(?<=[.!?])(?=\s)/).map(nativeSentence).join('');
}

/** 자주 하는 말과 바꿔 쓸 말. 첫 말이 원래 말이다. */
export const PHRASE_VARIANTS: Readonly<Record<string, readonly string[]>> = {
  '잘했어요': ['잘했어요', '멋져요', '와, 해냈어요', '정말 잘했어요', '훌륭해요'],
  '좋아요': ['좋아요', '아주 좋아요', '참 좋아요'],
  '시작해요': ['시작해요', '자, 시작해요', '이제 시작해요'],
  '다음': ['다음', '다음으로 가요'],
  '준비': ['준비', '자, 준비'],
};
const VARIANT_KEYS = Object.keys(PHRASE_VARIANTS);

export interface PhrasePicker { vary(text: string): string }
/**
 * 문장 하나가 자주 하는 말과 똑같으면(끝의 !·.만 다르면) 바꿔 쓸 말 가운데 하나를 고른다. 바로 앞에 고른 말은 다시 고르지 않는다.
 * 문장 일부만 같으면 바꾸지 않는다(뜻이 바뀌지 않게).
 */
export function createPhrasePicker(random: () => number = Math.random): PhrasePicker {
  const last = new Map<string, string>();
  return {
    vary(text) {
      return text.replace(/([^.!?]+)([.!?]*)/g, (whole, body: string, end: string) => {
        const lead = body.match(/^\s*/)?.[0] ?? '';
        const core = body.trim();
        if (!VARIANT_KEYS.includes(core)) return whole;
        const pool = PHRASE_VARIANTS[core];
        const prev = last.get(core);
        const choices = pool.filter(p => p !== prev);
        const pick = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))] ?? core;
        last.set(core, pick);
        return `${lead}${pick}${end}`;
      });
    },
  };
}

export type SpeechTone = 'calm' | 'normal' | 'excited';
/** 말투별 빠르기·높이(설정한 빠르기에 곱한다). */
export const TONE_PROSODY: Readonly<Record<SpeechTone, { rate: number; pitch: number }>> = {
  calm: { rate: 0.92, pitch: 0.95 },
  normal: { rate: 1, pitch: 1 },
  excited: { rate: 1.08, pitch: 1.1 },
};
