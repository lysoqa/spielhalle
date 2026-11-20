# Spielhalle – Hinweise für Claude

Electron-Launcher im Pixel-Stil für die Spiele des Nutzers. Versionen, Patch Notes, Installation und Updates kommen aus GitHub Releases.
Der Nutzer vibecodet, spricht Deutsch und ist kein Profi-Entwickler. Erklärungen kurz und verständlich halten, Antworten auf Deutsch.

## Projekt-Aufbau

Zwei Repos, lokal **nebeneinander** im selben Ordner:

| Ordner | Repo | Inhalt |
|---|---|---|
| `Soulgrind` | `lysoqa/spielhalle` (öffentlich) | dieser Launcher |
| `Soulgrind-Game` | `lysoqa/soulgrind` (öffentlich) | das Spiel Soulgrind, hat eine eigene CLAUDE.md |

Am Spiel wird in `../Soulgrind-Game` gearbeitet, nicht hier.

## Technik

- Electron 33, kein Framework. `src/main.js` (Hauptprozess: GitHub-API, Download, Entpacken mit `extract-zip`, Spielstart, Spielzeit), `src/preload.js` (sichere API für die Oberfläche), `src/renderer/` (HTML/CSS/JS-Oberfläche).
- Schriften: `@fontsource/silkscreen` und `@fontsource/pixelify-sans` aus `node_modules`.
- Eingebaute Spiele in `src/games.default.json`. `repo` = GitHub-Repo, `local` = Ordner relativ zum Launcher. **`local` gilt nur bei `npm start`** (nicht gepackt); der installierte Launcher nutzt immer die Releases.
- Spiele werden als `.zip` aus dem neuesten Release geladen. Darin eine `.exe` oder `index.html` (Web-Spiele öffnen in einem eigenen Electron-Fenster).
- Nutzerdaten (installierte Spiele, Spielzeit, verschlüsselter GitHub-Token) liegen in `%APPDATA%\Spielhalle`.

## Starten und Bauen

- Entwickeln: `npm start` oder `Spielhalle starten.bat`.
- Installer bauen: `version` in `package.json` erhöhen, dann `npm run dist` → `dist/Spielhalle-Setup-<version>.exe`.
- Veröffentlichen: committen, pushen, `gh release create v<version> dist/Spielhalle-Setup-<version>.exe --title … --notes-file …`.
- Code-Signierung ist abgeschaltet (`signAndEditExecutable: false`), weil das Signier-Werkzeug Admin-Rechte bräuchte. Windows zeigt deshalb beim Installer eine SmartScreen-Warnung.

## Testen

Automatisch mit einem kleinen Electron-Skript: `app.setPath('userData', <Testordner>)` setzen (damit die echten Nutzerdaten unberührt bleiben), `src/main.js` per `require` laden, dann per `executeJavaScript` prüfen und mit `capturePage()` Screenshots machen. Läuft das Skript nicht aus dem Launcher-Ordner, gilt das Spiel nicht als Dev-Spiel; so lässt sich das Verhalten des installierten Launchers testen.

## Windows-Stolpersteine

- Nach einer Neuinstallation von Node/Git/gh kennt eine bereits offene Shell die Befehle nicht. PATH neu laden:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
- Unter Node 26 entpackt sich Electron bei `npm install` evtl. nicht vollständig (`electron.exe` fehlt). Fix steht in der README.
- Windows PowerShell 5.1 zerlegt Argumente mit `"` falsch: Commit-Nachrichten und Release-Notes über Dateien übergeben (`git commit -F`, `--notes-file`).
- Commits mit der GitHub-noreply-Adresse des Nutzers, nie mit einer privaten E-Mail.
