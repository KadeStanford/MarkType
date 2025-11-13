import React, { useMemo, useState, useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import "katex/dist/katex.min.css";
import { renderMath } from "../utils/renderMath";

// Helper to safely escape attributes
function escAttr(s: string | null | undefined) {
  if (!s) return "";
  return String(s).replace(/"/g, "&quot;");
}

type PreviewProps = {
  markdown: string;
  fontSize?: number;
  editorVisibleLine?: number | null;
};

export default function Preview({
  markdown,
  fontSize,
  editorVisibleLine,
}: PreviewProps) {
  // Helper: scan markdown for heading source line numbers while ignoring fenced code blocks
  const scanHeadings = (md: string) => {
    const lines = (md || "").split(/\r?\n/);
    const res: Array<{ line: number; level: number; text: string }> = [];
    let inFence = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fenceMatch = line.match(/^\s*(```|~~~)/);
      if (fenceMatch) {
        inFence = !inFence;
        continue;
      }
      if (inFence) continue;
      const m = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
      if (m) {
        res.push({ line: i + 1, level: m[1].length, text: m[2].trim() });
      }
    }
    return res;
  };

  // Build renderer and extract mermaid blocks, embedding data-source-line on headings
  const { html, mermaidMatches } = useMemo(() => {
    const headingsQueue = scanHeadings(markdown);
    const renderer = new marked.Renderer();

    renderer.image = (
      href: string | null,
      title: string | null,
      text: string
    ) => {
      let src = href || "";
      if (src && !/^(https?:)?\/\//i.test(src) && !src.startsWith("/")) {
        if (src.startsWith("./")) src = src.replace(/^\.\//, "/docs/examples/");
        else src = "/docs/examples/" + src.replace(/^\//, "");
      }
      const titleAttr = title ? ` title="${escAttr(title)}"` : "";
      const altAttr = text ? ` alt="${escAttr(text)}"` : ' alt="image"';
      return `<img src="${escAttr(
        src
      )}"${altAttr}${titleAttr} class="md-image" />`;
    };

    renderer.link = (
      href: string | null,
      title: string | null,
      text: string
    ) => {
      const h = href || "";
      const titleAttr = title ? ` title="${escAttr(title)}"` : "";
      const isExternal = /^(https?:)?\/\//i.test(h);
      const target = isExternal
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
      return `<a href="${escAttr(h)}"${titleAttr}${target}>${text}</a>`;
    };

    const mermaidMatchesLocal: string[] = [];
    const defaultCode = (renderer as any).code?.bind(renderer);
    (renderer as any).code = function (
      code: string,
      infostring: string | undefined,
      escaped: boolean
    ) {
      const lang = (infostring || "").trim().toLowerCase();
      if (lang === "mermaid") {
        mermaidMatchesLocal.push(code);
        return "";
      }
      if (defaultCode) return defaultCode(code, infostring, escaped);
      return `<pre><code>${escAttr(code)}</code></pre>`;
    };

    renderer.heading = function (text: string, level: number, raw: string) {
      const hd = headingsQueue.shift();
      const line = hd ? hd.line : null;
      // simple slugify
      const slug =
        (text || "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") || undefined;
      const idAttr = slug ? ` id="${escAttr(slug)}"` : "";
      const lineAttr = line ? ` data-source-line="${line}"` : "";
      return `<h${level}${lineAttr}${idAttr}>${text}</h${level}>`;
    };

    const withMath = renderMath(markdown || "");
    const html = marked.parse(withMath, { renderer });
    return { html, mermaidMatches: mermaidMatchesLocal };
  }, [markdown]);

  const clean = useMemo(() => DOMPurify.sanitize(html), [html]);
  const cleanWithoutMermaid = clean;

  // Mermaid panels state (positions/sizes)
  const [panels, setPanels] = useState(() =>
    mermaidMatches.map((code, i) => ({
      id: `mermaid-${Date.now().toString(36)}-${i}`,
      code,
      left: 20 + i * 30,
      top: 20 + i * 30,
      width: 480,
      height: 240,
    }))
  );

  const [mermaidStatus, setMermaidStatus] = useState<{
    loaded: boolean;
    error?: string;
  }>({ loaded: false });

  // Detect if the whole file is raw mermaid (not a fenced code block)
  const rawMermaidDetected = (() => {
    const s = (markdown || "").trim();
    if (!s) return false;
    const first = s.split(/\r?\n/)[0].trim();
    return /^(?:graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|pie|erDiagram|journey|gitGraph)/i.test(
      first
    );
  })();

  // Rebuild panels when markdown content changes and mermaid blocks differ
  useEffect(() => {
    if (rawMermaidDetected) {
      setPanels([
        {
          id: `mermaid-${Date.now().toString(36)}-raw`,
          code: markdown,
          left: 0,
          top: 0,
          width: "100%",
          height: "100%",
        },
      ]);
      return;
    }
    setPanels(
      mermaidMatches.map((code, i) => ({
        id: `mermaid-${Date.now().toString(36)}-${i}`,
        code,
        left: 20 + i * 30,
        top: 20 + i * 30,
        width: 480,
        height: 240,
      }))
    );
  }, [markdown, rawMermaidDetected]);

  // refs to render mermaid SVG into DOM
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const fullRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const previewContentRef = useRef<HTMLDivElement | null>(null);
  const panState = useRef<{
    isPanning?: boolean;
    startX?: number;
    startY?: number;
    startLeft?: number;
    startTop?: number;
  }>({});
  const [zoom, setZoom] = useState<number>(1);

  useEffect(() => {
    if (!panels || panels.length === 0) return;
    let cancelled = false;
    (async () => {
      try {
        const M = await import("mermaid");
        const mermaidLib = (M as any).default || M;
        try {
          mermaidLib.initialize?.({ startOnLoad: false });
        } catch (e) {
          // ignore
        }
        setMermaidStatus({ loaded: true });

        for (const p of panels) {
          if (cancelled) return;
          const container = rawMermaidDetected
            ? innerRef.current
            : panelRefs.current[p.id];
          if (!container) continue;
          container.innerHTML = "";
          // normalize line endings and trim to avoid hidden chars
          const normalizedCode = (p.code || "").replace(/\r\n/g, "\n").trim();
          // debug: log the code being rendered so we can inspect missing header lines
          // eslint-disable-next-line no-console
          console.debug(
            "[mermaid] rendering",
            p.id,
            normalizedCode.split("\n").slice(0, 5)
          );
          try {
            let svg: string | null = null;
            // mermaid v10+ has mermaid.render returning a promise-like or string; handle many shapes
            if (typeof mermaidLib.render === "function") {
              const res = mermaidLib.render(p.id, normalizedCode);
              if (res && typeof res === "string") svg = res;
              else if (res && res.svg) svg = res.svg;
              else if (res && typeof res.then === "function") {
                const awaited = await res;
                svg = awaited.svg || awaited;
              }
            }
            if (
              !svg &&
              mermaidLib.mermaidAPI &&
              typeof mermaidLib.mermaidAPI.render === "function"
            ) {
              try {
                const out = mermaidLib.mermaidAPI.render(p.id, normalizedCode);
                if (out && out.svg) svg = out.svg;
              } catch (e) {
                // some builds use callback form
                mermaidLib.mermaidAPI.render(
                  p.id,
                  normalizedCode,
                  (s: string) => {
                    container.innerHTML = s;
                  }
                );
              }
            }
            if (svg) {
              container.innerHTML = svg;
            }
          } catch (err) {
            container.innerHTML = `<pre class="mermaid-error">${DOMPurify.sanitize(
              String(err)
            )}</pre>`;
          }
        }
      } catch (err) {
        // mermaid not available or failed to load; show fallback code blocks
        const msg = String(
          err && (err as any).message ? (err as any).message : err
        );
        setMermaidStatus({ loaded: false, error: msg });
        panels.forEach((p) => {
          const container = panelRefs.current[p.id];
          if (container)
            container.innerHTML = `<pre class="mermaid-fallback">${DOMPurify.sanitize(
              p.code
            )}</pre>`;
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [panels]);

  // Heading-aware sync: map editor visible source line to preview heading offsets
  useEffect(() => {
    if (rawMermaidDetected) return; // skip for raw mermaid preview
    if (typeof editorVisibleLine !== "number") return;
    const el = previewContentRef.current;
    if (!el) return;

    const headings = Array.from(
      el.querySelectorAll("h1,h2,h3,h4,h5,h6")
    ) as HTMLElement[];
    if (!headings || headings.length === 0) return;

    // build map of headings with their source lines and positions
    const map = headings.map((h) => ({
      line: Number(h.getAttribute("data-source-line")) || null,
      top: h.offsetTop,
    }));

    // find the last heading whose source line <= editorVisibleLine
    let chosen: { line: number | null; top: number } | null = null;
    for (const item of map) {
      if (item.line && item.line <= editorVisibleLine) chosen = item;
      else if (!item.line) {
        // headings without line info — ignore
      }
    }

    if (chosen) {
      // scroll so the heading is near top (with small padding)
      const target = Math.max(0, chosen.top - 8);
      try {
        el.scrollTo({ top: target, behavior: "smooth" });
      } catch (_) {
        el.scrollTop = target;
      }
    } else {
      // no heading before the visible line: scroll to top
      try {
        el.scrollTo({ top: 0, behavior: "smooth" });
      } catch (_) {
        el.scrollTop = 0;
      }
    }
  }, [editorVisibleLine, rawMermaidDetected, zoom]);

  // allow clicking headings in preview to jump to the source line in the editor
  useEffect(() => {
    if (rawMermaidDetected) return; // skip for mermaid-only views
    const el = previewContentRef.current;
    if (!el) return;
    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const heading =
        target.closest &&
        (target.closest("h1,h2,h3,h4,h5,h6") as HTMLElement | null);
      if (!heading) return;
      const s = heading.getAttribute("data-source-line");
      if (!s) return;
      const ln = Number(s);
      if (!Number.isFinite(ln)) return;
      try {
        const fn = (window as any).__mt_reveal;
        if (typeof fn === "function") fn(ln);
      } catch (_) {}
    };
    el.addEventListener("click", onClick as any);
    return () => el.removeEventListener("click", onClick as any);
  }, [clean, rawMermaidDetected]);

  // Drag/resize logic
  const dragState = useRef<{
    id?: string;
    type?: "move" | "resize";
    startX?: number;
    startY?: number;
    origLeft?: number;
    origTop?: number;
    origW?: number;
    origH?: number;
  }>({});

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragState.current.id) return;
      const st = dragState.current;
      const dx = e.clientX - (st.startX || 0);
      const dy = e.clientY - (st.startY || 0);
      setPanels((arr) =>
        arr.map((p) => {
          if (p.id !== st.id) return p;
          if (st.type === "move") {
            return {
              ...p,
              left: (st.origLeft || 0) + dx,
              top: (st.origTop || 0) + dy,
            };
          }
          if (st.type === "resize") {
            return {
              ...p,
              width: Math.max(120, (st.origW || 0) + dx),
              height: Math.max(80, (st.origH || 0) + dy),
            };
          }
          return p;
        })
      );
    };
    const onUp = () => {
      dragState.current = {};
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startPanelDrag = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dragState.current = {
      id,
      type: "move",
      startX: e.clientX,
      startY: e.clientY,
      origLeft: panels.find((p) => p.id === id)?.left,
      origTop: panels.find((p) => p.id === id)?.top,
    };
    document.body.style.userSelect = "none";
  };

  const startPanelResize = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    dragState.current = {
      id,
      type: "resize",
      startX: e.clientX,
      startY: e.clientY,
      origW: panels.find((p) => p.id === id)?.width,
      origH: panels.find((p) => p.id === id)?.height,
    };
    document.body.style.userSelect = "none";
  };

  // If the whole file is a raw mermaid file, show the full-mermaid preview (no markdown)
  if (rawMermaidDetected) {
    // full-screen mermaid preview (fills the preview area); the scroller is separate so the toolbar
    // can be rendered as an overlay that stays visible while panning/scrolling.
    const onWheel = (e: React.WheelEvent) => {
      // ctrl+wheel to zoom (common pattern)
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        setZoom((z) => Math.min(3, Math.max(0.2, +(z + delta).toFixed(2))));
      }
    };

    const zoomIn = () => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)));
    const zoomOut = () => setZoom((z) => Math.max(0.2, +(z - 0.1).toFixed(2)));

    // Pointer-based panning: drag to pan by adjusting the scroller's scrollLeft/Top
    const onPointerDownPan = (e: React.PointerEvent) => {
      const sc = scrollerRef.current;
      if (!sc) return;
      sc.setPointerCapture(e.pointerId);
      panState.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        startLeft: sc.scrollLeft,
        startTop: sc.scrollTop,
      };
      sc.classList.add("panning");
      e.preventDefault();
    };

    const onPointerMovePan = (e: React.PointerEvent) => {
      if (!panState.current.isPanning) return;
      const sc = scrollerRef.current;
      if (!sc) return;
      const dx = e.clientX - (panState.current.startX || 0);
      const dy = e.clientY - (panState.current.startY || 0);
      sc.scrollLeft = (panState.current.startLeft || 0) - dx;
      sc.scrollTop = (panState.current.startTop || 0) - dy;
      e.preventDefault();
    };

    const endPan = (e?: React.PointerEvent) => {
      const sc = scrollerRef.current;
      if (sc && e) {
        try {
          sc.releasePointerCapture(e.pointerId);
        } catch (err) {
          // ignore
        }
      }
      if (sc) sc.classList.remove("panning");
      panState.current.isPanning = false;
    };

    return (
      <div
        className="preview"
        style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
      >
        <div className="mermaid-full" ref={(el) => (fullRef.current = el)}>
          {/* Toolbar is outside the scrollable area so it remains visible while panning/scrolling */}
          <div className="mermaid-full-toolbar">
            <div className="mermaid-zoom-controls">
              <button onClick={zoomOut} title="Zoom out">
                −
              </button>
              <button onClick={zoomIn} title="Zoom in">
                ＋
              </button>
            </div>
            <div className="mermaid-zoom-label">{Math.round(zoom * 100)}%</div>
          </div>

          <div
            className="mermaid-full-scroller"
            ref={(el) => (scrollerRef.current = el)}
            onWheel={onWheel}
            onPointerDown={onPointerDownPan}
            onPointerMove={onPointerMovePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
          >
            <div
              className="mermaid-full-inner"
              ref={(el) => (innerRef.current = el)}
              style={{ transform: `scale(${zoom})`, transformOrigin: "0 0" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Default: regular markdown preview with any extracted mermaid panels overlaid
  return (
    <div
      className="preview"
      style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
    >
      <div
        className="preview-content"
        ref={(el) => (previewContentRef.current = el)}
        dangerouslySetInnerHTML={{ __html: cleanWithoutMermaid }}
      />
      {/* debug badge removed per user request */}
      {panels && panels.length > 0 && (
        <div className="mermaid-grid">
          {panels.map((p) => (
            <div
              key={p.id}
              className="mermaid-panel"
              style={{
                left: p.left,
                top: p.top,
                width: p.width,
                height: p.height,
              }}
            >
              <div
                className="mermaid-header"
                onMouseDown={(e) => startPanelDrag(p.id, e)}
              >
                <div className="mermaid-title">Mermaid</div>
              </div>
              <div
                className="mermaid-content"
                ref={(el) => (panelRefs.current[p.id] = el)}
              />
              <div
                className="mermaid-resizer"
                onMouseDown={(e) => startPanelResize(p.id, e)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
