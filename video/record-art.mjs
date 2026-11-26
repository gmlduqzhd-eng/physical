#!/usr/bin/env node
// 그림 장면(video/art/*.html)을 결정적 시간으로 한 프레임씩 그려 mp4로 굽는다.
//   node video/record-art.mjs                 # 전체 장면 + 오버레이 프레임 + manifest
//   node video/record-art.mjs classroom-move  # 일부 장면만
//   node video/record-art.mjs --thumbs        # 영상 없이 썸네일과 manifest만
//   옵션: --sec 14  --fps 30  --crf 18  --at <초>(썸네일 시각)
// 출력: video/out/art/<name>.mp4, phone-frame.png, split-frame.png, thumbs/<name>.jpg, manifest.json
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }
const QRCode = require(join(root, 'node_modules/qrcode'));

const SCENES = ['rain-window','classroom-idle','hand-remote','classroom-standup','classroom-move',
  'classroom-cheer','classroom-pause','group-phones','classroom-highfive','end-card'];
const FRAMES = ['phone-frame','split-frame'];
// 합성기가 TV 화면 영역을 앱 녹화로 덮는 장면
const TV_OVERLAY = new Set(['classroom-standup','classroom-move','classroom-cheer','classroom-pause']);
// 썸네일로 뽑을 시각(초)
const THUMB_AT = { 'rain-window':3, 'classroom-idle':4, 'hand-remote':3.5, 'classroom-standup':4,
  'classroom-move':2.0, 'classroom-cheer':1.6, 'classroom-pause':5, 'group-phones':4.2,
  'classroom-highfive':0.6, 'end-card':6 };

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const flagVals = new Set(['--sec','--fps','--crf','--at'].flatMap(k => { const i = argv.indexOf(k); return i >= 0 ? [argv[i+1]] : []; }));
const SEC = Number(opt('--sec', 14)), FPS = Number(opt('--fps', 30)), CRF = String(opt('--crf', 18));
const thumbsOnly = argv.includes('--thumbs');
const picked = argv.filter(a => !a.startsWith('--') && !flagVals.has(a));
const scenes = picked.length ? SCENES.filter(s => picked.includes(s)) : SCENES;
const frames = picked.length ? FRAMES.filter(s => picked.includes(s)) : FRAMES;

const outDir = join(here, 'out/art');
mkdirSync(join(outDir, 'thumbs'), { recursive: true });

// 마지막 카드용 QR (SVG) — 저장소에 이미 있는 qrcode 패키지 사용
const qrSvg = await QRCode.toString('https://physical-pi.vercel.app', {
  type: 'svg', errorCorrectionLevel: 'M', margin: 0, color: { dark: '#303d35', light: '#00000000' } });
writeFileSync(join(here, 'art/qr.svg'), qrSvg);

const manifestPath = join(outDir, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('  page error:', e.message));

async function open(name, extra = '') {
  await page.goto(pathToFileURL(join(here, 'art', `${name}.html`)).href + '?record' + extra);
  await page.evaluate(() => window.__ready);
}
const rectOf = sel => page.evaluate(s => {
  const e = document.querySelector(s); if (!e) return null;
  const r = e.getBoundingClientRect();
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
}, sel);

function encoder(file) {
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', file],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg ' + c))));
  return { write: buf => new Promise(r => ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r)), end: () => { ff.stdin.end(); return done; } };
}

for (const name of scenes) {
  await open(name);
  const t0 = Date.now();
  const entry = { sec: SEC };
  if (TV_OVERLAY.has(name)) entry.tv = await rectOf('[data-rect="tv"]');
  manifest[name] = entry;
  await page.evaluate(t => window.__seek(t), Number(opt('--at', THUMB_AT[name] ?? 3)));
  await page.screenshot({ path: join(outDir, 'thumbs', `${name}.jpg`), type: 'jpeg', quality: 88 });
  if (!thumbsOnly) {
    const enc = encoder(join(outDir, `${name}.mp4`));
    const n = Math.round(SEC * FPS);
    for (let i = 0; i < n; i++) {
      await page.evaluate(t => window.__seek(t), i / FPS);
      await enc.write(await page.screenshot({ type: 'png' }));
    }
    await enc.end();
  }
  console.log(`${name}: ${thumbsOnly ? 'thumb' : SEC + 's'} (${((Date.now() - t0) / 1000).toFixed(1)}s)`, entry.tv ? JSON.stringify(entry.tv) : '');
}

for (const name of frames) {
  await open(name);
  await page.evaluate(() => window.__seek(0));
  await page.screenshot({ path: join(outDir, `${name}.png`), omitBackground: true });
  await page.screenshot({ path: join(outDir, 'thumbs', `${name}.jpg`), type: 'jpeg', quality: 88 });
  manifest[name] = name === 'phone-frame'
    ? { screen: await rectOf('[data-rect="screen"]') }
    : { tv: await rectOf('[data-rect="tv"]'), phone: await rectOf('[data-rect="phone"]') };
  console.log(`${name}:`, JSON.stringify(manifest[name]));
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
await browser.close();
console.log('manifest →', manifestPath);
