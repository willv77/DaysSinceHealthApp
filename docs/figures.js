// Exercise poses drawn as line figures in a 200x200 box (ground at y=194).
const bell = (x, y, c) => `<circle cx="${x}" cy="${y}" r="10" fill="${c}"/><rect x="${x - 6}" y="${y - 19}" width="12" height="11" rx="5" fill="none" stroke="${c}" stroke-width="3.5"/>`;

const POSES = {
  yoga: { // Warrior II, front view
    head: [100, 30], ground: true,
    limbs: [[[100, 46], [100, 108]], [[100, 54], [64, 56], [26, 56]], [[100, 54], [136, 56], [174, 56]],
      [[94, 108], [62, 142], [58, 184], [44, 184]], [[106, 108], [132, 146], [158, 184], [172, 184]]],
  },
  balance: { // standing on one leg, other foot raised
    head: [100, 30], ground: true,
    limbs: [[[100, 46], [100, 108]], [[100, 56], [64, 54], [28, 48]], [[100, 56], [136, 58], [172, 64]],
      [[95, 108], [93, 146], [95, 184], [82, 184]], [[105, 108], [136, 122], [126, 156]]],
  },
  push: { // top of push-up
    head: [20, 106], ground: true,
    limbs: [[[42, 120], [42, 152], [42, 184]], [[40, 118], [93, 145]], [[93, 145], [132, 164], [172, 184]]],
  },
  pull: { // chin over bar, front view
    head: [100, 18],
    back: c => `<line x1="20" y1="32" x2="180" y2="32" stroke="${c}" stroke-width="6" stroke-linecap="round"/>`,
    limbs: [[[100, 42], [100, 102]], [[90, 48], [58, 64], [62, 32]], [[110, 48], [142, 64], [138, 32]],
      [[93, 102], [86, 144], [84, 186]], [[107, 102], [114, 144], [116, 186]]],
  },
  squat: { // goblet squat, bottom position
    head: [78, 64], ground: true,
    limbs: [[[112, 140], [68, 148], [96, 184], [80, 184]], [[112, 140], [88, 86]], [[88, 90], [72, 118], [62, 96]]],
    front: c => bell(58, 100, c),
  },
  hinge: { // kettlebell deadlift
    head: [56, 83], ground: true,
    limbs: [[[130, 112], [104, 148], [100, 184], [84, 184]], [[130, 112], [76, 92]], [[76, 94], [78, 128], [80, 160]]],
    front: c => bell(80, 180, c),
  },
  carry: { // farmer carry, front view
    head: [100, 24], ground: true,
    limbs: [[[100, 42], [100, 104]], [[90, 48], [80, 82], [74, 114]], [[110, 48], [120, 82], [126, 114]],
      [[93, 104], [86, 146], [82, 186]], [[107, 104], [114, 146], [118, 186]]],
    front: c => bell(72, 134, c) + bell(128, 134, c),
  },
  getup: { // half-kneel, bell overhead
    head: [102, 56], ground: true,
    limbs: [[[112, 136], [118, 182], [160, 184]], [[112, 136], [72, 138], [72, 184], [58, 184]],
      [[112, 136], [110, 78]], [[108, 82], [100, 108], [78, 132]], [[110, 80], [122, 50], [132, 26]]],
    front: c => bell(134, 18, c),
  },
  meditation: { // head in profile with a brain inside
    paths: ['M146 186 V150 C176 124 180 64 144 38 C112 14 62 26 52 70 L50 92 L36 114 L50 118 V132 C50 140 56 144 64 144 H88 V186',
      'M80 96 C68 96 66 80 76 76 C74 62 90 56 98 64 C104 52 124 52 128 64 C140 62 148 76 140 86 C146 96 138 104 128 100 C122 108 106 108 102 100 C96 106 82 104 80 96 Z',
      'M104 88 C108 80 118 80 120 88', 'M128 104 V134'],
  },
  daydream: { // single cloud
    paths: ['M50 140 H150 C176 140 178 104 152 102 C150 72 114 62 100 86 C88 70 56 76 58 104 C34 106 30 140 50 140 Z'],
  },
};

function poseSVG(id, c) {
  const p = POSES[id];
  const line = pts => `<polyline points="${pts.map(q => q.join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`;
  if (p.paths) {
    return `<svg viewBox="0 0 200 200" class="fig" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${p.paths.map(d =>
      `<path d="${d}" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}</svg>`;
  }
  return `<svg viewBox="0 0 200 200" class="fig" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
    ${p.ground ? `<line x1="8" y1="194" x2="192" y2="194" stroke="${c}" stroke-opacity=".3" stroke-width="3"/>` : ''}
    ${p.back ? p.back(c) : ''}${p.limbs.map(line).join('')}
    <circle cx="${p.head[0]}" cy="${p.head[1]}" r="14" fill="${c}"/>${p.front ? p.front(c) : ''}</svg>`;
}
