import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "./components/EditorMonaco";
import Preview from "./components/Preview";
import LintPanel from "./components/LintPanel";

const DEFAULT_MARKDOWN = `# Welcome to MarkType

This is a simple real-time Markdown editor and previewer built with React + TypeScript.

- Type Markdown on the left.
- See the preview on the right.

**Enjoy!**`;

export default function App() {
  const [markdown, setMarkdown] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("marktype:content");
      return saved || DEFAULT_MARKDOWN;
    } catch (err) {
      return DEFAULT_MARKDOWN;
    }
  });
  const saveTimerRef = useRef<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("marktype:theme");
    return (saved as "light" | "dark") || "light";
  });

  const [previewFont, setPreviewFont] = useState<number>(() => {
    const saved = localStorage.getItem("marktype:previewFont");
    return saved ? Number(saved) : 16;
  });
  const [editorFont, setEditorFont] = useState<number>(() => {
    const saved = localStorage.getItem("marktype:editorFont");
    return saved ? Number(saved) : 14;
  });

  const [lintHeight, setLintHeight] = useState<number>(220);
  const draggingRef = useRef(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  const onMouseMove = useCallback((e: MouseEvent | PointerEvent) => {
    if (!draggingRef.current) return;
    const clientY = (e as MouseEvent).clientY ?? (e as PointerEvent).clientY;
    const dy = startYRef.current - clientY; // drag up to increase height
    const newH = Math.max(80, startHeightRef.current + dy);
    // batch updates via rAF for smoother, snappy resizing
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setLintHeight(newH);
      rafRef.current = null;
    });
  }, []);

  const onMouseUp = useCallback(() => {
    // open combined panel instead
    setPanelOpen(true);
    document.body.style.cursor = "";
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    document.removeEventListener("pointermove", onMouseMove as EventListener);
    document.removeEventListener("pointerup", onMouseUp as EventListener);
    // re-enable text selection
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, [onMouseMove]);

  // Ensure listeners cleaned up on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointermove", onMouseMove as EventListener);
      document.removeEventListener("pointerup", onMouseUp as EventListener);
      // cleanup rAF and selection style
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, [onMouseMove, onMouseUp]);

  const handleStartDrag = (e: React.MouseEvent | React.PointerEvent) => {
    // prevent native behaviors like text selection / touch scroll
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = (e as any).clientY;
    startHeightRef.current = lintHeight;
    document.body.style.cursor = "ns-resize";
    // disable text selection while dragging to avoid accidental selection
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
    // try to capture the pointer so drags stay with the handle
    try {
      if ((e as any).pointerId && (e.currentTarget as any).setPointerCapture) {
        (e.currentTarget as any).setPointerCapture((e as any).pointerId);
      }
    } catch (err) {
      /* ignore */
    }
    // attach listeners for the drag (pointer + mouse for broader support)
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("pointermove", onMouseMove as EventListener);
    document.addEventListener("pointerup", onMouseUp as EventListener);
  };

  useEffect(() => {
    try {
      localStorage.setItem("marktype:theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {
      /* ignore */
    }
  }, [theme]);

  // Persist markdown content with debounce
  useEffect(() => {
    try {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current as any);
      }
      saveTimerRef.current = window.setTimeout(() => {
        try {
          localStorage.setItem("marktype:content", markdown);
        } catch (err) {}
        saveTimerRef.current = null;
      }, 500);
    } catch (err) {
      /* ignore */
    }
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current as any);
        saveTimerRef.current = null;
      }
    };
  }, [markdown]);

  const handleDownload = useCallback(() => {
    try {
      const blob = new Blob([markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "marktype.md";
      // append to body to make click work in all browsers
      document.body.appendChild(a);
      a.click();
      a.remove();
      // revoke after a short delay to ensure the download starts
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      // fallback: copy to clipboard? For now, silently ignore
      console.error("Download failed", err);
    }
  }, [markdown]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      if (!f.name.toLowerCase().endsWith(".md")) {
        alert("Please select a .md file");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        // confirm overwrite if editor has content
        if (markdown && markdown.trim().length > 0) {
          const ok = confirm(
            "Importing will replace the current editor contents. Continue?"
          );
          if (!ok) return;
        }
        setMarkdown(text);
      };
      reader.readAsText(f, "utf-8");
      // reset input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [markdown]
  );

  return (
    <div className={`app`} data-theme={theme}>
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>MarkType — Live Markdown Editor</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => setPanelOpen(true)}
            className="theme-toggle"
            aria-label="Import or export"
            title="Import or export markdown"
          >
            Import / Export
          </button>
          <label style={{ fontSize: 12 }}>Editor font</label>
          <input
            type="range"
            min={12}
            max={24}
            value={editorFont}
            onChange={(e) => {
              const v = Number(e.target.value);
              setEditorFont(v);
              try {
                localStorage.setItem("marktype:editorFont", String(v));
              } catch (err) {}
            }}
            aria-label="Editor font size"
          />
          <div style={{ minWidth: 36, textAlign: "right" }}>{editorFont}px</div>
          <label style={{ fontSize: 12 }}>Preview font</label>
          <input
            type="range"
            min={12}
            max={24}
            value={previewFont}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPreviewFont(v);
              try {
                localStorage.setItem("marktype:previewFont", String(v));
              } catch (err) {}
            }}
            aria-label="Preview font size"
          />
          <div style={{ minWidth: 36, textAlign: "right" }}>
            {previewFont}px
          </div>
          <button
            className="theme-toggle"
            onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌞 Light" : "🌙 Dark"}
          </button>
          {/* hidden file input used by panel import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,text/markdown"
            onChange={handleFileSelected}
            style={{ display: "none" }}
          />
        </div>
      </header>
      {panelOpen && (
        <div
          className={`import-panel-overlay ${dragActive ? "drag-active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
            const f = e.dataTransfer?.files && e.dataTransfer.files[0];
            if (!f) return;
            if (!f.name.toLowerCase().endsWith(".md")) {
              alert("Please drop a .md file");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              const text = String(reader.result || "");
              if (markdown && markdown.trim().length > 0) {
                const ok = confirm(
                  "Importing will replace the current editor contents. Continue?"
                );
                if (!ok) return;
              }
              setMarkdown(text);
              setPanelOpen(false);
            };
            reader.readAsText(f, "utf-8");
          }}
        >
          <div className="import-panel" role="dialog" aria-modal="true">
            <h3>Import or export Markdown</h3>
            <p style={{ marginTop: 6 }}>
              You can drag &amp; drop a <code>.md</code> file here to import it,
              or use the buttons to import via file picker or export the current
              contents.
            </p>
            <div className="import-actions">
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="theme-toggle"
              >
                Import .md
              </button>
              <button
                onClick={() => {
                  handleDownload();
                  setPanelOpen(false);
                }}
                className="theme-toggle"
              >
                Export .md
              </button>
              <button
                onClick={() => setPanelOpen(false)}
                className="theme-toggle"
                style={{ marginLeft: 8 }}
              >
                Close
              </button>
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
              Tip: importing replaces current editor content. You will be
              prompted to confirm.
            </div>
          </div>
        </div>
      )}
      <main className="main-with-console">
        <div className="split top-area">
          <section className="pane">
            <Editor
              value={markdown}
              onChange={setMarkdown}
              theme={theme}
              fontSize={editorFont}
            />
          </section>
          <section className="pane">
            <Preview markdown={markdown} fontSize={previewFont} />
          </section>
        </div>

        <div
          className="resizer"
          onMouseDown={handleStartDrag}
          onPointerDown={handleStartDrag}
          title="Drag to resize lint console"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize lint console"
        >
          <div className="resizer-handle" aria-hidden="true" />
        </div>

        <div
          className="bottom-lint"
          style={{ height: Math.max(lintHeight, 120), minHeight: 120 }}
        >
          <LintPanel text={markdown} />
        </div>
      </main>
      <footer className="app-footer">Made by Group NoNameFound</footer>
    </div>
  );
}
