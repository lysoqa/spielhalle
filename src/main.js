const { app, BrowserWindow, ipcMain, shell, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { spawn } = require('child_process');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const extract = require('extract-zip');

const DEFAULT_GAMES = require('./games.default.json');
// Der Launcher hieß früher „Spielhalle“. Der Datenordner bleibt %APPDATA%Spielhalle,
// damit installierte Spiele, Spielstände und der Login beim Umbenennen erhalten bleiben.
app.setPath('userData', path.join(app.getPath('appData'), 'Spielhalle'));
const DATA_DIR = app.getPath('userData');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const GAMES_DIR = path.join(DATA_DIR, 'games');
const RELEASE_CACHE_MS = 5 * 60 * 1000;

let win = null;
const running = new Map(); // id -> Startzeit
const busy = new Set(); // ids, die gerade installiert werden
const releaseCache = new Map(); // id -> { at, data }

// ---------- Zustand (installierte Versionen, Spielzeit, Einstellungen) ----------

function loadState() {
  let s = {};
  try { s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch {}
  s.games ??= {};
  s.customGames ??= [];
  s.settings ??= { closeOnLaunch: false };
  return s;
}
const state = loadState();

function saveState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function allGames() {
  return [...DEFAULT_GAMES.map((g) => ({ ...g, builtin: true })), ...state.customGames];
}

function findGame(id) {
  const g = allGames().find((x) => x.id === id);
  if (!g) throw new Error(`Unbekanntes Spiel: ${id}`);
  return g;
}

function send(channel, data) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, data);
}

// ---------- GitHub-Token (verschlüsselt gespeichert) ----------

function getToken() {
  const enc = state.settings.tokenEnc;
  if (!enc) return null;
  try {
    const buf = Buffer.from(enc, 'base64');
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString();
  } catch { return null; }
}

function setToken(token) {
  if (!token) delete state.settings.tokenEnc;
  else {
    const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(token) : Buffer.from(token);
    state.settings.tokenEnc = buf.toString('base64');
  }
}

// ---------- GitHub Releases ----------

async function gh(url, accept = 'application/vnd.github+json') {
  const headers = { Accept: accept, 'User-Agent': 'Soqa-Launcher', 'X-GitHub-Api-Version': '2022-11-28' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const err = new Error(
      res.status === 404 ? 'Repo oder Release nicht gefunden (privates Repo? Dann Token in den Einstellungen eintragen).'
      : res.status === 403 ? 'GitHub-Limit erreicht oder kein Zugriff. Ein Token in den Einstellungen hilft.'
      : `GitHub antwortet mit ${res.status}.`);
    err.status = res.status;
    throw err;
  }
  return res;
}

function pickAsset(assets, game) {
  const zips = (assets || []).filter((a) => a.name.toLowerCase().endsWith('.zip'));
  if (game.asset) {
    const re = new RegExp(game.asset, 'i');
    return zips.find((a) => re.test(a.name)) || null;
  }
  return zips.find((a) => /win/i.test(a.name)) || zips[0] || null;
}

async function latestRelease(game, force = false) {
  if (!game.repo) return null;
  const cached = releaseCache.get(game.id);
  if (!force && cached && Date.now() - cached.at < RELEASE_CACHE_MS) return cached.data;

  let data;
  try {
    const r = await (await gh(`https://api.github.com/repos/${game.repo}/releases/latest`)).json();
    const asset = pickAsset(r.assets, game);
    data = {
      version: String(r.tag_name || '').replace(/^v/i, ''),
      title: r.name || r.tag_name,
      body: r.body || '',
      publishedAt: r.published_at,
      url: r.html_url,
      asset: asset ? { name: asset.name, size: asset.size, url: asset.url } : null,
    };
  } catch (e) {
    if (e.status !== 404) throw e;
    // 404 heißt entweder "keine Releases" oder "Repo privat / nicht sichtbar"
    try {
      await gh(`https://api.github.com/repos/${game.repo}`);
    } catch (e2) {
      if (e2.status === 404) {
        throw new Error(getToken()
          ? 'Kein Zugriff auf das Repo. Hat der Token Leserechte für dieses Repo?'
          : 'Privates Repo: Bitte in den Einstellungen einen GitHub-Token eintragen.');
      }
      throw e2;
    }
    data = { none: true };
  }
  releaseCache.set(game.id, { at: Date.now(), data });
  return data;
}

// ---------- Installieren ----------

async function dirSize(dir) {
  let total = 0;
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    total += entry.isDirectory() ? await dirSize(p) : (await fsp.stat(p)).size;
  }
  return total;
}

async function install(id) {
  const game = findGame(id);
  if (isDev(game)) throw new Error('Dev-Spiele werden direkt aus dem Ordner gestartet.');
  if (running.has(id)) throw new Error('Das Spiel läuft gerade. Bitte erst beenden.');
  if (busy.has(id)) return;
  busy.add(id);
  const zipFile = path.join(GAMES_DIR, `${id}.download.zip`);
  const newDir = path.join(GAMES_DIR, `${id}.new`);
  const target = path.join(GAMES_DIR, id);
  try {
    const rel = await latestRelease(game, true);
    if (!rel || rel.none) throw new Error('Für dieses Spiel gibt es noch kein Release.');
    if (!rel.asset) throw new Error('Das neueste Release hat keine .zip-Datei.');

    await fsp.mkdir(GAMES_DIR, { recursive: true });
    const res = await gh(rel.asset.url, 'application/octet-stream');
    const total = Number(res.headers.get('content-length')) || rel.asset.size;
    let received = 0;
    let lastSent = 0;
    const body = Readable.fromWeb(res.body);
    body.on('data', (chunk) => {
      received += chunk.length;
      if (Date.now() - lastSent > 100) {
        lastSent = Date.now();
        send('progress', { id, phase: 'download', received, total });
      }
    });
    await pipeline(body, fs.createWriteStream(zipFile));

    send('progress', { id, phase: 'extract' });
    await fsp.rm(newDir, { recursive: true, force: true });
    await extract(zipFile, { dir: newDir });
    await fsp.rm(target, { recursive: true, force: true });
    await fsp.rename(newDir, target);

    state.games[id] = {
      ...state.games[id],
      installedVersion: rel.version,
      sizeBytes: await dirSize(target),
      installedAt: Date.now(),
    };
    saveState();
  } finally {
    busy.delete(id);
    await fsp.rm(zipFile, { force: true }).catch(() => {});
    await fsp.rm(newDir, { recursive: true, force: true }).catch(() => {});
    send('progress', { id, phase: 'done' });
    send('changed');
  }
}

async function uninstall(id) {
  const game = findGame(id);
  if (isDev(game)) throw new Error('Dev-Spiele können nicht deinstalliert werden.');
  if (running.has(id)) throw new Error('Das Spiel läuft gerade. Bitte erst beenden.');
  await fsp.rm(path.join(GAMES_DIR, id), { recursive: true, force: true });
  if (state.games[id]) {
    delete state.games[id].installedVersion;
    delete state.games[id].sizeBytes;
  }
  saveState();
  send('changed');
}

// ---------- Starten ----------

// Beim Entwickeln (npm start) wird ein Spiel mit "local" direkt aus seinem Ordner gestartet.
// Im installierten Launcher kommt es immer aus den GitHub-Releases.
function localDir(game) {
  return game.local ? path.resolve(app.getAppPath(), game.local) : null;
}

function isDev(game) {
  return !app.isPackaged && !!game.local && fs.existsSync(localDir(game));
}

function gameDir(game) {
  return isDev(game) ? localDir(game) : path.join(GAMES_DIR, game.id);
}

async function findLaunchFile(dir, depth = 0) {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const exe = files.find((f) => f.toLowerCase().endsWith('.exe') && !/unins|setup|crash|helper/i.test(f));
  if (exe) return path.join(dir, exe);
  if (files.includes('index.html')) return path.join(dir, 'index.html');
  if (depth < 2) {
    for (const e of entries.filter((x) => x.isDirectory())) {
      const found = await findLaunchFile(path.join(dir, e.name), depth + 1);
      if (found) return found;
    }
  }
  return null;
}

async function play(id) {
  if (running.has(id)) return;
  const game = findGame(id);
  const dir = gameDir(game);
  if (!fs.existsSync(dir)) throw new Error('Spiel ist nicht installiert.');
  const file = game.exe ? path.join(dir, game.exe) : await findLaunchFile(dir);
  if (!file || !fs.existsSync(file)) throw new Error('Keine .exe oder index.html im Spielordner gefunden.');

  const start = Date.now();
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
    running.delete(id);
    const s = (state.games[id] ??= {});
    s.playSeconds = (s.playSeconds || 0) + Math.round((Date.now() - start) / 1000);
    s.lastPlayed = Date.now();
    saveState();
    if (win && !win.isDestroyed() && win.isMinimized()) win.restore();
    send('changed');
  };

  running.set(id, start);
  if (file.toLowerCase().endsWith('.html')) {
    const gw = new BrowserWindow({
      width: 1280, height: 800, title: game.name, backgroundColor: '#000000', autoHideMenuBar: true,
      webPreferences: { contextIsolation: true, sandbox: true },
    });
    // Links aus dem Spiel (z. B. Discord-Einladung) im normalen Browser öffnen, nicht in einem Spielfenster
    gw.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https:\/\//i.test(url)) shell.openExternal(url);
      return { action: 'deny' };
    });
    gw.loadFile(file);
    gw.on('closed', done);
  } else {
    const child = spawn(file, [], { cwd: path.dirname(file), stdio: 'ignore' });
    child.on('error', done);
    child.on('exit', done);
  }
  (state.games[id] ??= {}).lastPlayed = Date.now();
  saveState();
  if (state.settings.closeOnLaunch && win) win.minimize();
  send('changed');
}

// ---------- IPC ----------

function listGames() {
  return allGames().map((g) => {
    const s = state.games[g.id] || {};
    return {
      ...g,
      dev: isDev(g),
      installedVersion: isDev(g) ? 'dev' : s.installedVersion || null,
      sizeBytes: s.sizeBytes || 0,
      playSeconds: s.playSeconds || 0,
      lastPlayed: s.lastPlayed || null,
      running: running.has(g.id),
      busy: busy.has(g.id),
    };
  });
}

function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'spiel';
}

function addGame({ name, repo, color, exe }) {
  repo = String(repo || '').trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\.git$|\/$/g, '');
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('Repo bitte als "besitzer/name" angeben.');
  name = String(name || '').trim() || repo.split('/')[1];
  let id = slug(name);
  while (allGames().some((g) => g.id === id)) id += '-2';
  const game = { id, name, repo, color: color || '#e0b84a' };
  if (exe) game.exe = String(exe).trim();
  state.customGames.push(game);
  saveState();
  return id;
}

function removeGame(id) {
  const game = findGame(id);
  if (game.builtin) throw new Error('Eingebaute Spiele können nicht entfernt werden.');
  if (running.has(id)) throw new Error('Das Spiel läuft gerade.');
  state.customGames = state.customGames.filter((g) => g.id !== id);
  delete state.games[id];
  saveState();
  fsp.rm(path.join(GAMES_DIR, id), { recursive: true, force: true }).catch(() => {});
}

const handlers = {
  'games:list': () => listGames(),
  'games:release': (id, force) => latestRelease(findGame(id), force),
  'games:install': (id) => install(id),
  'games:uninstall': (id) => uninstall(id),
  'games:play': (id) => play(id),
  'games:openFolder': (id) => shell.openPath(gameDir(findGame(id))),
  'games:openRepo': (id) => {
    const g = findGame(id);
    if (g.repo) shell.openExternal(`https://github.com/${g.repo}`);
  },
  'games:add': (data) => addGame(data || {}),
  'games:remove': (id) => removeGame(id),
  'settings:get': () => ({
    closeOnLaunch: !!state.settings.closeOnLaunch,
    hasToken: !!state.settings.tokenEnc,
    dataDir: DATA_DIR,
    version: app.getVersion(),
  }),
  'settings:set': ({ closeOnLaunch, token } = {}) => {
    if (typeof closeOnLaunch === 'boolean') state.settings.closeOnLaunch = closeOnLaunch;
    if (typeof token === 'string') { setToken(token.trim()); releaseCache.clear(); }
    saveState();
  },
  'settings:openDataDir': () => shell.openPath(DATA_DIR),
  'open-external': (url) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  },
};
for (const [channel, fn] of Object.entries(handlers)) {
  ipcMain.handle(channel, (_e, ...args) => fn(...args));
}

// ---------- Fenster ----------

function createWindow() {
  win = new BrowserWindow({
    width: 1200, height: 780, minWidth: 900, minHeight: 600,
    title: 'Soqa Launcher', backgroundColor: '#0d0d11', autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e) => e.preventDefault());
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
