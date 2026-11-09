export function screenTilt(beta: number | null, gamma: number | null, rotation: number): number | null {
  const angle = ((Math.round(rotation / 90) * 90 % 360) + 360) % 360;
  const value = angle === 90 ? beta : angle === 270 ? beta === null ? null : -beta : angle === 180 ? gamma === null ? null : -gamma : gamma;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
export const relativeTilt = (raw: number, center: number) => Math.max(-1, Math.min(1, (((raw - center + 540) % 360) - 180) / 25));

export async function requestOrientationAccess(target: { isSecureContext: boolean; DeviceOrientationEvent?: unknown }): Promise<'granted'|'denied'|'unsupported'> {
  const sensor = target.DeviceOrientationEvent as (typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> }) | undefined;
  if (!target.isSecureContext || !sensor) return 'unsupported';
  try { return !sensor.requestPermission || await sensor.requestPermission() === 'granted' ? 'granted' : 'denied'; }
  catch { return 'denied'; }
}
