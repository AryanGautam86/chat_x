import { useCallback, useState } from "react";

import {
  clearSessions,
  loadSessions,
  newId,
  saveSessions,
} from "../lib/history";

/**
 * Session history for one feature area ("chat", "code").
 *
 * Every mutation writes through to localStorage inside the calling event
 * handler — no effects — so there is no render-cascade and no window where
 * state and storage disagree.
 */
export function useHistory(name) {
  const [sessions, setSessions] = useState(() => loadSessions(name));
  const [activeId, setActiveId] = useState(null);

  // `name` carries the account id, so it changes when someone signs in as
  // somebody else. Re-read during render (the supported way to adjust state on
  // a changed input) instead of in an effect, which would briefly show the
  // previous account's sessions.
  const [loadedFor, setLoadedFor] = useState(name);
  if (loadedFor !== name) {
    setLoadedFor(name);
    setSessions(loadSessions(name));
    setActiveId(null);
  }

  const commit = useCallback(
    (next) => {
      const stored = saveSessions(name, next);
      setSessions(stored);
      return stored;
    },
    [name]
  );

  /** Create or update the active session. Returns its id. */
  const save = useCallback(
    ({ id, title, payload }) => {
      const sessionId = id || newId();
      const now = Date.now();

      const existing = sessions.find((s) => s.id === sessionId);

      const merged = {
        ...existing,
        id: sessionId,
        // Keep a title the user renamed by hand.
        title: existing?.renamed ? existing.title : title ?? existing?.title,
        renamed: existing?.renamed ?? false,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        ...payload,
      };

      commit([merged, ...sessions.filter((s) => s.id !== sessionId)]);
      setActiveId(sessionId);
      return sessionId;
    },
    [commit, sessions]
  );

  const remove = useCallback(
    (id) => {
      commit(sessions.filter((s) => s.id !== id));
      setActiveId((current) => (current === id ? null : current));
    },
    [commit, sessions]
  );

  const rename = useCallback(
    (id, title) => {
      const clean = (title || "").trim();
      if (!clean) return;

      commit(
        sessions.map((s) =>
          s.id === id ? { ...s, title: clean, renamed: true } : s
        )
      );
    },
    [commit, sessions]
  );

  const clearAll = useCallback(() => {
    setSessions(clearSessions(name));
    setActiveId(null);
  }, [name]);

  const get = useCallback(
    (id) => sessions.find((s) => s.id === id) || null,
    [sessions]
  );

  return {
    sessions,
    activeId,
    setActiveId,
    save,
    remove,
    rename,
    clearAll,
    get,
  };
}

export default useHistory;
