const MAX_LEVEL = 20;
const xpForLevel = (level) => Math.round(25 * Math.pow(level, 1.4));

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

class Player {
  constructor(cls, x, y) {
    this.cls = cls;
    this.x = x;
    this.y = y;
    this.r = 4;
    this.level = 1;
    this.xp = 0;
    this.maxHp = cls.hp;
    this.hp = this.maxHp;
    this.aim = 0;
    this.cd = 0; // Angriffs-Abklingzeit
    this.blockT = 0; // Block aktiv
    this.blockCd = 0; // Block-Abklingzeit
    this.hurtT = 0;
    this.castT = 0;
    this.lastHit = -99;
    this.walkT = 0;
    this.moving = false;
    this.swing = null;
    this.kills = 0;
  }

  get dmgMul() { return 1 + this.cls.growth.dmg * (this.level - 1); }

  rollDamage() {
    const [a, b] = this.cls.damage;
    return Math.round((a + Math.random() * (b - a)) * this.dmgMul);
  }

  update(dt, game) {
    const c = this.cls;
    let dx = 0, dy = 0;
    if (Input.down('KeyW')) dy--;
    if (Input.down('KeyS')) dy++;
    if (Input.down('KeyA')) dx--;
    if (Input.down('KeyD')) dx++;
    const len = Math.hypot(dx, dy);
    this.moving = len > 0;
    if (len) {
      const speed = c.speed * (this.blockT > 0 ? c.block.slow : 1);
      this.x += (dx / len) * speed * dt;
      this.y += (dy / len) * speed * dt;
      this.walkT += dt;
    }
    this.x = Math.max(8, Math.min(WORLD - 8, this.x));
    this.y = Math.max(8, Math.min(WORLD - 8, this.y));

    const m = game.mouseWorld();
    this.aim = Math.atan2(m.y - this.y, m.x - this.x);

    this.cd -= dt;
    this.hurtT -= dt;
    this.castT -= dt;
    this.blockT = Math.max(0, this.blockT - dt);
    this.blockCd = Math.max(0, this.blockCd - dt);
    if (this.swing && (this.swing.t += dt) >= this.swing.dur) this.swing = null;

    if (c.block && Input.rightPressed && this.blockCd <= 0) {
      this.blockT = c.block.duration;
      this.blockCd = c.block.cooldown;
      game.fx.ring(this.x, this.y, '#7fd4ff', 14);
    }

    if (Input.mouse.left && this.cd <= 0 && this.blockT <= 0) {
      this.attack(game);
      this.cd = c.cooldown;
    }

    // Langsame Regeneration, wenn man 4 Sekunden keinen Schaden bekommen hat
    if (game.time - this.lastHit > 4 && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.02 * dt);
    }
  }

  attack(game) {
    const c = this.cls;
    const a = this.aim;
    if (c.attack === 'melee') {
      this.swing = { t: 0, dur: 0.16, a };
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d > c.range + e.r) continue;
        const diff = Math.abs(angleDiff(Math.atan2(e.y - this.y, e.x - this.x), a));
        if (diff <= c.arc / 2 || d < e.r + 5) game.hitEnemy(e, this.rollDamage(), a, c.knockback);
      }
      return;
    }
    const speed = c.projSpeed;
    game.projectiles.push({
      friendly: true,
      kind: c.attack,
      x: this.x + Math.cos(a) * 6,
      y: this.y + Math.sin(a) * 6,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: c.range / speed,
      r: c.attack === 'orb' ? 3 : 2,
      dmg: this.rollDamage(),
      pierce: c.pierce || 1,
      hit: new Set(),
      aoe: c.aoe || 0,
      aoeFactor: c.aoeFactor || 0,
      knockback: c.knockback,
    });
    if (c.attack === 'orb') this.castT = 0.2;
  }

  takeDamage(amount, game) {
    if (game.state !== 'play') return;
    if (this.blockT > 0) {
      game.fx.text(this.x, this.y - 12, 'Block', '#7fd4ff');
      return;
    }
    amount = Math.round(amount);
    this.hp -= amount;
    this.hurtT = 0.15;
    this.lastHit = game.time;
    game.shake = 3;
    game.fx.text(this.x, this.y - 12, `-${amount}`, '#ff5a5a');
    if (this.hp <= 0) {
      this.hp = 0;
      game.die();
    }
  }

  gainXp(amount, game) {
    if (this.level >= MAX_LEVEL) return;
    this.xp += amount;
    while (this.level < MAX_LEVEL && this.xp >= xpForLevel(this.level)) {
      this.xp -= xpForLevel(this.level);
      this.level++;
      this.maxHp += this.cls.growth.hp;
      this.hp = this.maxHp;
      game.levelUp();
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
  }

  draw(ctx, cam, game) {
    const sx = Math.round(this.x - cam.x);
    const sy = Math.round(this.y - cam.y);
    const bob = this.moving && Math.floor(this.walkT * 8) % 2 ? 1 : 0;
    const flip = Math.cos(this.aim) < 0;
    const behind = Math.sin(this.aim) < -0.35; // Waffe hinter dem Körper, wenn nach oben gezielt wird

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx - 4, sy + 5, 9, 2);

    if (behind) this.drawWeapon(ctx, sx, sy, flip, game);
    drawSprite(ctx, SPR[this.cls.sprite], sx, sy - bob, { flip, white: this.hurtT > 0 });
    if (!behind) this.drawWeapon(ctx, sx, sy, flip, game);
    if (this.cls.block) this.drawShield(ctx, sx, sy, flip, game);
  }

  drawWeapon(ctx, sx, sy, flip, game) {
    const c = this.cls;
    if (c.attack === 'melee') {
      let ang = this.aim + (flip ? -0.5 : 0.5);
      if (this.swing) {
        const p = this.swing.t / this.swing.dur;
        ang = this.swing.a - c.arc / 2 + c.arc * p;
        ctx.strokeStyle = `rgba(255,255,255,${0.85 * (1 - p)})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy + 1, c.range - 5, this.swing.a - c.arc / 2, ang);
        ctx.stroke();
      }
      if (this.blockT <= 0) drawRotated(ctx, SPR.sword, sx, sy + 2, ang, 1);
    } else if (c.attack === 'arrow') {
      drawRotated(ctx, SPR.bow, sx, sy + 1, this.aim, 3);
      if (this.cd <= 0) drawRotated(ctx, SPR.arrow, sx, sy + 1, this.aim, 1);
    } else {
      const bx = sx + (flip ? -7 : 7);
      const by = sy + 1 + Math.round(Math.sin(game.time * 3));
      if (this.castT > 0) {
        ctx.fillStyle = 'rgba(176,124,255,0.45)';
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSprite(ctx, SPR.book, bx, by, { flip });
    }
  }

  drawShield(ctx, sx, sy, flip, game) {
    if (this.blockT > 0) {
      const pulse = 11 + Math.round(Math.sin(game.time * 20));
      ctx.strokeStyle = 'rgba(127,212,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(sx, sy, pulse, 0, Math.PI * 2);
      ctx.stroke();
      drawSprite(ctx, SPR.shield, sx + Math.cos(this.aim) * 8, sy + Math.sin(this.aim) * 8 + 1);
    } else {
      drawSprite(ctx, SPR.shield, sx + (flip ? 5 : -5), sy + 2, { flip });
    }
  }
}
