/**
 * EIS — gen-art.mjs
 * One consistent illustrated language for the whole site: sky gradient,
 * sun, clouds, rolling hills, baobab silhouettes, brand-palette buildings
 * and simple student figures. Generates scenes to src/assets/img/*.svg.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src', 'assets', 'img');
fs.mkdirSync(OUT, { recursive: true });

/* ---------- palette ---------- */
const P = {
  skyTop: '#ecead2',
  skyBottom: '#dee3c2',
  sun: '#d9a24b',
  sunHi: '#e9c37e',
  cloud: '#f8f3e2',
  hillFar: '#c7d2ae',
  hillMid: '#b1c49a',
  groundA: '#d9dbb8',
  groundB: '#a6b98c',
  path: '#c7b88f',
  trunk: '#78563a',
  leaf: '#1e5a33',
  leafD: '#123b22',
  wall: '#f2ecd7',
  wallShade: '#e2dabf',
  roof: '#a3692e',
  roofD: '#7c5217',
  win: '#2d6a42',
  door: '#5a3a22',
  saffron: '#a06c22',
  ink: '#22301f',
};
const SKIN = ['#a27144', '#8d5a3a', '#7c4a2e', '#b98a5e'];
const PEOPLE = [
  { skin: SKIN[0], hair: '#2a1c10', top: '#24573b' },
  { skin: SKIN[1], hair: '#11100c', top: '#3d5b43' },
  { skin: SKIN[2], hair: '#3a2414', top: '#2c4c66' },
  { skin: SKIN[3], hair: '#1c150e', top: '#7a5223' },
];

const R = (x, y, w, h, f, rx = 0, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${extra}/>`;
const O = (cx, cy, r, f, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}" ${extra}/>`;
const Pth = (d, f, extra = '') => `<path d="${d}" fill="${f}" ${extra}/>`;
const Ln = (d, extra) => `<path d="${d}" fill="none" ${extra}/>`;

/* sky band + sun + clouds */
function sky(w, h) {
  return `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.skyTop}"/><stop offset="1" stop-color="${P.skyBottom}"/></linearGradient></defs>` + R(0, 0, w, h, 'url(#sky)');
}
function sun(x, y, r) {
  return O(x, y, r, P.sun, 'opacity=".3"') + O(x, y, r * 0.7, P.sun) + O(x - r * 0.2, y - r * 0.2, r * 0.28, P.sunHi, 'opacity=".6"');
}
function cloud(x, y, s, op = 0.75) {
  return `<g opacity="${op}" fill="${P.cloud}">${O(x, y, 20 * s)}${O(x + 26 * s, y - 13 * s, 27 * s)}${O(x + 58 * s, y - 4 * s, 18 * s)}${O(x + 80 * s, y, 25 * s)}${R(x, y - 3 * s, 92 * s, 21 * s, P.cloud, 11)}</g>`;
}

/* hills + ground */
function scenery(w, h, gy) {
  return (
    Pth(`M0 ${gy - 46} Q ${w * 0.32} ${gy - 134} ${w * 0.62} ${gy - 76} T ${w} ${gy - 42} L ${w} ${gy} L 0 ${gy} Z`, P.hillFar, 'opacity=".55"') +
    Pth(`M-40 ${gy + 6} Q ${w * 0.24} ${gy - 56} ${w * 0.5} ${gy - 18} T ${w + 30} ${gy + 2} L ${w + 30} ${gy + 74} Q ${w * 0.56} ${gy - 14} -10 ${gy + 30} Z`, P.hillMid, 'opacity=".5"') +
    `<defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${P.groundA}"/><stop offset="1" stop-color="${P.groundB}"/></linearGradient></defs>` +
    Pth(`M0 ${gy} L ${w} ${gy} L ${w} ${h} L 0 ${h} Z`, 'url(#gr)') +
    Ln(`M 40 ${gy} Q 250 ${gy - 12} 480 ${gy} Q 780 ${gy + 12} ${w - 40} ${gy}`, 'stroke="#8fa378" stroke-width="3" opacity="0.5"')
  );
}

/* baobab: tapered trunk hold great rounded crown */
function baobab(x, y, s) {
  return (
    `<g>` +
    Pth(`M ${x + 12 * s} ${y + 58 * s} L ${x + 20 * s} ${y - 10 * s} L ${x + 42 * s} ${y - 16 * s} L ${x + 48 * s} ${y + 58 * s} Q ${x + 30 * s} ${y + 38 * s} ${x + 12 * s} ${y + 58 * s} Z`, P.trunk) +
    Pth(`M ${x - 22 * s} ${y - 2 * s} Q ${x + 4 * s} ${y - 48 * s} ${x + 32 * s} ${y - 34 * s} Q ${x + 72 * s} ${y - 60 * s} ${x + 88 * s} ${y - 2 * s} Q ${x + 62 * s} ${y + 24 * s} ${x + 26 * s} ${y + 14 * s} Q ${x - 6 * s} ${y + 18 * s} ${x - 22 * s} ${y - 2 * s} Z`, P.leaf) +
    O(x + 26 * s, y - 22 * s, 9 * s, P.leaf, 'opacity=".35"') +
    O(x + 66 * s, y - 16 * s, 8 * s, P.leaf, 'opacity=".4"') +
    `</g>`
  );
}

/* school building */
function building(x, y, w, h, o = {}) {
  const cols = o.cols || 3, rows = o.rows || 2;
  let s = R(x, y, w, h, o.warm ? P.wall : '#e9e8d2', 4);
  s += R(x - 7, y - 15, 28, 17, o.roof || P.roof, 3);
  s += R(x + w - 21, y - 15, 28, 17, o.roof || P.roof, 3);
  const cw = 24, ch = 18, gx = 30, gy = 32;
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
    const wx = x + 20 + i * (cw + gx), wy = y + 26 + j * (ch + gy);
    if (wx + cw > x + w - 12 || wy + ch > y + h - 8) continue;
    s += R(wx, wy, cw, ch, P.win, 2, 'stroke="#f7f3e0" stroke-width="3"');
  }
  if (o.door) {
    const dx = x + w / 2;
    s += Pth(`M ${dx - 18} ${y + h} L ${dx - 18} ${y + h - 42} A 18 18 0 0 1 ${dx + 18} ${y + h - 42} L ${dx + 18} ${y + h} Z`, P.door);
  }
  if (o.flag) {
    s += Ln(`M ${x + w + 4} ${y - 2} L ${x + w + 4} ${y - 66}`, 'stroke="' + P.trunk + '" stroke-width="5"');
    s += Pth(`M ${x + w + 4} ${y - 64} l 46 12 -46 14 Z`, P.saffron);
  }
  return s;
}

/* student figure */
function fig(x, y, s, o = {}) {
  const p = PEOPLE[(o.i || 0) % PEOPLE.length];
  const skinC = o.skin || p.skin;
  const hairC = o.hair || p.hair;
  const topC = o.top || p.top;
  const hh = o.h || s;
  const hy = y - hh;
  return (
    O(x, hy, 13 * s, skinC) +
    Pth(`M ${x - 13 * s} ${hy - 2} a 13 13 0 0 1 26 0 c 0 6 -5 8 -13 8 s -13 -2 -13 -8 Z`, hairC) +
    Pth(`M ${x - 12 * s} ${y + 2 * s} Q ${x} ${y + 9 * s} ${x + 12 * s} ${y + 2 * s} L ${x + 16 * s} ${y + 34 * s} Q ${x} ${y + 42 * s} ${x - 16 * s} ${y + 34 * s} Z`, topC) +
    (o.up ? O(x + 30 * s, y + 4 * s, 5 * s, P.saffron) : '')
  );
}
function kids(x0, y, n, s, base) {
  let out = '';
  for (let i = 0; i < n; i++) out += fig(x0 + i * 52 * s, y, s, { i: base + i });
  return out;
}

/* a low long table with chairs (dining) */
function table(x, y, w) {
  return R(x, y, w, 16, '#b98c5c', 4) + R(x + 12, y + 16, 12, 20, P.trunk) + R(x + w - 24, y + 16, 12, 20, P.trunk);
}

/* flask + notes for science */
function flask(x, y, s) {
  return (
    Pth(`M ${x + 20 * s} ${y} L ${x + 40 * s} ${y} L ${x + 44 * s} ${y - 140 * s} Q ${x + 16 * s} ${y - 120 * s} ${x + 20 * s} ${y} Z`, '#7fb2a8', 'opacity="0.9"') +
    R(x + 12 * s, y - 150 * s, 26 * s, 12 * s, '#d8e4d0', 3) +
    O(x + 34 * s, y - 60 * s, 6 * s, '#f3d39a') +
    R(x + 26 * s, y + 2 * s, 14 * s, 12 * s, P.trunk, 2)
  );
}

/* exam desks */
function desk(x, y, w) {
  return R(x, y, w, 15, '#b98c5c', 4) + R(x + 6, y + 15, 12, 16, P.trunk) + R(x + w - 18, y + 15, 12, 16, P.trunk);
}

/* bookshelf */
function shelf(x, y, w, h) {
  let s = R(x, y, w, h, '#8a6a45', 5);
  for (let i = 0; i < 3; i++) {
    const yy = y + 14 + i * ((h - 14) / 3 + 4);
    s += R(x + 8, yy, w - 16, (h - 14) / 3 - 8, '#e8e2c8', 3);
    s += R(x + 16, yy + 6, 46, 10, P.roofD, 2) + R(x + 68, yy + 6, 40, 10, P.roof, 2) + R(x + 114, yy + 6, 34, 10, '#7fb2a8', 2) + R(x + 154, yy + 6, 30, 10, P.saffron, 2);
  }
  return s;
}

/* bed (boarding) */
function bed(x, y, w) {
  return R(x, y, w, 26, '#9a7746', 4) + R(x, y - 8, w, 10, '#f4efe0', 3) + R(x + 6, y + 26, 12, 18, P.trunk) + R(x + w - 18, y + 26, 12, 18, P.trunk) + R(x + w - 40, y - 16, 18, 14, P.saffron, 3);
}

/* goal posts (sports) */
function goal(x, y, s) {
  return Ln(`M ${x} ${y} L ${x} ${y - 90 * s} L ${x + 64 * s} ${y - 90 * s} L ${x + 64 * s} ${y} M ${x} ${y - 66 * s} L ${x + 64 * s} ${y - 66 * s}`, 'stroke="#2d6a42" stroke-width="6"') + R(x - 5, y - 94 * s, 74 * s, 6, P.win);
}

/* ---------------- writer ---------------- */
function scene(name, opts) {
  const W = opts.w || 1200, H = opts.h || 900;
  const gy = opts.gy || 640;
  let inner = sky(W, H);
  inner += sun(opts.sunX !== undefined ? opts.sunX : W * 0.86, opts.sunY !== undefined ? opts.sunY : 150, opts.sunR || 80);
  inner += cloud(opts.c1x ?? W * 0.14, opts.c1y ?? 140, 1, 0.72);
  inner += cloud(opts.c2x ?? W * 0.7, opts.c2y ?? 78, 0.7, 0.6);
  inner += scenery(W, H, gy);
  if (opts.draw) inner += opts.draw();
  write(opts.file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Brand illustration of life at EIS">\n${inner}\n</svg>\n`);
}

function write(file, content) {
  fs.writeFileSync(path.join(OUT, file), content);
  console.log(' · ' + file);
}

/* ============================================================
   scenes
   ============================================================ */

scene('hero-campus.svg', {
  file: 'hero-campus.svg', w: 1600, h: 1000, gy: 700, sunX: 1300, sunR: 94,
  c1x: 220, c1y: 150, c2x: 880, c2y: 96,
  draw: () =>
    building(430, 350, 780, 360, { cols: 5, rows: 3, door: true, flag: true }) +
    baobab(150, 560, 52) + baobab(60, 350, 30) +
    baobab(1300, 540, 46) + baobab(1510, 360, 26) + baobab(235, 720, 20) +
    R(770, 710, 132, 220, P.path, 0, 'opacity="0.85"') +
    kids(240, 650, 3, 34, 0) + fig(1180, 640, 44, { i: 3 }),
});

scene('aerial.svg', {
  file: 'aerial.svg', w: 1200, h: 800, gy: 620,
  draw: () =>
    building(140, 300, 420, 300, { cols: 4, rows: 2, door: true }) +
    building(700, 330, 320, 270, { cols: 3, rows: 2, warm: true }) +
    R(160, 640, 260, 40, P.path, 6) + R(680, 640, 220, 40, P.path, 6) +
    baobab(70, 420, 30) + baobab(1080, 380, 26) +
    kids(220, 700, 3, 22, 1) + kids(760, 720, 3, 22, 3),
});

scene('sc-nursery.svg', {
  file: 'sc-nursery.svg',
  draw: () =>
    building(150, 380, 250, 250, { cols: 2, rows: 2, warm: true }) +
    baobab(580, 430, 22) +
    R(700, 450, 150, 16, P.roof, 8) + R(715, 466, 34, 14, P.winLit) + R(810, 466, 34, 14, P.winLit) +
    kids(150, 560, 5, 24, 0),
});

scene('sc-primary.svg', {
  file: 'sc-primary.svg',
  draw: () =>
    building(150, 330, 320, 300, { cols: 3, rows: 2, warm: true }) +
    R(580, 470, 260, 64, P.groundB, 8) +
    R(590, 480, 240, 44, P.leaf, 6) +
    Pth(`M 610 518 L 660 518 L 660 505 L 640 505 L 640 492 L 610 492 Z`, '#f6f2e2') +
    kids(600, 580, 4, 24, 1),
});

scene('sc-jss.svg', {
  file: 'sc-jss.svg',
  draw: () =>
    building(180, 310, 340, 310, { cols: 3, rows: 2 }) +
    flask(720, 300, 1.1) + flask(870, 330, 0.85) +
    kids(170, 560, 3, 26, 2),
});

scene('sc-sss.svg', {
  file: 'sc-sss.svg',
  draw: () =>
    building(150, 320, 380, 300, { cols: 4, rows: 2 }) +
    R(760, 480, 520, 140, P.roofD, 6) + R(804, 452, 190, 36, P.saffron, 4) +
    kids(780, 520, 4, 22, 3) +
    fig(1080, 620, 30, { i: 1, top: P.roof }),
});

/* facilities */
scene('fac_campus.svg', {
  file: 'fac_campus.svg',
  draw: () =>
    building(160, 330, 560, 300, { cols: 4, rows: 2, door: true, flag: true }) +
    baobab(80, 440, 30) + baobab(900, 470, 24) +
    R(320, 650, 260, 44, P.path, 6) +
    kids(180, 560, 4, 26, 0) + fig(1080, 620, 32, { i: 3 }),
});

scene('fac_lab.svg', {
  file: 'fac_lab.svg',
  draw: () =>
    R(140, 420, 220, 18, P.wallShade, 4) + R(500, 420, 220, 18, P.wallShade, 4) + R(860, 420, 220, 18, P.wallShade, 4) +
    flask(240, 420, 1) + flask(600, 420, 0.8) + flask(950, 420, 1.05) +
    O(470, 500, 26, P.roofD, 'opacity=".3"') +
    kids(110, 500, 3, 22, 1),
});

scene('fac_dining.svg', {
  file: 'fac_dining.svg',
  draw: () =>
    table(150, 470, 330) + table(600, 470, 330) + table(980, 470, 200) +
    kids(120, 390, 5, 20, 2) +
    fig(420, 560, 24, { i: 0 }) + fig(700, 560, 24, { i: 2 }) +
    R(30, 300, 140, 90, P.wall, 6) + R(1030, 300, 140, 90, P.wall, 6),
});

scene('fac_exam.svg', {
  file: 'fac_exam.svg',
  draw: () =>
    R(140, 330, 60, 16, P.roofD, 4) + R(240, 330, 60, 16, P.roofD, 4) + R(340, 330, 60, 16, P.roofD, 4) +
    kids(150, 432, 3, 20, 1) +
    desk(500, 400, 150) + desk(720, 400, 150) + desk(940, 400, 150) +
    desk(520, 490, 150) + desk(740, 490, 150) + desk(960, 490, 150) +
    kids(520, 520, 3, 20, 0),
});

scene('fac_boarding.svg', {
  file: 'fac_boarding.svg',
  draw: () =>
    bed(140, 400, 300) + bed(650, 400, 300) + bed(950, 380, 220) +
    R(150, 330, 60, 90, P.win, 6) +
    O(280, 460, 30, P.sun, 'opacity=".3"') +
    fig(260, 360, 22, { i: 2, top: P.roofD }),
});

scene('fac_library.svg', {
  file: 'fac_library.svg',
  draw: () =>
    shelf(150, 320, 150, 180) + shelf(430, 320, 150, 180) +
    R(760, 420, 220, 16, P.wallShade, 6) + R(770, 436, 200, 120, P.roofD, 8) +
    kids(760, 520, 3, 20, 3),
});

scene('fac_sports.svg', {
  file: 'fac_sports.svg',
  draw: () =>
    goal(180, 480, 1.2) + goal(1060, 480, 1.2) +
    O(620, 470, 34, P.paper, 'opacity=".9"') + O(620, 470, 34, 'none', 'stroke="#9aa87e" stroke-width="4"') +
    kids(300, 460, 3, 22, 2) + kids(920, 460, 3, 22, 0),
});

/* day-in-the-life frames (16:10 media) */
scene('day-1.svg', {
  file: 'day-1.svg', w: 1200, h: 750, gy: 560,
  draw: () =>
    building(200, 320, 380, 230, { cols: 3, rows: 2, warm: true }) +
    R(720, 350, 150, 16, P.path, 6) + R(940, 350, 120, 16, P.path, 6) +
    baobab(80, 340, 26) +
    kids(250, 480, 4, 22, 1) + fig(980, 440, 26, { i: 3 }),
});

scene('day-2.svg', {
  file: 'day-2.svg', w: 1200, h: 750, gy: 560,
  draw: () =>
    building(140, 340, 340, 210, { cols: 3, rows: 2 }) +
    R(600, 420, 380, 100, P.wallShade, 8) + R(615, 432, 350, 62, P.leaf, 6) +
    kids(600, 480, 6, 20, 0),
});

scene('day-3.svg', {
  file: 'day-3.svg', w: 1200, h: 750, gy: 560,
  draw: () =>
    table(200, 440, 300) + table(650, 440, 300) +
    kids(160, 400, 4, 20, 1) +
    kids(650, 520, 4, 20, 3),
});

scene('day-4.svg', {
  file: 'day-4.svg', w: 1200, h: 750, gy: 560,
  draw: () =>
    goal(180, 420, 1) + goal(1020, 420, 1) +
    kids(360, 380, 5, 20, 2),
});

scene('day-5.svg', {
  file: 'day-5.svg', w: 1200, h: 750, gy: 560,
  draw: () =>
    R(120, 300, 480, 130, P.roofD, 6) + R(700, 300, 480, 130, P.roofD, 6) +
    kids(140, 360, 3, 22, 0) + kids(720, 360, 3, 22, 2),
});

/* pano 360 classroom frames (16:9, indoor) */
function panoScene(file, accent) {
  const W = 1400, H = 788;
  const inner =
    sky(W, H) +
    R(0, 700, W, H - 700, P.groundB) +
    R(60, 120, 1280, 520, accent, 10) +
    R(90, 150, 380, 460, '#f6f2e2', 8) + R(120, 170, 320, 320, P.win, 4, 'stroke="#e9e4cf" stroke-width="6"') +
    R(510, 150, 380, 460, '#f6f2e2', 8) + R(540, 170, 320, 320, P.win, 4, 'stroke="#e9e4cf" stroke-width="6"') +
    R(820, 150, 380, 460, '#f6f2e2', 8) + R(850, 170, 320, 320, P.win, 4, 'stroke="#e9e4cf" stroke-width="6"') +
    R(200, 660, 220, 18, P.wallShade, 4) +
    O(90, 90, 46, P.sun);
  write(file, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustrated classroom panorama, frame one">\n${inner}\n</svg>\n`);
}
panoScene('pano-1.svg', P.leaf);
panoScene('pano-2.svg', P.saffron);
panoScene('pano-3.svg', '#5a7355');