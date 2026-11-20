// Tastatur und Maus. Mauskoordinaten werden in Spielpixel umgerechnet.
const Input = {
  keys: new Set(),
  pressed: new Set(),
  mouse: { x: 0, y: 0, left: false, right: false },
  leftPressed: false,
  rightPressed: false,

  down(code) { return this.keys.has(code); },
  wasPressed(code) { return this.pressed.has(code); },
  endFrame() {
    this.pressed.clear();
    this.leftPressed = false;
    this.rightPressed = false;
  },

  init(canvas) {
    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * W;
      this.mouse.y = ((e.clientY - r.top) / r.height) * H;
    });
    addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.left = true; this.leftPressed = true; }
      if (e.button === 2) { this.mouse.right = true; this.rightPressed = true; }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.left = false;
      if (e.button === 2) this.mouse.right = false;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('blur', () => {
      this.keys.clear();
      this.mouse.left = this.mouse.right = false;
    });
  },
};
