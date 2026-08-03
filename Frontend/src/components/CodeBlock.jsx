import { useState } from "react";
import {
  FaRegCopy,
  FaCheck,
  FaLock,
  FaLockOpen,
  FaUndoAlt,
} from "react-icons/fa";

import Editor from "@monaco-editor/react";

function CodeBlock({
  language,
  code,
  setCode,
  onReset,
}) {
  const [copied, setCopied] = useState(false);
  const [editable, setEditable] = useState(false);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-slate-700 shadow-lg">

      {/* Header */}

      <div className="bg-slate-900 px-5 py-3 flex justify-between items-center">

        <span className="uppercase text-sm font-semibold text-gray-300">
          {language}
        </span>

        <div className="flex items-center gap-6">

          {/* Edit / Lock */}

          <button
            onClick={() => setEditable(!editable)}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition"
          >
            {editable ? (
              <>
                <FaLock />
                Lock
              </>
            ) : (
              <>
                <FaLockOpen />
                Edit
              </>
            )}
          </button>

          {/* Reset */}

          <button
            disabled={!editable}
            onClick={onReset}
            className={`flex items-center gap-2 transition ${
              editable
                ? "text-red-400 hover:text-red-300"
                : "text-gray-500 cursor-not-allowed"
            }`}
          >
            <FaUndoAlt />
            Reset
          </button>

          {/* Copy */}

          <button
            onClick={copyCode}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition"
          >
            {copied ? (
              <>
                <FaCheck />
                Copied
              </>
            ) : (
              <>
                <FaRegCopy />
                Copy
              </>
            )}
          </button>

        </div>

      </div>

      {/* Monaco Editor */}

      <Editor
        height="500px"
        language={language}
        value={code}
        onChange={(value) => {
          if (setCode) {
            setCode(value || "");
          }
        }}
        theme="vs-dark"
        options={{
          readOnly: !editable,

          minimap: {
            enabled: false,
          },

          fontSize: 15,

          fontFamily: "Fira Code, Consolas, monospace",

          automaticLayout: true,

          wordWrap: "on",

          scrollBeyondLastLine: false,

          smoothScrolling: true,

          cursorBlinking: "smooth",

          renderWhitespace: "selection",

          padding: {
            top: 18,
            bottom: 18,
          },
        }}
      />

    </div>
  );
}

export default CodeBlock;