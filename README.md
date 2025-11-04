# MarkType

Desktop-first Markdown editor built with Electron, Vite, and React. Edit in Monaco, preview safely (DOMPurify), and view lint feedback in a resizable console.

- Download the latest Windows installer from Releases: https://github.com/KadeStanford/MarkType/releases
- Example release notes: docs/releases/v0.1.2.md

## Features

- Electron desktop app (secure defaults: contextIsolation on, nodeIntegration off)
- Monaco editor (Markdown syntax, folding, bracket matching)
- Live preview: marked + DOMPurify sanitizer
- Lint panel: markdownlint when available, with a lightweight browser fallback
- Theme + typography: light/dark toggle, per-pane font-size sliders
- Import/Export panel:
  - Export current editor content to .md
  - Import .md via file picker or drag-and-drop
- Persistence: auto-save/restore editor content
- UI polish: improved dark-mode contrast for blocks/tables; larger lint-panel font
- Demo docs: docs/examples (Showcase, DOMPurify demo, etc.)

## Getting started (desktop dev)

Prereqs: Node 18+ and npm.

```powershell
# install deps
npm ci

# run Electron + Vite together
npm run dev
```

Browser-only dev (optional):

```powershell
npm run web:dev
```

## Build and package (Windows)

Renderer output is built to dist-web; installer artifacts are written to dist.

```powershell
# build renderer bundle
npm run build:web

# package Electron app (NSIS installer)
npm run electron:build
```

Outputs:

- dist/MarkType Setup <version>.exe
- dist/win-unpacked/MarkType.exe

Icons:

- Place app icons in assets/ (see assets/README.md) to replace the default Electron icon.
