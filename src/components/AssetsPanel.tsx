import React, { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  activeDoc?: any;
  onInsert: (markdown: string) => void;
};

function isImagePath(p: string) {
  return /\.(png|jpe?g|gif|webp|svg)$/i.test(p);
}

export default function AssetsPanel({
  open,
  onClose,
  activeDoc,
  onInsert,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[] | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      if (!activeDoc || !activeDoc.git) {
        setFiles([]);
        return;
      }
      const token = localStorage.getItem("marktype:gh_token");
      if (!token) {
        (window as any).__mt_toast?.("Connect GitHub to browse assets", "info");
        setFiles([]);
        return;
      }
      setLoading(true);
      try {
        const owner = activeDoc.git.owner;
        const repo = activeDoc.git.repo;
        const branch = activeDoc.git.branch || "main";
        const docPath = activeDoc.git.path || "";
        const baseDir = docPath.includes("/")
          ? docPath.replace(/\/[^\/]+$/, "").replace(/\\/g, "/")
          : "";
        const folder = baseDir
          ? `${baseDir.replace(/^\//, "")}/assets`
          : "assets";
        const res = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
            folder
          )}?ref=${encodeURIComponent(branch)}`,
          {
            headers: { Authorization: `token ${token}` },
          }
        );
        if (!res.ok) throw new Error(await res.text());
        const body = await res.json();
        const imgs = (Array.isArray(body) ? body : []).filter(
          (f: any) => f && f.type === "file" && isImagePath(f.name)
        );
        setFiles(imgs);
      } catch (err: any) {
        setFiles([]);
        (window as any).__mt_toast?.(
          "Failed to load assets: " +
            (err && err.message ? err.message : String(err)),
          "error"
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [open, activeDoc]);

  if (!open) return null;

  return (
    <div
      className="import-panel-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="import-panel" onClick={(e) => e.stopPropagation()}>
        <h3>Assets</h3>
        <p style={{ marginTop: 6 }}>
          Browse images in the repo <strong>assets/</strong> folder and insert
          them into the current document.
        </p>
        {loading && <div style={{ marginTop: 8 }}>Loading…</div>}
        {!loading && files && files.length === 0 && (
          <div style={{ marginTop: 8, color: "#666" }}>
            No images found in assets/
          </div>
        )}
        {!loading && files && files.length > 0 && (
          <div style={{ marginTop: 8, maxHeight: 320, overflow: "auto" }}>
            {files.map((f: any) => (
              <div
                key={f.path}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: 8,
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 48,
                    background: "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={f.download_url || f.url}
                    alt={f.name}
                    style={{ maxWidth: "100%", maxHeight: "100%" }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{f.path}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="theme-toggle"
                    onClick={() => {
                      // construct raw URL for insertion
                      const owner = activeDoc.git.owner;
                      const repo = activeDoc.git.repo;
                      const branch = activeDoc.git.branch || "main";
                      const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${encodeURIComponent(
                        f.path
                      )}`;
                      const md = `![${f.name}](${raw})`;
                      // prefer the smarter helper if available (inserts at cursor or appends)
                      if ((window as any).__mt_insertOrAppend) {
                        try {
                          (window as any).__mt_insertOrAppend(md);
                        } catch (_) {
                          onInsert(md);
                        }
                      } else {
                        onInsert(md);
                      }
                      onClose();
                      (window as any).__mt_toast?.("Inserted image", "success");
                    }}
                  >
                    Insert
                  </button>
                  <button
                    className="theme-toggle"
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem("marktype:gh_token");
                        if (!token)
                          return (window as any).__mt_toast?.(
                            "No GitHub token",
                            "error"
                          );
                        const ok = (window as any).__mt_confirm
                          ? await (window as any).__mt_confirm(
                              `Delete ${f.path}? This cannot be undone.`,
                              "Delete asset"
                            )
                          : confirm(`Delete ${f.path}? This cannot be undone.`);
                        if (!ok) return;
                        const owner = activeDoc.git.owner;
                        const repo = activeDoc.git.repo;
                        const branch = activeDoc.git.branch || "main";
                        // fetch file to get sha
                        const get = await fetch(
                          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
                            f.path
                          )}?ref=${encodeURIComponent(branch)}`,
                          { headers: { Authorization: `token ${token}` } }
                        );
                        if (!get.ok) throw new Error(await get.text());
                        const body = await get.json();
                        const sha = body.sha;
                        const res = await fetch(
                          `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(
                            f.path
                          )}`,
                          {
                            method: "DELETE",
                            headers: {
                              Authorization: `token ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              message: `Remove ${f.name}`,
                              sha,
                              branch,
                            }),
                          }
                        );
                        if (!res.ok) throw new Error(await res.text());
                        (window as any).__mt_toast?.(
                          "Deleted asset",
                          "success"
                        );
                        // refresh list
                        setFiles((cur) =>
                          cur ? cur.filter((x) => x.path !== f.path) : []
                        );
                      } catch (err: any) {
                        (window as any).__mt_toast?.(
                          "Delete failed: " +
                            (err && err.message ? err.message : String(err)),
                          "error"
                        );
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 12,
          }}
        >
          <button className="theme-toggle" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
