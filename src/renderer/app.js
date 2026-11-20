const $ = (s) => document.querySelector(s);
const COLORS = ['#8b3dff', '#e0b84a', '#4cc24a', '#d6336c', '#2fb3c4', '#ef7d2d', '#3d7bff', '#c9c9c9'];

let games = [];
let selected = safeGet('selected');
const releases = {}; // id -> Release | { none } | { error }
const progress = {}; // id -> { phase, received, total }

function safeGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function safeSet(k, v) { try { localStorage.setItem(k, v); } catch {} }
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cleanErr = (e) => String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');

// ---------- Formatierung ----------

function fmtSize(bytes) {
  if (!bytes) return null;
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(1).replace('.', ',')} GB` : `${Math.max(1, Math.round(mb))} MB`;
}
function fmtPlaytime(sec) {
  if (!sec) return 'noch nicht gespielt';
  if (sec < 3600) return `${Math.max(1, Math.round(sec / 60))} Min. gespielt`;
  return `${(sec / 3600).toFixed(1).replace('.', ',')} Std. gespielt`;
}
const rtf = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });
function fmtAgo(ts) {
  if (!ts) return null;
  const min = Math.round((ts - Date.now()) / 60000);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const h = Math.round(min / 60);
  if (Math.abs(h) < 24) return rtf.format(h, 'hour');
  return rtf.format(Math.round(h / 24), 'day');
}
const fmtDate = (iso) => new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

// ---------- Daten laden ----------

async function refresh() {
  games = await api.listGames();
  if (!games.some((g) => g.id === selected)) selected = games[0]?.id ?? null;
  render();
}

async function loadRelease(id, force = false) {
  const game = games.find((g) => g.id === id);
  if (!game?.repo) return;
  if (force) delete releases[id];
  try { releases[id] = await api.getRelease(id, force); }
  catch (e) { releases[id] = { error: cleanErr(e) }; }
  render();
}

function loadAllReleases(force = false) {
  for (const g of games) if (g.repo) loadRelease(g.id, force);
}

// ---------- Status pro Spiel ----------

function statusOf(game) {
  const rel = releases[game.id];
  const latest = rel && !rel.none && !rel.error ? rel : null;
  const prog = progress[game.id];
  if (game.running) return { kind: 'running', label: 'Läuft …' };
  if (prog && prog.phase === 'download') {
    const pct = prog.total ? Math.round((prog.received / prog.total) * 100) : null;
    return { kind: 'busy', label: pct != null ? `Lädt ${pct} %` : 'Lädt …', pct };
  }
  if (prog && prog.phase === 'extract') return { kind: 'busy', label: 'Entpacke …', pct: 100 };
  if (game.local) return { kind: 'play', label: 'Spielen' };
  if (!game.installedVersion) {
    if (latest?.asset) return { kind: 'install', label: 'Installieren' };
    if (!rel) return { kind: 'wait', label: 'Prüfe …' };
    return { kind: 'none', label: 'Nicht verfügbar' };
  }
  if (latest?.asset && latest.version !== game.installedVersion) {
    return { kind: 'update', label: `Update auf ${latest.version}` };
  }
  return { kind: 'play', label: 'Spielen' };
}

// ---------- Rendern ----------

function render() {
  renderShelf();
  renderDetail();
}

function renderShelf() {
  const installed = games.filter((g) => g.installedVersion).length;
  $('#shelf-count').textContent = `${games.length} im Regal · ${installed} installiert`;
  const tiles = games.map((g) => {
    const rel = releases[g.id];
    const version = g.local ? 'dev' : g.installedVersion || (rel && rel.version) || '–';
    const hasUpdate = statusOf(g).kind === 'update';
    return `
      <button class="tile ${g.id === selected ? 'selected' : ''}" data-id="${esc(g.id)}" style="--c:${esc(g.color || '#888')}">
        ${hasUpdate ? '<span class="badge">Update</span>' : ''}
        ${g.running ? '<span class="badge live">Läuft</span>' : ''}
        <span class="tile-icon">${pixelIcon(g)}</span>
        <span class="tile-name">${esc(g.name)}</span>
        <span class="tile-version">${version === 'dev' ? 'DEV' : esc(version.startsWith('–') ? version : 'v' + version)}</span>
      </button>`;
  });
  tiles.push(`<button class="tile add" id="add-tile"><span class="plus">+</span><span class="tile-name">Spiel hinzufügen</span></button>`);
  $('#shelf').innerHTML = tiles.join('');
}

function renderDetail() {
  const g = games.find((x) => x.id === selected);
  const el = $('#detail');
  if (!g) { el.innerHTML = '<p class="muted">Noch keine Spiele. Füge oben eins hinzu.</p>'; return; }

  const rel = releases[g.id];
  const st = statusOf(g);
  const stateLine = g.local ? 'Dev-Version aus dem Projektordner'
    : g.installedVersion ? `v${esc(g.installedVersion)} installiert` : 'nicht installiert';
  const meta = [
    g.repo ? `<a href="#" class="repo" data-action="repo">${esc(g.repo)} ↗</a>` : null,
    fmtSize(g.sizeBytes),
    fmtPlaytime(g.playSeconds),
    g.lastPlayed ? `zuletzt ${fmtAgo(g.lastPlayed)}` : null,
  ].filter(Boolean).join(' · ');

  const primaryDisabled = ['running', 'busy', 'wait', 'none'].includes(st.kind);
  const icon = { play: '▶', update: '⬇', install: '⬇', running: '●' }[st.kind] || '';
  const bar = st.kind === 'busy' ? `<span class="bar" style="width:${st.pct ?? 30}%"></span>` : '';

  el.style.setProperty('--c', g.color || '#888');
  // Titelgröße so wählen, dass das längste Wort in eine Zeile passt
  const longest = Math.max(...g.name.split(/\s+/).map((w) => w.length));
  el.style.setProperty('--title-size', `${Math.min(72, Math.floor(440 / (longest * 0.95)))}px`);
  el.innerHTML = `
    <div class="detail-left">
      <p class="muted state">${stateLine}</p>
      <h1 class="title">${esc(g.name)}</h1>
      <p class="meta">${meta}</p>
      <div class="actions">
        <button class="btn primary big" data-action="primary" ${primaryDisabled ? 'disabled' : ''}>
          ${bar}<span class="lbl">${icon ? `<span class="ico">${icon}</span>` : ''}${esc(st.label)}</span>
        </button>
        ${g.repo ? '<button class="icon-btn square" data-action="reload" title="Nach Updates suchen">⟳</button>' : ''}
        <button class="icon-btn square" data-action="more" title="Mehr">⋯</button>
      </div>
    </div>
    <div class="detail-right">${releaseHtml(g, rel)}</div>`;
}

function releaseHtml(g, rel) {
  if (g.local) {
    return `<div class="bigver">DEV</div>
      <p class="muted">Läuft direkt aus <code>${esc(g.local)}</code>.</p>
      <div class="notes"><p>Sobald das Spiel ein eigenes GitHub-Repo mit Releases hat, trägst du es in
      <code>src/games.default.json</code> als <code>"repo"</code> ein und entfernst <code>"local"</code>.
      Dann zeigt der Launcher hier Version und Patch Notes.</p></div>`;
  }
  if (!rel) return '<div class="bigver dim">…</div><p class="muted">Lade Release-Infos …</p>';
  if (rel.error) return `<div class="bigver dim">?</div><p class="error">${esc(rel.error)}</p>`;
  if (rel.none) return '<div class="bigver dim">–</div><p class="muted">Noch kein Release auf GitHub.</p>';
  return `
    <div class="bigver">${esc(rel.version)}</div>
    <p class="muted">Erschienen am ${fmtDate(rel.publishedAt)}${rel.asset ? ` · ${fmtSize(rel.asset.size) || ''}` : ' · <span class="error">keine .zip im Release</span>'}</p>
    <hr>
    <h3 class="rel-title">${esc(rel.title)}</h3>
    <div class="notes">${renderMarkdown(rel.body) || '<p class="muted">Keine Patch Notes.</p>'}</div>`;
}

// ---------- Aktionen ----------

async function run(fn, okMsg) {
  try {
    await fn();
    if (okMsg) toast(okMsg);
  } catch (e) {
    toast(cleanErr(e), true);
  }
  await refresh();
}

async function primaryAction(g) {
  const kind = statusOf(g).kind;
  if (kind === 'play') return run(() => api.play(g.id));
  if (kind === 'install' || kind === 'update') {
    progress[g.id] = { phase: 'download', received: 0, total: 0 };
    render();
    return run(() => api.install(g.id), `${g.name} ist bereit.`);
  }
}

function openMore(g, anchor) {
  const menu = $('#more-menu');
  const items = [['folder', 'Ordner öffnen']];
  if (g.repo) items.push(['repo', 'Auf GitHub ansehen']);
  if (g.installedVersion && !g.local) items.push(['reinstall', 'Neu installieren'], ['uninstall', 'Deinstallieren']);
  if (!g.builtin) items.push(['remove', 'Aus dem Regal entfernen']);
  menu.innerHTML = items.map(([a, l]) => `<button data-menu="${a}" class="${a === 'uninstall' || a === 'remove' ? 'danger' : ''}">${l}</button>`).join('');
  const r = anchor.getBoundingClientRect();
  menu.style.left = `${r.left}px`;
  menu.style.top = `${r.bottom + 6}px`;
  menu.classList.remove('hidden');
  menu.onclick = async (e) => {
    const a = e.target.closest('[data-menu]')?.dataset.menu;
    if (!a) return;
    menu.classList.add('hidden');
    if (a === 'folder') api.openFolder(g.id);
    if (a === 'repo') api.openRepo(g.id);
    if (a === 'reinstall') { progress[g.id] = { phase: 'download' }; render(); run(() => api.install(g.id), `${g.name} neu installiert.`); }
    if (a === 'uninstall' && confirm(`${g.name} deinstallieren? Spielstände im Spielordner gehen dabei verloren.`)) run(() => api.uninstall(g.id), `${g.name} deinstalliert.`);
    if (a === 'remove' && confirm(`${g.name} aus dem Regal entfernen? Die installierten Dateien werden gelöscht.`)) run(() => api.removeGame(g.id));
  };
}

function toast(msg, isError = false) {
  const t = document.createElement('div');
  t.className = `toast ${isError ? 'err' : ''}`;
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), isError ? 7000 : 3500);
}

// ---------- Events ----------

$('#shelf').addEventListener('click', (e) => {
  const tile = e.target.closest('.tile');
  if (!tile) return;
  if (tile.id === 'add-tile') return openAddDialog();
  selected = tile.dataset.id;
  safeSet('selected', selected);
  render();
});

$('#detail').addEventListener('click', (e) => {
  const g = games.find((x) => x.id === selected);
  const link = e.target.closest('a[data-href]');
  if (link) { e.preventDefault(); return api.openExternal(link.dataset.href); }
  const btn = e.target.closest('[data-action]');
  if (!btn || !g) return;
  e.preventDefault();
  const a = btn.dataset.action;
  if (a === 'primary') primaryAction(g);
  if (a === 'reload') loadRelease(g.id, true);
  if (a === 'repo') api.openRepo(g.id);
  if (a === 'more') { e.stopPropagation(); openMore(g, btn); }
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('#more-menu')) $('#more-menu').classList.add('hidden');
});

document.addEventListener('keydown', (e) => {
  if (!$('#view-games').classList.contains('hidden') && !$('#add-dialog').open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    const i = games.findIndex((g) => g.id === selected);
    const next = games[(i + (e.key === 'ArrowRight' ? 1 : -1) + games.length) % games.length];
    if (next) { selected = next.id; safeSet('selected', selected); render(); }
  }
  if (e.key === 'Escape') $('#more-menu').classList.add('hidden');
});

$('#refresh-all').addEventListener('click', async () => { await refresh(); loadAllReleases(true); });

document.querySelectorAll('.tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === tab));
  $('#view-games').classList.toggle('hidden', tab.dataset.view !== 'games');
  $('#view-settings').classList.toggle('hidden', tab.dataset.view !== 'settings');
  if (tab.dataset.view === 'settings') loadSettings();
}));

api.on('progress', (p) => {
  if (p.phase === 'done') delete progress[p.id];
  else progress[p.id] = p;
  render();
});
api.on('changed', refresh);

// ---------- Spiel hinzufügen ----------

let pickedColor = COLORS[0];
function openAddDialog() {
  const form = $('#add-form');
  form.reset();
  $('#add-error').textContent = '';
  pickedColor = COLORS[games.length % COLORS.length];
  $('#color-pick').innerHTML = COLORS.map((c) => `<button type="button" class="swatch ${c === pickedColor ? 'on' : ''}" data-c="${c}" style="background:${c}"></button>`).join('');
  $('#add-dialog').showModal();
}
$('#color-pick').addEventListener('click', (e) => {
  const s = e.target.closest('.swatch');
  if (!s) return;
  pickedColor = s.dataset.c;
  document.querySelectorAll('.swatch').forEach((x) => x.classList.toggle('on', x === s));
});
$('#add-cancel').addEventListener('click', () => $('#add-dialog').close());
$('#add-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  try {
    const id = await api.addGame({ ...data, color: pickedColor });
    $('#add-dialog').close();
    selected = id;
    safeSet('selected', id);
    await refresh();
    loadRelease(id);
  } catch (err) {
    $('#add-error').textContent = cleanErr(err);
  }
});

// ---------- Einstellungen ----------

async function loadSettings() {
  const s = await api.getSettings();
  $('#set-close').checked = s.closeOnLaunch;
  $('#token-status').textContent = s.hasToken ? 'Ein Token ist gespeichert.' : 'Kein Token gespeichert.';
  $('#data-dir').textContent = s.dataDir;
  $('#app-version').textContent = `Spielhalle v${s.version}`;
}
$('#set-close').addEventListener('change', (e) => api.setSettings({ closeOnLaunch: e.target.checked }));
$('#save-token').addEventListener('click', async () => {
  const v = $('#set-token').value.trim();
  if (!v) return;
  await api.setSettings({ token: v });
  $('#set-token').value = '';
  toast('Token gespeichert.');
  loadSettings();
  loadAllReleases(true);
});
$('#clear-token').addEventListener('click', async () => {
  await api.setSettings({ token: '' });
  toast('Token entfernt.');
  loadSettings();
});
$('#open-data').addEventListener('click', () => api.openDataDir());

// ---------- Start ----------

refresh().then(() => loadAllReleases());
setInterval(() => renderDetail(), 60 * 1000); // "zuletzt vor X Minuten" aktuell halten
