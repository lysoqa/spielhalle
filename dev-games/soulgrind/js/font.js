// Eigene 3x5-Pixelschrift, damit Text genauso pixelig aussieht wie das Spiel.
const FONT_DATA = {
  A: '.#./#.#/###/#.#/#.#', B: '##./#.#/##./#.#/##.', C: '.##/#../#../#../.##', D: '##./#.#/#.#/#.#/##.',
  E: '###/#../##./#../###', F: '###/#../##./#../#..', G: '.##/#../#.#/#.#/.##', H: '#.#/#.#/###/#.#/#.#',
  I: '###/.#./.#./.#./###', J: '..#/..#/..#/#.#/.#.', K: '#.#/#.#/##./#.#/#.#', L: '#../#../#../#../###',
  M: '#...#/##.##/#.#.#/#...#/#...#', N: '#..#/##.#/#.##/#..#/#..#', O: '.#./#.#/#.#/#.#/.#.',
  P: '##./#.#/##./#../#..', Q: '.#./#.#/#.#/##./.##', R: '##./#.#/##./#.#/#.#', S: '.##/#../.#./..#/##.',
  T: '###/.#./.#./.#./.#.', U: '#.#/#.#/#.#/#.#/###', V: '#.#/#.#/#.#/#.#/.#.', W: '#...#/#...#/#.#.#/##.##/#...#',
  X: '#.#/#.#/.#./#.#/#.#', Y: '#.#/#.#/.#./.#./.#.', Z: '###/..#/.#./#../###',
  'Ä': '#.#/.#./#.#/###/#.#', 'Ö': '#.#/.../###/#.#/###', 'Ü': '#.#/.../#.#/#.#/###',
  0: '###/#.#/#.#/#.#/###', 1: '.#./##./.#./.#./###', 2: '##./..#/.#./#../###', 3: '##./..#/.#./..#/##.',
  4: '#.#/#.#/###/..#/..#', 5: '###/#../##./..#/##.', 6: '.##/#../###/#.#/###', 7: '###/..#/.#./.#./.#.',
  8: '###/#.#/###/#.#/###', 9: '###/#.#/###/..#/##.',
  ' ': '../../../../..', '.': '././././#', ',': '././././#', ':': './#/./#/.', '!': '#/#/#/./#',
  '?': '##./..#/.#./.../.#.', '-': '.../.../###/.../...', '+': '.../.#./###/.#./...', '/': '..#/..#/.#./#../#..',
  '%': '#.#/..#/.#./#../#.#', '(': '.#/#./#./#./.#', ')': '#./.#/.#/.#/#.', '·': '././#/./.',
  '>': '#../.#./..#/.#./#..', '<': '..#/.#./#../.#./..#', "'": '#/#/././.',
};

const Font = {
  glyphs: {},
  init() {
    for (const [ch, data] of Object.entries(FONT_DATA)) {
      const rows = data.split('/');
      this.glyphs[ch] = { w: Math.max(...rows.map((r) => r.length)), rows };
    }
  },
  norm(text) {
    return String(text).toUpperCase().replace(/ß/g, 'SS');
  },
  width(text, scale = 1) {
    let w = 0;
    for (const ch of this.norm(text)) w += ((this.glyphs[ch] || this.glyphs['?']).w + 1) * scale;
    return Math.max(0, w - scale);
  },
  draw(ctx, text, x, y, { color = '#f1ede2', scale = 1, align = 'left', shadow = '#1a1420' } = {}) {
    text = this.norm(text);
    const w = this.width(text, scale);
    if (align === 'center') x -= Math.floor(w / 2);
    else if (align === 'right') x -= w;
    x = Math.round(x);
    y = Math.round(y);
    const off = Math.max(1, Math.floor(scale / 2));
    if (shadow) this.raw(ctx, text, x, y + off, shadow, scale);
    this.raw(ctx, text, x, y, color, scale);
  },
  raw(ctx, text, x, y, color, scale) {
    ctx.fillStyle = color;
    for (const ch of text) {
      const g = this.glyphs[ch] || this.glyphs['?'];
      g.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          if (row[rx] === '#') ctx.fillRect(x + rx * scale, y + ry * scale, scale, scale);
        }
      });
      x += (g.w + 1) * scale;
    }
  },
};
Font.init();
