/**
 * Per-browser session history, backed by localStorage.
 *
 * Deliberately not server-side: this app has no login, so a shared backend
 * table would expose every visitor's history to every other visitor.
 */

const PREFIX = "chat_x.history.";
const MAX_SESSIONS = 50;

export function storageKey(name) {
  return PREFIX + name;
}

export function newId() {
  // randomUUID needs a secure context; fall back for plain-http dev hosts.
  return globalThis.crypto?.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSessions(name) {
  try {
    const raw = localStorage.getItem(storageKey(name));
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Tolerate hand-edited or older payloads rather than blowing up on load.
    return parsed.filter((s) => s && typeof s.id === "string");
  } catch (err) {
    console.error("Could not read history:", err);
    return [];
  }
}

/**
 * Persist sessions newest-first, capped at MAX_SESSIONS.
 * Returns what was actually stored, which may be shorter than requested if the
 * quota was hit.
 */
export function saveSessions(name, sessions) {
  const ordered = [...sessions]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, MAX_SESSIONS);

  let candidate = ordered;

  // localStorage is a few MB. If a long transcript blows the quota, shed the
  // oldest sessions until it fits rather than losing the write entirely.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      localStorage.setItem(storageKey(name), JSON.stringify(candidate));
      return candidate;
    } catch {
      if (candidate.length <= 1) break;
      candidate = candidate.slice(0, Math.floor(candidate.length / 2));
    }
  }

  console.error("Could not persist history: storage quota exceeded.");
  return candidate;
}

export function clearSessions(name) {
  try {
    localStorage.removeItem(storageKey(name));
  } catch (err) {
    console.error("Could not clear history:", err);
  }
  return [];
}

/** Build a short, human title from the first thing the user typed. */
export function titleFrom(text, fallback = "Untitled") {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) return fallback;
  return clean.length > 48 ? `${clean.slice(0, 48).trimEnd()}...` : clean;
}

/**
 * Blob URLs die when the page reloads, so persisting them would restore broken
 * images. Keep the filename only; ChatMessage falls back to a paperclip chip.
 */
export function stripTransientUrls(messages = []) {
  return messages.map((m) =>
    m.file ? { ...m, file: { name: m.file.name } } : m
  );
}

export function relativeTime(ts) {
  if (!ts) return "";

  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(ts).toLocaleDateString();
}
