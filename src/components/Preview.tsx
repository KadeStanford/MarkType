import React from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

// Helper to safely escape attributes
function escAttr(s: string | null | undefined) {
  if (!s) return "";
  return String(s).replace(/"/g, "&quot;");
}

type PreviewProps = {
  markdown: string;
  fontSize?: number;
};

export default function Preview({ markdown, fontSize }: PreviewProps) {
  // Create a renderer so we can rewrite relative image paths
  const renderer = new marked.Renderer();

  renderer.image = (
    href: string | null,
    title: string | null,
    text: string
  ) => {
    let src = href || "";
    // If src is a relative path (not starting with / or http), map it to the docs/examples assets path
    if (src && !/^(https?:)?\/\//i.test(src) && !src.startsWith("/")) {
      // Common pattern used in demo files is './assets/..' or 'assets/..'
      if (src.startsWith("./")) src = src.replace(/^\.\//, "/docs/examples/");
      else src = "/docs/examples/" + src.replace(/^\//, "");
    }
    const titleAttr = title ? ` title="${escAttr(title)}"` : "";
    const altAttr = text ? ` alt="${escAttr(text)}"` : ' alt="image"';
    return `<img src="${escAttr(
      src
    )}"${altAttr}${titleAttr} class="md-image" />`;
  };

  renderer.link = (href: string | null, title: string | null, text: string) => {
    const h = href || "";
    const titleAttr = title ? ` title="${escAttr(title)}"` : "";
    // open external links in new tab
    const isExternal = /^(https?:)?\/\//i.test(h);
    const target = isExternal
      ? ' target="_blank" rel="noopener noreferrer"'
      : "";
    return `<a href="${escAttr(h)}"${titleAttr}${target}>${text}</a>`;
  };

  const html = marked.parse(markdown, { renderer });
  const clean = DOMPurify.sanitize(html);

  return (
    <div
      className="preview"
      style={fontSize ? { fontSize: `${fontSize}px` } : undefined}
    >
      <div
        className="preview-content"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  );
}
