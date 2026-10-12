export interface GameResultDetails {
  ratings?: number[];
  criteria?: string[];
  selfReflection?: string;
  totalTime?: number;
  metrics?: Record<string, string>;
}

export function normalizeGameResultDetails(value: unknown): GameResultDetails | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  const result: GameResultDetails = {};
  if (Array.isArray(data.ratings) && data.ratings.length <= 20 && data.ratings.every(n => Number.isInteger(n) && n >= 1 && n <= 5)) result.ratings = data.ratings;
  if (Array.isArray(data.criteria) && data.criteria.every(s => typeof s === 'string')) result.criteria = data.criteria.slice(0, 20).map(s => s.slice(0, 100));
  if (typeof data.selfReflection === 'string') result.selfReflection = data.selfReflection.slice(0, 500);
  if (typeof data.totalTime === 'number' && Number.isFinite(data.totalTime) && data.totalTime >= 0) result.totalTime = Math.round(data.totalTime);
  if (data.metrics && typeof data.metrics === 'object' && !Array.isArray(data.metrics)) {
    result.metrics = Object.fromEntries(Object.entries(data.metrics).filter(([, v]) => typeof v === 'string').slice(0, 10).map(([k, v]) => [k.slice(0, 100), (v as string).slice(0, 200)]));
  }
  return Object.keys(result).length ? result : undefined;
}
