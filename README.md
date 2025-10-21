# MarkType — Desktop Markdown Editor (Electron + Vite + React)

MarkType is a compact Markdown editor with a snappy Monaco-based editing experience, real-time preview (sanitized with DOMPurify), and a bottom console-style lint panel. It runs as a desktop app using Electron and can also run purely in the browser for development.

This README covers the current feature set, how to run it in dev, how to package the desktop app, and a few troubleshooting notes.

---

## Highlights

- Monaco editor: Markdown mode, line numbers, bracket matching, smooth typing.
- Live preview: `marked` for parsing and `dompurify` for safe HTML sanitization.
- Bottom lint console: Resizable, uses `markdownlint` when available, with a browser fallback linter to stay reliable.
- Theme + fonts: Light/dark theme toggle; per-pane font-size sliders (editor and preview) persisted in `localStorage`.
- Persistence: Your editor content is saved locally and restored on reload.
- Import/Export: Modal panel with drag-and-drop import of .md files and export to .md. In web mode uses browser APIs; in Electron you can wire native dialogs via the preload bridge.
- Relative images: The preview resolves relative image paths against `docs/examples/` so demo assets render.

---

## Run in development

Requirements

- Node.js v18 or later
- npm

Install deps:

```powershell
npm install
```

Desktop app (Electron) — default:

```powershell
npm run dev
```

Browser-only dev (Vite):

```powershell
npm run web:dev
# opens http://localhost:5173
```

---

## Package the desktop app (Windows)

We use electron-builder. The renderer is built to `dist-web/` and Electron packages from there.

```powershell
# 1) Build the renderer (vite -> dist-web/)
npm run build:web

# 2) Package the app (NSIS installer + unpacked folder under dist/)
npm run electron:build
```

Outputs

- Installer: `dist/MarkType Setup <version>.exe`
- Unpacked app: `dist/win-unpacked/MarkType.exe`

Notes

- Icons: If you don't provide icons, the default Electron icon is used. Place platform icons under `assets/` (see `assets/README.md`).
- Windows symlinks: If you ever see a 7-Zip symlink privilege error during packaging, enable "Developer Mode" in Windows Settings (For developers) or run the build in an elevated PowerShell, then retry.

---

## Project structure (key files)

- `index.html` — Vite entry for the renderer
- `vite.config.ts` — Vite config (`base: './'`, `build.outDir: 'dist-web'` for Electron)
- `tsconfig.json` — TypeScript config (NodeNext module resolution)
- `electron/main.js` — Electron main process (secure: `contextIsolation: true`, `nodeIntegration: false`)
- `electron/preload.js` — Preload bridge (exposes `window.electronAPI`) for safe native calls
- `src/main.tsx` — React bootstrap
- `src/App.tsx` — main layout, resizer logic, import/export modal, persistence, theme
- `src/components/EditorMonaco.tsx` — Monaco editor wrapper
- `src/components/Preview.tsx` — markdown → HTML (`marked` + `dompurify`) with link/image overrides
- `src/components/LintPanel.tsx` — lint UI (tries `markdownlint`, falls back to a reliable browser linter)
- `src/styles.css` — layout, resizer, themes, preview typography
- `docs/examples/*` — demo markdown docs and assets (used by the preview)

---

## Native APIs (Electron preload)

When running inside Electron, these methods are available on `window.electronAPI`:

- `openFileDialog(): Promise<string | null>` — open a native file dialog
- `readFile(path: string): Promise<string>` — read a file from disk
- `saveFile(path: string, contents: string): Promise<boolean>` — write a file to disk

The current UI uses browser import/export by default. You can enhance it to prefer these native APIs when `window.electronAPI` exists (and fall back to the browser in web mode).

---

## Optional: Generate docs/presentations

There are scripts to generate a Word user manual and a PowerPoint deck:

```powershell
npm run manual:docx
npm run slides:pptx
```

Generated `.docx`/`.pptx` files are ignored by `.gitignore`.

---

## Troubleshooting

- Packaging symlink error on Windows (7-Zip):
	- Enable Windows Developer Mode (Settings → For developers) or run the build in an elevated PowerShell.
	- Then clear the cache and retry packaging: `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"`.
- Vite "module externalized for browser compatibility" warnings for Node core modules used by `markdownlint` are expected in web builds; the app uses a fallback linter in the browser if `markdownlint` isn't loadable.

---

## Roadmap / ideas

- Prefer native Open/Save dialogs and filesystem in Electron by default (with browser fallback)
- Export to HTML/PDF
- Optional plugins (mermaid, KaTeX) via lazy loading
