// Spielschleife, Kamera, Effekte und Spielzustände (Auswahl, Spielen, Tod)
const W = 384;
const H = 216;
const WORLD = 1600;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
Input.init(canvas);

function fit() {
  const scale = Math.max(1, Math.floor(Math.min(innerWidth / W, innerHeight / H)));
  canvas.style.width = `${W * scale}px`;
  canvas.style.height = `${H * scale}px`;
}
addEventListener('resize', fit);
fit();

const game = {
  state: 'select', // select | play | dead
  paused: false,
  time: 0,
  runTime: 0,
  cam: { x: 0, y: 0 },
  player: null,
  enemies: [],
  projectiles: [],
  particles: [],
  texts: [],
  rings: [],
  shake: 0,
  spawnT: 0,
  levelBanner: 0,
  deadT: 0,
  hoverCard: -1,
  lastRun: null,

  start(classId) {
    this.player = new Player(CLASSES[classId], WORLD / 2, WORLD / 2);
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.texts = [];
    this.rings = [];
    this.runTime = 0;
    this.spawnT = 1;
    this.levelBanner = 0;
    this.paused = false;
    this.cam.x = this.player.x - W / 2;
    this.cam.y = this.player.y - H / 2;
    for (let i = 0; i < 4; i++) spawnEnemy(this);
    this.state = 'play';
  },

  mouseWorld() {
    return { x: this.cam.x + Input.mouse.x, y: this.cam.y + Input.mouse.y };
  },

  hitEnemy(e, dmg, angle, knockback) {
    if (e.dead) return;
    e.hp -= dmg;
    e.flash = 0.08;
    e.x += Math.cos(angle) * knockback;
    e.y += Math.sin(angle) * knockback;
    this.fx.text(e.x, e.y - 10, dmg, '#f1ede2');
    this.fx.burst(e.x, e.y, e.type.blood, 3);
    if (e.hp <= 0) {
      e.dead = true;
      this.player.kills++;
      this.fx.burst(e.x, e.y, e.type.blood, 12);
      this.fx.text(e.x, e.y - 4, `+${e.xp} XP`, '#ffd34a');
      this.player.gainXp(e.xp, this);
    }
  },

  levelUp() {
    this.levelBanner = 2;
    this.fx.ring(this.player.x, this.player.y, '#ffd34a', 30);
    this.fx.burst(this.player.x, this.player.y, '#ffd34a', 20);
  },

  die() {
    const p = this.player;
    this.state = 'dead';
    this.deadT = 0;
    this.lastRun = { cls: p.cls.name, level: p.level, kills: p.kills, time: this.runTime };
    this.fx.burst(p.x, p.y, '#d93a4a', 30);
  },

  fx: {
    particle(x, y, color, life = 0.5, speed = 40) {
      const a = Math.random() * Math.PI * 2;
      const v = Math.random() * speed;
      game.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, max: life, color });
    },
    burst(x, y, color, n) {
      for (let i = 0; i < n; i++) this.particle(x, y, color, 0.3 + Math.random() * 0.4, 60);
    },
    text(x, y, str, color) {
      game.texts.push({ x: x + (Math.random() * 6 - 3), y, str: String(str), color, life: 0.8 });
    },
    ring(x, y, color, radius) {
      game.rings.push({ x, y, color, radius, life: 0.35, max: 0.35 });
    },
  },

  update(dt) {
    this.time += dt;

    if (this.state === 'select') {
      const keys = ['Digit1', 'Digit2', 'Digit3'];
      keys.forEach((k, i) => { if (Input.wasPressed(k)) this.start(CLASS_ORDER[i]); });
      if (Input.leftPressed && this.hoverCard >= 0) {
        Input.mouse.left = false; // erster Klick soll nicht gleich angreifen
        this.start(CLASS_ORDER[this.hoverCard]);
      }
      return;
    }

    if (this.state === 'play' && Input.wasPressed('Escape')) this.paused = !this.paused;
    if (this.paused) return;

    if (this.state === 'play') {
      this.runTime += dt;
      this.player.update(dt, this);

      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        if (this.enemies.length < maxEnemies(this.player.level)) spawnEnemy(this);
        this.spawnT = spawnDelay(this.player.level);
      }
    }

    if (this.state === 'dead') {
      this.deadT += dt;
      if (this.deadT > 1.2 && Input.leftPressed) this.state = 'select';
    }

    for (const e of this.enemies) if (!e.dead) e.update(dt, this);
    separateEnemies(this.enemies);
    updateProjectiles(dt, this);
    const p = this.player;
    this.enemies = this.enemies.filter((e) => !e.dead && Math.hypot(e.x - p.x, e.y - p.y) < 450);

    for (const pt of this.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.9;
      pt.vy *= 0.9;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const t of this.texts) { t.y -= 22 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const r of this.rings) r.life -= dt;
    this.rings = this.rings.filter((r) => r.life > 0);
    this.levelBanner = Math.max(0, this.levelBanner - dt);
    this.shake = Math.max(0, this.shake - dt * 15);

    // Kamera folgt dem Spieler weich
    this.cam.x += (p.x - W / 2 - this.cam.x) * Math.min(1, dt * 8);
    this.cam.y += (p.y - H / 2 - this.cam.y) * Math.min(1, dt * 8);
  },

  draw() {
    if (this.state === 'select') {
      drawSelect(ctx, this);
      drawCrosshair(ctx);
      return;
    }
    const cam = {
      x: Math.round(this.cam.x + (Math.random() - 0.5) * this.shake),
      y: Math.round(this.cam.y + (Math.random() - 0.5) * this.shake),
    };
    drawGround(ctx, cam);

    const actors = this.state === 'dead' ? [...this.enemies] : [...this.enemies, this.player];
    actors.sort((a, b) => a.y - b.y);
    for (const a of actors) a.draw(ctx, cam, this);

    drawProjectiles(ctx, cam, this);

    for (const pt of this.particles) {
      ctx.globalAlpha = Math.min(1, pt.life / pt.max + 0.2);
      ctx.fillStyle = pt.color;
      ctx.fillRect(Math.round(pt.x - cam.x), Math.round(pt.y - cam.y), 1, 1);
    }
    ctx.globalAlpha = 1;
    for (const r of this.rings) {
      const p = 1 - r.life / r.max;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - p;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(Math.round(r.x - cam.x), Math.round(r.y - cam.y), Math.max(1, r.radius * (0.4 + 0.6 * p)), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 3);
      Font.draw(ctx, t.str, t.x - cam.x, t.y - cam.y, { align: 'center', color: t.color });
    }
    ctx.globalAlpha = 1;

    if (this.state === 'play') {
      if (this.player.hurtT > 0) {
        ctx.fillStyle = 'rgba(255,40,40,0.12)';
        ctx.fillRect(0, 0, W, H);
      }
      drawHUD(ctx, this);
      if (this.paused) drawPause(ctx);
    } else {
      drawDead(ctx, this);
    }
    drawCrosshair(ctx);
  },
};

// Gegner schieben sich leicht auseinander, damit sie nicht übereinander stehen
function separateEnemies(enemies) {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const min = a.r + b.r;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        a.x -= (dx / d) * push;
        a.y -= (dy / d) * push;
        b.x += (dx / d) * push;
        b.y += (dy / d) * push;
      }
    }
  }
}

addEventListener('blur', () => { if (game.state === 'play') game.paused = true; });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw();
  Input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
