import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { FaRegCopy, FaCheck, FaPaperclip } from "react-icons/fa";
import ChatCode from "./ChatCode";

function ChatMessage({ sender, text, file = null }) {
  const isUser = sender === "user";

  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div
      className={`flex w-full mb-8 ${
        isUser ? "justify-end" : "justify-start"
      }`}
    >
      <div
        className={`flex gap-3 items-start max-w-[80%] ${
          isUser ? "flex-row-reverse" : ""
        }`}
      >
        {/* Avatar */}

        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shadow-lg flex-shrink-0 ${
            isUser ? "bg-blue-600" : "bg-emerald-500"
          }`}
        >
          {isUser ? "👤" : "🤖"}
        </div>

        {/* Message */}

        <div className="relative">

          {/* Sender */}

          <div
            className={`text-sm font-semibold mb-2 ${
              isUser
                ? "text-blue-400 text-right"
                : "text-emerald-400"
            }`}
          >
            {isUser ? "You" : "AI Assistant"}
          </div>

          {/* Bubble */}

          <div
            className={`rounded-2xl px-6 py-5 shadow-lg transition-all duration-300 hover:shadow-xl leading-8 ${
              isUser
                ? "bg-blue-600 text-white"
                : "bg-slate-700 text-gray-100"
            }`}
          >
            {/* Attachment sent with this message */}

            {file && (
              <div className="mb-4">
                {file.url ? (
                  <img
                    src={file.url}
                    alt={file.name}
                    className="max-h-64 rounded-xl border border-white/20"
                  />
                ) : (
                  <div className="flex items-center gap-2 bg-black/25 rounded-lg px-3 py-2 text-sm">
                    <FaPaperclip className="flex-shrink-0" />
                    <span className="truncate">{file.name}</span>
                  </div>
                )}
              </div>
            )}

            <div
              className="
                prose
                prose-invert
                max-w-none
                prose-headings:text-white
                prose-p:text-gray-200
                prose-strong:text-white
                prose-li:text-gray-200
                prose-code:text-cyan-300
                prose-pre:bg-transparent
                prose-pre:p-0
                prose-pre:m-0
                prose-a:text-blue-400
                prose-a:no-underline
                hover:prose-a:underline
              "
            >
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children }) {
                    const match = /language-(\w+)/.exec(className || "");

                    if (!inline) {
                      return (
                        <ChatCode
                          language={match ? match[1] : "text"}
                          code={String(children).replace(/\n$/, "")}
                        />
                      );
                    }

                    return (
                      <code className="bg-slate-900 px-1.5 py-0.5 rounded text-cyan-300">
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {text}
              </ReactMarkdown>
            </div>
          </div>

          {/* Copy Button */}

          {!isUser && (
            <button
              onClick={copyToClipboard}
              className="
                absolute
                -bottom-11
                right-0
                flex
                items-center
                gap-2
                text-sm
                bg-slate-800
                hover:bg-slate-700
                px-4
                py-2
                rounded-lg
                transition
              "
            >
              {copied ? (
                <>
                  <FaCheck className="text-green-400" />
                  Copied
                </>
              ) : (
                <>
                  <FaRegCopy />
                  Copy
                </>
              )}
            </button>
          )}

        </div>
      </div>
    </div>
  );
}

export default ChatMessage;