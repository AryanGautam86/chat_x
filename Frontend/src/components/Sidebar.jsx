import { useEffect, useRef, useState } from "react";
import {
  FaPlus,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaPen,
  FaCheck,
} from "react-icons/fa";

import { relativeTime } from "../lib/history";

/**
 * Session-history panel, shared by Chat and Code Generator.
 *
 * Presentational only: the parent owns the sessions and passes handlers, so the
 * same component serves both feature areas.
 */
function Sidebar({
  heading = "History",
  newLabel = "New",
  sessions = [],
  activeId = null,
  onNew,
  onSelect,
  onDelete,
  onRename,
  onClearAll,
  emptyHint = "Nothing here yet.",
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  const editRef = useRef(null);

  useEffect(() => {
    if (editingId) editRef.current?.focus();
  }, [editingId]);

  const startRename = (session) => {
    setEditingId(session.id);
    setDraft(session.title || "");
  };

  const commitRename = () => {
    if (editingId) onRename?.(editingId, draft);
    setEditingId(null);
    setDraft("");
  };

  if (collapsed) {
    return (
      <aside className="hidden md:flex flex-col items-center gap-4 w-16 border-r border-slate-800 bg-slate-900/60 py-6 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expand history"
          title="Expand history"
          className="p-3 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition"
        >
          <FaChevronRight />
        </button>

        <button
          onClick={onNew}
          aria-label={newLabel}
          title={newLabel}
          className="p-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition"
        >
          <FaPlus />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-72 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-900/60 flex flex-col max-h-[70vh] md:max-h-none">

      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        <h2 className="font-semibold text-sm uppercase tracking-wide text-gray-400">
          {heading}
        </h2>

        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse history"
          title="Collapse"
          className="hidden md:block p-2 rounded-lg text-gray-500 hover:text-white hover:bg-slate-800 transition"
        >
          <FaChevronLeft />
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-3 rounded-xl font-semibold transition shadow-lg"
        >
          <FaPlus className="text-sm" />
          {newLabel}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {sessions.length === 0 && (
          <p className="text-sm text-gray-500 px-2 py-6 text-center leading-relaxed">
            {emptyHint}
          </p>
        )}

        {sessions.map((session) => {
          const isActive = session.id === activeId;

          return (
            <div
              key={session.id}
              className={`group rounded-lg transition ${
                isActive
                  ? "bg-blue-600/20 border border-blue-600/50"
                  : "hover:bg-slate-800 border border-transparent"
              }`}
            >
              {editingId === session.id ? (
                <div className="flex items-center gap-1 p-2">
                  <input
                    ref={editRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onBlur={commitRename}
                    className="flex-1 min-w-0 bg-slate-950 border border-slate-600 rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={commitRename}
                    aria-label="Save name"
                    className="p-1.5 text-green-400 hover:text-green-300"
                  >
                    <FaCheck className="text-xs" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center">
                  <button
                    onClick={() => onSelect?.(session.id)}
                    className="flex-1 min-w-0 text-left px-3 py-2.5"
                  >
                    <span
                      className={`block truncate text-sm ${
                        isActive ? "text-white font-medium" : "text-gray-300"
                      }`}
                    >
                      {session.title || "Untitled"}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {relativeTime(session.updatedAt)}
                    </span>
                  </button>

                  {/* Always visible on touch, hover-revealed on desktop. */}
                  <div className="flex items-center pr-2 gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startRename(session)}
                      aria-label={`Rename ${session.title || "session"}`}
                      title="Rename"
                      className="p-2 text-gray-500 hover:text-blue-400 transition"
                    >
                      <FaPen className="text-xs" />
                    </button>

                    <button
                      onClick={() => onDelete?.(session.id)}
                      aria-label={`Delete ${session.title || "session"}`}
                      title="Delete"
                      className="p-2 text-gray-500 hover:text-red-400 transition"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sessions.length > 0 && (
        <div className="border-t border-slate-800 p-3">
          <button
            onClick={onClearAll}
            className="w-full text-sm text-gray-500 hover:text-red-400 py-2 transition"
          >
            Clear all history
          </button>
          <p className="text-[11px] text-gray-600 text-center mt-1">
            Stored in this browser only
          </p>
        </div>
      )}
    </aside>
  );
}

export default Sidebar;
