# MarkType — Real-time Markdown Editor

MarkType is a compact, client-side Markdown authoring tool built with React and TypeScript. It provides an instant, side-by-side editing experience so you can write Markdown and see the rendered output immediately.

This README documents the current implementation and how to run and extend the project.

---

## Highlights (current)

- Monaco-based editor with Markdown mode, line numbers, bracket matching and a nicer editing UX.
- Live preview pane rendered with `marked` and sanitized using `dompurify`.
- Markdown lint panel powered by `markdownlint`.
- Light/dark theme toggle persisted in `localStorage` and applied via `data-theme` on the HTML root.
- TypeScript + Vite + React stack with a small, focused codebase.

---

## Quick start

Requirements

- Node.js v18 or later
- npm

Install and run the dev server:

```powershell
npm install
npm run dev
# open http://localhost:5173
```

Build for production and preview the built site:

```powershell
npm run build
npm run preview
```

---

## Project structure (important files)

- `index.html` — app entry
- `vite.config.ts` — Vite configuration
- `tsconfig.json` — TypeScript configuration (uses NodeNext module resolution)
- `src/main.tsx` — React bootstrap
- `src/App.tsx` — main app wiring, theme toggle and state
- `src/components/EditorMonaco.tsx` — Monaco editor wrapper used as the editor
- `src/components/Preview.tsx` — markdown -> HTML renderer (`marked` + `dompurify`)
- `src/components/LintPanel.tsx` — markdown linting UI (dynamic import of `markdownlint`)
- `src/styles.css` — layout and theme variables

---

## Development ideas / next steps

- Add explicit Open/Save via the File System.
- Add export to HTML/PDF features.
- Provide optional plugin hooks for custom renderers (e.g. mermaid, KaTeX) loaded lazily.

---
