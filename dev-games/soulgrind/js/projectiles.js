// Pfeile, Magiekugeln (Spieler) und Kugeln der Gegner
function updateProjectiles(dt, game) {
  for (const p of game.projectiles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;

    if (p.kind === 'orb' && Math.random() < 0.7) {
      game.fx.particle(p.x, p.y, Math.random() < 0.5 ? '#b07cff' : '#e0ccff', 0.3, 10);
    }

    if (p.friendly) {
      for (const e of game.enemies) {
        if (e.dead || p.hit.has(e)) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) > e.r + p.r) continue;
        const ang = Math.atan2(p.vy, p.vx);
        if (p.aoe) {
          explode(p, game, e);
        } else {
          game.hitEnemy(e, p.dmg, ang, p.knockback);
          p.hit.add(e);
          if (--p.pierce <= 0) p.dead = true;
        }
        break;
      }
      if (!p.dead && p.life <= 0 && p.aoe) explode(p, game, null);
    } else {
      const pl = game.player;
      if (Math.hypot(pl.x - p.x, pl.y - p.y) < pl.r + p.r) {
        pl.takeDamage(p.dmg, game);
        p.dead = true;
      }
    }
    if (p.life <= 0) p.dead = true;
  }
  game.projectiles = game.projectiles.filter((p) => !p.dead);
}

// Magiekugel: voller Schaden am Ziel, weniger Schaden an Gegnern im Umkreis
function explode(p, game, target) {
  p.dead = true;
  game.fx.ring(p.x, p.y, '#b07cff', p.aoe);
  game.fx.burst(p.x, p.y, '#c9a6ff', 10);
  for (const e of game.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (e === target) game.hitEnemy(e, p.dmg, Math.atan2(e.y - p.y, e.x - p.x), p.knockback);
    else if (d <= p.aoe + e.r) game.hitEnemy(e, Math.round(p.dmg * p.aoeFactor), Math.atan2(e.y - p.y, e.x - p.x), p.knockback);
  }
}

function drawProjectiles(ctx, cam, game) {
  for (const p of game.projectiles) {
    const sx = Math.round(p.x - cam.x);
    const sy = Math.round(p.y - cam.y);
    if (p.kind === 'arrow') {
      drawRotated(ctx, SPR.arrow, sx, sy, Math.atan2(p.vy, p.vx), -4);
    } else if (p.kind === 'orb') {
      ctx.fillStyle = 'rgba(176,124,255,0.5)';
      ctx.fillRect(sx - 3, sy - 3, 7, 7);
      ctx.fillStyle = '#b07cff';
      ctx.fillRect(sx - 2, sy - 2, 5, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(sx - 1, sy - 1, 3, 3);
    } else {
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(sx - 2, sy - 3, 5, 7);
      ctx.fillRect(sx - 3, sy - 2, 7, 5);
      ctx.fillStyle = '#ff5a5a';
      ctx.fillRect(sx - 2, sy - 2, 5, 5);
      ctx.fillStyle = '#ffd0d0';
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
  }
}
