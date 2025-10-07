import React, { useEffect, useState } from "react";

type Issue = {
  lineNumber: number;
  ruleNames: string[];
  ruleDescription: string;
  errorDetail?: string;
};

export default function LintPanel({ text }: { text: string }) {
  const [issues, setIssues] = useState<Issue[] | null>(null);

  useEffect(() => {
    let active = true;
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
        if (active) setIssues(list);
      } catch (err) {
        if (active) setIssues(null);
      }
    };

    const id = setTimeout(run, 350);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [text]);

  if (!issues) return null;

  return (
    <aside className="lint-panel">
      <strong>Markdown Lint</strong>
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
    </aside>
  );
}
