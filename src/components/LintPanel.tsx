import React, { useEffect, useState } from "react";

type Issue = {
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  errorDetail?: string;
};

export default function LintPanel({ text }: { text: string }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  // Simple browser fallback linter for demo purposes.
  function fallbackLint(src: string): Issue[] {
    const lines = src.split(/\r?\n/);
    const out: Issue[] = [];

    // Trailing spaces (MD009 / MD051-ish)
    lines.forEach((ln, idx) => {
      if (/\s+$/.test(ln)) {
        out.push({
          lineNumber: idx + 1,
          ruleNames: ["trailing-spaces"],
          ruleDescription: "Trailing spaces",
          errorDetail: JSON.stringify(ln.match(/\s+$/)?.[0]),
        });
      }
    });

    // Missing space after hashes for header (e.g. '#Bad' instead of '# Bad')
    lines.forEach((ln, idx) => {
      if (/^#{1,6}[^\s#]/.test(ln)) {
        out.push({
          lineNumber: idx + 1,
          ruleNames: ["header-space"],
          ruleDescription: "Missing space after header hashes",
        });
      }
    });

    // Tabs used for indentation
    lines.forEach((ln, idx) => {
      if (/\t/.test(ln)) {
        out.push({
          lineNumber: idx + 1,
          ruleNames: ["no-tabs"],
          ruleDescription: "Tab characters used for indentation",
        });
      }
    });

    // Long lines
    const MAX = 120;
    lines.forEach((ln, idx) => {
      if (ln.length > MAX) {
        out.push({
          lineNumber: idx + 1,
          ruleNames: ["line-length"],
          ruleDescription: `Line exceeds ${MAX} characters`,
          errorDetail: `len=${ln.length}`,
        });
      }
    });

    // Multiple consecutive blank lines (2+)
    let blankStreak = 0;
    lines.forEach((ln, idx) => {
      if (/^\s*$/.test(ln)) {
        blankStreak += 1;
        if (blankStreak === 2) {
          out.push({
            lineNumber: idx, // report at the first extra blank line
            ruleNames: ["no-multiple-blanks"],
            ruleDescription: "Multiple consecutive blank lines",
          });
        }
      } else {
        blankStreak = 0;
      }
    });

    // Mixed list markers: prefer dashes (-) over asterisks (*)
    lines.forEach((ln, idx) => {
      if (/^\s*\*/.test(ln)) {
        out.push({
          lineNumber: idx + 1,
          ruleNames: ["list-style"],
          ruleDescription: "Asterisk list marker used; prefer dashes (-)",
        });
      }
    });

    // No final newline
    if (!/\n$/.test(src)) {
      out.push({
        lineNumber: lines.length,
        ruleNames: ["final-newline"],
        ruleDescription: "File does not end with a newline",
      });
    }

    return out;
  }

  useEffect(() => {
    let active = true;
    setStatus("loading");

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

    const id = setTimeout(run, 350);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [text]);

  return (
    <aside className="lint-panel">
      <strong>Markdown Lint</strong>
      {status === "loading" && <div className="lint-loading">Checking...</div>}
      {status === "error" && (
        <div className="lint-error">Linting unavailable (markdownlint could not be loaded)</div>
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
                    {it.ruleDescription} {it.errorDetail ? `— ${it.errorDetail}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}
