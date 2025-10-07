import React, { useState } from "react";
import Editor from "./components/Editor";
import Preview from "./components/Preview";

const DEFAULT_MARKDOWN = `# Welcome to MarkType

This is a simple real-time Markdown editor and previewer built with React + TypeScript.

- Type Markdown on the left.
- See the preview on the right.

**Enjoy!**`;

export default function App() {
  const [markdown, setMarkdown] = useState<string>(DEFAULT_MARKDOWN);

  return (
    <div className="app">
      <header className="app-header">MarkType — Live Markdown Editor</header>
      <main className="split">
        <section className="pane">
          <Editor value={markdown} onChange={setMarkdown} />
        </section>
        <section className="pane">
          <Preview markdown={markdown} />
        </section>
      </main>
      <footer className="app-footer">Made by Group NoNameFound</footer>
    </div>
  );
}
