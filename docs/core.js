'use strict';
// Items, dates, scoring and the daily notification text; kept free of DOM code.

const JOINTS = [
  { id: 'neck', name: 'Neck', pts: [[100, 74]] },
  { id: 'shoulders', name: 'Shoulders', pts: [[68, 90], [132, 90]] },
  { id: 'elbows', name: 'Elbows', pts: [[54, 142], [146, 142]] },
  { id: 'wrists', name: 'Wrists', pts: [[46, 192], [154, 192]] },
  { id: 'upperSpine', name: 'Upper spine', pts: [[100, 114]], spine: true },
  { id: 'lowerSpine', name: 'Lower spine', pts: [[100, 162]], spine: true },
  { id: 'hips', name: 'Hips', pts: [[86, 204], [114, 204]] },
  { id: 'knees', name: 'Knees', pts: [[86, 282], [114, 282]] },
  { id: 'ankles', name: 'Ankles', pts: [[86, 360], [114, 360]] },
];
const STRENGTH = [
  { id: 'push', name: 'Push' }, { id: 'pull', name: 'Pull' }, { id: 'squat', name: 'Squat' },
  { id: 'hinge', name: 'Hinge' }, { id: 'carry', name: 'Loaded carry' }, { id: 'getup', name: 'Get-up' },
];
const MIND = [
  { id: 'yoga', name: 'Isometric Yoga', short: 'Yoga', max: 5 },
  { id: 'balance', name: 'Balance', short: 'Balance', max: 4 },
  { id: 'meditation', name: 'Meditation', short: 'Meditation', max: 4 },
  { id: 'daydream', name: 'Active Imagination', short: 'Active Imagination', max: 4 },
];
// A log sets the score to the item's max; max 4 items turn yellow one day sooner than max 5 items.
const ITEMS = [
  ...JOINTS.map(j => ({ id: j.id, name: j.name, max: 4, group: 'mob' })),
  ...MIND.map(m => ({ ...m, group: 'mind' })),
  ...STRENGTH.map(f => ({ ...f, max: 5, group: 'str' })),
];
const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));
const GROUPS = [
  { id: 'mob', name: 'Mobility' },
  { id: 'mind', name: 'Yoga & Mind' },
  { id: 'str', name: 'Strength' },
].map(g => ({ ...g, ids: ITEMS.filter(i => i.group === g.id).map(i => i.id) }));

const COLORS = { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' };
const band = s => (s >= 4 ? 'green' : s === 3 ? 'yellow' : s === 2 ? 'orange' : 'red');
const col = s => COLORS[band(s)];

// ---- Dates: whole local days, numbered so that differences are DST-safe ----
const pad = n => String(n).padStart(2, '0');
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const dayNum = k => { const [y, m, d] = k.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const keyFromNum = n => new Date(n * 864e5).toISOString().slice(0, 10);
const realToday = () => dayNum(keyOf(new Date()));
// The log is append-only, so this is also the order the items were logged in.
const logsOn = (log, n) => log.filter(e => e.d === keyFromNum(n));

// ---- Scoring: replay the log one day at a time; a log sets the item's max, otherwise -1 per day ----
const step = (s, tapped, max) => (tapped ? max : Math.max(0, s - 1));

function scoreHistory(log, id, from, to) {
  const taps = new Set();
  let first = from;
  for (const e of log) {
    if (e.k !== id) continue;
    const n = dayNum(e.d);
    if (n > to) continue;
    taps.add(n);
    first = Math.min(first, n);
  }
  const out = [];
  let s = 0, last = null;
  for (let n = first; n <= to; n++) {
    const tapped = taps.has(n);
    s = step(s, tapped, ITEM[id].max);
    if (tapped) last = n;
    if (n >= from) out.push({ n, s, since: last === null ? null : n - last });
  }
  return out;
}

// Notification style A: reds then oranges; yellows only when there are no reds or oranges.
function dailySummary(log, t) {
  const by = { red: [], orange: [], yellow: [] };
  for (const it of ITEMS) by[band(scoreHistory(log, it.id, t, t)[0].s)]?.push(it.name);
  const { red: r, orange: o, yellow: y } = by;
  if (r.length) {
    return {
      title: `🔴 ${r.length} red` + (o.length ? ` · 🟠 ${o.length} orange` : ''),
      body: [`Red: ${r.join(', ')}`, o.length ? `Orange: ${o.join(', ')}` : ''].filter(Boolean).join('\n'),
      badge: r.length,
    };
  }
  if (o.length) return { title: `🟠 ${o.length} orange`, body: o.join(', '), badge: 0 };
  if (y.length) return { title: `🟡 ${y.length} turning yellow`, body: y.join(', '), badge: 0 };
  return { title: '🟢 All green', body: 'Nothing due today.', badge: 0 };
}

// ---- Notification slots: the latest 5:00 or 17:00 at or before `now` ----
const SLOT_HOURS = [5, 17];
function currentSlot(now) {
  const d = new Date(now);
  let hour = [...SLOT_HOURS].reverse().find(h => now.getHours() >= h);
  if (hour === undefined) { d.setDate(d.getDate() - 1); hour = SLOT_HOURS[SLOT_HOURS.length - 1]; }
  return `${keyOf(d)}T${pad(hour)}`;
}
// Next local midnight, 5:00 or 17:00 after `now`, when the screen or a notification may need updating.
function nextBoundary(now) {
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  return [new Date(y, m, d, 5), new Date(y, m, d, 17), new Date(y, m, d + 1, 0)]
    .find(t => t > now).getTime() + 1000;
}
