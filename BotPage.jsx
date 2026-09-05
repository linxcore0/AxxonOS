import { useState, useEffect, useRef } from "react";
import { Bot, Phone, Send } from "lucide-react";

const API = "";

export default function BotPage({ botId }) {
  const [bot, setBot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef(null);
  const isWidget = typeof window !== "undefined" && window.location.search.includes("widget=true");

  useEffect(() => {
    fetch(`${API}/api/bots/${botId}/public`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setBot(data);
        setMessages([{
          role: "bot",
          text: `Hello! I'm ${data.name}. How can I assist you today?`,
        }]);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [botId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text) return;
    setInput("");
    setShowSuggestions(false);
    setMessages(m => [...m, { role: "user", text }]);
    setTyping(true);

    try {
      const res = await fetch(`${API}/api/bots/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10).map(m => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "bot", text: data.reply, fallback: data.fallback, fallbackContact: data.fallback_contact }]);
    } catch {
      setMessages(m => [...m, { role: "bot", text: "Sorry, I couldn't process that right now.", fallback: false }]);
    }
    setTyping(false);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  if (loading) return (
    <div style={fullPage}>
      <div style={{ color: "#475569", fontFamily: "'Orbitron', monospace", fontSize: 12, letterSpacing: "0.2em" }}>
        LOADING...
      </div>
    </div>
  );

  if (notFound) return (
    <div style={fullPage}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <Bot size={44} style={{ color: "#6366f1", marginBottom: 16 }} />
        <div style={{ color: "#fff", fontFamily: "'Orbitron', monospace", fontSize: 14, letterSpacing: "0.15em", marginBottom: 8 }}>
          BOT NOT FOUND
        </div>
        <div style={{ color: "#475569", fontFamily: "system-ui", fontSize: 13 }}>
          This chatbot does not exist or has been removed.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: isWidget ? "rgba(5,5,15,0.98)" : "#000",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: isWidget ? "14px 20px" : "18px 24px",
        background: "rgba(10,10,30,0.95)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(99,102,241,0.2)",
        display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "linear-gradient(135deg, #3b82f6, #6366f1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 0 16px rgba(99,102,241,0.4)",
        }}>
          <Bot size={20} color="#ffffff" />
        </div>
        <div>
          <div style={{
            fontFamily: "'Orbitron', monospace", fontWeight: 700, fontSize: isWidget ? 12 : 14,
            letterSpacing: "0.1em", color: "#fff",
          }}>{bot.name}</div>
          {bot.website && (
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
              <a href={bot.website} target="_blank" rel="noreferrer" style={{ color: "#6366f1", textDecoration: "none" }}>
                {bot.website.replace(/^https?:\/\//, "")}
              </a>
            </div>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          <span style={{ fontSize: 10, color: "#22c55e", fontFamily: "'Orbitron', monospace", letterSpacing: "0.15em" }}>ONLINE</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: isWidget ? "16px 16px" : "24px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            alignItems: "flex-end", gap: 10,
          }}>
            {msg.role === "bot" && (
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Bot size={15} color="#ffffff" />
              </div>
            )}
            <div style={{ maxWidth: "75%" }}>
              <div style={{
                padding: "12px 16px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                  : "rgba(255,255,255,0.06)",
                border: msg.role === "user" ? "none" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                color: "#fff", fontSize: 13, lineHeight: 1.6,
                boxShadow: msg.role === "user" ? "0 2px 12px rgba(99,102,241,0.3)" : "none",
              }}>
                {msg.text}
              </div>
              {/* Fallback contact button */}
              {msg.fallback && msg.fallbackContact && (() => {
                const fc = msg.fallbackContact.trim();
                let href = fc;
                if (!fc.startsWith("http") && !fc.startsWith("mailto:") && fc.includes("@")) {
                  href = `mailto:${fc}`;
                } else if (!fc.startsWith("http") && (fc.startsWith("+") || /^\d/.test(fc))) {
                  href = `tel:${fc}`;
                }
                return (
                  <a href={href} target="_blank" rel="noreferrer" style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    marginTop: 8, padding: "9px 18px",
                    background: "linear-gradient(135deg, #22c55e, #16a34a)",
                    borderRadius: 20, color: "#fff", fontSize: 12, fontWeight: 700,
                    textDecoration: "none", letterSpacing: "0.05em",
                    boxShadow: "0 2px 12px rgba(34,197,94,0.3)",
                  }}>
                    <Phone size={13} />
                    <span>Contact Support</span>
                  </a>
                );
              })()}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typing && (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Bot size={15} color="#ffffff" />
            </div>
            <div style={{
              padding: "12px 18px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "18px 18px 18px 4px",
              display: "flex", gap: 5, alignItems: "center",
            }}>
              {[0, 0.2, 0.4].map((delay, i) => (
                <div key={i} style={{
                  width: 7, height: 7, borderRadius: "50%", background: "#6366f1",
                  animation: `typingDot 1.2s ease-in-out ${delay}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {showSuggestions && bot?.faqs?.filter(f => f.q).length > 0 && (
        <div style={{
          padding: isWidget ? "8px 12px" : "10px 20px",
          display: "flex", gap: 8, flexWrap: "wrap",
          borderTop: "1px solid rgba(99,102,241,0.1)",
          background: "rgba(10,10,30,0.9)",
        }}>
          <div style={{ width: "100%", fontSize: 10, color: "#475569", letterSpacing: "0.12em", marginBottom: 4 }}>
            SUGGESTED
          </div>
          {bot.faqs.filter(f => f.q).slice(0, 3).map((faq, i) => (
            <button key={i} onClick={() => sendMessage(faq.q)} style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.3)",
              borderRadius: 20, padding: "7px 14px",
              color: "#a5b4fc", fontSize: 12, cursor: "pointer",
              fontFamily: "system-ui", transition: "all 0.18s",
              maxWidth: "100%", textAlign: "left", lineHeight: 1.4,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.22)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.6)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.1)"; e.currentTarget.style.borderColor = "rgba(99,102,241,0.3)"; }}
            >
              {faq.q.length > 55 ? faq.q.slice(0, 55) + "…" : faq.q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{
        padding: isWidget ? "12px 16px" : "16px 24px",
        background: "rgba(10,10,30,0.95)",
        borderTop: "1px solid rgba(99,102,241,0.2)",
        backdropFilter: "blur(20px)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your message..."
            style={{
              flex: 1, background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12,
              color: "#fff", fontSize: 13, padding: "12px 16px",
              fontFamily: "system-ui", outline: "none",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || typing}
            style={{
              padding: "12px 18px", borderRadius: 12, border: "none",
              background: input.trim() && !typing
                ? "linear-gradient(135deg, #3b82f6, #6366f1)"
                : "rgba(255,255,255,0.05)",
              color: input.trim() && !typing ? "#fff" : "#334155",
              cursor: input.trim() && !typing ? "pointer" : "default",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 0.2s", flexShrink: 0,
            }}
          >
            <Send size={15} />
          </button>
        </div>
        <div style={{ textAlign: "center", marginTop: 8, fontSize: 10, color: "#1e293b", letterSpacing: "0.1em" }}>
          Powered by <span style={{ color: "#6366f1" }}>AXXON OS</span>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
        @keyframes typingDot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }
        input::placeholder { color: #334155; }
        input:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.1) !important; }
      `}</style>
    </div>
  );
}

const fullPage = {
  height: "100vh", display: "flex", alignItems: "center",
  justifyContent: "center", background: "#000",
};
