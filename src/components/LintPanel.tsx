import React, { useEffect, useState } from "react";

type Issue = {
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  errorDetail?: string;
  hint?: string;
  preview?: string;
};

export default function LintPanel({ text }: { text: string }) {
  // Detect if the document is a Mermaid file (raw or fenced-only)
  const isMermaid = (() => {
    const s = (text || "").trim();
    if (!s) return false;
    const first = s.split(/\r?\n/)[0].trim();
    const simpleHeaderMatch =
      /^(?:graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|pie|erDiagram|journey|gitGraph)/i.test(
        first
      );
    const fencedOnly = /^\s*(?:```|~~~)\s*mermaid[\s\S]*?(?:```|~~~)\s*$/i.test(
      s
    );
    return simpleHeaderMatch || fencedOnly;
  })();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [mathIssues, setMathIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [mathStatus, setMathStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  // Simple browser fallback linter for demo purposes.
  function fallbackLint(src: string): Issue[] {
    const lines = src.split(/\r?\n/);
    const out: Issue[] = [];

    // Trailing spaces (MD009 / MD051-ish)
    lines.forEach((ln, idx) => {
      const m = ln.match(/(\s+)$/);
      if (m) {
        out.push({
          lineNumber: idx + 1,
          ruleNames: ["MD009", "trailing-spaces"],
          ruleDescription: "Trailing spaces",
          errorDetail: m[1],
        });
      }
    });

    // No final newline
    if (!/\n$/.test(src)) {
      out.push({
        lineNumber: Math.max(1, lines.length),
        ruleNames: ["final-newline"],
        ruleDescription: "File does not end with a newline",
      });
    }

    return out;
  }

  useEffect(() => {
    // If this looks like a Mermaid file, skip markdown/KaTeX linting and run mermaid lint instead
    if (isMermaid) {
      setStatus("idle");
      setMathStatus("idle");
      return;
    }

    let active = true;
    setStatus("loading");
    setMathStatus("loading");

    const run = async () => {
      try {
        const markdownlint = await import("markdownlint");
        const options = {
          strings: { content: text },
          config: { default: true },
        } as any;

        const result = (markdownlint as any).sync(options);
        const errs = result.content || {};
        const list: Issue[] = [];
        for (const r of Object.values(errs)) {
          for (const e of r as any[]) {
            list.push({
              lineNumber: e.lineNumber,
              ruleNames: e.ruleNames,
              ruleDescription: e.ruleDescription,
              errorDetail: e.errorDetail,
            });
          }
        }
        if (active) {
          setIssues(list);
          setStatus("ready");
        }
      } catch (err) {
        // If dynamic import or linting fails, fallback to a lightweight browser lint
        // Log to console for debugging in dev tools
        // eslint-disable-next-line no-console
        console.warn("markdownlint load failed; using fallback linter:", err);
        if (active) {
          const fallback = fallbackLint(text);
          setIssues(fallback);
          setStatus("ready");
        }
      }
    };

    const id = setTimeout(run, 300);
    // KaTeX lint in parallel (basic parser check on $..$ and $$..$$)
    const mathId = setTimeout(async () => {
      try {
        const katex = await import("katex");
        const src = text;
        const lines = src.split(/\r?\n/);

        // Track code fences to avoid scanning inside
        let inCode = false;
        let inMathBlock = false;
        let mathBlockStart = 0;
        let mathBlockBuffer: string[] = [];
        const found: { expr: string; line: number }[] = [];
        const mathErrs: Issue[] = [];
        let pendingSingleDollarAtLine: number | null = null;

        const isFence = (ln: string) => /^\s*```|^\s*~~~/.test(ln);

        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          if (isFence(ln)) {
            inCode = !inCode;
            continue;
          }
          if (inCode) continue;

          const trimmed = ln.trim();
          // Multiline block math delimited by lines with only $$
          if (!inMathBlock && /^\$\$\s*$/.test(trimmed)) {
            // If a previous single '$' line likely intended to start a block, treat this as its close
            if (pendingSingleDollarAtLine) {
              // consume the pending single-dollar block intent; do not toggle block state
              pendingSingleDollarAtLine = null;
              continue;
            } else {
              inMathBlock = true;
              mathBlockStart = i + 1; // next line is where content begins visually
              mathBlockBuffer = [];
              continue;
            }
          }
          if (inMathBlock) {
            if (/^\$\$\s*$/.test(trimmed)) {
              // end block
              const expr = mathBlockBuffer.join("\n");
              found.push({ expr, line: mathBlockStart });
              inMathBlock = false;
              mathBlockBuffer = [];
            } else {
              mathBlockBuffer.push(ln);
            }
            continue;
          }

          // A single '$' on its own line is likely an intended block start typo
          if (/^\$\s*$/.test(trimmed)) {
            pendingSingleDollarAtLine = i + 1;
            mathErrs.push({
              lineNumber: i + 1,
              ruleNames: ["katex", "delimiters"],
              ruleDescription: "Single '$' used on its own line",
              hint: "For block math, use $$ on its own line to open and close",
              preview: (lines[i + 1] || "").trim().slice(0, 80),
            });
            // Skip further scanning on this line
            continue;
          }

          // Single-line $$ expr $$
          const singleBlock = ln.match(/\$\$(.+?)\$\$/);
          if (singleBlock) {
            found.push({ expr: singleBlock[1], line: i + 1 });
          }

          // Inline math $...$ (skip $$ and escaped \$)
          const s = ln;
          let idx = 0;
          while (idx < s.length) {
            const start = s.indexOf("$", idx);
            if (start === -1) break;
            // skip escaped or $$
            const isEscaped = start > 0 && s[start - 1] === "\\";
            const isDouble = s[start + 1] === "$";
            if (isEscaped || isDouble) {
              idx = start + 1;
              continue;
            }
            // find closing
            let end = start + 1;
            while (end < s.length) {
              if (s[end] === "$" && s[end - 1] !== "\\" && s[end + 1] !== "$") {
                break;
              }
              end++;
            }
            if (end < s.length && s[end] === "$") {
              const expr = s.slice(start + 1, end);
              found.push({ expr, line: i + 1 });
              idx = end + 1;
            } else {
              // unmatched inline math delimiter – report as a friendly issue
              mathErrs.push({
                lineNumber: i + 1,
                ruleNames: ["katex", "delimiters"],
                ruleDescription: "Unclosed inline math (missing closing $)",
                hint: "Close inline math like $...$ with a matching $",
                preview: ln.trim().slice(Math.max(0, start - 20), start + 40),
              });
              idx = start + 1;
            }
          }
        }

        // Unclosed block math at end of file
        if (inMathBlock) {
          mathErrs.push({
            lineNumber: mathBlockStart,
            ruleNames: ["katex", "delimiters"],
            ruleDescription: "Unclosed block math (missing closing $$)",
            hint: "End block math with a line containing only $$",
            preview: mathBlockBuffer.join(" ").slice(0, 80),
          });
        }

        // Validate with KaTeX
        for (const m of found) {
          try {
            (katex as any).renderToString(m.expr, { throwOnError: true });
          } catch (e: any) {
            const raw = e?.message || String(e);
            const { desc, hint } = friendlyKatexMessage(raw);
            mathErrs.push({
              lineNumber: m.line,
              ruleNames: ["katex"],
              ruleDescription: desc,
              errorDetail: raw,
              hint,
              preview: m.expr.trim().replace(/\s+/g, " ").slice(0, 80),
            });
          }
        }
        if (active) {
          setMathIssues(mathErrs);
          setMathStatus("ready");
        }
      } catch (e) {
        if (active) {
          // KaTeX not available or failed to load
          setMathIssues([]);
          setMathStatus("error");
        }
      }
    }, 320);
    return () => {
      active = false;
      clearTimeout(id);
      clearTimeout(mathId);
    };
  }, [text]);

  // Mermaid lint: if document is mermaid, provide friendly mermaid diagnostics
  const [mermaidIssues, setMermaidIssues] = useState<Issue[]>([]);
  const [mermaidStatus, setMermaidStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    if (!isMermaid) {
      setMermaidIssues([]);
      setMermaidStatus("idle");
      return;
    }
    let active = true;
    setMermaidStatus("loading");
    (async () => {
      try {
        const M = await import("mermaid");
        const mermaidLib = (M as any).default || M;
        // initialize like the preview does so parsing/render behaves the same
        try {
          mermaidLib.initialize?.({ startOnLoad: false });
        } catch (e) {
          // ignore
        }
        // normalize and extract fenced block if present
        const code = (text || "").replace(/\r\n/g, "\n").trim();
        const fenced = code.match(
          /^\s*(?:```|~~~)\s*mermaid\s*\n([\s\S]*?)\n(?:```|~~~)\s*$/i
        );
        const toCheck = fenced ? fenced[1] : code;

        // Attempt to render (supports multiple mermaid API shapes)
        try {
          let didError = false;
          // prefer mermaid.render if present (v10+ or some builds)
          if (typeof mermaidLib.render === "function") {
            const res = mermaidLib.render("lint-temp", toCheck);
            if (res && typeof res.then === "function") {
              // promise-like
              await res;
            }
          } else if (
            mermaidLib.mermaidAPI &&
            typeof mermaidLib.mermaidAPI.render === "function"
          ) {
            // some builds accept (id, code) and return {svg} or string, others accept callback
            try {
              const out = mermaidLib.mermaidAPI.render("lint-temp", toCheck);
              if (out && typeof out.then === "function") {
                await out;
              }
            } catch (renderErr) {
              // try callback form which may throw synchronously or call back with output
              await new Promise<void>((resolve, reject) => {
                try {
                  mermaidLib.mermaidAPI.render(
                    "lint-temp",
                    toCheck,
                    (s: string) => {
                      // if we get here, render succeeded
                      resolve();
                    }
                  );
                } catch (cbErr) {
                  reject(cbErr);
                }
              });
            }
          } else if (typeof mermaidLib.parse === "function") {
            // some builds expose parse which can throw
            mermaidLib.parse(toCheck);
          } else if (
            mermaidLib.mermaidAPI &&
            typeof mermaidLib.mermaidAPI.parse === "function"
          ) {
            mermaidLib.mermaidAPI.parse(toCheck);
          }

          if (!didError && active) {
            setMermaidIssues([]);
            setMermaidStatus("ready");
          }
        } catch (err: any) {
          const msg = String(err && (err.message || err));
          if (active) {
            // Try to produce a helpful fix suggestion for common typos (e.g. 'sectio' -> 'section')
            const lines = (toCheck || "").split("\n");
            // tiny levenshtein for small strings
            const lev = (a: string, b: string) => {
              const A = a.toLowerCase();
              const B = b.toLowerCase();
              const m = A.length;
              const n = B.length;
              const d: number[][] = Array.from({ length: m + 1 }, () =>
                Array(n + 1).fill(0)
              );
              for (let i = 0; i <= m; i++) d[i][0] = i;
              for (let j = 0; j <= n; j++) d[0][j] = j;
              for (let i = 1; i <= m; i++) {
                for (let j = 1; j <= n; j++) {
                  const cost = A[i - 1] === B[j - 1] ? 0 : 1;
                  d[i][j] = Math.min(
                    d[i - 1][j] + 1,
                    d[i][j - 1] + 1,
                    d[i - 1][j - 1] + cost
                  );
                }
              }
              return d[m][n];
            };

            const keywords = [
              "section",
              "title",
              "sequenceDiagram",
              "graph",
              "flowchart",
              "gantt",
              "classDiagram",
              "stateDiagram",
              "pie",
              "erDiagram",
              "journey",
              "gitGraph",
              "task",
              "taskData",
            ];

            let suggestion: {
              line: number;
              found: string;
              replaceWith: string;
              preview?: string;
            } | null = null;
            for (let i = 0; i < lines.length; i++) {
              const m = lines[i].trim().match(/^([a-zA-Z@\\]+)\b/);
              if (!m) continue;
              const token = m[1];
              // skip if it's a known keyword
              if (keywords.includes(token)) continue;
              // find closest keyword
              let best: { k: string; dist: number } | null = null;
              for (const k of keywords) {
                const distance = lev(token, k);
                if (!best || distance < best.dist) best = { k, dist: distance };
              }
              if (best && best.dist <= 2) {
                // propose a fix
                const replaced = lines.slice();
                replaced[i] = replaced[i].replace(
                  new RegExp("^\\s*" + token),
                  replaced[i].replace(token, best.k).slice(0, token.length + 10)
                );
                const preview = [Math.max(0, i - 1), i, i + 1]
                  .map((ln) =>
                    replaced[ln] !== undefined
                      ? `${ln + 1}: ${replaced[ln]}`
                      : null
                  )
                  .filter(Boolean)
                  .join("\n");
                suggestion = {
                  line: i + 1,
                  found: token,
                  replaceWith: best.k,
                  preview,
                };
                break;
              }
            }

            const baseHint =
              "Check your diagram syntax — e.g., missing '->' arrows, unclosed blocks, or incorrect node ids.";
            const hint = suggestion
              ? `Possible fix: replace '${suggestion.found}' with '${suggestion.replaceWith}' on line ${suggestion.line}.\nPreview:\n${suggestion.preview}`
              : baseHint;

            setMermaidIssues([
              {
                lineNumber: suggestion ? suggestion.line : 1,
                ruleNames: ["mermaid"],
                ruleDescription: "Mermaid syntax error",
                errorDetail: msg,
                hint,
              },
            ]);
            setMermaidStatus("error");
          }
        }
      } catch (err) {
        if (active) {
          setMermaidIssues([
            {
              lineNumber: 1,
              ruleNames: ["mermaid"],
              ruleDescription: "Mermaid library unavailable",
              errorDetail: String(err),
              hint: "Install or enable mermaid to get syntax validation.",
            },
          ]);
          setMermaidStatus("error");
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [text, isMermaid]);

  return (
    <aside className="lint-panel">
      {!isMermaid ? (
        <>
          <strong>Markdown Lint</strong>
          {status === "loading" && (
            <div className="lint-loading">Checking...</div>
          )}
          {status === "error" && (
            <div className="lint-error">
              Linting unavailable (markdownlint could not be loaded)
            </div>
          )}
          {status === "ready" && (
            <>
              {issues.length === 0 ? (
                <div className="lint-ok">No issues</div>
              ) : (
                <ul>
                  {issues.map((it, idx) => (
                    <li key={idx}>
                      <span className="ln">Ln {it.lineNumber}</span>
                      <span className="rule">{it.ruleNames.join(", ")}</span>
                      <div className="desc">
                        {it.ruleDescription}{" "}
                        {it.errorDetail ? `— ${it.errorDetail}` : ""}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div style={{ height: 10 }} />
          <strong>KaTeX Lint</strong>
          {mathStatus === "loading" && (
            <div className="lint-loading">Checking math...</div>
          )}
          {mathStatus === "error" && (
            <div className="lint-error">KaTeX lint unavailable</div>
          )}
          {mathStatus === "ready" && (
            <>
              {mathIssues.length === 0 ? (
                <div className="lint-ok">No math issues</div>
              ) : (
                <ul>
                  {mathIssues.map((it, idx) => (
                    <li key={idx}>
                      <span className="ln">Ln {it.lineNumber}</span>
                      <span className="rule">{it.ruleNames.join(", ")}</span>
                      <div className="desc">
                        {it.ruleDescription}
                        {it.preview
                          ? ` — e.g. ${it.preview}${
                              it.preview.length >= 80 ? "…" : ""
                            }`
                          : ""}
                        {it.hint ? (
                          <>
                            <br />
                            <em>Hint: {it.hint}</em>
                          </>
                        ) : null}
                        {it.errorDetail ? (
                          <>
                            <br />
                            <span style={{ opacity: 0.8 }}>
                              Details: {it.errorDetail}
                            </span>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <strong>Mermaid Lint</strong>
          {mermaidStatus === "loading" && (
            <div className="lint-loading">Checking diagram...</div>
          )}
          {mermaidStatus === "ready" && (
            <div className="lint-ok">Mermaid diagram looks OK</div>
          )}
          {mermaidStatus === "error" && (
            <>
              {mermaidIssues.length === 0 ? (
                <div className="lint-error">Unknown mermaid error</div>
              ) : (
                <ul>
                  {mermaidIssues.map((it, idx) => (
                    <li key={idx}>
                      <span className="ln">Ln {it.lineNumber}</span>
                      <span className="rule">{it.ruleNames.join(", ")}</span>
                      <div className="desc">
                        {it.ruleDescription}
                        {it.errorDetail ? (
                          <>
                            <br />
                            <span style={{ opacity: 0.9 }}>
                              {it.errorDetail}
                            </span>
                          </>
                        ) : null}
                        {it.hint ? (
                          <>
                            <br />
                            <em>Hint: {it.hint}</em>
                          </>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </aside>
  );
}

// Convert raw KaTeX error messages into friendlier descriptions with simple suggestions.
function friendlyKatexMessage(raw: string): { desc: string; hint?: string } {
  const text = String(raw || "");
  // Missing closing brace
  if (/Expected '\}'/i.test(text) && /EOF|end of input/i.test(text)) {
    return {
      desc: "Missing closing brace '}'",
      hint: "Make sure every { has a matching } (e.g., \\frac{a}{b})",
    };
  }
  // Extra closing brace
  if (/Extra \}/i.test(text)) {
    return {
      desc: "Too many '}' characters",
      hint: "Remove an extra } or add a matching { earlier",
    };
  }
  // Undefined control sequence / unknown command
  const undef = text.match(/Undefined control sequence:\s*(\\\\?[A-Za-z@]+)?/);
  if (undef) {
    return {
      desc: "Unknown command",
      hint: "Check the command spelling (e.g., \\alpha, \\sqrt, \\frac). Not all LaTeX packages are supported in KaTeX",
    };
  }
  // No such environment
  if (/No such environment/i.test(text)) {
    const env = text.match(/environment:\s*([A-Za-z*]+)/i)?.[1];
    return {
      desc: `Unknown environment${env ? ` '${env}'` : ""}`,
      hint: "Use supported environments like aligned, cases, matrix, bmatrix",
    };
  }
  // Alignment issues (common with & and \\)
  if (/Misplaced alignment tab character|Can't use.*'&'/i.test(text)) {
    return {
      desc: "Alignment '&' used in unsupported context",
      hint: "Use aligned or array environments when aligning with '&'",
    };
  }
  // General parse error fallback
  return {
    desc: "KaTeX parse error",
    hint: "Try inserting a preset from the right-click menu and adapt it",
  };
}
