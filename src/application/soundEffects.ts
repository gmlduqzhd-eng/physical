// Web Audio API 기반 사운드 시스템: 외부 파일 없이 코드로 만든다.
//
// 기계음처럼 들리지 않게 하는 규칙
// - 각진 파형(square·sawtooth) 대신 둥근 파형(sine·triangle)을 겹쳐 쓴다.
// - 소리마다 짧게 커지고(어택 5~15ms) 자연스럽게 사라진다(지수 감쇠): 딸깍거리지 않는다.
// - 칠 때마다 높이(±2~3%)와 길이(±5%)를 조금씩 바꾼다: 같은 소리가 되풀이돼도 덜 질린다.
// - 아주 옅은 울림(짧은 잔향, 약 12%)을 섞고, 맨 끝에 압축기를 둬서 소리가 겹쳐도 찢어지지 않는다.
// - 같은 효과음이 70ms 안에 다시 오면 한 번만 낸다.
// - 음성 안내가 나오는 동안 배경음악(과 효과음 조금)을 줄인다(duckForSpeech).
// 이 기능이 없는 브라우저(오래된 기기·테스트 환경)에서도 예외 없이 조용히 넘어간다.

let audioCtx: AudioContext | null = null;
let bgmInterval: ReturnType<typeof setInterval> | null = null;
let bgmGain: GainNode | null = null;

function getCtx() {
  try {
    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContextConstructor();
    // iOS는 전화·알림 뒤에 'interrupted'가 되고, 다른 브라우저는 'suspended'가 된다. 둘 다 다시 깨운다.
    const state = audioCtx.state as AudioContextState | 'interrupted';
    if (state === 'suspended' || state === 'interrupted') {
      void audioCtx.resume?.()?.catch?.(() => {});
    }
    return audioCtx;
  } catch { return null; }
}

/** 멈춰 있던 오디오가 이만큼 넘게 멈춰 있었으면, 그동안 부른 소리는 내지 않는다(깨어날 때 한꺼번에 터지지 않게). */
export const SUSPENDED_DROP_MS = 2000;
let suspendedSince: number | null = null;
/** 지금 소리를 예약해도 되는지: 돌고 있으면 늘 된다. 멈춘 지 오래면 버린다(첫 손짓으로 깨우는 짧은 순간은 허용). */
function playable(ctx: AudioContext, now = Date.now()): boolean {
  if (ctx.state === 'running' || ctx.state === undefined) { suspendedSince = null; return true; }
  if (suspendedSince === null) suspendedSince = now;
  return now - suspendedSince < SUSPENDED_DROP_MS;
}
/** 테스트용: 멈춤 기록을 지운다. */
export function resetAudioSuspension() { suspendedSince = null; }

export function unlockAudio() {
  const ctx = getCtx();
  if (ctx) void ctx.resume?.()?.catch?.(() => {});
}

// === 공용 출력(울림·압축·줄이기) ===

interface Bus { fx: AudioNode; fxLevel: GainNode | null; bgm: AudioNode; bgmLevel: GainNode | null }
const buses = new WeakMap<object, Bus>();
/** 울림(잔향) 비율. 체육관처럼 들리되 흐려지지 않게 낮게 둔다. */
export const REVERB_WET = 0.12;
/** 음성 안내 중 배경음악·효과음 크기(원래 크기에 곱한다). */
export const DUCK_BGM = 0.35;
export const DUCK_FX = 0.8;

function makeImpulse(ctx: AudioContext, seconds = 0.75) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
  }
  return impulse;
}

/** 효과음과 배경음악이 지나가는 길: 효과음 → (그대로 + 옅은 울림) → 압축기 → 스피커. 없는 기능은 건너뛴다. */
function bus(ctx: AudioContext): Bus {
  const known = buses.get(ctx);
  if (known) return known;
  let out: AudioNode = ctx.destination;
  try {
    if (typeof ctx.createDynamicsCompressor === 'function') {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
      comp.attack.value = 0.004; comp.release.value = 0.18;
      comp.connect(ctx.destination);
      out = comp;
    }
  } catch { out = ctx.destination; }
  let fx: AudioNode = out, fxLevel: GainNode | null = null, bgm: AudioNode = out, bgmLevel: GainNode | null = null;
  try {
    fxLevel = ctx.createGain(); fxLevel.gain.value = 1; fxLevel.connect(out); fx = fxLevel;
    if (typeof ctx.createConvolver === 'function' && typeof ctx.createBuffer === 'function') {
      const verb = ctx.createConvolver(); verb.buffer = makeImpulse(ctx);
      const wet = ctx.createGain(); wet.gain.value = REVERB_WET;
      fxLevel.connect(verb); verb.connect(wet); wet.connect(out);
    }
    bgmLevel = ctx.createGain(); bgmLevel.gain.value = 1; bgmLevel.connect(out); bgm = bgmLevel;
  } catch { /* 기본 출력으로 */ }
  const made = { fx, fxLevel, bgm, bgmLevel };
  buses.set(ctx, made);
  return made;
}

function glideTo(param: AudioParam | undefined, value: number, ctx: AudioContext, seconds = 0.12) {
  if (!param) return;
  try {
    if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(value, ctx.currentTime, seconds / 3);
    else param.value = value;
  } catch { /* 무시 */ }
}

let speaking = false;
let duckWatchdog: ReturnType<typeof setTimeout> | null = null;
/** 말이 끝났다는 알림이 오지 않아도 이 시간 뒤에는 배경음악을 되돌린다(기본값). */
export const DUCK_WATCHDOG_MS = 12000;
/**
 * 음성 안내가 시작·끝날 때 부른다: 말하는 동안 배경음악과 효과음을 줄인다.
 * maxMs: 말이 끝났다는 알림(onend)이 끝내 오지 않을 때 대비해 이 시간 뒤 저절로 되돌린다.
 */
export function duckForSpeech(active: boolean, maxMs = DUCK_WATCHDOG_MS) {
  if (duckWatchdog) { clearTimeout(duckWatchdog); duckWatchdog = null; }
  if (active) duckWatchdog = setTimeout(() => { duckWatchdog = null; if (speaking) duckForSpeech(false); }, Math.max(1000, maxMs));
  speaking = active;
  const ctx = audioCtx;
  if (!ctx || ctx.state === 'closed') return;
  const b = buses.get(ctx);
  if (!b) return;
  glideTo(b.bgmLevel?.gain, active ? DUCK_BGM : 1, ctx, active ? 0.12 : 0.45);
  glideTo(b.fxLevel?.gain, active ? DUCK_FX : 1, ctx, active ? 0.08 : 0.3);
}
export const isSpeechDucking = () => speaking;

// === 소리 재료 ===

/** 칠 때마다 조금씩 다르게(테스트에서 바꿀 수 있게). */
let random: () => number = () => Math.random();
export function setSoundRandom(fn: (() => number) | null) { random = fn ?? (() => Math.random()); }
const vary = (value: number, spread: number) => value * (1 + (random() * 2 - 1) * spread);

/** 같은 효과음은 이 시간 안에 한 번만 낸다. */
export const SFX_REPEAT_GAP_MS = 70;
const lastPlayed = new Map<string, number>();
let lastAnySfx = -Infinity;
function allow(key: string) {
  const now = Date.now();
  const last = lastPlayed.get(key);
  if (last !== undefined && now - last < SFX_REPEAT_GAP_MS) return false;
  lastPlayed.set(key, now);
  lastAnySfx = now;
  return true;
}
/** 마지막 효과음이 난 뒤 지난 시간(음성 앞 알림음이 다른 소리와 겹치지 않게). */
export const msSinceLastSfx = () => Date.now() - lastAnySfx;

interface ToneOptions {
  type?: OscillatorType;
  /** 0~1 사이 크기 */ volume?: number;
  delay?: number;
  attack?: number;
  /** 위(배음)로 얹을 둥근 소리의 높이 비율과 크기: 맑은 종소리처럼 들리게. */ overtone?: { ratio: number; level: number } | null;
  /** 끝으로 갈수록 높이가 이만큼(비율) 바뀐다. */ bend?: number;
  /** 높이·길이 흔들기를 끈다(박자처럼 정확해야 할 때). */ steady?: boolean;
  pan?: number;
}

/** 둥근 소리 하나: 짧게 커졌다 지수로 사라진다. */
function tone(freq: number, duration: number, opts: ToneOptions = {}) {
  const ctx = getCtx();
  if (!ctx || !playable(ctx)) return;
  try {
    const { type = 'sine', volume = 0.15, delay = 0, attack = 0.008, overtone = { ratio: 2, level: 0.18 }, bend = 0, steady = false, pan } = opts;
    const f = steady ? freq : vary(freq, 0.025);
    const d = Math.max(0.03, steady ? duration : vary(duration, 0.05));
    const t0 = ctx.currentTime + delay;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(volume, t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    let tail: AudioNode = env;
    if (pan !== undefined && typeof ctx.createStereoPanner === 'function') {
      const p = ctx.createStereoPanner(); p.pan.value = pan; env.connect(p); tail = p;
    }
    tail.connect(bus(ctx).fx);
    const voices: OscillatorNode[] = [];
    const add = (frequency: number, kind: OscillatorType, level: number) => {
      const osc = ctx.createOscillator();
      osc.type = kind;
      osc.frequency.setValueAtTime(frequency, t0);
      if (bend) osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * (1 + bend)), t0 + d);
      let node: AudioNode = osc;
      if (level < 1) { const g = ctx.createGain(); g.gain.value = level; osc.connect(g); node = g; }
      node.connect(env);
      osc.start(t0); osc.stop(t0 + d + 0.02);
      voices.push(osc);
    };
    add(f, type, 1);
    if (overtone) add(f * overtone.ratio, 'sine', overtone.level);
    voices[0].onended = () => { for (const v of voices) { try { v.disconnect(); } catch { /* 무시 */ } } try { env.disconnect(); tail.disconnect(); } catch { /* 무시 */ } };
  } catch { /* 소리 실패는 게임을 멈추지 않는다 */ }
}

interface NoiseOptions { volume?: number; delay?: number; filter?: BiquadFilterType; from?: number; to?: number; q?: number }
/** 걸러 낸 잡음: 나무 블록 째깍·바람 휙 같은 소리. */
function noise(duration: number, opts: NoiseOptions = {}) {
  const ctx = getCtx();
  if (!ctx || !playable(ctx)) return;
  try {
    const { volume = 0.12, delay = 0, filter = 'bandpass', from = 1800, to, q = 1.2 } = opts;
    const d = Math.max(0.02, vary(duration, 0.05));
    const t0 = ctx.currentTime + delay;
    const size = Math.max(1, Math.floor(ctx.sampleRate * d));
    const buffer = ctx.createBuffer(1, size, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / size, 2);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.linearRampToValueAtTime(volume, t0 + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    let node: AudioNode = source;
    if (typeof ctx.createBiquadFilter === 'function') {
      const bq = ctx.createBiquadFilter();
      bq.type = filter; bq.Q.value = q;
      bq.frequency.setValueAtTime(vary(from, 0.03), t0);
      if (to) bq.frequency.exponentialRampToValueAtTime(to, t0 + d);
      source.connect(bq); node = bq;
    }
    node.connect(env);
    env.connect(bus(ctx).fx);
    source.start(t0); source.stop(t0 + d + 0.02);
    source.onended = () => { try { source.disconnect(); node.disconnect(); env.disconnect(); } catch { /* 무시 */ } };
  } catch { /* 무시 */ }
}

// 음 높이(Hz)
const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A4 = 440, F4 = 349.23, D5 = 587.33;

// === 효과음 ===

export function sfxTap() {
  if (!allow('tap')) return;
  tone(880, 0.07, { type: 'sine', volume: 0.08, overtone: { ratio: 2.5, level: 0.12 } });
}

/** 성공: 맑게 올라가는 세 음(도-미-솔)과 마지막 높은 도. */
export function sfxSuccess() {
  if (!allow('success')) return;
  tone(C5, 0.22, { type: 'triangle', volume: 0.11 });
  tone(E5, 0.22, { type: 'triangle', volume: 0.11, delay: 0.09 });
  tone(G5, 0.26, { type: 'triangle', volume: 0.11, delay: 0.18 });
  tone(C6, 0.5, { type: 'sine', volume: 0.12, delay: 0.28, overtone: { ratio: 2, level: 0.25 } });
}

/** 실패: 날카로운 버저 대신 낮고 부드러운 두 음 '뿌-웅'. */
export function sfxFail() {
  if (!allow('fail')) return;
  tone(330, 0.2, { type: 'triangle', volume: 0.1, overtone: null, bend: -0.04 });
  tone(262, 0.34, { type: 'triangle', volume: 0.1, delay: 0.16, overtone: null, bend: -0.08 });
}

/** 준비 째깍: 나무 블록처럼 짧고 또렷하게. */
export function sfxCountdown() {
  if (!allow('countdown')) return;
  woodblock(1);
}

function woodblock(level = 1, lift = 0) {
  noise(0.05, { volume: 0.14 * level, filter: 'bandpass', from: 1700 * (1 + lift), q: 6 });
  tone(1250 * (1 + lift), 0.05, { type: 'triangle', volume: 0.07 * level, overtone: null, attack: 0.003 });
}

export function sfxPop() {
  if (!allow('pop')) return;
  tone(620, 0.09, { type: 'sine', volume: 0.12, overtone: null, bend: 0.6, attack: 0.004 });
  noise(0.04, { volume: 0.05, filter: 'highpass', from: 2500, q: 0.7 });
}

/** 동전: 맑은 두 음(시-미). */
export function sfxCoin() {
  if (!allow('coin')) return;
  tone(988, 0.1, { type: 'sine', volume: 0.09, overtone: { ratio: 3, level: 0.12 } });
  tone(1319, 0.28, { type: 'sine', volume: 0.1, delay: 0.08, overtone: { ratio: 3, level: 0.12 } });
}

/** 휙: 걸러 낸 바람 소리가 높아지며 지나간다. */
export function sfxWhoosh() {
  if (!allow('whoosh')) return;
  noise(0.32, { volume: 0.12, filter: 'bandpass', from: 300, to: 2400, q: 0.9 });
}

export function sfxDirectionalBell(pan: -1 | 0 | 1) {
  if (!allow(`bell${pan}`)) return;
  tone(620, 0.5, { type: 'sine', volume: 0.15, bend: 0.4, pan, overtone: { ratio: 2.76, level: 0.2 } });
}

export function sfxClick() {
  if (!allow('click')) return;
  tone(1400, 0.035, { type: 'sine', volume: 0.05, overtone: null, attack: 0.002 });
}

/** 팡파르: 결과 발표·빙고·보스 처치처럼 크게 축하할 때. 화음이 차례로 쌓인다. */
export function sfxFanfare() {
  if (!allow('fanfare')) return;
  const chord = (notes: number[], delay: number, length: number, volume: number) => notes.forEach((n, i) => tone(n, length, { type: 'triangle', volume, delay: delay + i * 0.012, overtone: { ratio: 2, level: 0.15 } }));
  chord([G5 / 2, D5, G5], 0, 0.18, 0.07);
  chord([G5 / 2, D5, G5], 0.16, 0.18, 0.07);
  chord([C5, E5, G5, C6], 0.32, 0.9, 0.08);
  noise(0.5, { volume: 0.03, filter: 'highpass', from: 6000, q: 0.5, delay: 0.32 });
}

/** 음성 안내 바로 앞의 아주 짧은 알림음(띵). 다른 소리가 막 났으면 내지 않는다. */
export function sfxEarcon() {
  if (msSinceLastSfx() < 250) return;
  if (!allow('earcon')) return;
  tone(1318.5, 0.18, { type: 'sine', volume: 0.05, overtone: { ratio: 2, level: 0.1 }, attack: 0.006 });
}

/** 체육관 교사용 호루라기(두 음 트릴). 알아듣기 쉽게 두되, 귀가 아프지 않게 고음을 덜어 낸다. */
export function sfxWhistle() {
  if (!allow('whistle')) return;
  try {
    const ctx = getCtx();
    if (!ctx || !playable(ctx)) return;
    const now = ctx.currentTime;
    const length = vary(0.82, 0.04);
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();

    lfo.frequency.setValueAtTime(vary(30, 0.04), now); // 트릴
    lfoGain.gain.setValueAtTime(55, now);
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(vary(2350, 0.015), now);
    osc2.frequency.setValueAtTime(vary(2650, 0.015), now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.16, now + 0.03);
    gain.gain.setValueAtTime(0.16, now + length - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + length);

    let tail: AudioNode = gain;
    if (typeof ctx.createBiquadFilter === 'function') {
      const soft = ctx.createBiquadFilter();
      soft.type = 'lowpass'; soft.frequency.value = 3400; soft.Q.value = 0.6;
      gain.connect(soft); tail = soft;
    }
    osc1.connect(gain);
    osc2.connect(gain);
    tail.connect(bus(ctx).fx);
    // 숨을 불어 넣는 바람 소리를 아주 조금
    noise(length * 0.9, { volume: 0.025, filter: 'bandpass', from: 2600, q: 1.5 });

    lfo.start(now); osc1.start(now); osc2.start(now);
    lfo.stop(now + length); osc1.stop(now + length); osc2.stop(now + length);
    // 끝나면 연결을 끊어 소리 장치가 쌓이지 않게 한다.
    osc1.onended = () => { for (const n of [lfo, lfoGain, osc1, osc2, gain, tail]) { try { n.disconnect(); } catch { /* 무시 */ } } };
  } catch {
    /* ignore audio errors */
  }
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

/** 마지막 10초 째깍. 나무 블록 소리이고, 마지막 3초는 조금씩 높고 크게. */
export function sfxTimerTick(remainSec: number) {
  if (!allow(`tick${remainSec}`)) { hapticTap(); return; }
  const left = Math.max(0, remainSec);
  const lift = left <= 3 ? (4 - left) * 0.12 : 0;
  woodblock(left <= 3 ? 1.25 : 0.9, lift);
  hapticTap();
}

/** 3초 남았을 때 경고음(세 번). 또렷하되 귀를 찌르지 않게 둥근 소리로. */
export function sfxUrgentWarning() {
  if (!allow('urgent')) return;
  for (let i = 0; i < 3; i++) tone(880 + i * 110, 0.12, { type: 'triangle', volume: 0.11, delay: i * 0.14, overtone: { ratio: 2, level: 0.2 }, steady: true });
  hapticPattern([30, 30, 30, 30, 60]);
}

// === BGM (부드러운 루프) ===

const BGM_NOTES = [
  523, 587, 659, 784, 659, 587, 523, 0,
  784, 880, 784, 659, 523, 587, 659, 0,
  523, 659, 784, 880, 1047, 880, 784, 659,
  784, 659, 523, 587, 523, 0, 0, 0,
];
// 마디마다 깔리는 낮은 음(도-솔-라-파)
const BGM_BASS = [C5 / 4, G5 / 4, A4 / 2, F4 / 2];

export function startBgm(volume = 0.175) {
  stopBgm();
  const ctx = getCtx();
  if (!ctx) return;
  const out = bus(ctx).bgm;
  const loopGain = ctx.createGain();
  bgmGain = loopGain;
  loopGain.gain.value = 0.06 * (Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.175) / 0.175;
  loopGain.connect(out);

  let step = 0;
  const tempo = 180; // ms per note

  bgmInterval = setInterval(() => {
    // A queued note may run after stop/replay; it belongs only to this loop.
    if (bgmGain !== loopGain) return;
    // 오디오가 오래 멈춰 있으면 음을 쌓지 않는다(깨어날 때 한꺼번에 울리지 않게).
    if (!playable(ctx)) { step++; return; }
    try {
      const t = ctx.currentTime, len = tempo / 1000;
      const note = (freq: number, length: number, level: number, kind: OscillatorType) => {
        const osc = ctx.createOscillator();
        osc.type = kind;
        osc.frequency.value = freq;
        const noteGain = ctx.createGain();
        noteGain.gain.setValueAtTime(0.0001, t);
        noteGain.gain.linearRampToValueAtTime(level, t + 0.012);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, t + length);
        osc.connect(noteGain);
        noteGain.connect(loopGain);
        osc.start(t);
        osc.stop(t + length + 0.02);
        osc.onended = () => { try { osc.disconnect(); noteGain.disconnect(); } catch { /* 무시 */ } };
      };
      const freq = BGM_NOTES[step % BGM_NOTES.length];
      if (freq > 0) note(freq, len * 0.95, 0.06, 'triangle');
      if (step % 8 === 0) note(BGM_BASS[(step / 8) % BGM_BASS.length], len * 7.5, 0.05, 'sine');
    } catch { /* 무시 */ }
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

/** 박자 소리 한 번. 마디 첫 박은 조금 높게 낸다. 표현 활동의 박자 맞추기에 쓴다(박자는 흔들지 않는다). */
export function sfxBeat(accent = false) {
  tone(accent ? 1046 : 784, 0.09, { type: 'triangle', volume: accent ? 0.18 : 0.12, steady: true, overtone: { ratio: 2, level: 0.12 }, attack: 0.003 });
}

/** 표현 활동의 소리 색깔. 물방울·북·바람·비·천둥·햇살을 서로 다르게 들리게 한다. */
export function sfxSoundColor(kind: 'drop' | 'drum' | 'wind' | 'rain' | 'thunder' | 'sun') {
  switch (kind) {
    case 'drop': tone(1568, 0.1, { volume: 0.14, bend: 0.25, overtone: null }); tone(2093, 0.08, { volume: 0.08, delay: 0.09, overtone: null }); break;
    case 'drum': tone(110, 0.38, { volume: 0.32, bend: -0.35, overtone: null, attack: 0.003 }); noise(0.08, { volume: 0.08, filter: 'lowpass', from: 900, q: 0.7 }); break;
    case 'wind': noise(1.1, { volume: 0.09, filter: 'bandpass', from: 400, to: 1400, q: 1.4 }); break;
    case 'rain': for (let i = 0; i < 7; i++) noise(0.04, { volume: 0.06, filter: 'highpass', from: 3000 + (i % 3) * 800, q: 0.8, delay: i * 0.09 }); break;
    case 'thunder': noise(1.2, { volume: 0.22, filter: 'lowpass', from: 420, to: 90, q: 0.6 }); tone(55, 0.9, { volume: 0.16, bend: -0.2, overtone: null }); break;
    case 'sun': tone(C5, 0.7, { volume: 0.08 }); tone(E5, 0.7, { volume: 0.07, delay: 0.06 }); tone(G5, 0.8, { volume: 0.06, delay: 0.12 }); break;
  }
}
