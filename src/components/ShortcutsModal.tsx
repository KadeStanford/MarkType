import React, { useEffect, useMemo, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SHORTCUTS = [
  { id: "new", keys: "Ctrl/⌘ + N", desc: "New file" },
  { id: "close", keys: "Ctrl/⌘ + W", desc: "Close current file" },
  { id: "undo", keys: "Ctrl/⌘ + Z", desc: "Undo" },
  { id: "redo", keys: "Ctrl/⌘ + Shift + Z", desc: "Redo (or Ctrl/⌘+Y)" },
  { id: "cut", keys: "Ctrl/⌘ + X", desc: "Cut" },
  { id: "copy", keys: "Ctrl/⌘ + C", desc: "Copy" },
  { id: "paste", keys: "Ctrl/⌘ + V", desc: "Paste" },
  { id: "selectAll", keys: "Ctrl/⌘ + A", desc: "Select all" },
  { id: "duplicate", keys: "Ctrl/⌘ + D", desc: "Duplicate line / selection" },
  { id: "toggleComment", keys: "Ctrl/⌘ + /", desc: "Toggle line comment" },
  { id: "find", keys: "Ctrl/⌘ + F", desc: "Find in file" },
  { id: "findNext", keys: "F3", desc: "Find next" },
  { id: "findPrev", keys: "Shift + F3", desc: "Find previous" },
  { id: "replace", keys: "Ctrl/⌘ + H", desc: "Replace in file" },
  { id: "gotoLine", keys: "Ctrl/⌘ + G", desc: "Go to line" },
  { id: "mermaid", keys: "Ctrl/⌘ + Alt + M", desc: "Insert Mermaid snippet" },
  { id: "katex", keys: "Ctrl/⌘ + Alt + K", desc: "Open KaTeX insert menu" },
  {
    id: "commandPalette",
    keys: "Ctrl/⌘ + P",
    desc: "Open Command Palette (quick actions)",
  },
  { id: "shortcuts", keys: "?", desc: "Toggle this help" },
  { id: "esc", keys: "Esc", desc: "Close this dialog" },
];

export default function ShortcutsModal({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const items = useMemo(() => {
    let arr = SHORTCUTS.slice();
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((a) =>
        (a.keys + " " + a.desc).toLowerCase().includes(q)
      );
    }
    return arr;
  }, [search]);

  if (!open) return null;

  return (
    <div
      className="import-panel-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="import-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Keyboard Shortcuts</h3>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            className="ctx-search"
            placeholder="Search shortcuts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          {items.length === 0 ? (
            <div style={{ padding: 8, color: "#888" }}>No shortcuts</div>
          ) : (
            <ul style={{ marginTop: 8, lineHeight: 1.6 }}>
              {items.map((s: any) => (
                <li
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div>
                    <strong>{s.keys}</strong>: {s.desc}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}
        >
          <button className="theme-toggle" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
