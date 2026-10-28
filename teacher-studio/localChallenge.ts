import { nextChallenge } from '../src/domain/teacherAi';

export type ChallengeRow = { score: string; rpe: string };
export type ChallengeReview =
  | { kind: 'empty' }
  | { kind: 'invalid'; error: string }
  | { kind: 'ready'; text: string; adopted: boolean };

export function reviewLocalChallenge(rows: ChallengeRow[], activityId: string): ChallengeReview {
  const valid = rows.length === 3 && rows.every(row => row.score.trim() !== '' && row.rpe.trim() !== ''
    && Number.isFinite(Number(row.score)) && Number(row.score) >= 0 && Number(row.score) <= 1000000
    && Number.isInteger(Number(row.rpe)) && Number(row.rpe) >= 1 && Number(row.rpe) <= 5);
  if (!valid) return { kind: 'invalid', error: '세 기록의 점수와 운동 자각도(1~5)를 모두 확인하세요.' };
  return { kind: 'ready', text: nextChallenge(rows.map(row => ({ gameType: activityId, score: Number(row.score), rpe: Number(row.rpe) })), activityId), adopted: false };
}

export function adoptLocalChallenge(review: ChallengeReview): ChallengeReview {
  return review.kind === 'ready' && review.text.trim() ? { ...review, adopted: true } : review;
}
