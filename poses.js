// Proportioned exercise poses rendered in line / pictogram / outline styles.
const BG = '#182030';
const bell = (x, y, c) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}"/><rect x="${x - 6}" y="${y - 19}" width="12" height="11" rx="5" fill="none" stroke="${c}" stroke-width="3.5"/>`;

// Solid blend of colour c over bg at alpha a, so outline interiors match tinted tiles exactly.
function mix(c, bg, a) {
  const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const [x, y] = [h(c), h(bg)];
  return '#' + x.map((v, i) => Math.round(v * a + y[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
}

// Side-view poses unless noted; 200x200 box, ground at y=194.
const POSES = {
  yoga: { // Warrior II, front view
    head: [100, 30], ground: true,
    limbs: [['torso', [[100, 46], [100, 108]]],
      ['arm', [[100, 54], [64, 56], [26, 56]]], ['arm', [[100, 54], [136, 56], [174, 56]]],
      ['leg', [[94, 108], [62, 142], [58, 184], [44, 184]]], ['leg', [[106, 108], [132, 146], [158, 184], [172, 184]]]],
  },
  push: { // top of push-up
    head: [20, 106], ground: true,
    limbs: [['arm', [[42, 120], [42, 152], [42, 184]]],
      ['torso', [[40, 118], [93, 145]]], ['leg', [[93, 145], [132, 164], [172, 184]]]],
  },
  pull: { // chin over bar, front view
    head: [100, 18],
    back: c => `<line x1="20" y1="32" x2="180" y2="32" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
    limbs: [['torso', [[100, 42], [100, 102]]],
      ['arm', [[90, 48], [58, 64], [62, 32]]], ['arm', [[110, 48], [142, 64], [138, 32]]],
      ['leg', [[93, 102], [86, 144], [84, 186]]], ['leg', [[107, 102], [114, 144], [116, 186]]]],
  },
  squat: { // goblet squat, bottom position
    head: [78, 64], ground: true,
    limbs: [['leg', [[112, 140], [68, 148], [96, 184], [80, 184]]], ['torso', [[112, 140], [88, 86]]],
      ['arm', [[88, 90], [72, 118], [62, 96]]]],
    front: c => bell(58, 100, c),
  },
  hinge: { // kettlebell deadlift
    head: [56, 83], ground: true,
    limbs: [['leg', [[130, 112], [104, 148], [100, 184], [84, 184]]], ['torso', [[130, 112], [76, 92]]],
      ['arm', [[76, 94], [78, 128], [80, 160]]]],
    front: c => bell(80, 180, c),
  },
  carry: { // farmer carry, front view
    head: [100, 24], ground: true,
    limbs: [['torso', [[100, 42], [100, 104]]],
      ['arm', [[90, 48], [80, 82], [74, 114]]], ['arm', [[110, 48], [120, 82], [126, 114]]],
      ['leg', [[93, 104], [86, 146], [82, 186]]], ['leg', [[107, 104], [114, 146], [118, 186]]]],
    front: c => bell(72, 134, c) + bell(128, 134, c),
  },
  getup: { // half-kneel, bell overhead
    head: [102, 56], ground: true,
    limbs: [['leg', [[112, 136], [118, 182], [160, 184]]], ['leg', [[112, 136], [72, 138], [72, 184], [58, 184]]],
      ['torso', [[112, 136], [110, 78]]], ['arm', [[108, 82], [100, 108], [78, 132]]], ['arm', [[110, 80], [122, 50], [132, 26]]]],
    front: c => bell(134, 18, c),
  },
};

const STYLES = {
  1: { name: '1 Line', w: { torso: 9, leg: 9, arm: 9 }, r: 14 },
  2: { name: '2 Pictogram', w: { torso: 22, leg: 16, arm: 12 }, r: 16, gap: true },
  3: { name: '3 Outline', w: { torso: 22, leg: 16, arm: 12 }, r: 16, outline: true },
};

function poseSVG(id, style, c, bg = BG) {
  const p = POSES[id], S = STYLES[style];
  const line = (pts, w, k) => `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${k}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const [hx, hy] = p.head;
  let s = `<svg viewBox="0 0 200 200" class="fig" xmlns="http://www.w3.org/2000/svg">`;
  if (p.ground) s += `<line x1="8" y1="194" x2="192" y2="194" stroke="${c}" stroke-opacity=".3" stroke-width="3"/>`;
  if (p.back) s += p.back(c);
  if (S.outline) {
    s += p.limbs.map(([t, pts]) => line(pts, S.w[t] + 7, c)).join('') + `<circle cx="${hx}" cy="${hy}" r="${S.r + 3.5}" fill="${c}"/>`;
    s += p.limbs.map(([t, pts]) => line(pts, S.w[t], bg)).join('') + `<circle cx="${hx}" cy="${hy}" r="${S.r}" fill="${bg}"/>`;
  } else {
    s += p.limbs.map(([t, pts]) => line(pts, S.w[t], c)).join('');
    s += `<circle cx="${hx}" cy="${hy}" r="${S.r}" fill="${c}"${S.gap ? ` stroke="${bg}" stroke-width="5"` : ''}/>`;
  }
  if (p.front) s += p.front(c);
  return s + `</svg>`;
}
