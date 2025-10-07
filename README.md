# MarkType — Real-time Markdown Editor

Motivation

- Markdown is the de-facto standard for documentation, but editing it often requires a separate preview step. MarkType provides instant visual feedback in the browser while you type.

What

- MarkType is a small single-page React + TypeScript app that shows a split view: an editor on the left and a live preview on the right. It uses `marked` to convert Markdown to HTML and `dompurify` to sanitize the output.

How to run

Requirements: Node.js v18+ (tested), npm

Install dependencies:

```powershell
npm install
```

Run development server:

```powershell
npm run dev
```

Build for production:

```powershell
npm run build
npm run preview
```

Project structure

- `index.html` — app entry
- `src/main.tsx` — app bootstrap
- `src/App.tsx` — main parent component (holds markdown state)
- `src/components/Editor.tsx` — text area for input
- `src/components/Preview.tsx` — renders sanitized HTML output
- `src/styles.css` — app styles

Notes

- I kept the Vite config minimal to avoid ESM plugin resolution issues on some systems. If you want to add `@vitejs/plugin-react`, ensure the environment supports ESM imports for plugins or use a matching plugin version for your Vite installation.

License

- MIT

# MarkType
