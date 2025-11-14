import React, { useState, useEffect, useRef, useCallback } from "react";
import Editor from "./components/EditorMonaco";
import KaTeXContextMenu from "./components/KaTeXContextMenu";
import ShortcutsModal from "./components/ShortcutsModal";
import ConfirmModal from "./components/ConfirmModal";
import Preview from "./components/Preview";
import LintPanel from "./components/LintPanel";
import logo from "./logoFinal.png";
import GitSyncPanel from "./components/GitSyncPanel";
import Toasts from "./components/Toast";
import AssetsPanel from "./components/AssetsPanel";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { renderMath } from "./utils/renderMath";

const DEFAULT_MARKDOWN = `# Welcome to MarkType

This is a simple real-time Markdown editor and previewer built with React + TypeScript.

- Type Markdown on the left.
- See the preview on the right.

**Enjoy!**`;

type Doc = {
  id: string;
  name: string;
  content: string;
  git?: {
    owner: string;
    repo: string;
    path: string;
    sha?: string;
    branch?: string;
  };
};

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const splitRef = useRef<HTMLDivElement | null>(null);
  const startSplitX = useRef(0);
  const startLeftPct = useRef(50);
  const [leftPct, setLeftPct] = useState<number>(() => {
    try {
      const s = localStorage.getItem("marktype:leftPct");
      return s ? Number(s) : 50;
    } catch {
      return 50;
    }
  });

  const onSplitMove = useCallback((e: any) => {
    const container = splitRef.current?.getBoundingClientRect();
    if (!container) return;
    const clientX =
      e.clientX ?? (e.touches && e.touches[0] && e.touches[0].clientX) ?? 0;
    const dx = clientX - startSplitX.current;
    const newLeftPx = (startLeftPct.current / 100) * container.width + dx;
    const newPct = Math.max(
      10,
      Math.min(90, (newLeftPx / container.width) * 100)
    );
    setLeftPct(newPct);
  }, []);

  const endSplit = useCallback(() => {
    document.removeEventListener("mousemove", onSplitMove);
    document.removeEventListener("mouseup", endSplit as any);
    document.removeEventListener("pointermove", onSplitMove as any);
    document.removeEventListener("pointerup", endSplit as any);
    document.body.style.cursor = "";
    try {
      localStorage.setItem("marktype:leftPct", String(leftPct));
    } catch (_) {}
  }, [leftPct, onSplitMove]);

  const startSplitDrag = useCallback(
    (e: React.MouseEvent | React.PointerEvent) => {
      e.preventDefault();
      const clientX = (e as any).clientX ?? 0;
      startSplitX.current = clientX;
      startLeftPct.current = leftPct;
      document.body.style.cursor = "col-resize";
      // pointer events preferred
      document.addEventListener("pointermove", onSplitMove as any);
      document.addEventListener("pointerup", endSplit as any);
      // mouse fallback
      document.addEventListener("mousemove", onSplitMove);
      document.addEventListener("mouseup", endSplit as any);
      try {
        if ((e as any).pointerId && (e.target as any).setPointerCapture) {
          (e.target as any).setPointerCapture((e as any).pointerId);
        }
      } catch (err) {
        /* ignore */
      }
    },
    [leftPct, onSplitMove, endSplit]
  );
  // keyboard handler for splitter: allow arrow keys to nudge the split
  const onSplitterKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setLeftPct((p) => Math.max(10, Math.min(90, p - step)));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setLeftPct((p) => Math.max(10, Math.min(90, p + step)));
    } else if (e.key === "Home") {
      e.preventDefault();
      setLeftPct(10);
    } else if (e.key === "End") {
      e.preventDefault();
      setLeftPct(90);
    }
  }, []);
  // Multi-document state
  const [docs, setDocs] = useState<Doc[]>(() => {
    try {
      const raw = localStorage.getItem("marktype:docs");
      if (raw) {
        const parsed = JSON.parse(raw) as Doc[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    // migrate from old single-doc storage if available
    try {
      const saved = localStorage.getItem("marktype:content");
      const initial: Doc = {
        id: makeId(),
        name: "untitled.md",
        content: saved || DEFAULT_MARKDOWN,
      };
      return [initial];
    } catch (_) {
      return [
        {
          id: makeId(),
          name: "untitled.md",
          content: DEFAULT_MARKDOWN,
        },
      ];
    }
  });
  const [activeId, setActiveId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("marktype:activeId");
      if (saved) return saved;
    } catch (_) {}
    return docs[0]?.id;
  });
  const activeDoc = docs.find((d) => d.id === activeId) || docs[0];
  const markdown = activeDoc?.content || "";
  // inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState<string>("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);
  // close confirmation state
  const [closingId, setClosingId] = useState<string | null>(null);
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

  // KaTeX context menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGitSync, setShowGitSync] = useState(false);
  const [showAssets, setShowAssets] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOpts, setConfirmOpts] = useState<{
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>({});
  const confirmResolveRef = useRef<((v: boolean) => void) | null>(null);

  const showConfirm = useCallback(
    (
      message: string,
      title = "Confirm",
      confirmLabel = "OK",
      cancelLabel = "Cancel"
    ) => {
      return new Promise<boolean>((resolve) => {
        setConfirmOpts({ title, message, confirmLabel, cancelLabel });
        confirmResolveRef.current = resolve;
        setConfirmOpen(true);
      });
    },
    []
  );

  useEffect(() => {
    // expose a simple global confirm helper for other components
    (window as any).__mt_confirm = async (message: string, title?: string) => {
      return await showConfirm(message, title || "Confirm");
    };
    return () => {
      try {
        delete (window as any).__mt_confirm;
      } catch (_) {}
    };
  }, [showConfirm]);

  const onMouseMove = useCallback((e: MouseEvent | PointerEvent) => {
    if (!draggingRef.current) return;
    const clientY = (e as MouseEvent).clientY ?? (e as PointerEvent).clientY;
    const dy = startYRef.current - clientY; // drag up to increase height
    // allow collapsing to zero height when dragging down fully
    const newH = Math.max(0, startHeightRef.current + dy);
    // batch updates via rAF for smoother, snappy resizing
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setLintHeight(newH);
      rafRef.current = null;
    });
  }, []);

  // editor -> preview scroll sync ratio (0..1)
  const [editorScrollRatio, setEditorScrollRatio] = useState<number>(0);
  const [editorVisibleLine, setEditorVisibleLine] = useState<number | null>(
    null
  );
  const commandsRef = useRef<{ undo?: () => void; redo?: () => void }>({});

  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle"
  );
  const saveTimerLocal = useRef<number | null>(null);

  // Git commit modal state (avoid using prompt())
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [pendingGitSaveDocId, setPendingGitSaveDocId] = useState<string | null>(
    null
  );
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [branchOptions, setBranchOptions] = useState<string[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("main");
  const [fetchingBranches, setFetchingBranches] = useState<boolean>(false);

  const fetchBranchesForDoc = useCallback(async (doc: Doc | undefined) => {
    if (!doc || !doc.git) return;
    const token = localStorage.getItem("marktype:gh_token");
    if (!token) return;
    setFetchingBranches(true);
    try {
      const owner = doc.git.owner;
      const repo = doc.git.repo;
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
        {
          headers: { Authorization: `token ${token}` },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      const names = Array.isArray(body)
        ? body.map((b: any) => b.name).filter(Boolean)
        : [];
      setBranchOptions(names);
      setSelectedBranch(doc.git.branch || names[0] || "main");
    } catch (err) {
      // ignore branch fetch failures; leave datalist empty
      setBranchOptions([]);
      setSelectedBranch(doc.git?.branch || "main");
    } finally {
      setFetchingBranches(false);
    }
  }, []);

  const openCommitModalForDoc = useCallback(
    (docId: string | null) => {
      if (!docId) return;
      const doc = docs.find((d) => d.id === docId);
      if (!doc) return;
      setPendingGitSaveDocId(docId);
      setCommitMessage(`Update ${doc.git?.path || doc.name}`);
      setCommitModalOpen(true);
      // fetch branches in background
      fetchBranchesForDoc(doc);
    },
    [docs, fetchBranchesForDoc]
  );

  const performGitSave = useCallback(async () => {
    try {
      if (!pendingGitSaveDocId) return;
      const doc = docs.find((d) => d.id === pendingGitSaveDocId);
      if (!doc || !doc.git)
        return (window as any).__mt_toast?.(
          "No git information found for this file.",
          "error"
        );
      const token = localStorage.getItem("marktype:gh_token");
      if (!token)
        return (window as any).__mt_toast?.(
          "No GitHub token found. Open Git sync and connect first.",
          "error"
        );
      const content = doc.content || "";
      const b64 = btoa(unescape(encodeURIComponent(content)));
      const path = doc.git.path;
      const owner = doc.git.owner;
      const repo = doc.git.repo;
      const message =
        (commitMessage && commitMessage.trim()) || `Update ${path}`;

      // determine target branch and sha for that branch
      const branch = selectedBranch || doc.git.branch || "main";
      let shaForBranch: string | undefined = undefined;
      try {
        const getRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
            path
          )}?ref=${encodeURIComponent(branch)}`,
          {
            headers: {
              Authorization: `token ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (getRes.ok) {
          const getBody = await getRes.json();
          shaForBranch = getBody && getBody.sha ? getBody.sha : undefined;
        } else if (getRes.status === 404) {
          shaForBranch = undefined; // file doesn't exist on branch — will create
        } else {
          // other errors: continue but let PUT handle it
          shaForBranch = doc.git.sha;
        }
      } catch (err) {
        shaForBranch = doc.git.sha;
      }

      const putBody: any = { message, content: b64, branch };
      if (shaForBranch) putBody.sha = shaForBranch;

      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
          path
        )}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(putBody),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      // update stored sha for future saves
      setDocs((arr) =>
        arr.map((d) =>
          d.id === doc.id
            ? {
                ...d,
                git: {
                  ...(d.git || {}),
                  sha:
                    body.content && body.content.sha
                      ? body.content.sha
                      : body.sha,
                },
              }
            : d
        )
      );
      setCommitModalOpen(false);
      setPendingGitSaveDocId(null);
      (window as any).__mt_toast?.("Saved to GitHub", "success");
    } catch (err: any) {
      (window as any).__mt_toast?.(
        "Failed to save to GitHub: " +
          (err && err.message ? err.message : String(err)),
        "error"
      );
    }
  }, [pendingGitSaveDocId, commitMessage, docs, selectedBranch]);

  // helper to insert snippets (used by context menu and keyboard shortcuts)
  const insertSnippet = useCallback(
    async (snippet: string) => {
      try {
        const isSnippetMermaid =
          /```\s*mermaid/.test(snippet) ||
          /^(graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|pie|erDiagram|journey|gitGraph)/i.test(
            snippet.trim()
          );
        if (isSnippetMermaid) {
          if (isMermaidContent(markdown)) {
            if ((window as any).__mt_insert)
              (window as any).__mt_insert(snippet);
          } else {
            const ok = (window as any).__mt_confirm
              ? await (window as any).__mt_confirm(
                  "This snippet is a Mermaid diagram.\nWould you like to create a new .mmd file for it?",
                  "Create Mermaid file"
                )
              : window.confirm(
                  "This snippet is a Mermaid diagram.\nWould you like to create a new .mmd file for it?"
                );
            if (ok) {
              const base = `untitled-${docs.length + 1}`;
              let name = `${base}.mmd`;
              const doc = { id: makeId(), name, content: snippet } as Doc;
              setDocs((arr) => [...arr, doc]);
              setActiveId(doc.id);
            }
          }
        } else {
          if ((window as any).__mt_insert) (window as any).__mt_insert(snippet);
        }
      } catch (err) {
        if ((window as any).__mt_insert) (window as any).__mt_insert(snippet);
      }
    },
    [docs.length, markdown]
  );

  const onMouseUp = useCallback(() => {
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
      // Apply theme attribute broadly so CSS selectors pick it up regardless
      // of how the app is embedded or when styles are evaluated.
      document.documentElement.setAttribute("data-theme", theme);
      try {
        document.body.setAttribute("data-theme", theme);
      } catch (_) {}
      try {
        const root = document.getElementById("root");
        if (root) root.setAttribute("data-theme", theme);
      } catch (_) {}
    } catch (e) {
      /* ignore */
    }
  }, [theme]);

  // Persist activeId immediately when it changes (helps survive reloads)
  useEffect(() => {
    try {
      if (activeId) localStorage.setItem("marktype:activeId", activeId);
    } catch (_) {}
  }, [activeId]);

  // Flush docs to storage before unload so we don't lose recent edits
  useEffect(() => {
    const onBefore = () => {
      try {
        localStorage.setItem("marktype:docs", JSON.stringify(docs));
        if (activeId) localStorage.setItem("marktype:activeId", activeId);
      } catch (_) {}
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [docs, activeId]);

  // Persist documents and activeId with debounce
  useEffect(() => {
    try {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current as any);
      saveTimerRef.current = window.setTimeout(() => {
        try {
          localStorage.setItem("marktype:docs", JSON.stringify(docs));
          if (activeId) localStorage.setItem("marktype:activeId", activeId);
        } catch (_) {}
        saveTimerRef.current = null;
      }, 400);
    } catch (_) {}
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current as any);
        saveTimerRef.current = null;
      }
    };
  }, [docs, activeId]);

  const handleDownload = useCallback((forceMmd?: boolean) => {
    try {
      // choose extension based on content heuristics (mermaid files -> .mmd)
      const isMermaid = (s: string) => {
        const t = (s || "").trim();
        if (!t) return false;
        const first = t.split(/\r?\n/)[0].trim();
        const simpleHeaderMatch =
          /^(?:graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|pie|erDiagram|journey|gitGraph)/i.test(
            first
          );
        const fencedOnly =
          /^\s*(?:```|~~~)\s*mermaid[\s\S]*?(?:```|~~~)\s*$/i.test(t);
        return simpleHeaderMatch || fencedOnly;
      };
      const preferMmd = forceMmd === true ? true : isMermaid(markdown);
      let name = activeDoc?.name || "untitled";
      const lower = name.toLowerCase();
      if (preferMmd) {
        if (!lower.endsWith(".mmd")) {
          name = name.replace(/\.md$/i, "") + ".mmd";
          // update tab name to reflect mmd
          if (activeDoc)
            setDocs((arr) =>
              arr.map((d) => (d.id === activeDoc.id ? { ...d, name } : d))
            );
        }
      } else {
        if (!lower.endsWith(".md")) {
          name = name.replace(/\.mmd$/i, "") + ".md";
          if (activeDoc)
            setDocs((arr) =>
              arr.map((d) => (d.id === activeDoc.id ? { ...d, name } : d))
            );
        }
      }

      const mime = preferMmd
        ? "text/plain;charset=utf-8"
        : "text/markdown;charset=utf-8";
      const blob = new Blob([markdown], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error("Download failed", err);
    }
  }, [markdown, activeDoc]);

  const buildExportHtml = useCallback((title: string, md: string) => {
    try {
      const safeTitle = String(title || "untitled").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const rendered = marked.parse(renderMath(md || ""));
      const body = DOMPurify.sanitize(rendered);
      const css = `body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial;padding:20px;max-width:900px;margin:0 auto;color:#111} img.md-image{max-width:100%;height:auto} pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto} code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,'Roboto Mono',Courier New,monospace}`;
      const head = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"><style>${css}</style></head>`;
      return head + `<body>${body}</body></html>`;
    } catch (err) {
      return `<!doctype html><html><head><meta charset="utf-8"><title>Export</title></head><body><pre>${String(err)}</pre></body></html>`;
    }
  }, []);

  const handleExportHtml = useCallback(() => {
    try {
      const name = (activeDoc?.name || "untitled").replace(/\.md$/i, "");
      const html = buildExportHtml(name, markdown);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      console.error("Export HTML failed", err);
      (window as any).__mt_toast?.("Export HTML failed", "error");
    }
  }, [activeDoc, markdown, buildExportHtml]);

  const handleExportPdf = useCallback(() => {
    (async () => {
      try {
        const name = (activeDoc?.name || "untitled").replace(/\.md$/i, "");
        const html = buildExportHtml(name, markdown);
        // dynamically import html2pdf so it's only loaded when needed
        const html2pdfModule = await import(/* webpackChunkName: "html2pdf" */ "html2pdf.js");
        const html2pdf = (html2pdfModule as any).default || (html2pdfModule as any);
        // create a hidden iframe to isolate exported document (prevents style leakage and layout shifts)
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.left = "-9999px";
        iframe.style.top = "0";
        iframe.style.width = "800px";
        iframe.style.height = "1000px";
        iframe.style.border = "0";
        iframe.style.visibility = "hidden";
        document.body.appendChild(iframe);
        const idoc = iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document);
        if (!idoc) throw new Error("Unable to access iframe document");
        idoc.open();
        idoc.write(html);
        idoc.close();
        // wait for iframe to load resources (stylesheets, images)
        await new Promise<void>((resolve) => {
          const timeout = window.setTimeout(() => resolve(), 800);
          iframe.onload = () => {
            clearTimeout(timeout);
            resolve();
          };
        });

        try {
          await new Promise<void>((resolve, reject) => {
            const opt = {
              margin: 12,
              filename: `${name}.pdf`,
              image: { type: "jpeg", quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: "pt", format: "a4", orientation: "portrait" },
            };
            try {
              (html2pdf as any)()
                .set(opt)
                .from(idoc.body)
                .save()
                .then(() => resolve())
                .catch((e: any) => reject(e));
            } catch (e) {
              reject(e);
            }
          });
        } finally {
          try {
            document.body.removeChild(iframe);
          } catch (_) {}
        }
      } catch (err) {
        console.error("Export PDF failed", err);
        (window as any).__mt_toast?.("Export PDF failed", "error");
      }
    })();
  }, [activeDoc, markdown, buildExportHtml]);

  // helper: detect whether content is mermaid (raw or fenced-only)
  const isMermaidContent = useCallback((s: string) => {
    const t = (s || "").trim();
    if (!t) return false;
    const first = t.split(/\r?\n/)[0].trim();
    const simpleHeaderMatch =
      /^(?:graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|pie|erDiagram|journey|gitGraph)/i.test(
        first
      );
    const fencedOnly = /^\s*(?:```|~~~)\s*mermaid[\s\S]*?(?:```|~~~)\s*$/i.test(
      t
    );
    return simpleHeaderMatch || fencedOnly;
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const handleImportClick = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      let name = f.name || "untitled";
      const allowed = [".md", ".mmd", ".txt"];
      if (!allowed.some((ext) => name.toLowerCase().endsWith(ext))) {
        (window as any).__mt_toast?.(
          "Please select a .md, .mmd or .txt file",
          "info"
        );
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result || "");
        // if the content looks like mermaid, prefer .mmd extension
        try {
          if (isMermaidContent(text) && !/\.mmd$/i.test(name)) {
            name = name.replace(/\.md$/i, "");
            name = name.replace(/\.txt$/i, "");
            name = `${name}.mmd`;
          }
        } catch (_) {}
        const newDoc: Doc = { id: makeId(), name, content: text };
        setDocs((arr) => [...arr, newDoc]);
        setActiveId(newDoc.id);
      };
      reader.readAsText(f, "utf-8");
      // reset input so the same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [isMermaidContent]
  );

  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result || ""));
      fr.onerror = (err) => reject(err);
      fr.readAsDataURL(file);
    });

  const uploadImage = useCallback(
    async (file: File) => {
      try {
        if (!file) return;
        const name = (file.name || `image-${Date.now()}.png`).replace(
          /^\.+/,
          ""
        );
        // if file is part of a Git-backed doc, upload to that repo; otherwise insert data URL
        if (activeDoc?.git) {
          const token = localStorage.getItem("marktype:gh_token");
          if (!token) {
            const ok = (window as any).__mt_confirm
              ? await (window as any).__mt_confirm(
                  "No GitHub token found. Insert image as data URL instead?",
                  "Insert image"
                )
              : confirm(
                  "No GitHub token found. Insert image as data URL instead?"
                );
            if (ok) {
              const data = await readFileAsDataURL(file);
              if ((window as any).__mt_insert)
                (window as any).__mt_insert(`![${name}](${data})`);
            }
            return;
          }
          const owner = activeDoc.git.owner;
          const repo = activeDoc.git.repo;
          const branch = selectedBranch || activeDoc.git.branch || "main";
          // place assets in same folder as the doc under an assets/ subfolder
          const docPath = activeDoc.git.path || "";
          const baseDir = docPath.includes("/")
            ? docPath.replace(/\/[^\/]+$/, "").replace(/\\/g, "/")
            : "";
          const folder = baseDir
            ? `${baseDir.replace(/^\//, "")}/assets`
            : "assets";
          const unique = `${Date.now().toString(36)}-${name}`;
          const targetPath = `${folder}/${unique}`;
          const dataUrl = await readFileAsDataURL(file);
          const b64 = dataUrl.split(",")[1] || "";
          const message = `Add image ${unique}`;
          const res = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
              targetPath
            )}`,
            {
              method: "PUT",
              headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ message, content: b64, branch }),
            }
          );
          if (!res.ok) throw new Error(await res.text());
          // raw url for direct linking
          const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURIComponent(
            targetPath
          )}`;
          if ((window as any).__mt_insert)
            (window as any).__mt_insert(`![${name}](${raw})`);
          (window as any).__mt_toast?.(
            "Image uploaded and inserted",
            "success"
          );
          return;
        }
        // fallback: insert data URL directly
        const data = await readFileAsDataURL(file);
        if ((window as any).__mt_insert)
          (window as any).__mt_insert(`![${name}](${data})`);
      } catch (err: any) {
        (window as any).__mt_toast?.(
          "Image upload failed: " +
            (err && err.message ? err.message : String(err)),
          "error"
        );
      }
    },
    [activeDoc, selectedBranch]
  );

  const handleImageSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      uploadImage(f);
      if (imageInputRef.current) imageInputRef.current.value = "";
    },
    [uploadImage]
  );

  const createNewDoc = useCallback(() => {
    const count = docs.length + 1;
    const name = `untitled-${count}.md`;
    const doc: Doc = { id: makeId(), name, content: "" };
    setDocs((arr) => [...arr, doc]);
    setActiveId(doc.id);
  }, [docs.length]);

  const [exportType, setExportType] = useState<
    "markdown" | "mermaid" | "html" | "pdf"
  >("markdown");

  const handleExport = useCallback(() => {
    if (exportType === "markdown") {
      handleDownload(false);
    } else if (exportType === "mermaid") {
      // force .mmd extension even if content heuristics don't detect mermaid
      handleDownload(true);
    } else if (exportType === "html") {
      handleExportHtml();
    } else if (exportType === "pdf") {
      handleExportPdf();
    }
  }, [exportType, handleDownload, handleExportHtml, handleExportPdf]);

  const setMarkdown = useCallback(
    (next: string) => {
      setSaveState("saving");
      if (saveTimerLocal.current) clearTimeout(saveTimerLocal.current as any);

      setDocs((arr) => {
        const nextDocs = arr.map((d) =>
          d.id === activeDoc.id ? { ...d, content: next } : d
        );
        try {
          localStorage.setItem("marktype:docs", JSON.stringify(nextDocs));
        } catch (_) {}
        return nextDocs;
      });
      // reflect saved state shortly after persisting
      saveTimerLocal.current = window.setTimeout(() => {
        setSaveState("saved");
        window.setTimeout(() => setSaveState("idle"), 1200);
        saveTimerLocal.current = null;
      }, 350);
      // If the content looks like a raw mermaid file, ensure filename has .mmd extension
      try {
        const s = (next || "").trim();
        if (s) {
          const first = s.split(/\r?\n/)[0].trim();
          const simpleHeaderMatch =
            /^(?:graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|pie|erDiagram|journey|gitGraph)/i.test(
              first
            );
          // also treat a file that consists ONLY of a fenced mermaid block as a mermaid file
          const fencedOnly =
            /^\s*(?:```|~~~)\s*mermaid[\s\S]*?(?:```|~~~)\s*$/i.test(s);
          const isRawMermaid = simpleHeaderMatch || fencedOnly;
          if (isRawMermaid && activeDoc && !/\.mmd$/i.test(activeDoc.name)) {
            setDocs((arr) => {
              const nextDocs = arr.map((d) =>
                d.id === activeDoc.id
                  ? { ...d, name: d.name.replace(/\.md$/i, ".mmd") }
                  : d
              );
              try {
                localStorage.setItem("marktype:docs", JSON.stringify(nextDocs));
              } catch (_) {}
              return nextDocs;
            });
          }
        }
      } catch (_) {}
    },
    [activeDoc?.id]
  );

  const startRename = useCallback((doc: Doc) => {
    setRenamingId(doc.id);
    setRenameVal(doc.name);
    // focus after render
    setTimeout(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }, 0);
  }, []);

  const commitRename = useCallback(() => {
    if (!renamingId) return;
    const next = (renameVal || "").trim();
    if (!next) {
      // if empty, keep previous name
      setRenamingId(null);
      return;
    }
    const withExt = /\.md$/i.test(next) ? next : `${next}.md`;
    setDocs((arr) =>
      arr.map((d) => (d.id === renamingId ? { ...d, name: withExt } : d))
    );
    setRenamingId(null);
  }, [renamingId, renameVal]);

  const requestClose = useCallback((id: string) => {
    setClosingId(id);
  }, []);

  const confirmClose = useCallback(() => {
    if (!closingId) return;
    setDocs((arr) => {
      const next = arr.filter((d) => d.id !== closingId);
      // choose new active id: prefer next item at same index, else previous, else undefined
      const idx = arr.findIndex((d) => d.id === closingId);
      if (next.length === 0) {
        // create an empty untitled doc to keep UI consistent
        const doc: Doc = { id: makeId(), name: "untitled-1.md", content: "" };
        setActiveId(doc.id);
        return [doc];
      }
      let newActive: string | undefined;
      if (idx >= 0) {
        if (idx < next.length) newActive = next[idx].id;
        else newActive = next[next.length - 1].id;
      } else {
        newActive = next[0].id;
      }
      setActiveId(newActive!);
      return next;
    });
    setClosingId(null);
  }, [closingId]);

  const cancelClose = useCallback(() => setClosingId(null), []);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.ctrlKey || e.metaKey;
      // '?' or Shift+/
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShowShortcuts((s) => !s);
        return;
      }
      if (meta && e.key.toLowerCase() === "n") {
        e.preventDefault();
        createNewDoc();
        return;
      }
      if (meta && e.key.toLowerCase() === "w") {
        e.preventDefault();
        requestClose(activeDoc.id);
        return;
      }
      // insert mermaid: Ctrl+Alt+M
      if (meta && e.altKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        insertSnippet(
          "journey\n  title My working day\n  section Go to work\n    Make tea: 5: Me\n    Go upstairs: 3: Me"
        );
        return;
      }
      // open KaTeX menu: Ctrl+Alt+K
      if (meta && e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // open KaTeX menu at center of editor area
        setMenuPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
        setMenuOpen(true);
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [createNewDoc, requestClose, activeDoc.id, insertSnippet]);

  return (
    <div className={`app`} data-theme={theme}>
      <Toasts />
      <AssetsPanel
        open={showAssets}
        onClose={() => setShowAssets(false)}
        activeDoc={activeDoc}
        onInsert={(md) => {
          if ((window as any).__mt_insert) (window as any).__mt_insert(md);
        }}
      />
      <ConfirmModal
        open={confirmOpen}
        title={confirmOpts.title}
        message={confirmOpts.message}
        confirmLabel={confirmOpts.confirmLabel}
        cancelLabel={confirmOpts.cancelLabel}
        onConfirm={() => {
          setConfirmOpen(false);
          try {
            confirmResolveRef.current && confirmResolveRef.current(true);
          } catch (_) {}
          confirmResolveRef.current = null;
        }}
        onCancel={() => {
          setConfirmOpen(false);
          try {
            confirmResolveRef.current && confirmResolveRef.current(false);
          } catch (_) {}
          confirmResolveRef.current = null;
        }}
      />
      <header className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logo} alt="MarkType" className="app-logo" />
          <span className="app-title">MarkType</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <label style={{ fontSize: 12 }}>Editor</label>
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
          <div className="font-chip" title="Editor font size">
            {editorFont}px
          </div>
          <label style={{ fontSize: 12 }}>Preview</label>
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
          <div className="font-chip" title="Preview font size">
            {previewFont}px
          </div>
          <div
            className="autosave-indicator"
            aria-live="polite"
            title="Autosave status"
            style={{ marginLeft: 8 }}
          >
            {saveState === "saving" && <span>Saving…</span>}
            {saveState === "saved" && <span>Saved ✓</span>}
          </div>

          <button
            onClick={() => setPanelOpen(true)}
            className="theme-toggle"
            aria-label="Import or export"
            title="Import or export markdown"
            style={{ marginLeft: 8 }}
          >
            Import / Export
          </button>
          <button
            className="theme-toggle shortcuts-button"
            onClick={() => setShowShortcuts(true)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
            style={{ marginLeft: 6 }}
          >
            ?
          </button>
          <button
            className="theme-toggle"
            aria-label="Git sync"
            title="Sync with GitHub"
            onClick={() => setShowGitSync(true)}
            style={{ marginLeft: 6 }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.53-1.36-1.3-1.72-1.3-1.72-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.73 1.27 3.4.97.11-.75.41-1.27.75-1.56-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.07 11.07 0 0 1 2.9-.39c.99 0 1.99.13 2.9.39 2.2-1.5 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.41-5.27 5.69.42.36.8 1.08.8 2.17 0 1.57-.02 2.83-.02 3.22 0 .31.21.68.8.56A10.5 10.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
            </svg>
          </button>
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
            accept=".md,.mmd,text/markdown,text/plain"
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
            const allowed = [".md", ".mmd", ".txt"];
            if (!allowed.some((ext) => f.name.toLowerCase().endsWith(ext))) {
              (window as any).__mt_toast?.(
                "Please drop a .md, .mmd or .txt file",
                "info"
              );
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              let text = String(reader.result || "");
              let name = f.name;
              try {
                if (isMermaidContent(text) && !/\.mmd$/i.test(name)) {
                  name = name.replace(/\.md$/i, "");
                  name = name.replace(/\.txt$/i, "");
                  name = `${name}.mmd`;
                }
              } catch (_) {}
              const newDoc: Doc = { id: makeId(), name, content: text };
              setDocs((arr) => [...arr, newDoc]);
              setActiveId(newDoc.id);
              setPanelOpen(false);
            };
            reader.readAsText(f, "utf-8");
          }}
        >
          <div className="import-panel" role="dialog" aria-modal="true">
            <h3>Import or export Markdown</h3>
            <p style={{ marginTop: 6 }}>
              Drag &amp; drop or pick a <code>.md</code>, <code>.mmd</code> or{" "}
              <code>.txt</code> file to open as a new tab. You can also export
              the currently active tab.
            </p>
            <div className="import-actions">
              <button
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="theme-toggle"
              >
                Import file (.md/.mmd/.txt)
              </button>
              <button
                onClick={() => {
                  if (imageInputRef.current) imageInputRef.current.click();
                }}
                className="theme-toggle"
                style={{ marginLeft: 8 }}
              >
                Upload image
              </button>
              <button
                onClick={() => {
                  setShowAssets(true);
                  setPanelOpen(false);
                }}
                className="theme-toggle"
                style={{ marginLeft: 8 }}
              >
                Assets
              </button>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13 }}>Export:</span>
                <div className="export-control">
                  <select
                    value={exportType}
                    onChange={(e) => setExportType(e.target.value as any)}
                    className="export-select"
                    aria-label="Export format"
                  >
                    <option value="markdown">Markdown (.md)</option>
                    <option value="mermaid">Mermaid (.mmd)</option>
                    <option value="html">HTML (.html)</option>
                    <option value="pdf">PDF (.pdf)</option>
                  </select>
                  <button
                    onClick={() => {
                      handleExport();
                      setPanelOpen(false);
                    }}
                    className="theme-toggle export-button"
                    aria-label="Export"
                  >
                    Export
                  </button>
                </div>
              </label>
              <button
                onClick={() => setPanelOpen(false)}
                className="theme-toggle"
                style={{ marginLeft: 8 }}
              >
                Close
              </button>
            </div>
            {/* hidden image input used by Upload image */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelected}
              style={{ display: "none" }}
            />
            <div style={{ marginTop: 12, fontSize: 12, color: "#666" }}>
              Tip: importing opens a new tab and does not replace existing
              content.
            </div>
          </div>
        </div>
      )}
      <main className="main-with-console">
        <div className="split top-area" ref={(el) => (splitRef.current = el)}>
          <section
            className="pane"
            style={{ width: `${leftPct}%`, minWidth: "200px" }}
          >
            {/* Tabs Bar */}
            <div className="tabbar">
              <div className="tabs">
                <button
                  className="tab-add"
                  onClick={createNewDoc}
                  title="New file"
                  aria-label="New file"
                >
                  +
                </button>
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className={`tab ${d.id === activeDoc.id ? "active" : ""}`}
                    title={d.name}
                    onClick={() => setActiveId(d.id)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      startRename(d);
                    }}
                  >
                    {renamingId === d.id ? (
                      <input
                        ref={renameInputRef}
                        className="tab-rename"
                        value={renameVal}
                        onChange={(e) => setRenameVal(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") cancelRename();
                        }}
                      />
                    ) : (
                      <>
                        <span className="tab-label">{d.name}</span>
                        <button
                          className="tab-close"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            requestClose(d.id);
                          }}
                          aria-label={`Close ${d.name}`}
                          title={`Close ${d.name}`}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div className="tabbar-right">
                <div className="tab-actions">
                  <button
                    className="theme-toggle small"
                    title="Undo"
                    aria-label="Undo"
                    onClick={() => {
                      try {
                        if (commandsRef.current.undo)
                          commandsRef.current.undo();
                      } catch (_) {}
                    }}
                  >
                    ↺
                  </button>
                  <button
                    className="theme-toggle small"
                    title="Redo"
                    aria-label="Redo"
                    onClick={() => {
                      try {
                        if (commandsRef.current.redo)
                          commandsRef.current.redo();
                      } catch (_) {}
                    }}
                  >
                    ↻
                  </button>
                </div>
              </div>
            </div>
            <Editor
              value={markdown}
              onChange={setMarkdown}
              theme={theme}
              fontSize={editorFont}
              modelId={activeDoc?.id}
              onScroll={(r) => setEditorScrollRatio(r)}
              onVisibleLine={(ln) => setEditorVisibleLine(ln)}
              onContextMenuRequest={({ x, y }) => {
                setMenuPos({ x, y });
                setMenuOpen(true);
              }}
              onExternalInsert={(fn) => {
                // store a global hook to keep App decoupled from Monaco types
                (window as any).__mt_insert = fn;
              }}
              onImageDrop={(file) => uploadImage(file)}
              onRegisterCommands={(cmds) => {
                commandsRef.current = cmds || {};
              }}
            />
            {activeDoc?.git && (
              <button
                className="git-push-sticky"
                onClick={() => openCommitModalForDoc(activeDoc.id)}
                title="Push to GitHub"
                aria-label="Push to GitHub"
              >
                <span className="push-icon" aria-hidden="true">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                  >
                    <path d="M12 2l-8 8h5v8h6v-8h5z" />
                  </svg>
                </span>
                Push
              </button>
            )}
          </section>
          <div
            className="v-splitter"
            onMouseDown={startSplitDrag}
            onPointerDown={startSplitDrag}
            onKeyDown={onSplitterKeyDown}
            tabIndex={0}
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={10}
            aria-valuemax={90}
            aria-valuenow={Math.round(leftPct)}
            title="Drag to resize editor/preview (or focus and use arrow keys)"
          />
          <section
            className="pane"
            style={{ width: `${100 - leftPct}%`, minWidth: "240px" }}
          >
            <Preview
              markdown={markdown}
              fontSize={previewFont}
              editorVisibleLine={editorVisibleLine}
            />
          </section>
        </div>

        {/* KaTeX context menu overlay */}
        <KaTeXContextMenu
          open={menuOpen}
          x={menuPos.x}
          y={menuPos.y}
          onPick={(snippet) => {
            insertSnippet(snippet);
            setMenuOpen(false);
          }}
          onClose={() => setMenuOpen(false)}
        />

        <ShortcutsModal
          open={showShortcuts}
          onClose={() => setShowShortcuts(false)}
        />
        <GitSyncPanel
          open={showGitSync}
          onClose={() => setShowGitSync(false)}
          onOpenRemoteFile={(doc) => {
            // add or focus imported doc
            setDocs((arr) => {
              const exists = arr.find((d) => d.id === doc.id);
              if (exists)
                return arr.map((d) =>
                  d.id === doc.id
                    ? { ...d, content: doc.content, git: doc.git }
                    : d
                );
              return [...arr, doc as Doc];
            });
            setActiveId(doc.id);
          }}
        />

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
          style={{ height: lintHeight, minHeight: 0 }}
        >
          <LintPanel text={markdown} />
        </div>
        {closingId && (
          <div className="confirm-overlay" role="dialog" aria-modal="true">
            <div className="confirm-box">
              <h3>Close file?</h3>
              <p>
                Are you sure you want to close this file? Any unsaved changes
                will be lost.
              </p>
              <div className="confirm-actions">
                <button className="theme-toggle" onClick={cancelClose}>
                  Cancel
                </button>
                <button
                  className="theme-toggle"
                  onClick={() => {
                    confirmClose();
                  }}
                >
                  Close file
                </button>
              </div>
            </div>
          </div>
        )}
        {commitModalOpen && (
          <div className="confirm-overlay" role="dialog" aria-modal="true">
            <div className="confirm-box">
              <h3>Commit message</h3>
              <p>Enter a commit message to save this file to GitHub.</p>
              <label style={{ display: "block", marginTop: 8, fontSize: 13 }}>
                Branch
              </label>
              {fetchingBranches ? (
                <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
                  Loading branches…
                </div>
              ) : (
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    marginTop: 6,
                    padding: "6px 8px",
                  }}
                  aria-label="Branch"
                >
                  {(branchOptions.length === 0
                    ? [selectedBranch]
                    : branchOptions
                  ).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", marginTop: 8 }}
                aria-label="Commit message"
              />
              <div className="confirm-actions" style={{ marginTop: 12 }}>
                <button
                  className="theme-toggle"
                  onClick={() => {
                    setCommitModalOpen(false);
                    setPendingGitSaveDocId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="theme-toggle"
                  onClick={async () => {
                    await performGitSave();
                  }}
                >
                  Save to GitHub
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="app-footer">Made by Group NoNameFound</footer>
    </div>
  );
}
