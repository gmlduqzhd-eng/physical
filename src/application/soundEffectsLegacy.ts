// '소리 미리듣기'(/sound-check)에서 예전 소리와 새 소리를 비교하려고 남겨 둔 예전 방식(각진 파형, 바로 끊기는 소리).
// 게임에서는 쓰지 않는다.

let ctx: AudioContext | null = null;
function getCtx() {
  try {
    const w = window as Window & { webkitAudioContext?: typeof AudioContext };
    const C = window.AudioContext || w.webkitAudioContext;
    if (!C) return null;
    if (!ctx || ctx.state === 'closed') ctx = new C();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}
function beep(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
  const c = getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator(), gain = c.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, c.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);
    osc.connect(gain); gain.connect(c.destination);
    osc.start(c.currentTime + delay); osc.stop(c.currentTime + delay + duration);
  } catch { /* 무시 */ }
}

export const legacySfx = {
  tap: () => beep(800, 0.05, 'square', 0.08),
  success: () => { beep(523, 0.12, 'square', 0.12); beep(659, 0.12, 'square', 0.12, 0.1); beep(784, 0.12, 'square', 0.12, 0.2); beep(1047, 0.3, 'square', 0.15, 0.3); },
  fail: () => { beep(300, 0.15, 'sawtooth', 0.1); beep(250, 0.15, 'sawtooth', 0.1, 0.15); beep(200, 0.4, 'sawtooth', 0.12, 0.3); },
  countdown: () => beep(600, 0.08, 'square', 0.1),
  coin: () => { beep(988, 0.08, 'square', 0.1); beep(1319, 0.15, 'square', 0.1, 0.08); },
  click: () => beep(1200, 0.03, 'square', 0.06),
  whoosh: () => { beep(400, 0.08, 'sine', 0.08); beep(800, 0.06, 'sine', 0.06, 0.05); },
  tick: () => beep(1000, 0.06, 'square', 0.15),
  urgent: () => { for (let i = 0; i < 3; i++) beep(1200 + i * 200, 0.08, 'square', 0.15, i * 0.12); },
  whistle: () => { beep(2550, 0.85, 'sine', 0.2); beep(2880, 0.85, 'triangle', 0.2); },
  fanfare: () => { beep(523, 0.12, 'square', 0.12); beep(659, 0.12, 'square', 0.12, 0.1); beep(784, 0.12, 'square', 0.12, 0.2); beep(1047, 0.3, 'square', 0.15, 0.3); },
};
export type LegacyKey = keyof typeof legacySfx;
