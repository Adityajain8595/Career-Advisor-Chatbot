import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

const loadingPhrases = [
  "Charting your career course...",
  "Crafting a path to success...",
  "Unlocking career insights...",
  "Aligning your professional stars...",
  "Mapping your future...",
];

function loadSessions() {
  try {
    const raw = localStorage.getItem("careerist_sessions");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s) =>
        s &&
        typeof s.id === "string" &&
        typeof s.title === "string" &&
        Array.isArray(s.messages)
    );
  } catch {
    localStorage.removeItem("careerist_sessions");
    return [];
  }
}
function saveSessions(sessions) {
  localStorage.setItem("careerist_sessions", JSON.stringify(sessions));
}

export default function ChatApp({
  backendUrl = import.meta.env.VITE_BACKEND_URL || "https://backend-api-67ei.onrender.com/",
}) {
  const [sessions, setSessions] = useState(loadSessions());
  const [currentSession, setCurrentSession] = useState(
    sessions.length > 0 ? sessions[0].id : null
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(loadingPhrases[0]);
  const endRef = useRef(null);

  const currentMessages =
    sessions.find((s) => s.id === currentSession)?.messages || [];

  const setCurrentMessages = (msgs) => {
    if (!currentSession) return;
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === currentSession ? { ...s, messages: msgs } : s
      );
      saveSessions(updated);
      return updated;
    });
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentMessages]);

  
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingPhrase(
          (prevPhrase) =>
            loadingPhrases[
              (loadingPhrases.indexOf(prevPhrase) + 1) % loadingPhrases.length
            ]
        );
      }, 1500); 
      return () => clearInterval(interval);
    }
  }, [loading]);

  const sendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    let activeSession = currentSession;
    if (!activeSession) {
      const newSession = {
        id:
          "sess_" +
          Date.now().toString(36) +
          Math.random().toString(36).slice(2, 10),
        title: "New Chat",
        messages: [],
      };
      activeSession = newSession.id;
      setSessions((prev) => {
        const updated = [newSession, ...prev];
        saveSessions(updated);
        return updated;
      });
      setCurrentSession(activeSession);
    }

    const userMsg = { role: "human", content: query };
    setCurrentMessages([...currentMessages, userMsg]);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("query", query);
      formData.append("session_id", activeSession);

      const res = await fetch(`${backendUrl}/ask`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();

      if (data.chat_history && Array.isArray(data.chat_history)) {
        setCurrentMessages(data.chat_history);
      } else {
        const aiMsg = { role: "ai", content: data.answer || "(no answer)" };
        setCurrentMessages([...currentMessages, aiMsg]);
      }

      setSessions((prev) => {
        const renamed = prev.map((s) =>
          s.id === activeSession && s.title === "New Chat"
            ? { ...s, title: query.slice(0, 50) }
            : s
        );
        saveSessions(renamed);
        return renamed;
      });
    } catch (err) {
      console.error(err);
      setCurrentMessages([
        ...currentMessages,
        { role: "ai", content: "⚠️ Error contacting backend." },
      ]);
    }

    setQuery("");
    setLoading(false);
  };

  const clearChats = () => {
    localStorage.removeItem("careerist_sessions");
    setSessions([]);
    setCurrentSession(null);
  };

  const removeSession = (id) => {
    const updated = sessions.filter((s) => s.id !== id);
    saveSessions(updated);
    setSessions(updated);
    if (currentSession === id) {
      setCurrentSession(updated.length ? updated[0].id : null);
    }
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-700 text-white border-r flex flex-col">
        <div className="p-3 font-semibold border-b border-slate-600 text-black bg-slate-200">
          Chats
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions
            .filter((s) => s && (s.title !== "New Chat" || s.messages.length > 0))
            .map((s) => (
              <div
                key={s.id}
                className={`flex items-center justify-between p-2 rounded cursor-pointer truncate ${
                  s.id === currentSession
                    ? "bg-indigo-200 text-indigo-900 font-medium"
                    : "hover:bg-slate-600 text-white"
                }`}
              >
                <div
                  onClick={() => setCurrentSession(s.id)}
                  className="flex-1 truncate"
                >
                  {s.title}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSession(s.id);
                  }} style={{ fontSize: '8px' }}
                  className="ml-2 text-gray-400 hover:text-red-500"
                  title="Delete Chat"
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
        <div className="p-2 space-y-2">
          <button
            onClick={() => {
              const newSession = {
                id:
                  "sess_" +
                  Date.now().toString(36) +
                  Math.random().toString(36).slice(2, 10),
                title: "New Chat",
                messages: [],
              };
              setSessions((prev) => {
                const updated = [newSession, ...prev];
                saveSessions(updated);
                return updated;
              });
              setCurrentSession(newSession.id);
            }}
            className="w-full px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            + New Chat
          </button>
          <button
            onClick={clearChats}
            className="w-full px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-red-600"
          >
            Clear Chats
          </button>
        </div>
      </aside>

      {/* Chat main */}
      <div className="flex-1 flex flex-col">
        <header className="bg-gradient-to-r from-indigo-600 to-blue-500 p-4 text-white shadow-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="text-xl font-semibold">Careerist — AI Career Advisor</div>
            {currentSession && (
              <div className="text-sm opacity-90">
                Session: {currentSession.slice(-8)}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6 bg-white rounded-2xl shadow-sm">
            {currentMessages.length === 0 && (
              <div className="text-center text-slate-500 py-12">
                <div className="text-lg font-medium mb-2 text-cyan-600 font-bold" style={{ fontSize: '30px' }}>
                  Powered by Gemini 2.5-Flash
                </div>
                <div className="text-lg font-medium mb-2">
                  Your Buddy for Career Guidance
                </div>
                <div className="text-sm">
                  Feel free to ask questions regarding jobs, careers, skills and
                  related topics.
                </div>
              </div>
            )}

            <div className="space-y-4">
              {currentMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${
                    m.role === "human" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl leading-relaxed whitespace-normal prose ${
                      m.role === "human"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-900 rounded-bl-none"
                    }`}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      rehypePlugins={[rehypeRaw]} 
                    >
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 text-slate-500 flex items-center space-x-2">
                    <svg
                      className="animate-spin h-5 w-5 text-indigo-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      ></path>
                    </svg>
                    <span>{loadingPhrase}</span>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          <form
            onSubmit={sendMessage}
            className="mt-4 p-3 bg-white rounded-xl shadow-md flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={loading ? loadingPhrase : "Type your question..."}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "..." : "Send"}
            </button>
          </form>
        </main>

        <footer className="text-center text-xs text-slate-500 p-4">
          Careerist • Built with LangChain + VertexAI
        </footer>
      </div>
    </div>
  );
}