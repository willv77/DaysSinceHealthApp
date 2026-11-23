'use strict';

const HISTORY_DAYS = 28, TOAST_MS = 5000, BANNER_MS = 8000;
const KEY = 'daysSince.v1';
// Day simulation is a desktop-only testing aid; touch devices always use the real date.
const SIM = matchMedia('(hover: hover) and (pointer: fine)').matches;
const fmtDay = n => new Date(n * 864e5).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });

// ---- Storage ----
function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d && Array.isArray(d.log)) {
      return {
        log: d.log.filter(e => e && ITEM[e.k] && /^\d{4}-\d\d-\d\d$/.test(e.d) && typeof e.u === 'string'),
        offset: Number.isInteger(d.offset) && d.offset > 0 ? d.offset : 0,
        start: /^\d{4}-\d\d-\d\d$/.test(d.start) ? d.start : null,
        notified: typeof d.notified === 'string' ? d.notified : null,
      };
    }
  } catch { /* corrupt or unavailable storage: start fresh */ }
  return { log: [], offset: 0, start: null, notified: null };
}
let db = load();
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private mode / quota: keep in memory */ }
}
const todayNum = () => realToday() + (SIM ? db.offset : 0);
if (!db.start) { db.start = keyFromNum(todayNum()); save(); }

const itemHistory = (id, from, to) => scoreHistory(db.log, id, from, to);
const current = id => { const t = todayNum(); return itemHistory(id, t, t)[0]; };

// ---- UI state ----
let tab = 'today', toastTimer, bannerTimer;
const $ = id => document.getElementById(id);
// 2x2 Yoga & Mind grid: body on the left, mind on the right.
const MIND_TILES = ['yoga', 'meditation', 'balance', 'daydream'];

function bodySVG() {
  let s = `<svg class="body" viewBox="20 20 160 375" xmlns="http://www.w3.org/2000/svg">
  <g fill="#3b4352" stroke="#3b4352" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="100" cy="40" r="22" stroke="none"/>
    <line x1="100" y1="60" x2="100" y2="86" stroke-width="16"/>
    <path d="M64 86 Q100 76 136 86 L128 150 Q130 180 122 210 L78 210 Q70 180 72 150 Z" stroke-width="4"/>
    <path d="M68 92 L54 142 L46 192" fill="none" stroke-width="16"/>
    <path d="M132 92 L146 142 L154 192" fill="none" stroke-width="16"/>
    <circle cx="43" cy="206" r="9" stroke="none"/><circle cx="157" cy="206" r="9" stroke="none"/>
    <path d="M88 208 L86 282 L86 360" fill="none" stroke-width="22"/>
    <path d="M112 208 L114 282 L114 360" fill="none" stroke-width="22"/>
    <ellipse cx="80" cy="376" rx="14" ry="7" stroke="none"/><ellipse cx="120" cy="376" rx="14" ry="7" stroke="none"/>
  </g>
  <line x1="100" y1="96" x2="100" y2="192" stroke="#fff" stroke-opacity=".25" stroke-width="3" stroke-dasharray="3 5"/>`;
  for (const j of JOINTS) {
    const { s: sc, since } = current(j.id), c = col(sc), done = since === 0;
    s += `<g data-item="${j.id}" data-band="${band(sc)}"${done ? ' data-done="1"' : ''} role="button" tabindex="0" aria-label="${j.name}${done ? ' (logged today)' : ''}">`;
    for (const [x, y] of j.pts) {
      s += `<circle cx="${x}" cy="${y}" r="20" fill="transparent"/>`;
      s += j.spine
        ? `<rect x="${x - 9}" y="${y - 15}" width="18" height="30" rx="7" fill="${c}" stroke="#fff" stroke-width="2.5"/>`
        : `<circle cx="${x}" cy="${y}" r="10" fill="${c}" stroke="#fff" stroke-width="2.5"/>`;
      if (done) {
        s += `<path class="check" d="M${x - 4.5} ${y + 0.5} L${x - 1.2} ${y + 3.8} L${x + 4.8} ${y - 3.5}" fill="none" stroke="#0f172a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
    }
    s += `</g>`;
  }
  return s + `</svg>`;
}

function tile(id, cls, inner) {
  const { s, since } = current(id), c = col(s), done = since === 0;
  return `<button type="button" class="${cls}" data-item="${id}" data-band="${band(s)}"${done ? ' data-done="1"' : ''}
    aria-label="${ITEM[id].name}${done ? ' (logged today)' : ''}" style="border-color:${c};background:${c}1f">${inner(c)}${
    done ? `<span class="done" style="background:${c}" aria-hidden="true">&#10003;</span>` : ''}</button>`;
}

function todayPane() {
  return `<div class="row2">
      <section class="card"><h2>Mobility</h2>${bodySVG()}</section>
      <section class="card"><h2>Yoga &amp; Mind</h2><div class="mind">${MIND_TILES.map(id =>
        tile(id, 'mt', c => `${poseSVG(id, c)}<div class="nm">${ITEM[id].short}</div>`)).join('')}</div></section>
    </div>
    <section class="card"><h2>Strength</h2>
      <div class="sgrid">${STRENGTH.map(f => tile(f.id, 'st', c => `${poseSVG(f.id, c)}<div class="nm">${f.name}</div>`)).join('')}</div>
    </section>`;
}

function heatmap(ids, t, start) {
  const from = t - HISTORY_DAYS + 1;
  return `<div class="heat">${ids.map(id => `<span class="hl">${ITEM[id].name}</span>${
    itemHistory(id, from, t).map(h => `<i class="cell" data-band="${h.n < start ? 'none' : band(h.s)}"></i>`).join('')}`).join('')}</div>`;
}

function historyPane() {
  const t = todayNum(), start = dayNum(db.start);
  // Cards share the screen height in proportion to their row count (+1 for the heading).
  return GROUPS.map(g => `<section class="card hcard" data-group="${g.id}" style="flex:${g.ids.length + 1} 1 0"><h3>${g.name}</h3>${
    heatmap(g.ids, t, start)}</section>`).join('');
}

const TITLES = { today: 'Wellness', history: 'History' };
function render() {
  const t = todayNum();
  $('title').textContent = TITLES[tab];
  const date = $('date');
  date.innerHTML = fmtDay(t) + (SIM && db.offset ? `<b>+${db.offset}d</b>` : '');
  date.disabled = !SIM;
  date.classList.toggle('sim', SIM);
  date.title = SIM ? 'Click: advance one day (simulation). Shift+click: back to today.' : '';
  const pane = (id, html) => `<div class="pane" id="pane-${id}"${tab === id ? '' : ' hidden'}>${html}</div>`;
  $('app').innerHTML = pane('today', todayPane()) + pane('history', historyPane());
  document.querySelectorAll('nav [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  $('undo').disabled = !logsOn(db.log, t).length;
  if (!$('sheet').hidden) renderPop();
  renderBell();
  updateBadge();
}

// ---- Undo popup: today's logs in the order they were made; any of them can be undone ----
function renderPop() {
  const logs = logsOn(db.log, todayNum());
  if (!logs.length) { closePop(); return; }
  $('popList').innerHTML = logs.map((e, i) => `<li><span>${ITEM[e.k].name}</span><button type="button" data-undo="${i}"
    aria-label="Undo ${ITEM[e.k].name}">Undo</button></li>`).join('');
}

function openPop() {
  $('sheet').hidden = false;
  renderPop();
  $('popClose').focus({ preventScroll: true });
}

function closePop() {
  if ($('sheet').hidden) return;
  $('sheet').hidden = true;
  if (!$('undo').disabled) $('undo').focus({ preventScroll: true });
}

function toast(msg) {
  $('notif').classList.remove('show');
  $('toastMsg').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), TOAST_MS);
}

// ---- Notifications: no server, so they fire when the app is open at/after each 5:00 and 17:00 slot ----
const canNotify = () => 'Notification' in window && Notification.permission === 'granted';

function banner(n, label) {
  $('notifLabel').textContent = label;
  $('notifTitle').textContent = n.title;
  $('notifBody').textContent = n.body;
  $('toast').classList.remove('show');
  $('notif').classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => $('notif').classList.remove('show'), BANNER_MS);
}

function checkSlot() {
  const slot = currentSlot(new Date());
  if (db.notified === slot) return;
  const firstLaunch = db.notified === null;
  db.notified = slot;
  save();
  if (firstLaunch) return;
  const n = dailySummary(db.log, realToday());
  banner(n, slot.endsWith('T05') ? '5:00 AM' : '5:00 PM');
  if (canNotify() && navigator.serviceWorker) {
    navigator.serviceWorker.ready
      .then(r => r.showNotification(n.title, { body: n.body, tag: 'daily', icon: 'icons/icon-192.png' }))
      .catch(() => {});
  }
}

function updateBadge() {
  if (!navigator.setAppBadge) return;
  const reds = dailySummary(db.log, realToday()).badge;
  (reds ? navigator.setAppBadge(reds) : navigator.clearAppBadge()).catch(() => {});
}

function renderBell() {
  const on = canNotify();
  $('bell').textContent = on ? '\u{1F514}' : '\u{1F515}';
  $('bell').dataset.on = on ? '1' : '0';
  $('bell').setAttribute('aria-label', on ? 'Notifications on' : 'Turn on notifications');
}

async function enableNotifications() {
  // iOS only exposes notifications to Home Screen web apps.
  if (!('Notification' in window)) { toast('Add to Home Screen to get notifications'); return; }
  if (Notification.permission === 'default') await Notification.requestPermission();
  renderBell();
  toast(canNotify() ? 'Notifications on (5 AM & 5 PM)' : 'Notifications are off in Settings');
}

function logTap(id) {
  if (current(id).since === 0) return; // one tap per item per day
  const u = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  db.log.push({ k: id, d: keyFromNum(todayNum()), u });
  save(); render();
}

function undo(i) {
  const e = logsOn(db.log, todayNum())[i];
  if (!e) return;
  db.log = db.log.filter(x => x !== e);
  save(); render();
}

document.addEventListener('click', e => {
  if (e.target.id === 'sheet') { closePop(); return; } // tap outside the popup
  const t = e.target.closest('[data-tab], [data-item], [data-undo], #undo, #popClose, #date, #bell');
  if (!t) return;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); }
  else if (t.dataset.item) logTap(t.dataset.item);
  else if (t.dataset.undo) undo(Number(t.dataset.undo));
  else if (t.id === 'undo') openPop();
  else if (t.id === 'popClose') closePop();
  else if (t.id === 'bell') enableNotifications();
  else if (t.id === 'date' && SIM) {
    db.offset = e.shiftKey ? 0 : db.offset + 1;
    save(); render();
    if (db.offset) banner(dailySummary(db.log, todayNum()), `5:00 AM preview \u00b7 ${fmtDay(todayNum())}`);
    else toast('Back to today');
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closePop(); return; }
  const t = e.target.closest && e.target.closest('svg [data-item]');
  if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); logTap(t.dataset.item); }
});

// Refresh at each local midnight / 5:00 / 17:00 and whenever the app returns to the foreground.
function scheduleTick() {
  const now = new Date();
  setTimeout(() => { render(); checkSlot(); scheduleTick(); }, nextBoundary(now) - now.getTime());
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) { render(); checkSlot(); } });

render();
checkSlot();
scheduleTick();
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
