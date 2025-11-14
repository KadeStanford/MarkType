import React, { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  theme?: "light" | "dark";
  fontSize?: number;
  onExternalInsert?: (fn: (text: string) => void) => void;
  onContextMenuRequest?: (coords: { x: number; y: number }) => void;
  onImageDrop?: (file: File) => void;
  modelId?: string;
  onScroll?: (ratio: number) => void; // 0..1 scroll position
  onVisibleLine?: (line: number) => void;
  onRegisterCommands?: (cmds: { undo: () => void; redo: () => void }) => void;
  onMount?: (editor: any, monaco: any) => void;
};

export default function EditorMonaco({
  value,
  onChange,
  theme = "light",
  fontSize = 14,
  onExternalInsert,
  onContextMenuRequest,
  onImageDrop,
  modelId,
  onScroll,
  onVisibleLine,
  onRegisterCommands,
  onMount,
}: Props) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const currentModelRef = useRef<any>(null);
  const domNodeRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    editor.getModel()?.updateOptions({ tabSize: 2 });
    // disable Monaco's built-in context menu so we can show our own
    editor.updateOptions({ contextmenu: false });

    // forward right-click coordinates to parent to open a custom menu
    try {
      editor.onContextMenu((e: any) => {
        const ev = e.event || e.browserEvent || {};
        const x = ev.posx ?? ev.clientX ?? 0;
        const y = ev.posy ?? ev.clientY ?? 0;
        if (onContextMenuRequest) onContextMenuRequest({ x, y });
      });
    } catch (_) {
      // no-op if API shape differs
    }
    // expose external insert hook
    if (onExternalInsert) {
      onExternalInsert((text: string) => {
        const ed = editorRef.current;
        if (!ed) return;
        ed.focus();
        ed.executeEdits("katex-palette", [
          {
            range: ed.getSelection(),
            text,
            forceMoveMarkers: true,
          },
        ]);
        ed.revealPositionInCenter(ed.getPosition());
      });
    }

    // expose a safer insert-or-append helper so callers can insert at the
    // current editor cursor when the editor is focused, or append to the end
    // of the document when it is not. This avoids race conditions when the
    // editor isn't active (e.g. when user opened Assets modal).
    try {
      let hasFocus = false;
      const lastSelectionRef = { current: null as any };
      try {
        editor.onDidFocusEditorWidget(() => {
          hasFocus = true;
        });
      } catch (_) {}
      try {
        editor.onDidBlurEditorWidget(() => {
          hasFocus = false;
        });
      } catch (_) {}
      try {
        // track last known selection so we can insert at that position even
        // after the editor loses focus (clicking Import/Assets will blur the editor)
        editor.onDidChangeCursorSelection(() => {
          try {
            lastSelectionRef.current = editor.getSelection();
          } catch (_) {
            lastSelectionRef.current = null;
          }
        });
        // initialize
        try {
          lastSelectionRef.current = editor.getSelection();
        } catch (_) {
          lastSelectionRef.current = null;
        }
      } catch (_) {}

      (window as any).__mt_insertOrAppend = (text: string) => {
        try {
          const ed = editorRef.current;
          const mon = monacoRef.current;
          const model = (
            ed && ed.getModel ? ed.getModel() : currentModelRef.current
          ) as any;
          if (!model) return;
          // If editor has focus, insert at current selection so caret position is respected
          if (hasFocus && ed) {
            try {
              ed.focus();
              const sel = ed.getSelection();
              ed.executeEdits("insert-or-append", [
                { range: sel, text, forceMoveMarkers: true },
              ]);
              const pos = ed.getPosition();
              if (pos) ed.revealPositionInCenter(pos);
              return;
            } catch (_) {}
          }
          // otherwise, if we have a last known selection, insert there
          try {
            const sel = lastSelectionRef.current;
            if (sel && mon) {
              const Range =
                mon.Range ||
                (mon && (mon as any).editor && (mon as any).editor.Range);
              const range = new Range(
                sel.startLineNumber,
                sel.startColumn,
                sel.endLineNumber,
                sel.endColumn
              );
              model.pushEditOperations([], [{ range, text }], () => null);
              return;
            }
          } catch (_) {}
          // fallback: append to end of document
          try {
            const len = model.getValueLength();
            const pos = model.getPositionAt(len);
            const Range =
              mon.Range ||
              (mon && (mon as any).editor && (mon as any).editor.Range);
            const range = new Range(
              pos.lineNumber,
              pos.column,
              pos.lineNumber,
              pos.column
            );
            model.pushEditOperations([], [{ range, text }], () => null);
          } catch (_) {
            try {
              model.setValue((model.getValue() || "") + text);
            } catch (_) {}
          }
        } catch (_) {}
      };
    } catch (_) {}

    // attach drag/drop listeners to allow image drops into the editor
    try {
      const dom = editor.getDomNode && editor.getDomNode();
      domNodeRef.current = dom;
      if (dom && onImageDrop) {
        const onDragOver = (ev: any) => {
          ev.preventDefault();
          try {
            ev.dataTransfer && (ev.dataTransfer.dropEffect = "copy");
          } catch (_) {}
        };
        const onDrop = (ev: any) => {
          try {
            ev.preventDefault();
            ev.stopPropagation();
            const files = (ev.dataTransfer && ev.dataTransfer.files) || [];
            if (files && files.length > 0) {
              const f = files[0];
              if (f && f.type && f.type.startsWith("image/")) {
                onImageDrop(f);
                return;
              }
            }
          } catch (_) {}
        };
        // use capture to try to intercept before Monaco
        dom.addEventListener("dragover", onDragOver, true);
        dom.addEventListener("drop", onDrop, true);
        // store cleanup
        (dom as any).__mt_cleanup_drop = () => {
          try {
            dom.removeEventListener("dragover", onDragOver, true);
          } catch (_) {}
          try {
            dom.removeEventListener("drop", onDrop, true);
          } catch (_) {}
        };
      }
    } catch (_) {}

    // expose a simple reveal API to allow preview -> editor navigation
    try {
      (window as any).__mt_reveal = (line: number) => {
        try {
          const ed = editorRef.current;
          const mon = monacoRef.current;
          if (!ed || !mon) return;
          const ln = Math.max(1, Math.floor(Number(line) || 1));
          const pos = { lineNumber: ln, column: 1 } as any;
          if (typeof ed.revealPositionInCenter === "function")
            ed.revealPositionInCenter(pos);
          try {
            ed.setSelection({
              startLineNumber: ln,
              startColumn: 1,
              endLineNumber: ln,
              endColumn: 1,
            });
          } catch (_) {}
          // add a temporary line highlight decoration
          try {
            const Range =
              mon.Range ||
              (mon && (mon as any).editor && (mon as any).editor.Range);
            const range = new Range(ln, 1, ln, 1);
            const dec = ed.deltaDecorations(
              [],
              [
                {
                  range,
                  options: {
                    isWholeLine: true,
                    className: "mt-editor-line-highlight",
                  },
                },
              ]
            );
            setTimeout(() => {
              try {
                ed.deltaDecorations(dec, []);
              } catch (_) {}
            }, 1600);
          } catch (_) {}
        } catch (_) {}
      };
    } catch (_) {}

    // register undo/redo commands for parent toolbar
    try {
      if (onRegisterCommands) {
        onRegisterCommands({
          undo: () => {
            try {
              editor.trigger("", "undo", null);
            } catch (_) {}
          },
          redo: () => {
            try {
              editor.trigger("", "redo", null);
            } catch (_) {}
          },
        });
      }
    } catch (_) {}

    // set up scroll listener to report relative scroll position to parent
    try {
      editor.onDidScrollChange(() => {
        try {
          const ed = editorRef.current;
          if (!ed || !onScroll) return;
          const scrollTop = ed.getScrollTop();
          const scrollHeight = ed.getScrollHeight();
          const layout = ed.getLayoutInfo();
          const clientH = layout.height;
          const max = Math.max(1, scrollHeight - clientH);
          const ratio = Math.max(0, Math.min(1, scrollTop / max));
          onScroll(ratio);
          // also report top visible line number for heading-aware sync
          try {
            if (onVisibleLine) {
              const ranges = ed.getVisibleRanges();
              if (ranges && ranges.length > 0) {
                const start = ranges[0].startLineNumber;
                onVisibleLine(start);
              }
            }
          } catch (_) {}
        } catch (_) {}
      });
    } catch (_) {}
    // Create or reuse a model for the provided modelId so undo history is per-doc
    try {
      if (modelId && monaco) {
        const uri = monaco.Uri.parse(`inmemory://model/${modelId}.md`);
        let model = monaco.editor.getModel(uri);
        if (!model) {
          model = monaco.editor.createModel(value || "", "markdown", uri);
        }
        currentModelRef.current = model;
        editor.setModel(model);
        // notify parent of commands after model is set
        try {
          if (onRegisterCommands) {
            onRegisterCommands({
              undo: () => editor.trigger("", "undo", null),
              redo: () => editor.trigger("", "redo", null),
            });
          }
        } catch (_) {}
      }
    } catch (_) {}
    if (onMount) {
          onMount(editor, monaco);
    }
  };

  // react to modelId changes (switch models without losing undo history)
  React.useEffect(() => {
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    if (!monaco || !ed) return;
    try {
      if (modelId) {
        const uri = monaco.Uri.parse(`inmemory://model/${modelId}.md`);
        let model = monaco.editor.getModel(uri);
        if (!model) {
          model = monaco.editor.createModel(value || "", "markdown", uri);
        }
        currentModelRef.current = model;
        ed.setModel(model);
      }
    } catch (_) {}
  }, [modelId]);

  // keep model value in sync when parent updates content for the active model
  React.useEffect(() => {
    const model = currentModelRef.current;
    if (!model) return;
    const cur = model.getValue();
    if (value != null && cur !== value) {
      // setValue will preserve undo stack if called with push=false, but Monaco API has setValue only
      // We'll replace content but try to avoid interfering when user is typing by checking selection
      model.pushEditOperations(
        [],
        [{ range: model.getFullModelRange(), text: value }],
        () => null
      );
    }
  }, [value]);

  // cleanup drop listeners on unmount
  React.useEffect(() => {
    return () => {
      try {
        const dom = domNodeRef.current as any;
        if (dom && typeof dom.__mt_cleanup_drop === "function")
          dom.__mt_cleanup_drop();
      } catch (_) {}
    };
  }, []);

  // attach drag/drop listeners to the outer container as a fallback (more reliable)
  React.useEffect(() => {
    const cont = containerRef.current;
    if (!cont || !onImageDrop) return;
    const onDragOver = (ev: DragEvent) => {
      try {
        ev.preventDefault();
        ev.dataTransfer && (ev.dataTransfer.dropEffect = "copy");
      } catch (_) {}
    };
    const onDrop = (ev: DragEvent) => {
      try {
        ev.preventDefault();
        ev.stopPropagation();
        const files = (ev.dataTransfer && ev.dataTransfer.files) || [];
        if (files && files.length > 0) {
          const f = files[0];
          if (f && f.type && f.type.startsWith("image/")) {
            onImageDrop(f);
          }
        }
      } catch (_) {}
    };
    // use capture on container as well to try to catch early
    cont.addEventListener("dragover", onDragOver as any, true);
    cont.addEventListener("drop", onDrop as any, true);
    return () => {
      try {
        cont.removeEventListener("dragover", onDragOver as any, true);
      } catch (_) {}
      try {
        cont.removeEventListener("drop", onDrop as any, true);
      } catch (_) {}
    };
  }, [onImageDrop]);

  return (
    <div className="editor-container" ref={containerRef}>
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={value}
        onChange={(v) => onChange(v || "")}
        theme={theme === "dark" ? "vs-dark" : "light"}
        onMount={handleMount}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          glyphMargin: false,
          fontSize: fontSize,
        }}
      />
    </div>
  );
}
