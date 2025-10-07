import React, { useState, useEffect } from "react";
import Editor from "./components/EditorMonaco";
import Preview from "./components/Preview";
import LintPanel from "./components/LintPanel";

const DEFAULT_MARKDOWN = `# Welcome to MarkType

This is a simple real-time Markdown editor and previewer built with React + TypeScript.

- Type Markdown on the left.
- See the preview on the right.

**Enjoy!**`;

export default function App() {
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("marktype:theme");
    return (saved as "light" | "dark") || "light";
  });

  useEffect(() => {
    try {
      localStorage.setItem("marktype:theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {
      /* ignore */
    }
  }, [theme]);

  return (
    <div className={`app`} data-theme={theme}>
      <header className="app-header">
        <div>MarkType — Live Markdown Editor</div>
        <div>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌞 Light" : "🌙 Dark"}
          </button>
        </div>
      </header>
      <main className="split">
        <section className="pane">
          <Editor value={markdown} onChange={setMarkdown} theme={theme} />
          <LintPanel text={markdown} />
        </section>
        <section className="pane">
          <Preview markdown={markdown} />
        </section>
      </main>
      <footer className="app-footer">Made by Group NoNameFound</footer>
    </div>
  );
}
