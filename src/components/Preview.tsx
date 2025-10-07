import React from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

type PreviewProps = {
  markdown: string
}

export default function Preview({ markdown }: PreviewProps) {
  const html = marked.parse(markdown)
  const clean = DOMPurify.sanitize(html)

  return (
    <div className="preview">
      <div
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  )
}
