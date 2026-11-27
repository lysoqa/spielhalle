# Soqa Launcher (früher Spielhalle) – Hinweise für Claude

Seit 0.4.0 heißt der Launcher **Soqa Launcher** (Icon: `build/icon.png`, `src/icon.png`). Repo und Ordner heißen weiter `spielhalle` / `Soulgrind`.

Electron-Launcher im Pixel-Stil für die Spiele des Nutzers. Versionen, Patch Notes, Installation und Updates kommen aus GitHub Releases.
Der Nutzer vibecodet, spricht Deutsch und ist kein Profi-Entwickler. Erklärungen kurz und verständlich halten, Antworten auf Deutsch.

**Hintergrund:** `../Soulgrind-Game/VERLAUF.md` erklärt bisherige Entscheidungen, Versionen und offene Punkte (Spiel und Launcher). Zu Beginn lesen und bei wichtigen neuen Entscheidungen unten ergänzen.

## Projekt-Aufbau

Zwei Repos, lokal **nebeneinander** im selben Ordner:

| Ordner | Repo | Inhalt |
|---|---|---|
| `Soulgrind` | `lysoqa/spielhalle` (öffentlich) | dieser Launcher |
| `Soulgrind-Game` | `lysoqa/soulgrind` (öffentlich) | das Spiel Soulgrind, hat eine eigene CLAUDE.md |
| `Aschenreich` | `lysoqa/aschenreich` (öffentlich) | das Spiel Aschenreich (ab Launcher 0.5.0), hat eine eigene CLAUDE.md |
| `Hexenpfad` | `lysoqa/hexenpfad` (öffentlich) | das Spiel Hexenpfad (ab Launcher 0.7.0), hat eine eigene CLAUDE.md |
| `~/OneDrive/Desktop/Soqa Adventure` | `lysoqa/soqa-adventure` (öffentlich) | Online-Koop-Spiel Soqa Adventure (ab Launcher 0.8.0), eigene CLAUDE.md, hat nichts mit Soulgrind zu tun |

Am Spiel wird in `../Soulgrind-Game` gearbeitet, nicht hier.

## Technik

- Electron 33, kein Framework. `src/main.js` (Hauptprozess: GitHub-API, Download, Entpacken mit `extract-zip`, Spielstart, Spielzeit), `src/preload.js` (sichere API für die Oberfläche), `src/renderer/` (HTML/CSS/JS-Oberfläche).
- Schriften: `@fontsource/silkscreen` und `@fontsource/pixelify-sans` aus `node_modules`.
- Eingebaute Spiele in `src/games.default.json`. `repo` = GitHub-Repo, `local` = Ordner relativ zum Launcher. **`local` gilt nur bei `npm start`** (nicht gepackt); der installierte Launcher nutzt immer die Releases.
- Spiele werden als `.zip` aus dem neuesten Release geladen. Darin eine `.exe` oder `index.html` (Web-Spiele öffnen in einem eigenen Electron-Fenster).
- Nutzerdaten (installierte Spiele, Spielzeit, verschlüsselter GitHub-Token) liegen in `%APPDATA%\Spielhalle`. Dieser Ordner bleibt trotz neuem Namen gleich (`app.setPath` oben in `src/main.js`), sonst gingen Spiele und Login verloren.

## Starten und Bauen

- Entwickeln: `npm start` oder `Spielhalle starten.bat`.
- Installer bauen: `version` in `package.json` erhöhen, dann `npm run dist` → `dist/Soqa-Launcher-Setup-<version>.exe`.
- Veröffentlichen: committen, pushen, `gh release create v<version> dist/Soqa-Launcher-Setup-<version>.exe --title … --notes-file …`.
- Code-Signierung ist abgeschaltet (`signAndEditExecutable: false`), weil das Signier-Werkzeug Admin-Rechte bräuchte. Windows zeigt deshalb beim Installer eine SmartScreen-Warnung.

## Testen

Automatisch mit einem kleinen Electron-Skript: `app.setPath('userData', <Testordner>)` setzen (damit die echten Nutzerdaten unberührt bleiben), `src/main.js` per `require` laden, dann per `executeJavaScript` prüfen und mit `capturePage()` Screenshots machen. Läuft das Skript nicht aus dem Launcher-Ordner, gilt das Spiel nicht als Dev-Spiel; so lässt sich das Verhalten des installierten Launchers testen.

## Windows-Stolpersteine

- Nach einer Neuinstallation von Node/Git/gh kennt eine bereits offene Shell die Befehle nicht. PATH neu laden:
  `$env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')`
- Unter Node 26 entpackt sich Electron bei `npm install` evtl. nicht vollständig (`electron.exe` fehlt). Fix steht in der README.
- Windows PowerShell 5.1 zerlegt Argumente mit `"` falsch: Commit-Nachrichten und Release-Notes über Dateien übergeben (`git commit -F`, `--notes-file`).
- Commits mit der GitHub-noreply-Adresse des Nutzers, nie mit einer privaten E-Mail. Vor dem ersten Commit `git config --local user.email` prüfen. Ist nichts gesetzt (z. B. auf einem anderen PC), in **beiden** Ordnern (`Soulgrind` und `Soulgrind-Game`) selbst einrichten:
  `git config --local user.name lysoqa` und `git config --local user.email 339582153+lysoqa@users.noreply.github.com`
