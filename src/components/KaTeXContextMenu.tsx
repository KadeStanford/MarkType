import React, { useEffect, useMemo, useRef, useState } from "react";

function IconStarFilled(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
      />
    </svg>
  );
}

function IconStarOutline(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28L6.47 10.5l4.38-.38L12 6.1l1.15 4.02 4.38.38-3.77 2.89 1 4.28L12 15.4z"
      />
    </svg>
  );
}

function IconClose(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M18.3 5.71a1 1 0 00-1.41 0L12 10.59 7.11 5.7A1 1 0 105.7 7.11L10.59 12l-4.9 4.89a1 1 0 101.41 1.41L12 13.41l4.89 4.9a1 1 0 001.41-1.41L13.41 12l4.9-4.89a1 1 0 000-1.4z"
      />
    </svg>
  );
}

function IconTrash(props: { className?: string }) {
  return (
    <svg
      className={props.className}
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M6 19a2 2 0 002 2h8a2 2 0 002-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
      />
    </svg>
  );
}

export type KaTeXItem = {
  label: string;
  title: string;
  snippet: string;
  shortcut?: string; // e.g., \\sqrt, \\frac
};
const basics: KaTeXItem[] = [
  { label: "x²", title: "Exponent", snippet: "$x^2$", shortcut: "^" },
  { label: "xᵢ", title: "Subscript", snippet: "$x_i$", shortcut: "_" },
  {
    label: "√x",
    title: "Square root",
    snippet: "$\\sqrt{x}$",
    shortcut: "\\sqrt",
  },
  {
    label: "a/b",
    title: "Fraction",
    snippet: "$\\frac{a}{b}$",
    shortcut: "\\frac",
  },
  {
    label: "|x|",
    title: "Absolute value",
    snippet: "$\\lvert x\\rvert$",
    shortcut: "|…|",
  },
  {
    label: "∙",
    title: "Dot product",
    snippet: "$a \\cdot b$",
    shortcut: "\\cdot",
  },
  {
    label: "×",
    title: "Cross product",
    snippet: "$a \\times b$",
    shortcut: "\\times",
  },
  { label: "±", title: "Plus/minus", snippet: "$\\pm$", shortcut: "\\pm" },
];

const greek: KaTeXItem[] = [
  { label: "α", title: "alpha", snippet: "$\\alpha$", shortcut: "\\alpha" },
  { label: "β", title: "beta", snippet: "$\\beta$", shortcut: "\\beta" },
  { label: "γ", title: "gamma", snippet: "$\\gamma$", shortcut: "\\gamma" },
  { label: "π", title: "pi", snippet: "$\\pi$", shortcut: "\\pi" },
  { label: "θ", title: "theta", snippet: "$\\theta$", shortcut: "\\theta" },
  { label: "λ", title: "lambda", snippet: "$\\lambda$", shortcut: "\\lambda" },
  { label: "μ", title: "mu", snippet: "$\\mu$", shortcut: "\\mu" },
  { label: "Ω", title: "Omega", snippet: "$\\Omega$", shortcut: "\\Omega" },
];

const relations: KaTeXItem[] = [
  { label: "≤", title: "less or equal", snippet: "$\\le$", shortcut: "\\le" },
  {
    label: "≥",
    title: "greater or equal",
    snippet: "$\\ge$",
    shortcut: "\\ge",
  },
  { label: "≠", title: "not equal", snippet: "$\\neq$", shortcut: "\\neq" },
  {
    label: "≈",
    title: "approximately",
    snippet: "$\\approx$",
    shortcut: "\\approx",
  },
  {
    label: "≡",
    title: "equivalent",
    snippet: "$\\equiv$",
    shortcut: "\\equiv",
  },
  {
    label: "∝",
    title: "proportional",
    snippet: "$\\propto$",
    shortcut: "\\propto",
  },
];

const arrows: KaTeXItem[] = [
  { label: "→", title: "to", snippet: "$\\to$", shortcut: "\\to" },
  {
    label: "⇒",
    title: "implies",
    snippet: "$\\Rightarrow$",
    shortcut: "\\Rightarrow",
  },
  {
    label: "←",
    title: "left arrow",
    snippet: "$\\leftarrow$",
    shortcut: "\\leftarrow",
  },
  {
    label: "↔",
    title: "leftright",
    snippet: "$\\leftrightarrow$",
    shortcut: "\\leftrightarrow",
  },
  { label: "↦", title: "maps to", snippet: "$\\mapsto$", shortcut: "\\mapsto" },
];

const calculus: KaTeXItem[] = [
  { label: "∑", title: "sum", snippet: "$\\sum_{i=1}^{n}$", shortcut: "\\sum" },
  {
    label: "∏",
    title: "product",
    snippet: "$\\prod_{i=1}^{n}$",
    shortcut: "\\prod",
  },
  {
    label: "∫",
    title: "integral",
    snippet: "$\\int_{a}^{b}$",
    shortcut: "\\int",
  },
  {
    label: "∬",
    title: "double integral",
    snippet: "$\\iint_D$",
    shortcut: "\\iint",
  },
  {
    label: "∮",
    title: "contour integral",
    snippet: "$\\oint$",
    shortcut: "\\oint",
  },
  {
    label: "lim",
    title: "limit",
    snippet: "$\\lim_{x \\to 0}$",
    shortcut: "\\lim",
  },
  {
    label: "∂",
    title: "partial",
    snippet: "$\\frac{\\partial f}{\\partial x}$",
    shortcut: "\\partial",
  },
  { label: "∇", title: "nabla", snippet: "$\\nabla f$", shortcut: "\\nabla" },
];

const accents: KaTeXItem[] = [
  { label: "x̂", title: "hat", snippet: "$\\hat{x}$", shortcut: "\\hat" },
  { label: "x̄", title: "bar", snippet: "$\\bar{x}$", shortcut: "\\bar" },
  { label: "x̃", title: "tilde", snippet: "$\\tilde{x}$", shortcut: "\\tilde" },
  {
    label: "\u203eAB",
    title: "overline",
    snippet: "$\\overline{AB}$",
    shortcut: "\\overline",
  },
  {
    label: "x\u0332",
    title: "underline",
    snippet: "$\\underline{x}$",
    shortcut: "\\underline",
  },
  {
    label: "\u2192",
    title: "vector",
    snippet: "$\\vec{x}$",
    shortcut: "\\vec",
  },
];

const setsLogic: KaTeXItem[] = [
  { label: "∈", title: "in", snippet: "$\\in$", shortcut: "\\in" },
  { label: "∉", title: "notin", snippet: "$\\notin$", shortcut: "\\notin" },
  {
    label: "⊆",
    title: "subseteq",
    snippet: "$\\subseteq$",
    shortcut: "\\subseteq",
  },
  { label: "∪", title: "union", snippet: "$\\cup$", shortcut: "\\cup" },
  { label: "∩", title: "intersection", snippet: "$\\cap$", shortcut: "\\cap" },
  {
    label: "∅",
    title: "empty set",
    snippet: "$\\emptyset$",
    shortcut: "\\emptyset",
  },
  { label: "∀", title: "for all", snippet: "$\\forall$", shortcut: "\\forall" },
  { label: "∃", title: "exists", snippet: "$\\exists$", shortcut: "\\exists" },
  { label: "∧", title: "and", snippet: "$\\land$", shortcut: "\\land" },
  { label: "∨", title: "or", snippet: "$\\lor$", shortcut: "\\lor" },
];

const delimiters: KaTeXItem[] = [
  {
    label: "(x)",
    title: "left/right parentheses",
    snippet: "$\\left( x \\right)$",
    shortcut: "\\left … \\right",
  },
  {
    label: "|x|",
    title: "absolute value scalable",
    snippet: "$\\left\\lvert x \\right\\rvert$",
    shortcut: "\\lvert … \\rvert",
  },
  {
    label: "⌊x⌋",
    title: "floor",
    snippet: "$\\left\\lfloor x \\right\\rfloor$",
    shortcut: "\\lfloor … \\rfloor",
  },
  {
    label: "⌈x⌉",
    title: "ceil",
    snippet: "$\\left\\lceil x \\right\\rceil$",
    shortcut: "\\lceil … \\rceil",
  },
];

const styles: KaTeXItem[] = [
  {
    label: "text{}",
    title: "Text in math",
    snippet: "$\\text{text}$",
    shortcut: "\\text",
  },
  {
    label: "ℝ",
    title: "blackboard bold",
    snippet: "$\\mathbb{R}$",
    shortcut: "\\mathbb",
  },
  {
    label: "𝒜",
    title: "calligraphic",
    snippet: "$\\mathcal{A}$",
    shortcut: "\\mathcal",
  },
  { label: "𝐱", title: "bold", snippet: "$\\mathbf{x}$", shortcut: "\\mathbf" },
  {
    label: "bold α",
    title: "boldsymbol",
    snippet: "$\\boldsymbol{\\alpha}$",
    shortcut: "\\boldsymbol",
  },
];

const linear: KaTeXItem[] = [
  {
    label: "bmatrix",
    title: "2x2 bmatrix",
    snippet:
      "\n$$\n\\begin{bmatrix}\n a & b \\\\ \n c & d \n\\end{bmatrix}\n$$\n",
    shortcut: "bmatrix",
  },
  {
    label: "pmatrix",
    title: "2x2 pmatrix",
    snippet:
      "\n$$\n\\begin{pmatrix}\n a & b \\\\ \n c & d \n\\end{pmatrix}\n$$\n",
    shortcut: "pmatrix",
  },
  {
    label: "vector",
    title: "column vector",
    snippet: "\n$$\n\\begin{bmatrix}\\, a \\\\ b \\end{bmatrix}\n$$\n",
    shortcut: "column",
  },
];

const blocks: KaTeXItem[] = [
  {
    label: "Block",
    title: "Block math",
    snippet: "\n$$\n...\n$$\n",
    shortcut: "$$ (display)",
  },
  {
    label: "Align",
    title: "Aligned equations",
    snippet:
      "\n$$\n\\begin{aligned}\n a &= b \\\\ \n c &= d \n\\end{aligned}\n$$\n",
    shortcut: "aligned",
  },
  {
    label: "Cases",
    title: "Piecewise/cases",
    snippet:
      "\n$$\n\\begin{cases}\n x^2, & x\\ge0 \\\\ \n -x, & x<0 \n\\end{cases}\n$$\n",
    shortcut: "cases",
  },
];

const mermaidSnippets: KaTeXItem[] = [
  {
    label: "graph",
    title: "Simple graph (LR)",
    snippet:
      "graph LR\n  A[Start] --> B{Decision}\n  B --> C[Option 1]\n  B --> D[Option 2]",
  },
  {
    label: "flow",
    title: "Flowchart",
    snippet: "flowchart TD\n  Start --> Stop",
  },
  {
    label: "seq",
    title: "Sequence diagram",
    snippet:
      "sequenceDiagram\n  Alice->>Bob: Hello Bob, how are you?\n  Bob-->>Alice: I am good thanks!",
  },
  {
    label: "journey",
    title: "Journey diagram",
    snippet:
      "journey\n  title My working day\n  section Go to work\n    Make tea: 5: Me\n    Go upstairs: 3: Me",
  },
];

const TABS = [
  { id: "basics", name: "Basics", items: basics },
  { id: "greek", name: "Greek", items: greek },
  { id: "rel", name: "Relations", items: relations },
  { id: "ops", name: "Operators", items: arrows },
  { id: "calc", name: "Calculus", items: calculus },
  { id: "acc", name: "Accents", items: accents },
  { id: "sets", name: "Sets/Logic", items: setsLogic },
  { id: "delim", name: "Delimiters", items: delimiters },
  { id: "style", name: "Styles", items: styles },
  { id: "linear", name: "Linear Alg", items: linear },
  { id: "blocks", name: "Blocks", items: blocks },
  { id: "mermaid", name: "Mermaid", items: mermaidSnippets },
  // Custom tab will be appended dynamically inside the component (backed by localStorage)
] as const;

const FAV_KEY = "marktype:katex:favs";
const RECENT_KEY = "marktype:katex:recent";
const CUSTOM_KEY = "marktype:katex:custom";

function loadFavs(): string[] {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}
function saveFavs(arr: string[]) {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify(arr));
  } catch (_) {}
}

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}
function saveRecent(arr: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(arr));
  } catch (_) {}
}

function loadCustom(): KaTeXItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}
function saveCustom(arr: KaTeXItem[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
  } catch (_) {}
}

export default function KaTeXContextMenu({
  open,
  x,
  y,
  onPick,
  onClose,
}: {
  open: boolean;
  x: number;
  y: number;
  onPick: (snippet: string) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<string>("basics");
  const [search, setSearch] = useState("");
  const [favs, setFavs] = useState<string[]>(() => loadFavs());
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [custom, setCustom] = useState<KaTeXItem[]>(() => loadCustom());
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newSnippet, setNewSnippet] = useState("");
  const [newShortcut, setNewShortcut] = useState("");

  // include custom tab items by building a runtime tab list
  const tabsWithCustom = useMemo(() => {
    return [...TABS, { id: "custom", name: "Custom", items: custom }];
  }, [custom]);

  const allItems = useMemo(
    () => tabsWithCustom.flatMap((t) => t.items),
    [tabsWithCustom]
  );

  const itemToTab = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tabsWithCustom) {
      for (const it of t.items) {
        m.set(makeId(it), t.name);
      }
    }
    return m;
  }, [tabsWithCustom]);

  const items = useMemo(() => {
    // When search is present, search across all tabs
    if (search) {
      const q = search.toLowerCase();
      return allItems.filter((it) =>
        (
          it.title +
          " " +
          it.label +
          " " +
          (it.shortcut || "") +
          " " +
          it.snippet
        )
          .toLowerCase()
          .includes(q)
      );
    }
    if (activeTab === "favorites") {
      // map fav ids back to items
      return favs
        .map((id) => allItems.find((ai) => makeId(ai) === id))
        .filter(Boolean) as typeof allItems;
    }
    if (activeTab === "recent") {
      return recent
        .map((id) => allItems.find((ai) => makeId(ai) === id))
        .filter(Boolean) as typeof allItems;
    }
    const tab =
      tabsWithCustom.find((t) => t.id === activeTab) || tabsWithCustom[0];
    return tab.items;
  }, [activeTab, favs, recent, allItems, search]);

  function makeId(it: KaTeXItem) {
    return (it.title + "::" + it.snippet).slice(0, 220);
  }

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const el = menuRef.current;
      if (!el) return onClose();
      if (!el.contains(e.target as Node)) onClose();
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("click", onDocClick, true);
    document.addEventListener("contextmenu", onDocClick, true);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick, true);
      document.removeEventListener("contextmenu", onDocClick, true);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Prevent menu from going off-screen: clamp using menu width so the star isn't cut off
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MENU_W = 360; // keep in sync with .ctx-menu min-width
  let left = Math.min(x, Math.max(8, vw - MENU_W - 12));
  if (left < 8) left = 8;
  const top = Math.min(y, vh - 280);

  return (
    <div
      className="ctx-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 300 }}
    >
      <div
        ref={menuRef}
        className="ctx-menu"
        style={{ position: "fixed", left, top }}
        role="menu"
        aria-label="KaTeX presets"
      >
        <div style={{ padding: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div className="ctx-search-wrap">
              <input
                ref={searchRef}
                className="ctx-search"
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search ? (
                <button
                  className="ctx-search-clear"
                  aria-label="Clear search"
                  onClick={() => {
                    setSearch("");
                    searchRef.current?.focus();
                  }}
                >
                  <IconClose className="ctx-icon" />
                </button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                className={`ctx-tab ${activeTab === "recent" ? "active" : ""}`}
                onClick={() => setActiveTab("recent")}
              >
                Recent
              </button>
              <button
                className={`ctx-tab ctx-fav-toggle ${
                  activeTab === "favorites" ? "active" : ""
                }`}
                onClick={() => setActiveTab("favorites")}
                aria-label="Favorites"
                title="Favorites"
              >
                <IconStarFilled className="ctx-icon" />
              </button>
            </div>
          </div>
        </div>

        <div className="ctx-tabs" role="tablist" aria-label="KaTeX categories">
          {tabsWithCustom.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={activeTab === t.id}
              className={`ctx-tab ${activeTab === t.id ? "active" : ""}`}
              onClick={() => setActiveTab(t.id)}
              title={t.name}
            >
              {t.name}
            </button>
          ))}
          <button
            className={`ctx-tab ${activeTab === "custom" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("custom");
              setAdding(true);
            }}
            title="Add custom"
            aria-label="Add custom snippet"
          >
            +
          </button>
        </div>

        <div className="ctx-list" role="group" aria-label="KaTeX items">
          {activeTab === "custom" && (
            <div style={{ padding: 8 }}>
              {adding ? (
                <div className="ctx-form">
                  <input
                    className="ctx-form-input"
                    placeholder="Label (symbol)"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                  <input
                    className="ctx-form-input"
                    placeholder="Title (short description)"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                  <input
                    className="ctx-form-input"
                    placeholder="Shortcut (e.g. \\alpha)"
                    value={newShortcut}
                    onChange={(e) => setNewShortcut(e.target.value)}
                  />
                  <textarea
                    className="ctx-form-input"
                    placeholder="Snippet (LaTeX or text)"
                    value={newSnippet}
                    onChange={(e) => setNewSnippet(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      className="ctx-add-btn"
                      onClick={() => {
                        const item: KaTeXItem = {
                          label: newLabel || newTitle || "Custom",
                          title: newTitle || newLabel || "Custom snippet",
                          snippet: newSnippet || "$$",
                          shortcut: newShortcut || undefined,
                        };
                        const next = [item, ...custom];
                        setCustom(next);
                        saveCustom(next);
                        setNewLabel("");
                        setNewTitle("");
                        setNewSnippet("");
                        setNewShortcut("");
                        setAdding(false);
                        // switch to custom tab to show it
                        setActiveTab("custom");
                      }}
                    >
                      Add
                    </button>
                    <button
                      className="ctx-add-btn"
                      onClick={() => {
                        setAdding(false);
                        setNewLabel("");
                        setNewTitle("");
                        setNewSnippet("");
                        setNewShortcut("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="ctx-add-btn"
                    onClick={() => setAdding(true)}
                  >
                    Add custom snippet
                  </button>
                </div>
              )}
            </div>
          )}
          {items
            .filter((it) => {
              if (!search) return true;
              const q = search.toLowerCase();
              return (
                it.title +
                " " +
                it.label +
                " " +
                (it.shortcut || "") +
                " " +
                it.snippet
              )
                .toLowerCase()
                .includes(q);
            })
            .map((it) => {
              const id = makeId(it);
              const isFav = favs.includes(id);
              const tabName = itemToTab.get(id) || "";
              const isCustom =
                tabsWithCustom.find((t) =>
                  t.items.some((x) => makeId(x) === id)
                )?.id === "custom";
              return (
                <div
                  key={id}
                  className="ctx-item"
                  role="menuitem"
                  title={it.title}
                >
                  <button
                    className="ctx-item-main"
                    onClick={() => {
                      // record recent
                      const next = [
                        id,
                        ...recent.filter((r) => r !== id),
                      ].slice(0, 20);
                      setRecent(next);
                      saveRecent(next);
                      onPick(it.snippet);
                      onClose();
                    }}
                  >
                    <div className="ctx-main-left">
                      <span className="ctx-sym">{it.label}</span>
                      <div className="ctx-meta">
                        <span className="ctx-title">{it.title}</span>
                        {it.shortcut ? (
                          <span className="ctx-key">{it.shortcut}</span>
                        ) : null}
                      </div>
                    </div>
                    {search ? (
                      <span className="ctx-badge">{tabName}</span>
                    ) : null}
                  </button>
                  <div
                    className="ctx-item-actions"
                    style={{ display: "flex", gap: 6 }}
                  >
                    <button
                      className={`ctx-star ${isFav ? "fav" : ""}`}
                      aria-label={isFav ? "Unfavorite" : "Favorite"}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isFav) {
                          const next = favs.filter((f) => f !== id);
                          setFavs(next);
                          saveFavs(next);
                        } else {
                          const next = [
                            id,
                            ...favs.filter((f) => f !== id),
                          ].slice(0, 100);
                          setFavs(next);
                          saveFavs(next);
                        }
                      }}
                    >
                      {isFav ? (
                        <IconStarFilled className="ctx-icon" />
                      ) : (
                        <IconStarOutline className="ctx-icon" />
                      )}
                    </button>
                    {isCustom ? (
                      <button
                        className="ctx-star"
                        aria-label="Delete custom"
                        title="Delete custom snippet"
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = custom.filter((c) => makeId(c) !== id);
                          setCustom(next);
                          saveCustom(next);
                        }}
                      >
                        <IconTrash className="ctx-icon" />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
