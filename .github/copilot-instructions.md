# Copilot instructions: Balance and Wellness

Static iPhone web app (PWA) tracking how recently you did mobility, yoga & mind, and strength work. Deployed with GitHub Pages from `main` / `docs/`. There is no server, no build step and no GitHub Actions.

## Layout
- `docs/` is the deployed site. `core.js` holds items, dates, scoring, notification text and slots, with no DOM code. `app.js` handles UI, storage, undo, notifications and day simulation. `figures.js` holds the line icons, `style.css` the styles, `sw.js` the offline cache.
- `tests/`: Playwright + pytest (Chromium desktop, WebKit iPhone 13 / SE emulation). `tools/`: icon generation. `mockups/`: design explorations, not deployed.

## Rules that must hold
- Data is local only: `localStorage["daysSince.v1"]` = `{ log: [{k, d, u}], offset, start, notified }`. Scores are always recomputed from `log`. Never store derived scores.
- Scoring: a log sets the item's `max` (5 for mobility/balance/meditation/imagination, 5 for yoga/strength), then −1 per midnight, min 0. Colours: 4–5 green, 3 yellow, 2 orange, 0–1 red. Scores and day counts are never shown on the Today screen, only colours.
- One log per item per day. The header undo button is disabled until something is logged today; its popup lists today's logs in log order, and any of them can be undone.
- Every view must fit an iPhone SE screen (375×667) without scrolling, including the undo popup with every item logged.
- Day simulation (click the header date) is desktop only (`(hover: hover) and (pointer: fine)`) and never affects real notifications.
- Notifications fire once per 5:00 / 17:00 slot when the app is open (no push server). Text comes from `dailySummary()` in `core.js`: reds, then oranges, yellows only if neither.

## Conventions
- Plain ES2020 scripts loaded with `<script>` (no modules, no frameworks, no dependencies). Keep the CSP in `index.html` (`script-src 'self'`): no inline scripts or external resources.
- Build HTML only from constants; never insert user-provided text with `innerHTML`.
- Comments are rare and one line, explaining *why*, not *what*.
- When changing any file in `docs/`, bump `CACHE` in `docs/sw.js`.
- Add or update Playwright tests for behaviour changes; run `.\.venv\Scripts\python -m pytest tests -q` and keep it green.
- Use the desktop day simulation in tests (`#date` click) rather than mocking time, except for real-clock behaviour (use `page.clock`).
- Keep `README.md` in sync when behaviour, scoring or setup changes.
