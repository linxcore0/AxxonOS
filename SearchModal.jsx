import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Search, X, BookOpen, MessageSquare, Bot, Sparkles, Clock, 
  ArrowRight, Check, Copy, ExternalLink, HelpCircle, FileText,
  ChevronRight, CornerDownLeft, Filter, Tag, Layers
} from "lucide-react";
import { C, Badge, Btn, Card3D } from "./theme.jsx";
import { KNOWLEDGE_BASE_ARTICLES, GLOSSARY_TERMS } from "./knowledgeBaseData.js";

export default function SearchModal({
  isOpen = false,
  onClose = () => {},
  onNavigate = () => {},
  onTabChange = () => {},
  initialQuery = "",
  user = null,
}) {
  const [query, setQuery] = useState(initialQuery || "");
  const [activeCategory, setActiveCategory] = useState("all"); // "all" | "knowledge" | "logs" | "bots" | "glossary"
  const [serverLogs, setServerLogs] = useState([]);
  const [serverBots, setServerBots] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const inputRef = useRef(null);

  // Sync initial query if passed
  useEffect(() => {
    if (initialQuery) setQuery(initialQuery);
  }, [initialQuery]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 60);
      fetchServerResults(query);
    } else {
      setSelectedArticle(null);
      setSelectedLog(null);
    }
  }, [isOpen]);

  // Query server when query changes (debounced)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      fetchServerResults(query);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, isOpen]);

  const fetchServerResults = async (q) => {
    setLoadingServer(true);
    try {
      const token = user?.token || localStorage.getItem("axxon_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/search?q=${encodeURIComponent(q || "")}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setServerLogs(data.logs || []);
        setServerBots(data.bots || []);
      }
    } catch (e) {
      // server search fallback gracefully
    }
    setLoadingServer(false);
  };

  // Local knowledge articles filtering
  const filteredArticles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return KNOWLEDGE_BASE_ARTICLES;
    return KNOWLEDGE_BASE_ARTICLES.filter(art => 
      art.title.toLowerCase().includes(q) ||
      art.summary.toLowerCase().includes(q) ||
      art.category.toLowerCase().includes(q) ||
      art.tags.some(t => t.toLowerCase().includes(q)) ||
      art.content.toLowerCase().includes(q)
    );
  }, [query]);

  // Glossary terms filtering
  const filteredGlossary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GLOSSARY_TERMS;
    return GLOSSARY_TERMS.filter(g =>
      g.term.toLowerCase().includes(q) ||
      g.plain.toLowerCase().includes(q) ||
      g.tech.toLowerCase().includes(q)
    );
  }, [query]);

  // Also collect local AI assistant history logs from localStorage
  const localAiHistory = useMemo(() => {
    try {
      const saved = localStorage.getItem("axxon_chat_history_v2");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const userQuestions = parsed.filter(m => m.role === "user" && m.text);
      const q = query.trim().toLowerCase();
      if (!q) {
        return userQuestions.slice(-5).map((m, i) => ({
          id: `local-ai-${i}`,
          question: m.text,
          bot_name: "Axxon AI Assistant",
          matched: true,
          created_at: m.time || new Date().toISOString(),
          isAiHistory: true,
        }));
      }
      return userQuestions
        .filter(m => m.text.toLowerCase().includes(q))
        .map((m, i) => ({
          id: `local-ai-${i}`,
          question: m.text,
          bot_name: "Axxon AI Assistant",
          matched: true,
          created_at: m.time || new Date().toISOString(),
          isAiHistory: true,
        }));
    } catch {
      return [];
    }
  }, [query]);

  // Combined chat logs (server + local AI assistant)
  const combinedLogs = useMemo(() => {
    const map = new Map();
    serverLogs.forEach(l => map.set(l.question, l));
    localAiHistory.forEach(l => {
      if (!map.has(l.question)) map.set(l.question, l);
    });
    return Array.from(map.values());
  }, [serverLogs, localAiHistory]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const handleAskAI = (promptText) => {
    onClose();
    if (onTabChange) onTabChange("aichat");
    if (onNavigate) onNavigate("dashboard");
    // Trigger custom event so GeminiChat can automatically populate
    window.dispatchEvent(new CustomEvent("axxon_insert_prompt", { detail: { prompt: promptText } }));
  };

  const handleOpenBotBuilder = () => {
    onClose();
    if (onTabChange) onTabChange("bots");
    if (onNavigate) onNavigate("dashboard");
  };

  if (!isOpen) return null;

  const totalResultsCount = 
    filteredArticles.length + 
    combinedLogs.length + 
    serverBots.length + 
    filteredGlossary.length;

  return (
    <div 
      style={{
        position: "fixed", inset: 0, zIndex: 10000,
        background: "rgba(5, 8, 18, 0.82)",
        backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "clamp(8px, 4vh, 60px) clamp(8px, 2vw, 16px) 24px",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div style={{
        width: "100%", maxWidth: 760,
        maxHeight: "clamp(520px, 86dvh, 850px)",
        background: "var(--card-bg, rgba(11, 15, 28, 0.98))",
        border: `1px solid ${C.borderHi}`,
        borderRadius: "clamp(14px, 3vw, 20px)",
        boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.75), 0 0 40px rgba(99, 102, 241, 0.15)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        animation: "fadeUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}>
        
        {/* ── TOP SEARCH BAR HEADER ─────────────────────────────── */}
        <div style={{
          padding: "clamp(12px, 2.5vw, 16px) clamp(14px, 3vw, 20px)",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Search size={19} style={{ color: C.indigo, flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search articles, logs, FAQs..."
            style={{
              flex: 1, background: "transparent", border: "none",
              color: C.text, fontSize: "clamp(14px, 2vw, 16px)",
              fontFamily: "system-ui", outline: "none", minWidth: 0,
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              style={{
                background: "rgba(255,255,255,0.06)", border: "none",
                borderRadius: "50%", width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.muted, cursor: "pointer", touchAction: "manipulation",
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "6px 12px", borderRadius: 8,
              minHeight: 34,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
              color: C.text, fontSize: 11, fontWeight: 700, fontFamily: "system-ui",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              touchAction: "manipulation",
            }}
            title="Close modal"
          >
            <span>Close</span>
          </button>
        </div>

        {/* ── CATEGORY FILTER PILLS ────────────────────────────── */}
        <div style={{
          padding: "10px 20px",
          background: "rgba(0, 0, 0, 0.2)",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 8,
          overflowX: "auto", whiteSpace: "nowrap",
        }}>
          {[
            { id: "all", label: "All Results", count: totalResultsCount, icon: Filter },
            { id: "knowledge", label: "Knowledge Base", count: filteredArticles.length, icon: BookOpen },
            { id: "logs", label: "Chat Logs", count: combinedLogs.length, icon: MessageSquare },
            { id: "bots", label: "Bots & FAQs", count: serverBots.length, icon: Bot },
            { id: "glossary", label: "Glossary", count: filteredGlossary.length, icon: HelpCircle },
          ].map(cat => {
            const Icon = cat.icon;
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 12px", borderRadius: 20,
                  background: active ? "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.3))" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${active ? C.indigo : C.border}`,
                  color: active ? "#fff" : C.muted,
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  cursor: "pointer", transition: "all 0.15s ease",
                  fontFamily: "system-ui", flexShrink: 0,
                }}
              >
                <Icon size={12} style={{ color: active ? C.indigo : C.muted }} />
                <span>{cat.label}</span>
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 10,
                  background: active ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)",
                  color: active ? "#fff" : C.dim,
                }}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SEARCH RESULTS SCROLL AREA ────────────────────────── */}
        <div style={{
          maxHeight: "55vh", overflowY: "auto",
          padding: "16px 20px", display: "flex", flexDirection: "column", gap: 18,
        }}>

          {/* 1. KNOWLEDGE BASE ARTICLES SECTION */}
          {(activeCategory === "all" || activeCategory === "knowledge") && filteredArticles.length > 0 && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 10, fontSize: 11, fontWeight: 700,
                color: C.indigo, letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "'Orbitron', monospace",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <BookOpen size={13} />
                  <span>Knowledge Base Articles & Guides ({filteredArticles.length})</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {filteredArticles.slice(0, activeCategory === "knowledge" ? 20 : 4).map(art => (
                  <div
                    key={art.id}
                    onClick={() => setSelectedArticle(art)}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: "12px 16px",
                      cursor: "pointer", transition: "all 0.18s ease",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                      e.currentTarget.style.borderColor = C.borderHi;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = C.border;
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>
                          {art.title}
                        </span>
                        <span style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 6,
                          background: "rgba(99,102,241,0.15)", color: "#a5b4fc",
                          fontFamily: "system-ui", fontWeight: 600, flexShrink: 0,
                        }}>
                          {art.category}
                        </span>
                      </div>
                      <p style={{
                        fontSize: 12, color: C.muted, margin: 0, fontFamily: "system-ui",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {art.summary}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.dim, fontSize: 11, flexShrink: 0 }}>
                      <Clock size={12} />
                      <span>{art.readTime}</span>
                      <ChevronRight size={14} style={{ color: C.indigo }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. CHAT LOGS & TRANSCRIPTS SECTION */}
          {(activeCategory === "all" || activeCategory === "logs") && combinedLogs.length > 0 && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 10, fontSize: 11, fontWeight: 700,
                color: "#38bdf8", letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "'Orbitron', monospace",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MessageSquare size={13} />
                  <span>Visitor Chat Logs & Queries ({combinedLogs.length})</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {combinedLogs.slice(0, activeCategory === "logs" ? 25 : 4).map((log, idx) => (
                  <div
                    key={log.id || idx}
                    onClick={() => setSelectedLog(log)}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: "12px 16px",
                      cursor: "pointer", transition: "all 0.18s ease",
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(56,189,248,0.08)";
                      e.currentTarget.style.borderColor = "rgba(56,189,248,0.3)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = C.border;
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.text, fontFamily: "system-ui" }}>
                          "{log.question}"
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: C.muted, fontFamily: "system-ui" }}>
                        <span>Bot: <strong style={{ color: "#94a3b8" }}>{log.bot_name || "Support Bot"}</strong></span>
                        <span>•</span>
                        <span>{new Date(log.created_at || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 6,
                        background: log.matched ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                        border: `1px solid ${log.matched ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                        color: log.matched ? "#4ade80" : "#f87171",
                        fontWeight: 700, fontFamily: "system-ui",
                      }}>
                        {log.matched ? "FAQ Matched" : "AI Fallback"}
                      </span>
                      <ChevronRight size={14} style={{ color: "#38bdf8" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. BOTS & FAQS SECTION */}
          {(activeCategory === "all" || activeCategory === "bots") && serverBots.length > 0 && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 10, fontSize: 11, fontWeight: 700,
                color: "#a855f7", letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "'Orbitron', monospace",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Bot size={13} />
                  <span>My Chatbots & FAQ Knowledge Base ({serverBots.length})</span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {serverBots.map(bot => (
                  <div
                    key={bot.id}
                    onClick={handleOpenBotBuilder}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: "12px 16px",
                      cursor: "pointer", transition: "all 0.18s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = "rgba(168,85,247,0.08)";
                      e.currentTarget.style.borderColor = "rgba(168,85,247,0.3)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                      e.currentTarget.style.borderColor = C.border;
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Bot size={15} style={{ color: "#c084fc" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>{bot.name}</span>
                        {bot.website && <span style={{ fontSize: 11, color: C.dim }}>({bot.website})</span>}
                      </div>
                      <span style={{ fontSize: 11, color: "#c084fc", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        Open in Bot Builder <ArrowRight size={12} />
                      </span>
                    </div>
                    {bot.matchedFaqs && bot.matchedFaqs.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, paddingLeft: 22, borderLeft: `2px solid rgba(168,85,247,0.3)` }}>
                        {bot.matchedFaqs.slice(0, 2).map((faq, fIdx) => (
                          <div key={fIdx} style={{ fontSize: 12, color: C.muted }}>
                            <strong style={{ color: "#e2e8f0" }}>Q:</strong> {faq.q}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. GLOSSARY SECTION */}
          {(activeCategory === "all" || activeCategory === "glossary") && filteredGlossary.length > 0 && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 10, fontSize: 11, fontWeight: 700,
                color: "#10b981", letterSpacing: "0.08em", textTransform: "uppercase",
                fontFamily: "'Orbitron', monospace",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <HelpCircle size={13} />
                  <span>Platform & AI Glossary ({filteredGlossary.length})</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8 }}>
                {filteredGlossary.slice(0, activeCategory === "glossary" ? 20 : 4).map((g, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: `1px solid ${C.border}`,
                      borderRadius: 12, padding: "12px 14px",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#34d399", fontFamily: "system-ui", marginBottom: 4 }}>
                      {g.term}
                    </div>
                    <p style={{ fontSize: 12, color: C.text, lineHeight: 1.5, margin: "0 0 6px 0", fontFamily: "system-ui" }}>
                      {g.plain}
                    </p>
                    <div style={{ fontSize: 11, color: C.dim, fontStyle: "italic", fontFamily: "system-ui" }}>
                      Tech: {g.tech}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* NO RESULTS AT ALL */}
          {totalResultsCount === 0 && !loadingServer && (
            <div style={{
              textAlign: "center", padding: "36px 20px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 50, height: 50, borderRadius: "50%",
                background: "rgba(99,102,241,0.1)", border: `1px solid rgba(99,102,241,0.25)`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Search size={22} style={{ color: C.indigo }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>
                No direct matches found for "{query}"
              </div>
              <p style={{ fontSize: 13, color: C.muted, maxWidth: 440, margin: 0, lineHeight: 1.6, fontFamily: "system-ui" }}>
                Try searching for general keywords like <strong style={{ color: "#a5b4fc" }}>embed</strong>, <strong style={{ color: "#a5b4fc" }}>fallback</strong>, <strong style={{ color: "#a5b4fc" }}>pricing</strong>, or ask the AI Assistant directly.
              </p>
              {query && (
                <Btn
                  onClick={() => handleAskAI(query)}
                  style={{
                    marginTop: 8, padding: "10px 20px", fontSize: 12,
                    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  }}
                >
                  <Sparkles size={14} />
                  <span>Ask Axxon AI Assistant about "{query}"</span>
                </Btn>
              )}
            </div>
          )}

        </div>

        {/* ── FOOTER ACTIONS & SHORTCUTS ───────────────────────── */}
        <div style={{
          padding: "12px 20px",
          background: "rgba(0, 0, 0, 0.35)",
          borderTop: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexWrap: "wrap", gap: 10,
          fontSize: 11, color: C.muted, fontFamily: "system-ui",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ background: "rgba(255,255,255,0.08)", padding: "2px 5px", borderRadius: 4, color: C.text }}>ESC</kbd> Close
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <kbd style={{ background: "rgba(255,255,255,0.08)", padding: "2px 5px", borderRadius: 4, color: C.text }}>↵</kbd> Select
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => handleAskAI(query || "How do I build and embed an AI chatbot?")}
              style={{
                background: "transparent", border: "none",
                color: C.indigo, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5, fontSize: 11,
              }}
            >
              <Sparkles size={12} />
              <span>Launch in AI Assistant</span>
            </button>
          </div>
        </div>

      </div>

      {/* ── ARTICLE READER MODAL ─────────────────────────────────── */}
      {selectedArticle && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSelectedArticle(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 680, maxHeight: "85vh",
              background: "var(--card-bg, #0b0f19)",
              border: `1px solid ${C.borderHi}`, borderRadius: 20,
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              animation: "fadeUp 0.2s ease both",
            }}
          >
            <div style={{
              padding: "18px 24px", borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.indigo, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {selectedArticle.category} • {selectedArticle.readTime}
                </span>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: C.text, margin: "4px 0 0 0", fontFamily: "system-ui" }}>
                  {selectedArticle.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "none",
                  borderRadius: "50%", width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.text, cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{
              padding: "24px", overflowY: "auto",
              color: C.muted, fontSize: 13, lineHeight: 1.7, fontFamily: "system-ui",
            }}>
              <div style={{ whiteSpace: "pre-line" }}>
                {selectedArticle.content}
              </div>
            </div>

            <div style={{
              padding: "16px 24px", borderTop: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(0,0,0,0.25)",
            }}>
              <button
                onClick={() => copyToClipboard(selectedArticle.content, "article")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8,
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 12, cursor: "pointer",
                }}
              >
                {copiedId === "article" ? <><Check size={13} style={{ color: "#22c55e" }} /> Copied</> : <><Copy size={13} /> Copy Guide</>}
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <Btn
                  onClick={() => { setSelectedArticle(null); handleAskAI(`Explain how to implement: ${selectedArticle.title}`); }}
                  style={{ padding: "8px 16px", fontSize: 12 }}
                >
                  <Sparkles size={13} /> Ask AI Assistant
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT LOG INSPECTOR MODAL ─────────────────────────────── */}
      {selectedLog && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 10001,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(20px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setSelectedLog(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 580,
              background: "var(--card-bg, #0b0f19)",
              border: `1px solid ${C.borderHi}`, borderRadius: 20,
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              animation: "fadeUp 0.2s ease both",
            }}
          >
            <div style={{
              padding: "18px 24px", borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Chat Log Event
                </span>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: "4px 0 0 0", fontFamily: "system-ui" }}>
                  Visitor Question Record
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "none",
                  borderRadius: "50%", width: 32, height: 32,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: C.text, cursor: "pointer",
                }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Question Asked
                </div>
                <div style={{
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 14, fontWeight: 600, fontFamily: "system-ui",
                }}>
                  "{selectedLog.question}"
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.dim }}>Resolution Status</div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, marginTop: 4,
                    color: selectedLog.matched ? "#4ade80" : "#f87171",
                  }}>
                    {selectedLog.matched ? "Matched Approved FAQ" : "Fell Back to Gemini AI"}
                  </div>
                </div>

                <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.dim }}>Logged Timestamp</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 4 }}>
                    {new Date(selectedLog.created_at || Date.now()).toLocaleString()}
                  </div>
                </div>
              </div>

              <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5, fontFamily: "system-ui" }}>
                {!selectedLog.matched 
                  ? "This query was not directly found in your bot's approved FAQs. You can add it as a new FAQ entry in Bot Builder so future inquiries match immediately!" 
                  : "This query matched your bot's FAQ knowledge base and was answered instantly."}
              </p>
            </div>

            <div style={{
              padding: "16px 24px", borderTop: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "rgba(0,0,0,0.25)",
            }}>
              <button
                onClick={() => copyToClipboard(selectedLog.question, "logQ")}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "7px 14px", borderRadius: 8,
                  background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 12, cursor: "pointer",
                }}
              >
                {copiedId === "logQ" ? <><Check size={13} style={{ color: "#22c55e" }} /> Copied</> : <><Copy size={13} /> Copy Question</>}
              </button>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setSelectedLog(null); handleOpenBotBuilder(); }}
                  style={{
                    padding: "8px 14px", borderRadius: 8,
                    background: "rgba(168,85,247,0.15)", border: `1px solid rgba(168,85,247,0.3)`,
                    color: "#c084fc", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  Add to Bot FAQs
                </button>
                <Btn
                  onClick={() => { setSelectedLog(null); handleAskAI(`Provide a comprehensive answer for this customer question: "${selectedLog.question}"`); }}
                  style={{ padding: "8px 14px", fontSize: 12 }}
                >
                  <Sparkles size={13} /> Ask AI
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
