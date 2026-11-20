// Pixel-Grafiken. Jedes Zeichen ist ein Pixel, '.' ist durchsichtig.
// Die Farben stehen in PAL. Alle Figuren schauen nach rechts und werden für links gespiegelt.
const PAL = {
  k: '#1a1420', // Umriss
  s: '#f2c9a0', e: '#1a1420', // Haut, Augen
  h: '#9aa4b1', H: '#5d6673', // Helm / Metall
  r: '#b8333a', R: '#7a1f2b', // Rot
  b: '#5a3a22', // Stiefel / Griff
  g: '#3f8f3a', G: '#255a24', // Grün (Kapuze)
  l: '#8a5a2b', L: '#5e3b1c', // Leder / Holz
  p: '#7b4fe0', P: '#4a2a99', // Lila
  y: '#ffd34a', // Gold
  z: '#7fb069', Z: '#4f7a3e', // Zombiehaut
  w: '#f5f5d0', // helle Augen / Sehne
  c: '#4a6fa5', C: '#2f4a75', // Blau
  v: '#6b4a8c', V: '#3f2a5a', x: '#ff4d4d', // Fledermaus
  o: '#e8e4d4', O: '#a9a493', // Knochen / Seiten
  m: '#dfe6ee', M: '#9fb0c2', // Klinge
};

function makeSprite(rows, colors = {}) {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const build = (mirror, white) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    rows.forEach((row, y) => [...row].forEach((ch, i) => {
      if (ch === '.') return;
      const col = white ? '#ffffff' : colors[ch] || PAL[ch];
      if (!col) return;
      g.fillStyle = col;
      g.fillRect(mirror ? w - 1 - i : i, y, 1, 1);
    }));
    return c;
  };
  return { w, h, img: build(false, false), flip: build(true, false), white: build(false, true), whiteFlip: build(true, true) };
}

const SPR = {
  warrior: makeSprite([
    '...kkkkkk...',
    '..khhhhhhk..',
    '..khhhhhHk..',
    '..kHHHHHHk..',
    '..ksssesek..',
    '..kssssssk..',
    '.kkrrrrrrkk.',
    'krrRrrrrRrrk',
    'kssrrrrrrssk',
    '.kkRRRRRRkk.',
    '..kbbk.kbbk.',
    '..kkkk.kkkk.',
  ]),
  archer: makeSprite([
    '...kkkkkk...',
    '..kggggggk..',
    '.kggggggggk.',
    '.kgGsssssgk.',
    '.kgssseseGk.',
    '..kgsssssk..',
    '.kkgggggkkk.',
    'kllgllllgllk',
    'kssllllllssk',
    '.kkLLLLLLkk.',
    '..kLLk.kLLk.',
    '..kkkk.kkkk.',
  ]),
  mage: makeSprite([
    '.....kk.....',
    '....kppk....',
    '...kpppPk...',
    '..kppyppPk..',
    'kkkkkkkkkkkk',
    '..ksssesek..',
    '..kssssssk..',
    '.kppppppppk.',
    'kspppyppppsk',
    '.kpPPPPPPpk.',
    '.kPPPPPPPPk.',
    '..kkkkkkkk..',
  ]),
  zombie: makeSprite([
    '...kkkkkk...',
    '..kzzzzzzk..',
    '..kzZzzzzk..',
    '..kzzwzwzk..',
    '..kzzzZzzk..',
    '..kzkkkkzk..',
    '.kkcccccckk.',
    'kcccCcczzzzk',
    'kcCcccczzzzk',
    '.kCCCCCCkk..',
    '..kCCk.kCCk.',
    '..kkkk.kkkk.',
  ]),
  batA: makeSprite([
    'k..........k',
    'vk........kv',
    'vvk.kkkk.kvv',
    'vvvkvvvvkvvv',
    '.vVvxvvxvVv.',
    '..VVvvvvVV..',
    '....kvvk....',
    '............',
  ]),
  batB: makeSprite([
    '............',
    '............',
    '....kkkk....',
    '...kvvvvk...',
    '.vVvxvvxvVv.',
    'vvvVvvvvVvvv',
    'vvk.kvvk.kvv',
    'vk........kv',
  ]),
  skeleton: makeSprite([
    '...kkkkkk...',
    '..kooooook..',
    '..kokkokkok.',
    '..kooooooOk.',
    '...kokokok..',
    '....kkkk....',
    '..kkoOoOokk.',
    '.koOoOoOoOk.',
    'ko.kOoOok.ok',
    '...kooook...',
    '...ko..ok...',
    '...kk..kk...',
  ]),
  sword: makeSprite([
    '...y.........',
    'bbbyMmmmmmmmk',
    '...y.........',
  ]),
  shield: makeSprite([
    '.kkkkk.',
    'khhhhhk',
    'khrrrhk',
    'khryrhk',
    'khrrrhk',
    'khrrrhk',
    '.khrhk.',
    '..khk..',
    '...k...',
  ]),
  bow: makeSprite([
    'wl...', 'w.l..', 'w..l.', 'w..l.', 'w...l', 'w...l', 'w...l',
    'w...l', 'w...l', 'w..l.', 'w..l.', 'w.l..', 'wl...',
  ]),
  arrow: makeSprite([
    'w.....m.',
    'wlllllmm',
    'w.....m.',
  ]),
  book: makeSprite([
    'kkkkkkk.',
    'kcccccck',
    'kccyccck',
    'kcyyycck',
    'kccyccck',
    'kcccccck',
    'kooooook',
    'kkkkkkkk',
  ]),
  rock: makeSprite([
    '..kkk.',
    '.kooOk',
    'kooOOk',
    'kOOOOk',
    '.kkkk.',
  ], { o: '#8c8c96', O: '#5d5d68' }),
};

function drawSprite(ctx, s, x, y, { flip = false, white = false, scale = 1 } = {}) {
  const img = white ? (flip ? s.whiteFlip : s.white) : flip ? s.flip : s.img;
  const w = s.w * scale;
  const h = s.h * scale;
  ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
}

// Zeichnet ein Sprite gedreht um (x, y). ox = Abstand vom Drehpunkt entlang der Blickrichtung.
function drawRotated(ctx, s, x, y, angle, ox = 0) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(angle);
  if (Math.cos(angle) < 0) ctx.scale(1, -1); // nicht kopfüber
  ctx.drawImage(s.img, ox, -Math.floor(s.h / 2));
  ctx.restore();
}

// ---------- Boden ----------

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function tileHash(x, y) {
  let h = Math.imul(x, 73856093) ^ Math.imul(y, 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

const TILE = 16;
const GRASS = [1, 2, 3, 4].map((seed) => {
  const c = document.createElement('canvas');
  c.width = c.height = TILE;
  const g = c.getContext('2d');
  const rnd = seeded(seed * 977);
  g.fillStyle = '#4a7d3b';
  g.fillRect(0, 0, TILE, TILE);
  for (let i = 0; i < 26; i++) {
    g.fillStyle = rnd() < 0.5 ? '#427334' : '#558a45';
    g.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * TILE), 1, 1);
  }
  for (let i = 0; i < 3; i++) {
    g.fillStyle = '#62a050';
    g.fillRect(Math.floor(rnd() * TILE), Math.floor(rnd() * (TILE - 1)), 1, 2);
  }
  return c;
});
const FLOWER_COLORS = ['#ffd34a', '#f1ede2', '#ff7aa8', '#8fc9ff'];

function drawGround(ctx, cam) {
  const x0 = Math.floor(cam.x / TILE);
  const y0 = Math.floor(cam.y / TILE);
  const max = WORLD / TILE;
  for (let ty = y0; ty <= y0 + Math.ceil(H / TILE); ty++) {
    for (let tx = x0; tx <= x0 + Math.ceil(W / TILE); tx++) {
      const sx = tx * TILE - cam.x;
      const sy = ty * TILE - cam.y;
      if (tx < 0 || ty < 0 || tx >= max || ty >= max) {
        ctx.fillStyle = (tx + ty) % 2 ? '#1d3320' : '#1a2f1d';
        ctx.fillRect(sx, sy, TILE, TILE);
        continue;
      }
      const h = tileHash(tx, ty);
      ctx.drawImage(GRASS[h % 4], sx, sy);
      const deco = (h >>> 8) % 100;
      const dx = sx + 3 + ((h >>> 16) % 9);
      const dy = sy + 3 + ((h >>> 20) % 9);
      if (deco < 2) drawSprite(ctx, SPR.rock, dx, dy);
      else if (deco < 8) {
        ctx.fillStyle = FLOWER_COLORS[(h >>> 4) % FLOWER_COLORS.length];
        ctx.fillRect(dx - 1, dy, 1, 1); ctx.fillRect(dx + 1, dy, 1, 1);
        ctx.fillRect(dx, dy - 1, 1, 1); ctx.fillRect(dx, dy + 1, 1, 1);
        ctx.fillStyle = '#ffd34a';
        ctx.fillRect(dx, dy, 1, 1);
      }
    }
  }
}
