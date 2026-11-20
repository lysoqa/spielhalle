# Spielhalle

Pixel-Launcher für unsere Spiele. Versionen und Patch Notes kommen aus GitHub Releases.

## Starten

```powershell
npm install
npm start
```

> **Node 26:** Beim `npm install` entpackt Electron sich evtl. nicht vollständig
> (`node_modules/electron/dist/electron.exe` fehlt). Dann einmal ausführen:
>
> ```powershell
> $zip = Get-ChildItem "$env:LOCALAPPDATA\electron\Cache" -Recurse -Filter 'electron-v*-win32-x64.zip' | Select-Object -First 1
> Expand-Archive $zip.FullName node_modules/electron/dist -Force
> Set-Content node_modules/electron/path.txt 'electron.exe' -NoNewline -Encoding ascii
> ```

## Ein Spiel hinzufügen

Im Launcher auf **+ Spiel hinzufügen** klicken und das Repo als `besitzer/repo` eintragen.

Damit der Launcher ein Spiel installieren kann, braucht das Repo ein **GitHub Release**:

- Tag = Version, z. B. `v0.2.0`
- Release-Text = Patch Notes (Markdown)
- Anhang: eine **.zip** mit dem Spiel. Darin eine `.exe` oder eine `index.html` (Web-Spiel).
  Gibt es mehrere .zip-Dateien, nimmt der Launcher die mit „win“ im Namen.

Für private Repos in den Einstellungen ein GitHub-Token eintragen.

## Eingebaute Spiele

Stehen in `src/games.default.json`. Felder:

| Feld    | Bedeutung |
|---------|-----------|
| `id`    | eindeutiger Kurzname |
| `name`  | Anzeigename |
| `color` | Farbe der Kachel |
| `repo`  | GitHub-Repo `besitzer/repo` |
| `local` | Spielordner relativ zum Launcher. Nur bei `npm start` (Entwicklung) wird das Spiel direkt von dort gestartet, der installierte Launcher nutzt immer `repo`. |
| `exe`   | optional: Startdatei im Spielordner |
| `asset` | optional: Muster für den Namen der .zip im Release |
| `icon`  | optional: Pixel-Icon aus Zeilen mit `#` und `.` |

Soulgrind liegt in `../Soulgrind-Game` (eigenes Repo `lysoqa/soulgrind`).
Spiel-Updates veröffentlichst du dort mit `.\release.ps1 <version> "<Patch Notes>"`.

## Als .exe bauen

```powershell
npm run dist
```

Der Installer landet in `dist/`.
