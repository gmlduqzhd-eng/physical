import { z } from 'zod';

export const TASKS = {
  recommend: '1. 활동 3개 추천', difficulty: '2. 난이도 조절', plan: '3. 수업 지도안',
  safety: '4. 안전 점검', mission: '5. 협동 미션', next: '6. 다음 도전 (기기 내 분석)',
  observation: '7. 관찰 요약', group: '8. 모둠 결과 요약', alternative: '9. 대체 활동', reflection: '10. 성찰 질문',
  participation: '11. 몸 미션 · 역할 교대 · 대기 활동',
} as const;
export type TeacherTask = keyof typeof TASKS;
export const GOALS = ['협동과 소통', '기본 움직임', '체력 기르기', '전략과 문제 해결', '리듬과 표현', '즐거운 참여'] as const;
export const OBSERVATIONS = ['참여가 고르지 않음', '차례 지키기 향상', '규칙 이해에 시간 필요', '협동이 활발함', '활동 시간이 부족함', '기기 조작에 어려움', '공간이 좁음', '설명이 효과적임'] as const;
export const inputSchema = z.object({
  task: z.enum(['recommend', 'difficulty', 'plan', 'safety', 'mission', 'observation', 'group', 'alternative', 'reflection', 'participation']),
  activityId: z.string().max(100).nullable(),
  grade: z.enum(['1~2학년', '3~4학년군', '5~6학년군']),
  goal: z.enum(GOALS), place: z.enum(['교실', '체육관', '운동장', '다목적실', '좁은 실내 공간']),
  device: z.enum(['스마트폰', '태블릿 PC', '데스크톱 PC']),
  deviceCount: z.enum(['교사용 1대', '모둠별 1대', '학생 1인 1기기']),
  minutes: z.number().int().min(15).max(90), groupSize: z.number().int().min(2).max(12),
  activityMinutes: z.number().int().min(1).max(30), classSize: z.number().int().min(1).max(60),
  weather: z.enum(['제약 없음', '비로 실내 전환', '더위로 실내 전환', '추위로 실내 전환']),
  observations: z.array(z.enum(OBSERVATIONS)).max(8),
  aggregate: z.object({ groups: z.enum(['3~5모둠', '6모둠 이상']), participants: z.enum(['모둠당 5~8명', '모둠당 9명 이상']), completion: z.enum(['대부분 완료', '절반 정도 완료', '대부분 미완료']), cooperation: z.enum(['고른 참여', '일부 편중', '관찰 부족']) }).strict().nullable(),
  consent: z.literal(true),
}).strict();
export type TeacherInput = z.infer<typeof inputSchema>;
export const citationSchema = z.object({ activityId: z.string(), field: z.enum(['description', 'grades', 'devices', 'space', 'safety', 'equipment']), quote: z.string().min(1).max(500) }).strict();
export const outputSchema = z.object({
  title: z.string().min(1).max(120),
  recommendations: z.array(z.object({ activityId: z.string(), reason: z.string().min(1).max(500), citations: z.array(citationSchema).min(1).max(4) }).strict()).max(3),
  sections: z.array(z.object({ heading: z.string().min(1).max(60), minutes: z.number().int().min(0).max(90).nullable(), content: z.string().min(1).max(1500), citations: z.array(citationSchema).max(6) }).strict()).max(10),
  safety: z.array(z.object({ activityId: z.string(), quote: z.string().min(1).max(500) }).strict()).max(8),
  teacherChecks: z.array(z.string().max(200)).min(1).max(6),
}).strict();
export type TeacherOutput = z.infer<typeof outputSchema>;
export interface AiResponse { result: TeacherOutput; model: string; generatedAt: string; sourceVersion: string }

// Nicknames, numbers, timestamps and profiles never enter the AI request schema.
export function nextChallenge(records: { gameType: string; score: number; rpe?: number }[], activityId: string) {
  const recent = records.filter(r => r.gameType === activityId).slice(0, 3);
  if (recent.length < 3) return '기록이 부족합니다. 같은 활동의 최근 3회 기록과 교사의 관찰을 먼저 확인하세요.';
  if (recent.some(r => (r.rpe ?? 0) >= 4)) return '기초 수준 유지 제안: 최근 힘들었다는 응답이 있습니다. 교사가 회복 상태와 참여 의사를 확인하세요.';
  if (recent.every((r,i) => r.rpe !== undefined && r.rpe >= 1 && r.rpe <= 2 && Number.isFinite(r.score) && r.score >= 0 && (i === 2 || r.score >= recent[i+1].score))) return '도전 수준을 교사와 검토해 보세요. 최근 3회가 비교적 수월했고 점수가 감소하지 않았습니다. 자동 승급하지 않습니다.';
  return '보통 수준 유지 제안: 점수만으로 신체 능력을 판단하지 않습니다. 교사가 수행 과정과 참여 의사를 함께 확인하세요.';
}
