/**
 * 디자인 기준 지킴이: 작은 글씨(14px 미만)와 화면 파일에 직접 적은 색(#hex)이 늘지 않게 센다.
 *
 * - 파일마다 지금 개수를 scripts/ui-guard-allowlist.json 에 적어 둔다. 개수가 늘면 테스트가 실패한다.
 * - 줄였으면 `npx tsx scripts/ui-guard.ts --update` 로 허용 개수도 함께 줄인다(개수는 내려가기만 한다).
 * - 색 값의 원본 파일(ui.css, ApplicationPalette.css)은 세지 않는다.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export type Counts = Record<string, number>;
export interface GuardSnapshot { smallFontCss: Counts; smallFontTsx: Counts; rawHex: Counts }

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const ALLOWLIST_PATH = join(ROOT, 'scripts/ui-guard-allowlist.json');
export const MIN_FONT_PX = 14;
/** 색 값을 정하는 원본 파일. 여기에는 #hex 를 적어도 된다. */
export const TOKEN_FILES = new Set(['src/presentation/ui.css', 'src/presentation/ApplicationPalette.css']);
const SCAN_DIRS = ['src', 'teacher-studio'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'public' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out); else out.push(full);
  }
  return out;
}

const stripCssComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

/** CSS에서 14px 미만 font-size 선언 수. `font-size:12px`, `font-size:clamp(11px,…)`, `font:700 12px/1.2 …` 를 센다. */
export function countSmallFontCss(text: string): number {
  const css = stripCssComments(text);
  let count = 0;
  for (const match of css.matchAll(/font-size\s*:\s*(?:clamp\(\s*|max\(\s*|min\(\s*)?(\d*\.?\d+)px/g)) if (Number(match[1]) < MIN_FONT_PX) count += 1;
  for (const match of css.matchAll(/(?:^|[;{\s])font\s*:[^;}]*?\s(\d*\.?\d+)px/g)) if (Number(match[1]) < MIN_FONT_PX) count += 1;
  return count;
}

/** TSX에서 Tailwind `text-[9px]`~`text-[13px]` 와 인라인 `fontSize: 9~13` 수. */
export function countSmallFontTsx(text: string): number {
  let count = 0;
  for (const match of text.matchAll(/text-\[(\d*\.?\d+)px\]/g)) if (Number(match[1]) < MIN_FONT_PX) count += 1;
  for (const match of text.matchAll(/fontSize\s*:\s*['"]?(\d*\.?\d+)(?:px)?['"]?\s*[,}]/g)) if (Number(match[1]) < MIN_FONT_PX) count += 1;
  return count;
}

/** 직접 적은 색(#rgb, #rrggbb, #rrggbbaa) 수. `var(--x, #fff)` 의 대체값도 센다(원본 밖의 색이므로). */
export function countRawHex(text: string, isCss: boolean): number {
  const body = isCss ? stripCssComments(text) : text;
  return [...body.matchAll(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-zA-Z_-])/g)].length;
}

export function scan(): GuardSnapshot {
  const snapshot: GuardSnapshot = { smallFontCss: {}, smallFontTsx: {}, rawHex: {} };
  const put = (bucket: Counts, file: string, count: number) => { if (count > 0) bucket[file] = count; };
  for (const dir of SCAN_DIRS) for (const full of walk(join(ROOT, dir))) {
    const file = relative(ROOT, full).split('\\').join('/');
    const isCss = file.endsWith('.css');
    const isTsx = file.endsWith('.tsx');
    if (!isCss && !isTsx) continue;
    const text = readFileSync(full, 'utf8');
    if (isCss) put(snapshot.smallFontCss, file, countSmallFontCss(text)); else put(snapshot.smallFontTsx, file, countSmallFontTsx(text));
    if (!TOKEN_FILES.has(file)) put(snapshot.rawHex, file, countRawHex(text, isCss));
  }
  return snapshot;
}

export function loadAllowlist(): GuardSnapshot {
  return JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as GuardSnapshot;
}

/** 허용 개수보다 늘어난 파일. 비어 있으면 통과. */
export function regressions(now: Counts, allowed: Counts): string[] {
  return Object.entries(now).filter(([file, count]) => count > (allowed[file] ?? 0)).map(([file, count]) => `${file}: ${count} (허용 ${allowed[file] ?? 0})`);
}

export const total = (counts: Counts) => Object.values(counts).reduce((sum, count) => sum + count, 0);

const sorted = (counts: Counts): Counts => Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const now = scan();
  if (process.argv.includes('--update')) {
    // 허용 개수는 내려가기만 한다: 예전 허용값과 지금 값 중 작은 쪽을 적는다. 처음 만들 때(--init)만 지금 값을 그대로 적는다.
    const init = process.argv.includes('--init');
    const old = init ? null : loadAllowlist();
    const tighten = (current: Counts, allowed: Counts | undefined): Counts => sorted(Object.fromEntries(
      Object.entries(current).map(([file, count]) => [file, allowed ? Math.min(count, allowed[file] ?? 0) : count] as const).filter(([, count]) => count > 0)));
    const next: GuardSnapshot = { smallFontCss: tighten(now.smallFontCss, old?.smallFontCss), smallFontTsx: tighten(now.smallFontTsx, old?.smallFontTsx), rawHex: tighten(now.rawHex, old?.rawHex) };
    writeFileSync(ALLOWLIST_PATH, `${JSON.stringify(next, null, 1)}\n`);
  }
  console.log(JSON.stringify({ smallFontCss: total(now.smallFontCss), smallFontTsx: total(now.smallFontTsx), rawHex: total(now.rawHex) }));
}
