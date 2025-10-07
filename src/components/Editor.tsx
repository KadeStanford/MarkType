import React from 'react'

type EditorProps = {
  value: string
  onChange: (v: string) => void
}

export default function Editor({ value, onChange }: EditorProps) {
  return (
    <div className="editor">
      <textarea
        className="editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Markdown editor"
      />
    </div>
  )
}
