export function encodeStoredToken(t: string) {
  try {
    const salt = Math.random().toString(36).slice(2, 10);
    return btoa(`${salt}:${t}`);
  } catch (_) {
    return t;
  }
}

export function decodeStoredToken(s: string | null) {
  if (!s) return "";
  try {
    const decoded = atob(s);
    const idx = decoded.indexOf(":");
    if (idx > 0) return decoded.slice(idx + 1);
    return s;
  } catch (_) {
    return s;
  }
}

export function setStoredToken(t: string) {
  try {
    const enc = encodeStoredToken(t);
    localStorage.setItem("marktype:gh_token", enc);
  } catch (_) {
    try {
      localStorage.setItem("marktype:gh_token", t);
    } catch (_) {}
  }
}

export function getStoredToken() {
  try {
    const raw = localStorage.getItem("marktype:gh_token");
    return decodeStoredToken(raw);
  } catch (_) {
    return "";
  }
}
