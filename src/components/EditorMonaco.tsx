import React, { useRef } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  theme?: "light" | "dark";
  fontSize?: number;
};

export default function EditorMonaco({
  value,
  onChange,
  theme = "light",
  fontSize = 14,
}: Props) {
  const editorRef = useRef<any>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.getModel()?.updateOptions({ tabSize: 2 });
  };

  return (
    <div className="editor-container">
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
