# Text layout audit — 2026-11-10

## Changes

- Classroom package choices now put the duration heading above the full lesson breakdown. A dedicated responsive grid and 16px corners prevent narrow flex columns and oversized pill ends. Saved lesson choices use the same readable corners.
- The advanced catalog and its recommendation cards show full activity names, descriptions, categories and achievement summaries instead of line clamps or ellipses.
- The manual lesson planner's activity picker uses full-width block buttons, a shrinking text column, wrapping metadata and complete descriptions. This fixes content overflowing inside the scrollable picker even when the document itself did not overflow.
- Generated lesson self-assessment badges wrap onto another row on narrow screens.
- Game toolbar names and learning goals wrap. A cleaned-up ResizeObserver reserves the toolbar's measured height so wrapped headings cannot cover the game below, including after viewport or font changes.

## Verification

Actual browser DOM measurements were made at requested widths 320, 360, 768 and 1440 CSS px (available content widths may be 15px smaller due to the scrollbar). The final audit contains 312 screen/state/width checks with no remaining document overflow or clipped text detected in the measured elements:

| Coverage | Checks |
| --- | ---: |
| 13 main routes, including teacher/student entry, catalog, guide, device check, privacy and records | 52 |
| Isolated classroom setup, operations and administrator member fixtures | 12 |
| All 24 advanced catalog pages at 360px, covering 214 distinct activity cards | 24 |
| All three classroom setup stages in an isolated fixture | 12 |
| Manual planner's activity picker and generated result | 8 |
| Expanded student QR instructions, without starting the camera | 4 |
| Ten studio tools, all three input stages in an isolated fixture | 120 |
| Ten games, preparation and mounted screens; all six flagship games also entered local practice | 80 |

The ten games were the six flagship expeditions, `phone-play-084`, `space-occupier`, `body-rhythm-orchestrator` and `cpr-compression-110`. Header height and content placement were measured during resizing. Intentionally hidden 1px screen-reader labels were excluded. The rhythm game's decorative musical-note glyph extends its line box with visible overflow on itself and its parent; it is not clipped and is recorded separately.

Build, full ESLint, runtime regressions (22), current regression tests (12), classroom refresh tests (5), and whitespace checks passed. The older `test:ui` script stopped at its obsolete `스탑워치` catalog-name assertion; it is not counted as passing. The browser checks above use the current activity names and flows.

## Boundaries

- Authenticated management and studio input screens were tested using actual components in loopback-only synthetic fixtures with remote auth/DB writes blocked. This is layout verification, not a new production authentication or permissions test.
- No real classroom was created or edited, no AI generation was requested, and no camera or microphone was started.
- These are browser viewport checks, not new physical Galaxy S25, tablet hardware or classroom effectiveness tests. All 214 catalog cards were checked, but all 214 games were not played through to completion.
- Only the main application source changed. The separate teacher studio was inspected through its existing components; it does not need a new deployment for this change.

Detailed measurements and screenshots are stored in the workspace outputs, outside the deployed repository.
