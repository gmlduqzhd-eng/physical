import { z } from 'zod';

const cue = z.string().trim().min(1).max(100).refine(value => !/[\r\n]/.test(value));

// Four bounded strings can expand to nine URL characters per Korean character.
// Keep a finite parsing limit that also admits every value the schema accepts.
export const MAX_PARTICIPATION_HASH_LENGTH = 4096;

export const participationCuesSchema = z.object({
  activityId: z.string().min(1).max(100),
  mission: cue,
  roles: cue,
  waiting: cue,
}).strict();

export type ParticipationCues = z.infer<typeof participationCuesSchema>;

export function participationLink(origin: string, cues: ParticipationCues) {
  const approved = participationCuesSchema.parse(cues);
  const fragment = new URLSearchParams({ participation: JSON.stringify(approved) });
  return `${origin}/play/${encodeURIComponent(approved.activityId)}#${fragment}`;
}

export function readParticipationCues(hash: string, activityId: string): ParticipationCues | null {
  if (hash.length > MAX_PARTICIPATION_HASH_LENGTH) return null;
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    if (params.size !== 1) return null;
    const raw = params.get('participation');
    if (!raw) return null;
    const result = participationCuesSchema.safeParse(JSON.parse(raw));
    return result.success && result.data.activityId === activityId ? result.data : null;
  } catch {
    return null;
  }
}
