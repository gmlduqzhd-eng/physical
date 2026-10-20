export const GUIDED_REFLECTIONS = [
  { value: 'try', label: '새 움직임을 시도했어요' },
  { value: 'together', label: '친구와 맞춰 움직였어요' },
  { value: 'finish', label: '끝까지 참여했어요' },
] as const;

export type GuidedReflection = typeof GUIDED_REFLECTIONS[number]['value'];

export function reflectionLabel(value: unknown): string | null {
  return GUIDED_REFLECTIONS.find(item => item.value === value)?.label ?? null;
}
