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
  backendUrl = import.meta.env.VITE_BACKEND_URL || "https://backend-api-67ei.onrender.com",
}) {
  const [sessions, setSessions] = useState(loadSessions());
  const [currentSession, setCurrentSession] = useState(
    sessions.length > 0 ? sessions[0].id : null
  );
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhrase, setLoadingPhrase] = useState(loadingPhrases[0]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Added state for sidebar
  const endRef = useRef(null);
  const textareaRef = useRef(null);

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
    if (!currentSession) return;
    const loadHistory = async () => {
      try {
        const res = await fetch(`${backendUrl}/history?session_id=${currentSession}`);
        const data = await res.json();
        if (data.chat_history && Array.isArray(data.chat_history)) {
          setCurrentMessages(data.chat_history);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    };
    loadHistory();
  }, [currentSession]);

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


const sendMessage = async (e, sampleQuery = null) => {
    if (e) e.preventDefault();
    const messageToSend = sampleQuery || query;
    if (!messageToSend.trim()) return;

    let activeSession = currentSession;
    let isNewChat = false;

    if (!activeSession) {
      const newSession = {
        id:
          "sess_" +
          Date.now().toString(36) +
          Math.random().toString(36).slice(2, 10),
        title: messageToSend.slice(0, 50), 
        messages: [],
      };
      activeSession = newSession.id;
      setSessions((prev) => {
        const updated = [newSession, ...prev];
        saveSessions(updated);
        return updated;
      });
      setCurrentSession(newSession.id);
      isNewChat = true;
    }

    const userMsg = { role: "human", content: messageToSend };
    
    setSessions((prev) => {
      const updated = prev.map((s) =>
        s.id === activeSession ? { ...s, messages: [...s.messages, userMsg] } : s
      );
      saveSessions(updated);
      return updated;
    });

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("query", messageToSend);
      formData.append("session_id", activeSession);

      const res = await fetch(`${backendUrl}/ask`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();

      const aiMsg = { role: "ai", content: data.answer || "(no answer)" };
      
      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id === activeSession) {
            return {
              ...s,
              messages: [...s.messages, aiMsg],
            };
          }
          return s;
        });
        saveSessions(updated);
        return updated;
      });

    } catch (err) {
      console.error(err);
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === activeSession
            ? { ...s, messages: [...s.messages, { role: "ai", content: "⚠️ Error contacting backend." }] }
            : s
        );
        saveSessions(updated);
        return updated;
      });
    }

    setQuery("");
    setLoading(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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

  const handleSampleQueryClick = (sampleQuery) => {
    setQuery(sampleQuery);
    sendMessage(null, sampleQuery);
  };

  return (
    <div className="w-screen h-screen flex overflow-hidden bg-gray-50">
      <style>
        {`
          @media (max-width: 768px) {
            .flex-col-container {
              flex-direction: column;
            }
            .main-content {
              flex-grow: 1;
              overflow-y: auto;
              padding-bottom: 7rem;
            }
            .input-form {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              padding: 1rem;
              background-color: white;
              z-index: 10;
            }
          }
        `}
      </style>
      {/* Sidebar */}
      <aside className={`bg-slate-700 text-white border-r flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-16' : 'w-64 flex'}`}>
        <div className="p-3 font-semibold border-b border-slate-600 text-black bg-slate-200 flex justify-between items-center">
          {!isSidebarCollapsed && <span>Chats</span>}
          <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-1 rounded hover:bg-slate-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {isSidebarCollapsed ? (
                <path d="M9 5l7 7-7 7" />
              ) : (
                <path d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
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
                  {!isSidebarCollapsed && s.title}
                </div>
                {!isSidebarCollapsed && (
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
                )}
              </div>
            ))}
        </div>
        <div className="p-2 space-y-2">
          {!isSidebarCollapsed && (
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
          )}
          {!isSidebarCollapsed && (
            <button
              onClick={clearChats}
              className="w-full px-3 py-2 bg-gray-400 text-white rounded-lg hover:bg-red-600"
            >
              Clear Chats
            </button>
          )}
        </div>
      </aside>

      {/* Chat main */}
      <div className="flex-1 flex flex-col flex-col-container">
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

        <main className="flex-1 p-4 flex flex-col overflow-hidden main-content">
          <div className="flex-1 overflow-auto p-6 bg-white rounded-2xl shadow-sm">
            {currentMessages.length === 0 && (
              <div className="text-center text-slate-500 py-12">
                  <img src="/careerist_logo.png" alt="Careerist Logo" className="mx-auto mb-4 w-40 h-40" />
                <div className="text-lg font-medium mb-2" style={{ fontSize: '30px' }}>
                  Your Buddy for Career Guidance
                </div>
                <div className="text-lg font-medium mb-2 text-cyan-600 font-bold" style={{ fontSize: '15px' }}>
                  Powered by Gemini 2.5-Flash
                </div>
                <div className="text-sm">
                  Feel free to ask questions regarding jobs, careers, skills andrelated topics.
                </div>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <button onClick={() => handleSampleQueryClick("What are the key skills for an AI Engineer?")} className="bg-slate-100 p-4 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors">
                    What are the key skills for an AI Engineer?
                  </button>
                  <button onClick={() => handleSampleQueryClick("How can I prepare for a software engineering interview?")} className="bg-slate-100 p-4 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors">
                    How can I prepare for a software engineering interview?
                  </button>
                  <button onClick={() => handleSampleQueryClick("Provide a detailed roadmap for a successful entrepreneur.")} className="bg-slate-100 p-4 rounded-xl text-slate-700 hover:bg-slate-200 transition-colors">
                    Provide a detailed roadmap for a successful entrepreneur.
                  </button>
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
            className="mt-4 p-3 bg-white rounded-xl shadow-md flex items-end gap-2 input-form"
          >
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              placeholder={loading ? loadingPhrase : "Type your question..."}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none overflow-hidden"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '200px' }}
            />

            <button
              type="submit"
              disabled={loading || !query.trim()}
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