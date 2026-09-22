// Web Audio API 기반 사운드 시스템 — 외부 파일 없이 코드로 생성
let audioCtx: AudioContext | null = null;
let bgmInterval: ReturnType<typeof setInterval> | null = null;
let bgmGain: GainNode | null = null;

function getCtx() {
  const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Web Audio API is not supported in this browser.');
  if (!audioCtx) audioCtx = new AudioContextConstructor();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function unlockAudio() {
  void getCtx().resume();
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15, delay = 0) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration);
}

// === 효과음 ===

export function sfxTap() {
  playTone(800, 0.05, 'square', 0.08);
}

export function sfxSuccess() {
  playTone(523, 0.12, 'square', 0.12, 0);
  playTone(659, 0.12, 'square', 0.12, 0.1);
  playTone(784, 0.12, 'square', 0.12, 0.2);
  playTone(1047, 0.3, 'square', 0.15, 0.3);
}

export function sfxFail() {
  playTone(300, 0.15, 'sawtooth', 0.1, 0);
  playTone(250, 0.15, 'sawtooth', 0.1, 0.15);
  playTone(200, 0.4, 'sawtooth', 0.12, 0.3);
}

export function sfxCountdown() {
  playTone(600, 0.08, 'square', 0.1);
}

export function sfxPop() {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * 0.1;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
  }
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = buffer;
  gain.gain.value = 0.15;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function sfxCoin() {
  playTone(988, 0.08, 'square', 0.1, 0);
  playTone(1319, 0.15, 'square', 0.1, 0.08);
}

export function sfxWhoosh() {
  playTone(400, 0.08, 'sine', 0.08, 0);
  playTone(800, 0.06, 'sine', 0.06, 0.05);
}

export function sfxDirectionalBell(pan: -1 | 0 | 1) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(620, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.16, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
  panner.pan.value = pan;
  osc.connect(gain);
  gain.connect(panner);
  panner.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.45);
}

export function sfxClick() {
  playTone(1200, 0.03, 'square', 0.06);
}

// === 햅틱(진동) 피드백 ===

/** 짧은 탭 진동 (50ms) — 카운트 증가, 터치 액션 등 */
export function hapticTap() {
  try { navigator?.vibrate?.(50); } catch { /* unsupported */ }
}

/** 무거운 진동 (100ms) — 게임 종료, 중요 이벤트 */
export function hapticHeavy() {
  try { navigator?.vibrate?.(100); } catch { /* unsupported */ }
}

/** 커스텀 패턴 진동 — [vibrate, pause, vibrate, ...] */
export function hapticPattern(pattern: number[]) {
  try { navigator?.vibrate?.(pattern); } catch { /* unsupported */ }
}

/** 더블 탭 진동 — 배지 획득, 레벨업 등 */
export function hapticDouble() {
  try { navigator?.vibrate?.([40, 60, 40]); } catch { /* unsupported */ }
}

// === 타이머 경고음 ===

/** 10초 미만 틱 사운드 — remainSec이 작을수록 높은 피치 + 빠른 템포 */
export function sfxTimerTick(remainSec: number) {
  const pitch = 600 + (10 - Math.max(0, remainSec)) * 80; // 600Hz → 1400Hz
  const vol = 0.06 + (10 - Math.max(0, remainSec)) * 0.012; // 점점 커짐
  playTone(pitch, 0.06, 'square', Math.min(vol, 0.18));
  hapticTap();
}

/** 3초 남았을 때 긴급 경고음 (빠른 연속 비프 3회) */
export function sfxUrgentWarning() {
  const ctx = getCtx();
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200 + i * 200, ctx.currentTime + i * 0.12);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.08);
  }
  hapticPattern([30, 30, 30, 30, 60]);
}

// === BGM (귀여운 8비트 루프) ===

const BGM_NOTES = [
  523, 587, 659, 784, 659, 587, 523, 0,
  784, 880, 784, 659, 523, 587, 659, 0,
  523, 659, 784, 880, 1047, 880, 784, 659,
  784, 659, 523, 587, 523, 0, 0, 0,
];

export function startBgm() {
  stopBgm();
  const ctx = getCtx();
  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.06;
  bgmGain.connect(ctx.destination);

  let step = 0;
  const tempo = 180; // ms per note

  bgmInterval = setInterval(() => {
    const freq = BGM_NOTES[step % BGM_NOTES.length];
    if (freq > 0) {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = freq;
      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.06, ctx.currentTime);
      noteGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + tempo / 1000 * 0.9);
      osc.connect(noteGain);
      noteGain.connect(bgmGain!);
      osc.start();
      osc.stop(ctx.currentTime + tempo / 1000);
    }
    step++;
  }, tempo);
}

export function stopBgm() {
  if (bgmInterval) {
    clearInterval(bgmInterval);
    bgmInterval = null;
  }
  if (bgmGain) {
    bgmGain.disconnect();
    bgmGain = null;
  }
}

export function isBgmPlaying() {
  return bgmInterval !== null;
}
