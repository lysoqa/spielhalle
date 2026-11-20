// Anzeigen: Lebensleiste, XP-Leiste, Level, Block, Auswahl- und Todesbildschirm
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function drawBar(ctx, x, y, w, h, frac, color, back = '#2a2230') {
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
}

function drawHUD(ctx, game) {
  const p = game.player;
  const w = 150;
  const x = Math.round((W - w) / 2);

  // Leben
  drawBar(ctx, x, H - 22, w, 7, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? '#ff5a5a' : '#d93a4a');
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x, H - 22, Math.round((w * p.hp) / p.maxHp), 2);
  Font.draw(ctx, `${Math.ceil(p.hp)}/${p.maxHp}`, W / 2, H - 21, { align: 'center' });

  // XP
  const maxed = p.level >= MAX_LEVEL;
  drawBar(ctx, x, H - 11, w, 4, maxed ? 1 : p.xp / xpForLevel(p.level), '#ffd34a');
  Font.draw(ctx, `LV ${p.level}`, x - 5, H - 16, { align: 'right', color: '#ffd34a' });
  Font.draw(ctx, maxed ? 'MAX' : `${Math.floor(p.xp)}/${xpForLevel(p.level)} XP`, x + w + 5, H - 12, { color: '#b9b4a6' });

  // Oben: Klasse, Kills, Zeit
  Font.draw(ctx, p.cls.name, 6, 6, { color: '#f1ede2' });
  Font.draw(ctx, `Kills ${p.kills}`, 6, 14, { color: '#b9b4a6' });
  Font.draw(ctx, fmtTime(game.runTime), W - 6, 6, { align: 'right', color: '#b9b4a6' });

  // Block-Anzeige (Krieger)
  if (p.cls.block) {
    const bx = x + w + 10;
    const by = H - 34;
    ctx.fillStyle = '#1a1420';
    ctx.fillRect(bx - 1, by - 1, 16, 16);
    ctx.fillStyle = p.blockT > 0 ? '#2d5a73' : '#2a2230';
    ctx.fillRect(bx, by, 14, 14);
    drawSprite(ctx, SPR.shield, bx + 7, by + 7);
    if (p.blockCd > 0 && p.blockT <= 0) {
      const frac = p.blockCd / p.cls.block.cooldown;
      ctx.fillStyle = 'rgba(10,8,14,0.7)';
      ctx.fillRect(bx, by, 14, Math.ceil(14 * frac));
      Font.draw(ctx, Math.ceil(p.blockCd), bx + 7, by + 5, { align: 'center' });
    }
    Font.draw(ctx, 'RK', bx + 18, by + 5, { color: '#8b8a95' });
  }

  // Level-Up-Banner
  if (game.levelBanner > 0) {
    const t = game.levelBanner;
    const y = 40 - Math.round(Math.max(0, t - 1.2) * 20);
    Font.draw(ctx, 'Level Up!', W / 2, y, { align: 'center', scale: 3, color: '#ffd34a' });
    Font.draw(ctx, `Level ${p.level} · Leben und Schaden erhöht`, W / 2, y + 20, { align: 'center' });
  }
}

// ---------- Klassenauswahl ----------

function cardRects() {
  const cw = 112, ch = 122, gap = 10;
  const x0 = Math.round((W - (cw * 3 + gap * 2)) / 2);
  return CLASS_ORDER.map((id, i) => ({ id, x: x0 + i * (cw + gap), y: 50, w: cw, h: ch }));
}

function drawSelect(ctx, game) {
  ctx.fillStyle = '#100c16';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) { // Hintergrund-Pixel
    ctx.fillStyle = i % 3 ? '#1c1626' : '#2a2038';
    ctx.fillRect((i * 97 + Math.floor(game.time * (4 + (i % 5)))) % W, (i * 53) % H, 1, 1);
  }

  Font.draw(ctx, 'Soulgrind', W / 2, 10, { align: 'center', scale: 4, color: '#8b3dff', shadow: '#2a1050' });
  Font.draw(ctx, 'Wähle deine Klasse', W / 2, 36, { align: 'center', color: '#b9b4a6' });

  const m = Input.mouse;
  game.hoverCard = -1;
  cardRects().forEach((r, i) => {
    const cls = CLASSES[r.id];
    const hover = m.x >= r.x && m.x < r.x + r.w && m.y >= r.y && m.y < r.y + r.h;
    if (hover) game.hoverCard = i;
    const lift = hover ? 2 : 0;
    const y = r.y - lift;

    ctx.fillStyle = '#000';
    ctx.fillRect(r.x + 3, y + 3, r.w, r.h);
    ctx.fillStyle = hover ? '#241c30' : '#1a1422';
    ctx.fillRect(r.x, y, r.w, r.h);
    ctx.strokeStyle = hover ? '#f1ede2' : '#3a3046';
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, y + 0.5, r.w - 1, r.h - 1);

    Font.draw(ctx, cls.name, r.x + r.w / 2, y + 7, { align: 'center', scale: 2 });
    const bob = hover && Math.floor(game.time * 4) % 2 ? 1 : 0;
    drawSprite(ctx, SPR[cls.sprite], r.x + r.w / 2, y + 40 - bob, { scale: 3 });
    Font.draw(ctx, cls.gear, r.x + r.w / 2, y + 62, { align: 'center', color: '#ffd34a' });

    Object.entries(cls.pips).forEach(([label, val], j) => {
      const py = y + 76 + j * 9;
      Font.draw(ctx, label, r.x + 8, py, { color: '#b9b4a6', shadow: null });
      for (let k = 0; k < 5; k++) {
        ctx.fillStyle = k < val ? '#8b3dff' : '#3a3046';
        ctx.fillRect(r.x + 62 + k * 8, py, 6, 5);
      }
    });
    Font.draw(ctx, i + 1, r.x + r.w - 6, y + r.h - 9, { align: 'right', color: '#5d5868', shadow: null });
  });

  const hint = game.hoverCard >= 0 ? CLASSES[CLASS_ORDER[game.hoverCard]].hint : 'WASD laufen · Maus zielen · Linksklick angreifen';
  Font.draw(ctx, hint, W / 2, 186, { align: 'center', color: '#b9b4a6' });
  Font.draw(ctx, 'Klicken oder 1 / 2 / 3 drücken', W / 2, 198, { align: 'center', color: '#5d5868', shadow: null });
}

// ---------- Tod und Pause ----------

function drawDead(ctx, game) {
  ctx.fillStyle = 'rgba(16,6,10,0.75)';
  ctx.fillRect(0, 0, W, H);
  const s = game.lastRun;
  Font.draw(ctx, 'Du bist gefallen', W / 2, 52, { align: 'center', scale: 3, color: '#ff5a5a', shadow: '#3a0a10' });
  Font.draw(ctx, `${s.cls} · Level ${s.level}`, W / 2, 86, { align: 'center', scale: 2 });
  Font.draw(ctx, `Kills ${s.kills} · Zeit ${fmtTime(s.time)}`, W / 2, 104, { align: 'center', color: '#b9b4a6' });
  Font.draw(ctx, 'Dein Held ist für immer verloren.', W / 2, 124, { align: 'center', color: '#8b8a95' });
  if (game.deadT > 1.2 && Math.floor(game.time * 2) % 2 === 0) {
    Font.draw(ctx, 'Klicken für einen neuen Helden', W / 2, 156, { align: 'center', color: '#ffd34a' });
  }
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,8,14,0.6)';
  ctx.fillRect(0, 0, W, H);
  Font.draw(ctx, 'Pause', W / 2, 80, { align: 'center', scale: 4 });
  Font.draw(ctx, 'ESC zum Fortsetzen', W / 2, 112, { align: 'center', color: '#b9b4a6' });
}

function drawCrosshair(ctx) {
  const x = Math.round(Input.mouse.x);
  const y = Math.round(Input.mouse.y);
  ctx.fillStyle = '#1a1420';
  ctx.fillRect(x - 4, y - 1, 9, 3);
  ctx.fillRect(x - 1, y - 4, 3, 9);
  ctx.fillStyle = '#f1ede2';
  ctx.fillRect(x - 3, y, 2, 1);
  ctx.fillRect(x + 2, y, 2, 1);
  ctx.fillRect(x, y - 3, 1, 2);
  ctx.fillRect(x, y + 2, 1, 2);
}
