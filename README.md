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
- Import/Export panel:
- Export current editor content to `.md`, `.mmd`, `.html`, or `.pdf` (choose format from the panel)
- Import `.md`/`.mmd` via file picker or drag-and-drop

- GitHub integration / Git Sync:

  - Connect a Personal Access Token to browse your repos, open markdown files directly from a repo, and save changes back (commit) to GitHub.
  - Branch selection and file tree browsing supported.

- Assets & image workflow:

  - Upload images directly to the repository `assets/` folder when editing a Git-backed file.
  - Browse repo `assets/` via the Assets panel and insert or delete images.
  - Drag & drop images into the editor to upload or insert as data URLs when not connected to GitHub.

- Math & KaTeX:

  - KaTeX context menu for quick insertion of common math snippets and templates.
  - KaTeX linting detects unclosed delimiters and common mistakes.

- Mermaid support:

  - Render fenced-code-block or raw Mermaid diagrams in the preview.
  - Mermaid linting to catch syntax issues.

- Export & UI tweaks:
  - Single export control in the Import/Export panel with responsive styling and explicit `.mmd` option for Mermaid files.
  - PDF export uses `html2pdf.js` to create downloadable PDFs programmatically.

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
