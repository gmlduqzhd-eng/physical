/**
 * 화면 보기 설정(교실 TV 모드, 글씨 크기). 이 기기에만 저장하고 서버로 보내지 않는다.
 *
 * - TV 모드: `<html data-tv-mode="on">`. 진행 화면은 이 속성을 보고 머리말·설명·작은 버튼을 숨기고
 *   큰 신호·점수판·남은 시간만 크게 보여 준다(각 화면의 CSS가 `html[data-tv-mode="on"] …`로 맞춘다).
 * - 글씨 크기: `<html data-text-scale="large|xlarge">`. 보통(normal)이면 속성을 두지 않는다.
 */
import { useSyncExternalStore } from 'react';
import { readStorage, writeStorage } from './browserStorage';

export type TextScale = 'normal' | 'large' | 'xlarge';
export interface DisplayPrefs { tvMode: boolean; textScale: TextScale }

const TV_KEY = 'physical_tv_mode_v1';
const SCALE_KEY = 'physical_text_scale_v1';
const SCALES: readonly TextScale[] = ['normal', 'large', 'xlarge'];
const listeners = new Set<() => void>();
let current: DisplayPrefs | null = null;

export function parseTextScale(value: unknown): TextScale {
  return SCALES.includes(value as TextScale) ? (value as TextScale) : 'normal';
}

function load(): DisplayPrefs {
  return { tvMode: readStorage(TV_KEY) === 'on', textScale: parseTextScale(readStorage(SCALE_KEY)) };
}

function apply(prefs: DisplayPrefs) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (prefs.tvMode) root.setAttribute('data-tv-mode', 'on'); else root.removeAttribute('data-tv-mode');
  if (prefs.textScale === 'normal') root.removeAttribute('data-text-scale'); else root.setAttribute('data-text-scale', prefs.textScale);
}

export function getDisplayPrefs(): DisplayPrefs {
  if (!current) { current = load(); apply(current); }
  return current;
}

function update(next: DisplayPrefs) {
  current = next;
  writeStorage(TV_KEY, next.tvMode ? 'on' : 'off');
  writeStorage(SCALE_KEY, next.textScale);
  apply(next);
  listeners.forEach(listener => listener());
}

export function setTvMode(on: boolean) { update({ ...getDisplayPrefs(), tvMode: on }); }
export function toggleTvMode() { setTvMode(!getDisplayPrefs().tvMode); }
export function setTextScale(scale: TextScale) { update({ ...getDisplayPrefs(), textScale: parseTextScale(scale) }); }
/** 보통 → 크게 → 더 크게 → 보통 순서로 바꾼다. */
export function nextTextScale(scale: TextScale): TextScale { return SCALES[(SCALES.indexOf(scale) + 1) % SCALES.length]; }

// '기기 정보 지우기'를 누르면 저장값과 함께 지금 화면의 TV 모드·글씨 크기도 바로 기본값으로 돌린다.
if (typeof window !== 'undefined') window.addEventListener?.('physical-device-cleared', () => {
  current = { tvMode: false, textScale: 'normal' };
  apply(current);
  listeners.forEach(listener => listener());
});

function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
const serverPrefs: DisplayPrefs = { tvMode: false, textScale: 'normal' };

/** 화면 보기 설정을 읽는 훅. 앱 시작 때 한 번 불러 `<html>` 속성을 맞춘다. */
export function useDisplayPrefs(): DisplayPrefs {
  return useSyncExternalStore(subscribe, getDisplayPrefs, () => serverPrefs);
}
