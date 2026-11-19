// Draws the PNG app icons from public/favicon.svg (home-screen installs need PNG; iOS ignores SVG).
// Run after the favicon changes:  node scripts/make-app-icons.cjs
const fs = require('node:fs'), path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.join(root, 'public', 'icons');
const svg = fs.readFileSync(path.join(root, 'public', 'favicon.svg'), 'utf8');
// name, size, share of the square the drawing fills (maskable icons keep a safe margin), rounded corners?
const ICONS = [['icon-192.png', 192, 0.86, true], ['icon-512.png', 512, 0.86, true], ['icon-maskable-512.png', 512, 0.62, false], ['apple-touch-icon.png', 180, 0.78, false]];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  for (const [name, size, fill, rounded] of ICONS) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    const art = Math.round(size * fill);
    await page.setContent(`<style>html,body{margin:0;background:transparent}div{width:${size}px;height:${size}px;display:grid;place-items:center;background:#faf8f2;border-radius:${rounded ? size * 0.22 : 0}px}img{width:${art}px;height:${art}px}</style><div><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"></div>`);
    await page.waitForFunction(() => document.querySelector('img').complete);
    await page.screenshot({ path: path.join(out, name), omitBackground: true });
    await page.close();
  }
  await browser.close();
})();
