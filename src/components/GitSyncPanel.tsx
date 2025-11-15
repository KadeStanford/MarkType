import React, { useState, useEffect } from "react";
import { FaEye, FaEyeSlash } from "react-icons/fa";

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
  // Helpers to obfuscate token in localStorage while remaining reversible
  const encodeStoredToken = (t: string) => {
    try {
      const salt = Math.random().toString(36).slice(2, 10);
      return btoa(`${salt}:${t}`);
    } catch (_) {
      return t;
    }
  };

  const decodeStoredToken = (s: string | null) => {
    if (!s) return "";
    try {
      const decoded = atob(s);
      const idx = decoded.indexOf(":");
      if (idx > 0) return decoded.slice(idx + 1);
      return s;
    } catch (_) {
      // not base64, assume raw token
      return s;
    }
  };

  const setStoredToken = (t: string) => {
    try {
      const enc = encodeStoredToken(t);
      localStorage.setItem("marktype:gh_token", enc);
    } catch (_) {
      try {
        localStorage.setItem("marktype:gh_token", t);
      } catch (_) {}
    }
  };

  const getStoredToken = () => {
    try {
      const raw = localStorage.getItem("marktype:gh_token");
      return decodeStoredToken(raw);
    } catch (_) {
      return "";
    }
  };

  const [token, setToken] = useState<string>(getStoredToken());
  const [showToken, setShowToken] = useState<boolean>(false);
  const [repos, setRepos] = useState<Repo[] | null>(null);
  const [repoQuery, setRepoQuery] = useState<string>("");
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
      // store obfuscated token for slightly improved privacy in storage
      setStoredToken(token);
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
      <div
        className="import-panel"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 920, maxWidth: "min(96vw,1200px)", padding: 16 }}
      >
        <div className="git-sync">
          <h3>GitHub Sync</h3>
          <p style={{ marginTop: 6 }}>
            Enter a GitHub Personal Access Token (with repo scope) to browse
            your repos and open markdown files.
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
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
              alignItems: "center",
            }}
          >
            <div
              style={{ display: "flex", flex: 1, gap: 6, alignItems: "center" }}
            >
              <input
                type={showToken ? "text" : "password"}
                style={{ flex: 1, padding: "8px 10px" }}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="ghp_... or token"
                aria-label="GitHub personal access token"
              />
              <button
                title={showToken ? "Hide token" : "Show token"}
                onClick={() => setShowToken((s) => !s)}
                className="theme-toggle small"
                style={{ padding: 8 }}
                aria-label={showToken ? "Hide token" : "Show token"}
              >
                {showToken ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={connect} className="theme-toggle">
                Connect
              </button>
            </div>
          </div>

          {loading && <div style={{ marginTop: 8 }}>Loading…</div>}

          {repos && (
            <div className="git-sync-body">
              <div className="git-sync-repos">
                <h4>Your repos</h4>
                {/* Repo selection is now handled via the searchable list below. */}
                <div style={{ marginTop: 8 }}>
                  <input
                    className="repo-search"
                    placeholder="Search repos…"
                    value={repoQuery}
                    onChange={(e) => setRepoQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--toggle-border)",
                    }}
                  />
                  <div style={{ marginTop: 8 }}>
                    {(repos || [])
                      .filter((r) =>
                        repoQuery.trim()
                          ? r.full_name
                              .toLowerCase()
                              .includes(repoQuery.trim().toLowerCase())
                          : true
                      )
                      .map((r) => (
                        <div
                          key={r.full_name}
                          className="repo-item"
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "8px 6px",
                            alignItems: "center",
                            borderRadius: 6,
                          }}
                        >
                          <div style={{ fontSize: 13 }}>{r.full_name}</div>
                          <div>
                            <button
                              className="theme-toggle"
                              onClick={() => {
                                setSelectedRepo(r);
                                loadRepoFiles(r);
                              }}
                            >
                              Browse
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
              <div className="git-sync-files">
                <h4>Markdown files in {selectedRepo?.full_name}</h4>
                <div>
                  {files && files.length === 0 && (
                    <div style={{ color: "#666" }}>No .md files found</div>
                  )}
                  {files &&
                    files.map((p) => (
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
            </div>
          )}

          {/* files are shown in the right-hand column above; no duplicate listing here */}

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
    </div>
  );
}
