# Balance and Wellness

A small, static web app for iPhone that tracks how recently you've worked on mobility, yoga & mind, and strength. Each item turns from green to red as days pass without it. Everything is stored on the device (`localStorage`). There is no server or account.

## Using it

- **Today** tab: tap a joint on the body, a Yoga & Mind panel, or a Strength panel to log it for today.
  - Each item can be logged **once per day**. A check mark shows it's done.
- **↶ undo** (header): greyed out until something is logged today. Tap it to see today's logs in the order you made them, and **Undo** any of them.
- **History** tab: a 4-week colour heatmap per section, filling the screen.
- **🔔 bell** (header): turn on notifications (see below).

### Items

| Section | Items |
|---|---|
| Mobility | Neck, Shoulders, Elbows, Wrists, Upper spine, Lower spine, Hips, Knees, Ankles |
| Yoga & Mind | Isometric Yoga, Balance, Meditation, Active Imagination |
| Strength | Push, Pull, Squat, Hinge, Loaded carry, Get-up |

On the Today screen, Yoga & Mind is a 2×2 grid: Yoga and Balance on the left, Meditation and Active Imagination on the right.

### Scoring

The score is internal and only the colour is shown.

- Logging an item sets it to its **max**: **4** for Mobility joints, Balance, Meditation and Active Imagination; **5** for Isometric Yoga and Strength.
- Each midnight it drops by **1**, down to a minimum of 0.

| Score | 4–5 | 3 | 2 | 0–1 |
|---|---|---|---|---|
| Colour | green | yellow | orange | red |

| Days since logged | 0 | 1 | 2 | 3 | 4+ |
|---|---|---|---|---|---|
| Mobility, Balance, Meditation, Active Imagination | green | yellow | orange | red | red |
| Isometric Yoga, Strength | green | green | yellow | orange | red |

### Notifications (5 AM and 5 PM)

The summary lists reds first, then oranges. Yellows are only mentioned when nothing is red or orange.

| Situation | Title | Body |
|---|---|---|
| Any reds | `🔴 3 red · 🟠 2 orange` | `Red: Hips, Knees, Pull` / `Orange: Wrists, Meditation` |
| Oranges only | `🟠 2 orange` | `Wrists, Meditation` |
| Yellows only | `🟡 2 turning yellow` | `Neck, Isometric Yoga` |
| All green | `🟢 All green` | `Nothing due today.` |

The app icon badge shows the number of reds.

**How delivery works.** GitHub Pages is static, and iOS can only wake a web app with a push from a server. So the notification fires the **first time the app is open at or after 5:00 and 17:00** (once per slot, not on the very first launch). It shows:

- an in-app banner;
- a system notification as well, if notifications are allowed.

To allow notifications on iPhone (iOS 16.4+):

1. Add the app to the Home Screen and open it from there.
2. Tap the 🔕 bell in the header and allow notifications. The bell turns to 🔔.

> An iOS Shortcuts *Time of Day* automation can open a URL at 5:00 / 17:00. Note that Safari and the Home Screen app keep **separate** storage. A Shortcut that opens the URL in Safari will not see your Home Screen data.

### Desktop day simulation

On a desktop browser (mouse/trackpad), click the date in the header to move forward one day. A `+Nd` badge shows the offset, and a **5:00 AM notification preview** for the simulated day appears at the top. **Shift+click** returns to today. This is disabled on phones and tablets.

## Deploy (GitHub Pages, no Actions)

The deployed site is the `docs/` folder.

1. Push to GitHub.
2. In **Settings → Pages**, choose **Deploy from a branch**, branch **`main`**, folder **`/docs`**.
3. Open the Pages URL on iPhone in Safari, then **Share → Add to Home Screen**.

It runs full-screen with the ring + kettlebell icon and works offline after the first visit (service worker). When you change any file in `docs/`, bump `CACHE` in `docs/sw.js` so installed copies refresh.

## Development

No build step: plain HTML/CSS/JS.

```
docs/                  deployed site (GitHub Pages)
  index.html           app shell, iOS/PWA meta tags, CSP
  core.js              items, dates, scoring, notification text and slots (no DOM)
  app.js               storage, rendering, undo, notifications, day simulation
  figures.js           line-figure icons for panels
  style.css            layout (fits one screen, no scrolling)
  sw.js                offline cache, notification click
  manifest.webmanifest PWA manifest
  icons/               icon.svg + generated PNGs
tests/                 Playwright tests (pytest)
tools/make_icons.py    renders icon.svg to 180/192/512 PNGs
mockups/               design explorations
```

### Run locally

```powershell
python -m http.server 8000 --directory docs
# open http://localhost:8000
```

### Tests

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m playwright install chromium webkit
.\.venv\Scripts\python -m pytest tests -q
```

Tests serve `docs/` locally and run in Chromium (desktop) and WebKit with iPhone 13 and iPhone SE (3rd gen, 375×667) emulation. They cover:

- scoring, decay and one log per day;
- the undo popup (today's logs in order, undo any), persistence and midnight rollover;
- the desktop-only simulation and notification preview;
- 5 AM / 5 PM notification slots and system notifications;
- the no-scroll layout (including the undo popup with every item logged), PWA assets and offline use.

If `playwright install` fails with `unable to get local issuer certificate` (corporate TLS inspection), export the Windows trusted certificates and point Node at them:

```powershell
$pem = "$env:TEMP\win-roots.pem"
Get-ChildItem Cert:\LocalMachine\Root, Cert:\CurrentUser\Root, Cert:\LocalMachine\CA | ForEach-Object {
  "-----BEGIN CERTIFICATE-----`n$([Convert]::ToBase64String($_.RawData, 'InsertLineBreaks'))`n-----END CERTIFICATE-----"
} | Set-Content $pem -Encoding ascii
$env:NODE_EXTRA_CA_CERTS = $pem
.\.venv\Scripts\python -m playwright install chromium webkit
```

### Icons

After editing `docs/icons/icon.svg`:

```powershell
.\.venv\Scripts\python tools\make_icons.py
```

### Data format

`localStorage["daysSince.v1"]`:

```json
{ "log": [{ "k": "neck", "d": "2026-11-22", "u": "unique-id" }], "offset": 0, "start": "2026-11-22", "notified": "2026-11-22T05" }
```

Scores and colours are recomputed from the log, so changing the scoring rules re-colours existing history.
