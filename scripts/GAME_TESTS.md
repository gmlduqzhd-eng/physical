# Game verification

Start the Vite development server with `npm run dev -- --host 127.0.0.1`. These scripts use an existing Playwright installation and Chrome, without adding a production dependency.

```powershell
$env:PLAYWRIGHT_MODULE = 'C:/path/to/playwright'
node scripts/game-regressions.cjs http://127.0.0.1:5173
node scripts/game-catalog-smoke.cjs http://127.0.0.1:5173
```

If Playwright is already available to Node, omit `PLAYWRIGHT_MODULE`. Set `BROWSER_CHANNEL` to another installed Chromium browser channel if needed.

`game-regressions.cjs` mounts isolated game fixtures through Vite with React StrictMode. Its 17 checks cover drawing accuracy, multi-touch input races, skipped mission rewards, elimination cleanup, microphone startup and late permission cleanup, complete breathing phase durations and replay, late pose confirmation, expression activity steps, tilt scoring, sound goalball round locking, tactical defense rounds, post-exercise pulse measurement, and YouTube player replacement. It never creates a classroom or sends scores to Supabase.

`game-catalog-smoke.cjs` reads the current catalog from source and opens every `/play/:type` at 390×844 and 1440×900. Each case selects normal difficulty, skips the external ready countdown, and checks that the initial game renders without a browser exception, blank screen, unknown route, or page overflow. It records console errors for review. This covers game startup; it does not claim to complete every physical activity or verify every external YouTube video.

The catalog script also accepts a comma-separated game subset as its second argument:

```powershell
node scripts/game-catalog-smoke.cjs http://127.0.0.1:5173 scream,multi_touch,circle_draw
```

The same catalog startup check can target a preview or production URL after deployment. JSON reports and screenshots are saved under the ignored `test-results/game-catalog/` directory. Set `TEST_OUTPUT_DIR` to save them elsewhere. The regression fixtures require the development server.
