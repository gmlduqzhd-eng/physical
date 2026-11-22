/** 빠른 추천의 상황 단추. 활동 자료를 끌고 오지 않는 가벼운 파일이다(첫 화면이 쓴다). */
import { TERMS } from './glossary';

export const SITUATION_SPACES = [TERMS.classroom, TERMS.gym, TERMS.field] as const;
const [CLASSROOM, GYM] = SITUATION_SPACES;

export type QuickSituationId = 'five' | 'classroom' | 'noprep' | 'big';
export interface QuickSituation { id: QuickSituationId; label: string; emoji: string; note: string; hub: string }

export const QUICK_SITUATIONS: readonly QuickSituation[] = [
  { id: 'five', label: '5분 남았어요', emoji: '⏱', note: '준비물 없이 5분 안에 끝나는 활동이에요.', hub: '/hub?minutes=5' },
  { id: 'classroom', label: '교실에서', emoji: '🏫', note: '교실에서 할 수 있는 활동이에요.', hub: `/hub?where=${encodeURIComponent(CLASSROOM)}` },
  { id: 'noprep', label: '준비물 없이', emoji: '🙌', note: '준비물 없이 바로 하는 활동이에요.', hub: '/hub?collection=phone' },
  { id: 'big', label: '강당·운동장에서', emoji: '🏟', note: '넓은 곳에서 하는 활동이에요.', hub: `/hub?where=${encodeURIComponent(GYM)}` },
];

export const QUICK_PICK_COUNT = 3;
