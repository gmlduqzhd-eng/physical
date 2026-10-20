import { z } from 'zod';
import { inputSchema, TASKS } from '../src/domain/teacherAi.js';

// Only coarse allowlisted tags/bins, never raw notes, identities or personal records.
export const studioInputSchema = inputSchema.pick({ task: true, activityId: true, grade: true, goal: true, place: true, device: true, deviceCount: true, minutes: true, groupSize: true, classSize: true, consent: true })
  .extend({ adultTeacher: z.literal(true), activityMinutes: inputSchema.shape.activityMinutes.default(10), weather: inputSchema.shape.weather.default('제약 없음'), observations: inputSchema.shape.observations.default([]), aggregate: inputSchema.shape.aggregate.default(null) }).strict()
  .superRefine((input, ctx) => {
    if (input.task !== 'observation' && input.observations.length) ctx.addIssue({ code: 'custom', message: 'Observation tags only belong to observation requests' });
    if (input.task !== 'group' && input.aggregate !== null) ctx.addIssue({ code: 'custom', message: 'Aggregate bins only belong to group requests' });
  });
export type StudioInput = z.infer<typeof studioInputSchema>;
export const STUDIO_TASKS = { ...TASKS, next: '6. 다음 도전 (외부 전송 없음)' } as const;
