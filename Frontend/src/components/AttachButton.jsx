import { useEffect, useRef, useState } from "react";
import { FaPlus, FaFolderOpen, FaCamera } from "react-icons/fa";

import CameraModal from "./CameraModal";

// Kept in sync with SUPPORTED_EXTENSIONS in Backend/app/services/files.py.
export const ACCEPTED = ".png,.jpg,.jpeg,.webp,.pdf,.txt,.md,.markdown";
export const MAX_MB = 10;

/**
 * "+" button that opens a small menu: pick a file from the computer, or take a
 * photo with the camera. Calls onSelect(File) with whatever the user chose.
 */
function AttachButton({ onSelect, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [camera, setCamera] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef(null);
  const wrapRef = useRef(null);

  // Close the menu on an outside click or Escape.
  useEffect(() => {
    if (!open) return;

    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);

    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const accept = (file) => {
    if (!file) return;

    // Check size here so a 50 MB file isn't uploaded just to be rejected.
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`${file.name} is ${(file.size / 1048576).toFixed(1)} MB; the limit is ${MAX_MB} MB.`);
      return;
    }

    setError("");
    onSelect(file);
  };

  return (
    <div className="relative" ref={wrapRef}>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          accept(e.target.files?.[0]);
          e.target.value = ""; // allow re-picking the same file
        }}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-label="Attach a file"
        aria-expanded={open}
        title="Attach a file or photo"
        className="
          flex items-center justify-center
          w-[52px] h-[52px]
          bg-slate-800 hover:bg-slate-700
          border border-slate-700 hover:border-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          rounded-xl transition-all duration-200
          text-gray-300 hover:text-white
        "
      >
        <FaPlus className={`transition-transform duration-200 ${open ? "rotate-45" : ""}`} />
      </button>

      {open && (
        <div
          className="
            absolute bottom-full left-0 mb-3 z-40
            w-60 overflow-hidden
            bg-slate-800 border border-slate-700
            rounded-xl shadow-2xl
          "
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              fileRef.current?.click();
            }}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-700 transition text-left"
          >
            <FaFolderOpen className="text-blue-400 flex-shrink-0" />
            <span>
              Upload a file
              <span className="block text-xs text-gray-400">Image, PDF or text</span>
            </span>
          </button>

          <div className="h-px bg-slate-700" />

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setCamera(true);
            }}
            className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-700 transition text-left"
          >
            <FaCamera className="text-purple-400 flex-shrink-0" />
            <span>
              Take a photo
              <span className="block text-xs text-gray-400">Use your camera</span>
            </span>
          </button>
        </div>
      )}

      {error && (
        <p className="absolute bottom-full left-0 mb-3 w-72 bg-red-900/95 border border-red-700 text-red-100 text-sm rounded-lg px-4 py-3 z-40">
          {error}
        </p>
      )}

      {camera && (
        <CameraModal onCapture={accept} onClose={() => setCamera(false)} />
      )}
    </div>
  );
}

export default AttachButton;
