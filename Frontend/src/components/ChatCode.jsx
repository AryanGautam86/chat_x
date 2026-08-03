import { useState } from "react";
// PrismLight, not Prism: the full Prism build bundles every language it knows
// and more than doubled the production bundle. Register only what we render.
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FaRegCopy, FaCheck } from "react-icons/fa";

import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import c from "react-syntax-highlighter/dist/esm/languages/prism/c";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import csharp from "react-syntax-highlighter/dist/esm/languages/prism/csharp";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";

const LANGUAGES = {
  bash, c, cpp, csharp, css, go, java, javascript, json, jsx,
  markdown, python, rust, sql, typescript, yaml,
};

Object.entries(LANGUAGES).forEach(([name, def]) =>
  SyntaxHighlighter.registerLanguage(name, def)
);

// Common aliases the model emits in fences.
const ALIASES = {
  py: "python",
  js: "javascript",
  ts: "typescript",
  sh: "bash",
  shell: "bash",
  "c++": "cpp",
  cs: "csharp",
  yml: "yaml",
  md: "markdown",
};

/**
 * Read-only code block for chat answers.
 *
 * Chat deliberately does NOT use the Monaco editor: a 500px editor per snippet
 * dominates the transcript, and its Edit/Reset controls are dead here because
 * chat has no code to write back to. Editing belongs on the Code Generator
 * page, which still uses CodeBlock/Monaco.
 */
function ChatCode({ language = "text", code = "" }) {
  const [copied, setCopied] = useState(false);

  const lines = code.split("\n").length;

  // Unregistered languages render as plain text rather than throwing.
  const requested = (language || "text").toLowerCase();
  const resolved = ALIASES[requested] || requested;
  const highlighted = resolved in LANGUAGES ? resolved : "text";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-600 not-prose min-w-[min(100%,20rem)]">
      <div className="bg-slate-900 px-4 py-2 flex justify-between items-center gap-6">
        <span className="uppercase text-xs font-semibold tracking-wide text-gray-400 truncate">
          {highlighted}
          {lines > 1 && (
            <span className="ml-2 normal-case font-normal text-gray-500">
              {lines} lines
            </span>
          )}
        </span>

        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition flex-shrink-0"
        >
          {copied ? (
            <>
              <FaCheck /> Copied
            </>
          ) : (
            <>
              <FaRegCopy /> Copy
            </>
          )}
        </button>
      </div>

      {/* Tall snippets scroll instead of stretching the transcript. */}
      <div className="max-h-[420px] overflow-auto">
        <SyntaxHighlighter
          language={highlighted}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: "1rem 1.25rem",
            background: "#0f172a",
            fontSize: "0.875rem",
            lineHeight: 1.6,
          }}
          codeTagProps={{
            style: { fontFamily: "Fira Code, Consolas, monospace" },
          }}
          wrapLongLines
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default ChatCode;
