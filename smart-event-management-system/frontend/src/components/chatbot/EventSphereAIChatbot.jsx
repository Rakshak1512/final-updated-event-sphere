import { useState, useRef, useEffect, useCallback } from "react";
import {
  FiMessageCircle,
  FiX,
  FiSend,
  FiTrash2,
  FiCpu,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext.jsx";
import { chatbotService } from "../../api/services.js";

const getRoleSuggestions = (role) => {
  if (role === "faculty") {
    return [
      "How many students registered?",
      "Who attended?",
      "Who won?",
      "What work is assigned to me?",
    ];
  }
  if (role === "volunteer") {
    return [
      "Which events am I assigned to?",
      "How many attendees scanned?",
      "How do I scan QR?",
    ];
  }
  if (role === "admin") {
    return [
      "How many faculty are there?",
      "How many events are active?",
      "What work is assigned?",
      "Show reports",
    ];
  }
  return [
    "What events am I registered for?",
    "What events are available?",
    "Show my certificates",
    "Which events did I win?",
  ];
};

const getInitialGreeting = (user) => {
  return {
    role: "assistant",
    content: `Hello ${user?.name || "there"}! I am EventSphere AI. How can I assist you with events, registrations, schedules, or certificates today?`,
  };
};

export default function EventSphereAIChatbot() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);
  const isSendingRef = useRef(false);
  const initializedUserRef = useRef(null);

  const role = user?.role || "student";

  // Initialize greeting exactly once per user session
  useEffect(() => {
    if (!user) return;
    if (initializedUserRef.current !== user.id) {
      initializedUserRef.current = user.id;
      setMessages([getInitialGreeting(user)]);
      setSuggestions(getRoleSuggestions(role));
    }
  }, [user, role]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open, loading]);

  const handleSend = useCallback(async (textToSend = null) => {
    if (isSendingRef.current) return;
    const query = typeof textToSend === "string" ? textToSend.trim() : input.trim();
    if (!query) return;

    isSendingRef.current = true;
    setLoading(true);
    setInput("");

    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const historyPayload = [...messages, userMsg].slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data } = await chatbotService.ask({
        message: query,
        history: historyPayload,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error("Chatbot request error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I encountered an error connecting to EventSphere services. Please try asking again.",
        },
      ]);
    } finally {
      setLoading(false);
      isSendingRef.current = false;
    }
  }, [input, messages]);

  const handleClear = () => {
    if (loading) return;
    setMessages([getInitialGreeting(user)]);
    setSuggestions(getRoleSuggestions(role));
    setInput("");
  };

  if (!user) return null;

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="chatbot-trigger-btn"
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 16px) + 16px)",
          right: "calc(env(safe-area-inset-right, 16px) + 16px)",
          zIndex: 1040,
          width: 52,
          height: 52,
          borderRadius: "50%",
          background: "var(--gradient-primary)",
          color: "#ffffff",
          border: "none",
          boxShadow: "0 8px 24px rgba(139, 92, 246, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        title="Open EventSphere AI Assistant"
      >
        {open ? <FiX size={22} /> : <FiMessageCircle size={24} />}
      </button>

      {/* Chat Window Side Panel */}
      {open && (
        <div
          className="glass-card chatbot-window"
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 16px) + 74px)",
            right: "calc(env(safe-area-inset-right, 16px) + 16px)",
            width: 380,
            maxWidth: "calc(100vw - 32px)",
            height: 520,
            maxHeight: "calc(100dvh - 100px)",
            zIndex: 1040,
            borderRadius: 24,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
            border: "1px solid rgba(139, 92, 246, 0.3)",
            overflow: "hidden",
            background: "var(--bg-elevated)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 18px",
              background: "var(--gradient-primary)",
              color: "#ffffff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <FiCpu size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
                  EventSphere AI
                </h3>
                <span style={{ fontSize: 11, opacity: 0.9 }}>Live Campus Assistant</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={handleClear}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  opacity: 0.85,
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  minHeight: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                }}
                title="Clear Chat"
                aria-label="Clear chat messages"
              >
                <FiTrash2 size={16} />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#ffffff",
                  opacity: 0.85,
                  cursor: "pointer",
                  width: 36,
                  height: 36,
                  minWidth: 36,
                  minHeight: 36,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "8px",
                }}
                title="Close"
                aria-label="Close chatbot"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            style={{
              flex: 1,
              padding: "16px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              minHeight: 0,
            }}
          >
            {messages.map((m, idx) => {
              const isUser = m.role === "user";
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isUser ? "var(--gradient-primary)" : "var(--bg-base)",
                      color: isUser ? "#ffffff" : "var(--text-primary)",
                      fontSize: 13,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div
                  style={{
                    padding: "10px 16px",
                    borderRadius: "16px 16px 16px 4px",
                    background: "var(--bg-base)",
                    color: "var(--text-secondary)",
                    fontSize: 12.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span className="dot-pulse" /> EventSphere AI is analyzing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {suggestions.length > 0 && !loading && (
            <div
              style={{
                padding: "8px 12px",
                display: "flex",
                gap: 6,
                overflowX: "auto",
                whiteSpace: "nowrap",
                borderTop: "1px solid var(--border-color)",
                background: "var(--bg-base)",
                flexShrink: 0,
              }}
            >
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSend(s)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 12,
                    background: "var(--bg-elevated)",
                    border: "1px solid rgba(139, 92, 246, 0.3)",
                    color: "#8b5cf6",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    flexShrink: 0,
                    minHeight: 32,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border-color)",
              display: "flex",
              gap: 8,
              alignItems: "center",
              background: "var(--bg-elevated)",
              flexShrink: 0,
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask EventSphere AI..."
              disabled={loading}
              className="chatbot-input"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1.5px solid var(--border-color)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: 16,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn btn-primary"
              aria-label="Send message"
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                borderRadius: 12,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <FiSend size={16} />
            </button>
          </form>

          <style>{`
            @media (max-width: 480px) {
              .chatbot-window {
                right: max(10px, env(safe-area-inset-right, 0px)) !important;
                bottom: calc(env(safe-area-inset-bottom, 12px) + 68px) !important;
                width: calc(100vw - 20px) !important;
                max-width: calc(100vw - 20px) !important;
                height: 480px !important;
                max-height: calc(100dvh - 84px) !important;
                border-radius: 20px !important;
              }
              .chatbot-input {
                font-size: 16px !important;
              }
            }
          `}</style>
        </div>
      )}
    </>
  );
}

