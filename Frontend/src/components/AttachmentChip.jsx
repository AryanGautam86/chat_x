import { useEffect, useState } from "react";
import { FaTimes, FaFilePdf, FaFileAlt, FaImage } from "react-icons/fa";

function iconFor(name = "") {
  const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
  if (ext === ".pdf") return <FaFilePdf className="text-red-400" />;
  if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext))
    return <FaImage className="text-blue-400" />;
  return <FaFileAlt className="text-gray-400" />;
}

/** Pending attachment, with a thumbnail for images and a remove button. */
function AttachmentChip({ file, onRemove }) {
  const [preview, setPreview] = useState(null);

  // A FileReader data URL rather than URL.createObjectURL: an object URL has to
  // be revoked, and StrictMode's double-invoked effect revokes it before the
  // <img> ever loads, leaving a broken thumbnail. A data URL has no such
  // teardown, so it survives the remount.
  useEffect(() => {
    if (!file?.type?.startsWith("image/")) {
      return;
    }

    let cancelled = false;
    const reader = new FileReader();

    reader.onload = () => {
      if (!cancelled) setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    return () => {
      cancelled = true;
      reader.abort();
    };
  }, [file]);

  if (!file) return null;

  return (
    <div className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 max-w-sm">
      {preview ? (
        <img
          src={preview}
          alt={file.name}
          className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
        />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-xl flex-shrink-0">
          {iconFor(file.name)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.name}</p>
        <p className="text-xs text-gray-400">
          {(file.size / 1024).toFixed(0)} KB
        </p>
      </div>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${file.name}`}
        className="text-gray-400 hover:text-red-400 transition p-1 flex-shrink-0"
      >
        <FaTimes />
      </button>
    </div>
  );
}

export default AttachmentChip;
