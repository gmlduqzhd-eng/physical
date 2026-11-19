/**
 * 놀이 화면이 오류 화면으로 바뀌었는지 알리는 작은 신호.
 * 처음 쓰는 선생님 안내 창처럼 놀이 위에 뜨는 것들이 오류 화면을 덮지 않게 쓴다.
 */
let active = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

export function playErrorShown() { active++; emit(); }
export function playErrorCleared() { if (active > 0) { active--; emit(); } }
export const playErrorActive = () => active > 0;
export function subscribePlayError(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
