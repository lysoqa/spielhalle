// Pixel-Icons als SVG. Spiele können ein eigenes "icon" (Zeilen aus '#' und '.') haben,
// sonst wird aus dem Namen ein symmetrisches Pixel-Muster erzeugt.
(function () {
  function hash(str) {
    let h = 2166136261;
    for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  function generated(name) {
    let h = hash(name);
    const rows = [];
    for (let y = 0; y < 10; y++) {
      const half = [];
      for (let x = 0; x < 5; x++) {
        h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0;
        half.push(h % 100 < 48 ? '#' : '.');
      }
      rows.push(half.join('') + [...half].reverse().join(''));
    }
    return rows;
  }

  window.pixelIcon = function (game, fill = '#111') {
    const rows = game.icon && game.icon.length ? game.icon : generated(game.name || game.id);
    const w = Math.max(...rows.map((r) => r.length));
    const h = rows.length;
    let rects = '';
    rows.forEach((row, y) => {
      [...row].forEach((ch, x) => {
        if (ch === '#') rects += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
      });
    });
    return `<svg viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" fill="${fill}" aria-hidden="true">${rects}</svg>`;
  };
})();
