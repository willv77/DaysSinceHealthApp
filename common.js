// Shared mockup helpers: sample data, SVG figures, charts, tap + undo behaviour.
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
  { id: 'push', name: 'Push' },
  { id: 'pull', name: 'Pull' },
  { id: 'squat', name: 'Squat' },
  { id: 'hinge', name: 'Hinge' },
  { id: 'carry', name: 'Loaded carry' },
  { id: 'getup', name: 'Get-up' },
];
const NAMES = Object.fromEntries([...JOINTS, { id: 'yoga', name: 'Isometric Yoga' }, ...STRENGTH].map(j => [j.id, j.name]));
const amtFor = id => (JOINTS.some(j => j.id === id) ? 2 : 5);

// s = internal score (drives colour only, never shown), d = days since last log
const state = {
  neck: { s: 5, d: 0 }, shoulders: { s: 4, d: 1 }, elbows: { s: 3, d: 2 }, wrists: { s: 1, d: 6 },
  upperSpine: { s: 2, d: 3 }, lowerSpine: { s: 4, d: 1 }, hips: { s: 0, d: 9 }, knees: { s: 3, d: 2 },
  ankles: { s: 1, d: 4 }, yoga: { s: 3, d: 2 },
  push: { s: 5, d: 0 }, pull: { s: 4, d: 1 }, squat: { s: 3, d: 2 }, hinge: { s: 2, d: 3 }, carry: { s: 0, d: 8 }, getup: { s: 1, d: 4 },
};

const COLORS = { green: '#22c55e', yellow: '#eab308', orange: '#f97316', red: '#ef4444' };
const band = s => (s >= 4 ? 'green' : s === 3 ? 'yellow' : s === 2 ? 'orange' : 'red');
const col = s => COLORS[band(s)];
const worstStrength = () => STRENGTH.reduce((w, f) => (state[f.id].s < state[w.id].s ? f : w), STRENGTH[0]);

const CALLOUT = {
  neck: ['L', 62], elbows: ['L', 140], wrists: ['L', 200], knees: ['L', 282],
  shoulders: ['R', 78], upperSpine: ['R', 122], lowerSpine: ['R', 166], hips: ['R', 214], ankles: ['R', 352],
};

function bodySVG(o = {}) {
  const sil = o.sil || '#3b4352';
  const vb = o.callouts ? '-98 0 396 400' : '20 20 160 375';
  let s = `<svg class="body" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
  <g fill="${sil}" stroke="${sil}" stroke-linecap="round" stroke-linejoin="round">
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
  <line x1="100" y1="96" x2="100" y2="192" stroke="#ffffff" stroke-opacity=".25" stroke-width="3" stroke-dasharray="3 5"/>`;
  for (const j of JOINTS) {
    const st = state[j.id];
    if (o.callouts) {
      const [side, ly] = CALLOUT[j.id];
      const [px, py] = side === 'L' ? j.pts[0] : j.pts[j.pts.length - 1];
      const lx = side === 'L' ? -8 : 208;
      const tx = side === 'L' ? -94 : 214;
      s += `<g data-bump="${j.id}" class="callout">
        <polyline points="${lx},${ly} ${side === 'L' ? lx + 10 : lx - 10},${ly} ${px},${py}" fill="none" stroke="${o.lead || '#94a3b8'}" stroke-width="1"/>
        <rect x="${tx - 4}" y="${ly - 12}" width="86" height="24" rx="12" fill="${col(st.s)}"/>
        <text x="${tx + 39}" y="${ly + 4}" font-size="11.5" font-weight="600" text-anchor="middle" fill="#0f172a">${j.name}</text>
      </g>`;
    }
    s += `<g class="joint" data-bump="${j.id}">`;
    for (const [x, y] of j.pts) {
      s += `<circle cx="${x}" cy="${y}" r="20" fill="transparent"/>`;
      s += j.spine
        ? `<rect x="${x - 9}" y="${y - 15}" width="18" height="30" rx="7" fill="${col(st.s)}" stroke="#fff" stroke-width="2.5"/>`
        : `<circle cx="${x}" cy="${y}" r="10" fill="${col(st.s)}" stroke="#fff" stroke-width="2.5"/>`;
    }
    s += `</g>`;
  }
  return s + `</svg>`;
}

function yogaSVG(c) {
  return `<svg viewBox="0 0 200 200" class="fig" xmlns="http://www.w3.org/2000/svg">
  <g stroke="${c}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <line x1="22" y1="78" x2="178" y2="78"/>
    <line x1="100" y1="66" x2="100" y2="122"/>
    <polyline points="100,122 142,136 146,180"/>
    <polyline points="100,122 52,180"/>
    <line x1="132" y1="186" x2="160" y2="186" stroke-width="9"/>
    <line x1="40" y1="186" x2="62" y2="182" stroke-width="9"/>
  </g>
  <circle cx="100" cy="42" r="17" fill="${c}"/>
  <line x1="10" y1="194" x2="190" y2="194" stroke="${c}" stroke-opacity=".3" stroke-width="3"/>
  </svg>`;
}

function strengthSVG(c) {
  return `<svg viewBox="0 0 200 200" class="fig" xmlns="http://www.w3.org/2000/svg">
  <line x1="18" y1="28" x2="182" y2="28" stroke="${c}" stroke-width="6" stroke-linecap="round"/>
  <rect x="22" y="8" width="12" height="40" rx="3" fill="${c}"/><rect x="36" y="14" width="8" height="28" rx="2" fill="${c}"/>
  <rect x="166" y="8" width="12" height="40" rx="3" fill="${c}"/><rect x="156" y="14" width="8" height="28" rx="2" fill="${c}"/>
  <g stroke="${c}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <polyline points="62,30 66,62 84,88"/>
    <polyline points="138,30 134,62 116,88"/>
    <line x1="100" y1="86" x2="100" y2="136"/>
    <polyline points="100,136 78,160 76,186"/>
    <polyline points="100,136 122,160 124,186"/>
  </g>
  <circle cx="100" cy="64" r="16" fill="${c}"/>
  <line x1="10" y1="194" x2="190" y2="194" stroke="${c}" stroke-opacity=".3" stroke-width="3"/>
  </svg>`;
}

function facetSVG(id, c) {
  const g = (body, head) => `<svg viewBox="0 0 200 200" class="fig" xmlns="http://www.w3.org/2000/svg">
  <g stroke="${c}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round" fill="none">${body}</g>
  <circle cx="${head[0]}" cy="${head[1]}" r="16" fill="${c}"/>
  <line x1="10" y1="194" x2="190" y2="194" stroke="${c}" stroke-opacity=".3" stroke-width="3"/></svg>`;
  switch (id) {
    case 'push': return g(`<line x1="56" y1="114" x2="122" y2="134"/><line x1="122" y1="134" x2="178" y2="180"/>
      <line x1="68" y1="118" x2="68" y2="184"/>`, [38, 104]);
    case 'pull': return g(`<line x1="24" y1="20" x2="176" y2="20" stroke-width="6"/>
      <polyline points="64,22 68,66 90,84"/><polyline points="136,22 132,66 110,84"/>
      <line x1="100" y1="80" x2="100" y2="136"/><polyline points="100,136 86,168 100,188"/><polyline points="100,136 114,168 118,188"/>`, [100, 56]);
    case 'squat': return g(`<line x1="102" y1="76" x2="132" y2="130"/><line x1="104" y1="84" x2="52" y2="98"/>
      <line x1="132" y1="130" x2="78" y2="138"/><line x1="78" y1="138" x2="94" y2="184"/>`, [92, 56]);
    case 'hinge': return g(`<line x1="72" y1="92" x2="132" y2="104"/><line x1="76" y1="96" x2="80" y2="150"/>
      <polyline points="132,104 118,146 122,186"/>
      <line x1="34" y1="152" x2="166" y2="152" stroke-width="6"/>
      <line x1="36" y1="128" x2="36" y2="176" stroke-width="12"/><line x1="164" y1="128" x2="164" y2="176" stroke-width="12"/>`, [54, 80]);
    case 'carry': return g(`<line x1="100" y1="56" x2="100" y2="120"/><line x1="90" y1="64" x2="74" y2="124"/><line x1="110" y1="64" x2="126" y2="124"/>
      <line x1="100" y1="120" x2="82" y2="186"/><line x1="100" y1="120" x2="120" y2="186"/>
      <circle cx="72" cy="144" r="10" fill="${c}" stroke-width="6"/><circle cx="128" cy="144" r="10" fill="${c}" stroke-width="6"/>`, [100, 36]);
    case 'getup': return g(`<line x1="100" y1="62" x2="100" y2="118"/><line x1="106" y1="68" x2="122" y2="26"/>
      <line x1="94" y1="70" x2="72" y2="112"/>
      <polyline points="100,118 140,124 142,186"/><polyline points="100,118 86,184 40,186"/>
      <circle cx="124" cy="14" r="8" fill="${c}" stroke-width="6"/>`, [100, 44]);
  }
}

const GROUPS = [
  ['Mobility', JOINTS.map(j => j.id)],
  ['Isometric Yoga', ['yoga']],
  ['Strength', STRENGTH.map(f => f.id)],
];

// Days-since numbers live only in the history/trends area, never on the main screen.
function daysList(o = {}, ids = Object.keys(state)) {
  return ids.map(id => `<div style="display:flex;justify-content:space-between;padding:5px 4px;border-bottom:1px solid ${o.line || '#ffffff14'}">
    <span>${NAMES[id]}</span><b style="color:${col(state[id].s)}">${state[id].d} d</b></div>`).join('');
}

// Deterministic sample history for chart previews.
function rng(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }
function history(days = 56) {
  const r = rng(7), out = {};
  for (const id of Object.keys(state)) {
    const amt = amtFor(id), p = id === 'yoga' ? 0.3 : amt === 5 ? 0.2 : 0.35;
    let s = 0, ds = 10; const scores = [], taps = [], since = [];
    for (let d = 0; d < days; d++) {
      if (d > 0) { s = Math.max(0, s - 1); ds++; }
      const tap = r() < p; if (tap) { s = Math.min(5, s + amt); ds = 0; }
      scores.push(s); taps.push(tap); since.push(ds);
    }
    out[id] = { scores, taps, since };
  }
  return out;
}
const HIST = history();

function heatmap(days = 28, o = {}, ids = Object.keys(state)) {
  const cw = 11, ch = 13, lw = 78, axis = o.axis !== false;
  let s = `<svg viewBox="0 0 ${lw + days * cw} ${ids.length * ch + (axis ? 14 : 0)}" class="chart">`;
  ids.forEach((id, i) => {
    s += `<text x="0" y="${i * ch + 10}" font-size="9" fill="${o.label || '#cbd5e1'}">${NAMES[id]}</text>`;
    HIST[id].scores.slice(-days).forEach((v, k) => {
      s += `<rect x="${lw + k * cw}" y="${i * ch}" width="${cw - 2}" height="${ch - 2}" rx="2" fill="${col(v)}" opacity=".85"/>`;
    });
  });
  if (axis) s += `<text x="${lw}" y="${ids.length * ch + 11}" font-size="8" fill="${o.label || '#94a3b8'}">4 weeks ago</text>
        <text x="${lw + days * cw - 2}" y="${ids.length * ch + 11}" font-size="8" text-anchor="end" fill="${o.label || '#94a3b8'}">today</text>`;
  return s + `</svg>`;
}

function daysChart(days = 30, o = {}) {
  const W = 340, H = 150, P = 22;
  const avg = ids => Array.from({ length: days }, (_, k) => {
    const idx = HIST.neck.since.length - days + k;
    return ids.reduce((a, id) => a + HIST[id].since[idx], 0) / ids.length;
  });
  const series = [
    ['Mobility avg', avg(JOINTS.map(j => j.id)), '#3b82f6'],
    ['Yoga', avg(['yoga']), '#a855f7'],
    ['Strength avg', avg(STRENGTH.map(f => f.id)), '#14b8a6'],
  ];
  const max = Math.ceil(Math.max(...series.flatMap(x => x[1])) / 2) * 2;
  const x = k => P + (k * (W - P - 6)) / (days - 1), y = v => H - P - (v * (H - P - 8)) / max;
  let s = `<svg viewBox="0 0 ${W} ${H + 16}" class="chart">`;
  for (let v = 0; v <= max; v += 2) s += `<line x1="${P}" x2="${W - 6}" y1="${y(v)}" y2="${y(v)}" stroke="${o.grid || '#e2e8f0'}"/><text x="${P - 6}" y="${y(v) + 3}" font-size="9" text-anchor="end" fill="#64748b">${v}</text>`;
  for (const [, data, c] of series) s += `<polyline fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" points="${data.map((v, k) => `${x(k)},${y(v)}`).join(' ')}"/>`;
  series.forEach(([n, , c], i) => { s += `<rect x="${P + i * 105}" y="${H + 3}" width="10" height="10" rx="2" fill="${c}"/><text x="${P + 14 + i * 105}" y="${H + 12}" font-size="10" fill="#475569">${n}</text>`; });
  return s + `</svg>`;
}

function weeklyBars(weeks = 8, o = {}) {
  const W = 340, H = 140, P = 20, bw = 26;
  const groups = [['Mobility', JOINTS.map(j => j.id), '#3b82f6'], ['Yoga', ['yoga'], '#a855f7'], ['Strength', STRENGTH.map(f => f.id), '#14b8a6']];
  const data = Array.from({ length: weeks }, (_, w) => groups.map(([, ids]) =>
    ids.reduce((a, id) => a + HIST[id].taps.slice(w * 7, w * 7 + 7).filter(Boolean).length, 0)));
  const max = Math.max(...data.map(r => r.reduce((a, b) => a + b, 0)));
  let s = `<svg viewBox="0 0 ${W} ${H + 18}" class="chart">`;
  data.forEach((row, w) => {
    let base = H - P; const x = P + w * ((W - P) / weeks) + 6;
    row.forEach((v, g) => { const h = (v * (H - P - 10)) / max; base -= h; s += `<rect x="${x}" y="${base}" width="${bw}" height="${h}" fill="${groups[g][2]}" rx="2"/>`; });
    s += `<text x="${x + bw / 2}" y="${H - 6}" font-size="9" text-anchor="middle" fill="${o.label || '#94a3b8'}">${w === weeks - 1 ? 'now' : `-${weeks - 1 - w}w`}</text>`;
  });
  groups.forEach(([n, , c], i) => { s += `<rect x="${P + i * 100}" y="${H + 5}" width="10" height="10" rx="2" fill="${c}"/><text x="${P + 14 + i * 100}" y="${H + 14}" font-size="10" fill="${o.label || '#cbd5e1'}">${n} taps</text>`; });
  return s + `</svg>`;
}

// Tap + undo (mockup only: in-memory)
const undoStack = [];
let toastTimer;
function bump(id) {
  undoStack.push({ id, prev: { ...state[id] } });
  state[id] = { s: Math.min(5, state[id].s + amtFor(id)), d: 0 };
  render();
  showToast('Saved');
}
function undo() {
  const u = undoStack.pop(); if (!u) return;
  state[u.id] = u.prev; render();
  showToast('Undone', false);
}
function showToast(msg, withUndo = true) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.innerHTML = `<span>${msg}</span>${withUndo ? '<button data-undo>Undo</button>' : ''}`;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 5000);
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-undo]')) return undo();
  const b = e.target.closest('[data-bump]');
  if (b) bump(b.dataset.bump);
});
