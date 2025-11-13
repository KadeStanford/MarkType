import React, { useState, useEffect } from "react";

type Repo = {
  full_name: string;
  name: string;
  owner: { login: string };
  default_branch: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenRemoteFile: (doc: {
    id: string;
    name: string;
    content: string;
    git?: any;
  }) => void;
};

function b64DecodeUnicode(str: string) {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), function (c: string) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
  } catch (e) {
    try {
      return atob(str);
    } catch (_) {
      return str;
    }
  }
}

export default function GitSyncPanel({
  open,
  onClose,
  onOpenRemoteFile,
}: Props) {
  const [token, setToken] = useState<string>(
    localStorage.getItem("marktype:gh_token") || ""
  );
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [files, setFiles] = useState<string[] | null>(null);

  const connect = async () => {
    if (!token)
      return (window as any).__mt_toast?.(
        "Enter a GitHub token (personal access token with repo scope)",
        "info"
      );
    setLoading(true);
    try {
      localStorage.setItem("marktype:gh_token", token);
      const res = await fetch(
        "https://api.github.com/user/repos?per_page=100",
        {
          headers: { Authorization: `token ${token}` },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRepos(data as Repo[]);
    } catch (err: any) {
      (window as any).__mt_toast?.(
        "Failed to list repos: " +
          (err && err.message ? err.message : String(err)),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // if a token already exists in localStorage, try to auto-connect once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (token && !repos) {
          setLoading(true);
          const res = await fetch(
            "https://api.github.com/user/repos?per_page=100",
            {
              headers: { Authorization: `token ${token}` },
            }
          );
          if (!mounted) return;
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          setRepos(data as Repo[]);
        }
      } catch (err: any) {
        // silently ignore auto-connect failures (user may paste a bad token)
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadRepoFiles = async (r: Repo) => {
    setSelectedRepo(r);
    setFiles(null);
    setLoading(true);
    try {
      // try fetching tree recursively
      const treeRes = await fetch(
        `https://api.github.com/repos/${r.full_name}/git/trees/${r.default_branch}?recursive=1`,
        {
          headers: { Authorization: `token ${token}` },
        }
      );
      if (!treeRes.ok) throw new Error(await treeRes.text());
      const tree = await treeRes.json();
      const mdFiles = (tree.tree || [])
        .filter(
          (t: any) =>
            t.path && t.type === "blob" && t.path.toLowerCase().endsWith(".md")
        )
        .map((t: any) => t.path);
      setFiles(mdFiles);
    } catch (err: any) {
      (window as any).__mt_toast?.(
        "Failed to list repo files: " +
          (err && err.message ? err.message : String(err)),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const openFile = async (path: string) => {
    if (!selectedRepo) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.github.com/repos/${
          selectedRepo.full_name
        }/contents/${encodeURIComponent(path)}?ref=${
          selectedRepo.default_branch
        }`,
        {
          headers: { Authorization: `token ${token}` },
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      const content = body.content
        ? b64DecodeUnicode(body.content.replace(/\n/g, ""))
        : "";
      const doc = {
        id: `gh-${selectedRepo.full_name}-${path}`,
        name: path.split("/").slice(-1)[0],
        content,
        git: {
          owner: selectedRepo.owner.login,
          repo: selectedRepo.name,
          path,
          sha: body.sha,
          branch: selectedRepo.default_branch,
        },
      };
      onOpenRemoteFile(doc);
      onClose();
    } catch (err: any) {
      (window as any).__mt_toast?.(
        "Failed to fetch file: " +
          (err && err.message ? err.message : String(err)),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="import-panel-overlay"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="import-panel" onClick={(e) => e.stopPropagation()}>
        <h3>GitHub Sync</h3>
        <p style={{ marginTop: 6 }}>
          Enter a GitHub Personal Access Token (with repo scope) to browse your
          repos and open markdown files.
        </p>
        <p style={{ marginTop: 6, fontSize: 12 }}>
          Need a token? Follow the{" "}
          <a
            href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub guide to create a Personal Access Token
          </a>{" "}
          (select <code>repo</code> scope for private repositories).
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input
            style={{ flex: 1 }}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_... or token"
          />
          <button onClick={connect} className="theme-toggle">
            Connect
          </button>
        </div>

        {loading && <div style={{ marginTop: 8 }}>Loading…</div>}

        {repos && (
          <div style={{ marginTop: 12 }}>
            <h4>Your repos</h4>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select
                style={{ flex: 1 }}
                value={selectedRepo?.full_name || ""}
                onChange={(e) => {
                  const fn = e.target.value;
                  const r =
                    (repos || []).find((x) => x.full_name === fn) || null;
                  if (r) loadRepoFiles(r);
                }}
              >
                <option value="">Select a repo…</option>
                {repos.map((r) => (
                  <option key={r.full_name} value={r.full_name}>
                    {r.full_name}
                  </option>
                ))}
              </select>
              <button
                className="theme-toggle"
                onClick={() => {
                  if (selectedRepo) loadRepoFiles(selectedRepo);
                  else if (repos && repos.length > 0) loadRepoFiles(repos[0]);
                }}
              >
                Browse
              </button>
            </div>
            <div style={{ marginTop: 8, maxHeight: 220, overflow: "auto" }}>
              {/* quick list with direct Browse buttons as fallback */}
              {(repos || []).slice(0, 12).map((r) => (
                <div
                  key={r.full_name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 6,
                  }}
                >
                  <div style={{ fontSize: 13 }}>{r.full_name}</div>
                  <div>
                    <button
                      className="theme-toggle"
                      onClick={() => loadRepoFiles(r)}
                    >
                      Browse
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files && (
          <div style={{ marginTop: 12 }}>
            <h4>Markdown files in {selectedRepo?.full_name}</h4>
            <div style={{ maxHeight: 260, overflow: "auto" }}>
              {files.length === 0 && (
                <div style={{ color: "#666" }}>No .md files found</div>
              )}
              {files.map((p) => (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: 6,
                  }}
                >
                  <div style={{ fontSize: 13 }}>{p}</div>
                  <div>
                    <button
                      className="theme-toggle"
                      onClick={() => openFile(p)}
                    >
                      Open
                    </button>
                  </div>
                </div>
              ))}
            </div>
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
