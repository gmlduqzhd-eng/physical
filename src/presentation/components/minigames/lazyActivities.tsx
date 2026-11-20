/* eslint-disable react-refresh/only-export-components -- 여기 있는 것은 모두 필요할 때 받는 화면(lazy 컴포넌트)이다. */
/**
 * 활동 화면들을 필요할 때만 받는다.
 *
 * 학생 폰(/mobile)과 놀이 화면(/play)은 예전에 모든 활동(대표 원정·원정 게임·안전·신체 미션·표현…)을
 * 처음부터 한꺼번에 받아서, 저가 폰에서 첫 화면이 늦게 떴다. 지금 하는 활동 하나만 받으면 된다.
 * 한 번 못 받아도 lazyWithRetry라 '다시 열기'나 다른 활동으로 옮길 때 새로 받는다.
 */
import type { ReactNode } from 'react';
import { lazyWithRetry } from '../../../application/lazyWithRetry';

export const FlagshipActivity = lazyWithRetry(() => import('../../flagship/FlagshipActivity'), m => m.FlagshipActivity);
export const ExpeditionActivity = lazyWithRetry(() => import('./expedition/ExpeditionActivity'), m => m.ExpeditionActivity);
export const ConsolidatedActivity = lazyWithRetry(() => import('./common/ConsolidatedActivity'), m => m.ConsolidatedActivity);
export const SafetyLesson = lazyWithRetry(() => import('./common/SafetyLesson'), m => m.SafetyLesson);
export const MovementQuest = lazyWithRetry(() => import('./common/MovementQuest'), m => m.MovementQuest);
export const LegacyBombGame = lazyWithRetry(() => import('./LegacyBombGame'), m => m.LegacyBombGame);
export const LegacyQuizGame = lazyWithRetry(() => import('./LegacyQuizGame'), m => m.LegacyQuizGame);
export const RetiredGameNotice = lazyWithRetry(() => import('./common/RetiredGameNotice'), m => m.RetiredGameNotice);

/** 활동 파일을 받는 동안 보이는 화면. 아이들이 기다리는 줄 알 수 있게 큰 글씨로 보여 준다. */
export function ActivityLoading({ children }: { children?: ReactNode }) {
  return <div className="activity-loading" role="status" aria-live="polite" style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', padding: 24, fontSize: '1.25rem', fontWeight: 800, textAlign: 'center' }}>
    {children ?? '활동을 준비하고 있어요…'}
  </div>;
}

// 놀이 화면(/play)에서만 쓰는 활동들.
export const SignaturePlay = lazyWithRetry(() => import('./signature/SignaturePlay'), m => m.SignaturePlay);
export const PhonePlay = lazyWithRetry(() => import('./common/PhonePlay'), m => m.PhonePlay);
export const StretchTimer = lazyWithRetry(() => import('./StretchTimer'), m => m.StretchTimer);
export const EmotionThermometer = lazyWithRetry(() => import('./EmotionThermometer'), m => m.EmotionThermometer);
export const PartnerRobotLab = lazyWithRetry(() => import('./PartnerRobotLab'), m => m.PartnerRobotLab);
export const ExpressionGameViewer = lazyWithRetry(() => import('./expression/ExpressionGameViewer'), m => m.ExpressionGameViewer);
