import { useState, useRef, useEffect } from "react";
import { FaPaperPlane } from "react-icons/fa";

import MainLayout from "../layouts/MainLayout";
import API from "../api/api";
import ChatMessage from "../components/ChatMessage";
import Loader from "../components/Loader";
import AttachButton from "../components/AttachButton";
import AttachmentChip from "../components/AttachmentChip";
import Sidebar from "../components/Sidebar";
import useHistory from "../hooks/useHistory";
import { stripTransientUrls, titleFrom } from "../lib/history";
import { useAuth } from "../hooks/useAuth";

const suggestions = [
  "Summarize my documents",
  "What is AI?",
  "Explain Machine Learning",
  "Generate interview questions",
];

function Chat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [sessionId, setSessionId] = useState(null);

  const { user } = useAuth();
  // Namespaced per account so two people sharing a browser don't see each
  // other's transcripts.
  const history = useHistory(`chat.${user?.id ?? "anon"}`);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, loading]);

  const sendQuestion = async (text = question) => {
    const file = attachment;

    // With a file attached, the question may be empty — "what is this?" is implied.
    if (!text.trim() && !file) return;

    const prompt = text.trim() || "What is in this file?";

    // Build the transcript explicitly rather than with setState callbacks, so
    // the same array can be handed to both the UI and localStorage.
    const withUser = [
      ...messages,
      {
        sender: "user",
        text: prompt,
        file: file
          ? {
              name: file.name,
              url: file.type.startsWith("image/")
                ? URL.createObjectURL(file)
                : null,
            }
          : null,
      },
    ];

    setMessages(withUser);

    // Clear the composer immediately so the attachment can't be sent twice.
    setQuestion("");
    setAttachment(null);
    setLoading(true);

    let answer;

    try {
      if (file) {
        // Attached files are answered and discarded — nothing is indexed.
        const formData = new FormData();
        formData.append("q", prompt);
        formData.append("file", file);

        const response = await API.post("/query_with_file", formData);
        answer = response.data.answer;
      } else {
        const response = await API.get("/query", { params: { q: prompt } });
        answer = response.data.answer;
      }
    } catch (err) {
      console.error(err);
      answer = err.response?.data?.detail || "Something went wrong.";
    }

    const withAnswer = [...withUser, { sender: "ai", text: answer }];
    setMessages(withAnswer);

    const id = history.save({
      id: sessionId,
      title: titleFrom(withAnswer[0]?.text, "New chat"),
      payload: { messages: stripTransientUrls(withAnswer) },
    });
    setSessionId(id);

    setLoading(false);
    inputRef.current?.focus();
  };

  /** Start a fresh conversation without touching saved history. */
  const newChat = () => {
    messages.forEach((m) => m.file?.url && URL.revokeObjectURL(m.file.url));

    setMessages([]);
    setAttachment(null);
    setSessionId(null);
    history.setActiveId(null);
    inputRef.current?.focus();
  };

  const openSession = (id) => {
    const session = history.get(id);
    if (!session) return;

    messages.forEach((m) => m.file?.url && URL.revokeObjectURL(m.file.url));

    setMessages(session.messages || []);
    setAttachment(null);
    setSessionId(id);
    history.setActiveId(id);
  };

  const deleteSession = (id) => {
    history.remove(id);
    if (id === sessionId) newChat();
  };

  const clearAllHistory = () => {
    history.clearAll();
    newChat();
  };

  return (
    <MainLayout
      sidebar={
        <Sidebar
          heading="Chat history"
          newLabel="New chat"
          sessions={history.sessions}
          activeId={sessionId}
          onNew={newChat}
          onSelect={openSession}
          onDelete={deleteSession}
          onRename={history.rename}
          onClearAll={clearAllHistory}
          emptyHint="Your conversations will appear here once you send a message."
        />
      }
    >
      <div className="max-w-6xl mx-auto">

        {/* Header */}

        <div className="mb-8 flex justify-between items-start">

          <div className="flex items-center gap-4">

            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-3xl shadow-lg">
              🤖
            </div>

            <div>

              <h1 className="text-4xl font-bold text-white">
                AI Assistant
              </h1>

              <p className="text-gray-400 mt-1">
                Chat with your uploaded documents or ask the AI anything.
              </p>

            </div>

          </div>

          {messages.length > 0 && (
            <button
              onClick={newChat}
              className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition shadow-md flex-shrink-0"
            >
              New chat
            </button>
          )}

        </div>

        {/* Suggestion Chips */}

        {messages.length === 0 && (

          <div className="flex flex-wrap gap-3 mb-6">

            {suggestions.map((item) => (

              <button
                key={item}
                onClick={() => {
                  setQuestion(item);
                  inputRef.current?.focus();
                }}
                className="bg-slate-700 hover:bg-blue-600 transition-all duration-300 hover:scale-105 px-4 py-2 rounded-full text-sm shadow-md"
              >
                {item}
              </button>

            ))}

          </div>

        )}

        {/* Chat Box */}

        <div
          className="
            bg-gradient-to-b
            from-slate-800
            to-slate-900
            rounded-2xl
            h-[600px]
            overflow-y-auto
            p-8
            shadow-xl
            border
            border-slate-700
            space-y-6
          "
        >

          {messages.length === 0 && !loading && (

            <div className="flex flex-col items-center justify-center h-full text-center">

              <div className="text-7xl mb-5">
                💬
              </div>

              <h2 className="text-3xl font-bold text-white mb-3">
                How can I help today?
              </h2>

              <p className="text-gray-400 max-w-xl">
                Chat with your uploaded documents or ask the AI anything.
                Your assistant uses Retrieval-Augmented Generation (RAG)
                together with a Large Language Model (LLM) to provide
                intelligent answers.
              </p>

            </div>

          )}

          {messages.map((msg, index) => (
            <ChatMessage
              key={index}
              sender={msg.sender}
              text={msg.text}
              file={msg.file}
            />
          ))}

          {loading && <Loader />}

          <div ref={bottomRef}></div>

        </div>

        {/* Input */}

        <div className="sticky bottom-0 bg-[#0f172a] pt-6">

          {attachment && (
            <div className="mb-4 flex items-center gap-3 flex-wrap">
              <AttachmentChip
                file={attachment}
                onRemove={() => setAttachment(null)}
              />
              <p className="text-xs text-gray-400">
                Used for this question only — not saved to your documents.
              </p>
            </div>
          )}

          <div className="flex gap-4">

            <AttachButton onSelect={setAttachment} disabled={loading} />

            <input
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && sendQuestion()
              }
              placeholder={
                attachment
                  ? "Ask about this file..."
                  : "Chat with your documents or ask the AI anything..."
              }
              className="
                flex-1
                bg-slate-800
                border
                border-slate-700
                focus:border-blue-500
                rounded-xl
                p-4
                outline-none
                transition
              "
            />

            <button
              disabled={loading}
              onClick={() => sendQuestion()}
              className="
                flex
                items-center
                justify-center
                gap-2
                bg-blue-600
                hover:bg-blue-700
                hover:scale-105
                transition-all
                duration-300
                disabled:bg-gray-600
                disabled:cursor-not-allowed
                disabled:hover:scale-100
                px-8
                rounded-xl
                font-semibold
                shadow-lg
              "
            >
              <FaPaperPlane className="text-sm" />
              {loading ? "Sending..." : "Send"}
            </button>

          </div>

        </div>

      </div>
    </MainLayout>
  );
}

export default Chat;