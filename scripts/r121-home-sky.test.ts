import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const css = readFileSync('src/presentation/HomeSkyBanner.css', 'utf8');
test('home title sits on the sky banner with the water-drop friends picture', () => {
  const home = readFileSync('src/presentation/UnifiedHomePage.tsx', 'utf8');
  assert.match(home, /className="entry-head home-sky"><span className="home-sky-art" aria-hidden="true"><img src="\/images\/home-hero-1600\.webp" srcSet="\/images\/home-hero-900\.webp 900w, \/images\/home-hero-1600\.webp 1600w"/);
  assert.match(home, /import '\.\/HomeSkyBanner\.css';/);
  for (const f of ['public/images/home-hero-900.webp', 'public/images/home-hero-1600.webp']) assert.ok(existsSync(f), f);
});
test('text side is lightened (and darkened in dark mode) so the title stays readable', () => {
  assert.match(css, /\.entry-head\.home-sky::before\{[^}]*linear-gradient\(90deg,rgba\(246,251,255,\.97\)/);
  assert.match(css, /html\.dark-theme \.entry-head\.home-sky::before\{background:linear-gradient\(90deg,rgba\(22,26,30,\.94\)/);
});
test('on phones the picture is a strip above the text, and stays visible (a bit shorter) with large text', () => {
  assert.match(css, /@media\(max-width:900px\)\{[^]*\.home-sky-art\{position:relative;inset:auto;z-index:0;height:clamp\(150px,30vw,250px\)\}/);
  assert.match(css, /html:is\(\[data-text-scale=large\],\[data-text-scale=xlarge\]\) \.home-sky-art\{height:clamp\(120px,26vw,200px\)\}/);
  assert.doesNotMatch(css, /home-sky-art\{display:none\}/);
});
