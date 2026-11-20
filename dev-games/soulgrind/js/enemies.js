// Gegnertypen. hp/contact/xp sind Werte auf Level 1 und wachsen mit dem Level des Spielers.
const ENEMY_TYPES = {
  zombie: {
    name: 'Zombie', sprites: ['zombie'], hp: 50, speed: 20, contact: 12, xp: 10, r: 5, blood: '#4f7a3e',
  },
  bat: {
    name: 'Fledermaus', sprites: ['batA', 'batB'], hp: 18, speed: 55, contact: 7, xp: 7, r: 4, blood: '#6b4a8c',
    zigzag: true,
  },
  skeleton: {
    name: 'Skelett-Schütze', sprites: ['skeleton'], hp: 35, speed: 26, contact: 0, xp: 14, r: 5, blood: '#e8e4d4',
    ranged: { dist: 95, cd: 1.9, speed: 85, dmg: 9 },
  },
};

class Enemy {
  constructor(typeId, level, x, y) {
    const t = ENEMY_TYPES[typeId];
    const hpMul = 1 + 0.15 * (level - 1);
    const dmgMul = 1 + 0.1 * (level - 1);
    this.type = t;
    this.level = level;
    this.x = x;
    this.y = y;
    this.r = t.r;
    this.maxHp = Math.round(t.hp * hpMul);
    this.hp = this.maxHp;
    this.speed = t.speed * (1 + 0.02 * (level - 1)) * (0.9 + Math.random() * 0.2);
    this.contact = t.contact * dmgMul;
    this.bulletDmg = t.ranged ? t.ranged.dmg * dmgMul : 0;
    this.xp = Math.round(t.xp * (1 + 0.1 * (level - 1)));
    this.seed = Math.random() * 100;
    this.fireT = t.ranged ? 1 + Math.random() : 0;
    this.strafe = Math.random() < 0.5 ? 1 : -1;
    this.contactT = 0;
    this.flash = 0;
    this.facing = 1;
    this.dead = false;
  }

  update(dt, game) {
    const p = game.player;
    const t = this.type;
    const dx = p.x - this.x;
    const dy = p.y - this.y;
    const d = Math.hypot(dx, dy) || 1;
    const ux = dx / d;
    const uy = dy / d;
    let mx = ux, my = uy;

    if (t.ranged) {
      if (d > t.ranged.dist + 15) { mx = ux; my = uy; }
      else if (d < t.ranged.dist - 15) { mx = -ux; my = -uy; }
      else { mx = -uy * this.strafe * 0.7; my = ux * this.strafe * 0.7; }
      if (Math.random() < dt * 0.3) this.strafe *= -1;
      this.fireT -= dt;
      if (this.fireT <= 0 && d < 180) {
        this.shoot(game, Math.atan2(dy, dx));
        this.fireT = t.ranged.cd * (0.8 + Math.random() * 0.4);
      }
    } else if (t.zigzag) {
      const wave = Math.sin(game.time * 7 + this.seed) * 0.9;
      mx = ux - uy * wave;
      my = uy + ux * wave;
      const l = Math.hypot(mx, my) || 1;
      mx /= l; my /= l;
    }

    this.x += mx * this.speed * dt;
    this.y += my * this.speed * dt;
    this.facing = dx < 0 ? -1 : 1;
    this.contactT -= dt;
    this.flash -= dt;

    if (t.contact && d < this.r + p.r + 1 && this.contactT <= 0) {
      p.takeDamage(this.contact, game);
      this.contactT = 0.8;
    }
  }

  shoot(game, angle) {
    const shots = this.level >= 6 ? 3 : 1; // ab Level 6 schießen Skelette 3 Kugeln
    const sp = this.type.ranged.speed * (1 + 0.02 * (this.level - 1));
    for (let i = 0; i < shots; i++) {
      const a = angle + (i - (shots - 1) / 2) * 0.25;
      game.projectiles.push({
        friendly: false, kind: 'bullet', x: this.x, y: this.y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 200 / sp, r: 2, dmg: this.bulletDmg,
      });
    }
  }

  draw(ctx, cam, game) {
    const sx = Math.round(this.x - cam.x);
    const sy = Math.round(this.y - cam.y);
    const sprites = this.type.sprites;
    const spr = SPR[sprites[Math.floor((game.time + this.seed) * 7) % sprites.length]];
    const hover = this.type.zigzag ? -3 : 0;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(sx - 4, sy + 5, 9, 2);
    drawSprite(ctx, spr, sx, sy + hover, { flip: this.facing < 0, white: this.flash > 0 });

    if (this.hp < this.maxHp) {
      const w = 12;
      ctx.fillStyle = '#1a1420';
      ctx.fillRect(sx - w / 2, sy - 10 + hover, w, 2);
      ctx.fillStyle = '#e04848';
      ctx.fillRect(sx - w / 2, sy - 10 + hover, Math.max(1, Math.round((w * this.hp) / this.maxHp)), 2);
    }
  }
}

// Wählt einen Gegnertyp passend zum Level des Spielers
function pickEnemyType(level) {
  const weights = {
    zombie: 45,
    bat: 30 + level,
    skeleton: level >= 2 ? 15 + level * 2 : 0,
  };
  let total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [id, w] of Object.entries(weights)) {
    if ((r -= w) < 0) return id;
  }
  return 'zombie';
}

function spawnEnemy(game) {
  const p = game.player;
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * Math.PI * 2;
    const dist = 220 + Math.random() * 50;
    const x = Math.max(10, Math.min(WORLD - 10, p.x + Math.cos(a) * dist));
    const y = Math.max(10, Math.min(WORLD - 10, p.y + Math.sin(a) * dist));
    if (Math.hypot(x - p.x, y - p.y) > 150) {
      game.enemies.push(new Enemy(pickEnemyType(p.level), p.level, x, y));
      return;
    }
  }
}

const maxEnemies = (level) => Math.min(40, 7 + level * 2);
const spawnDelay = (level) => Math.max(0.35, 1.3 - level * 0.05);
