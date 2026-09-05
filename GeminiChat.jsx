import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { 
  Zap, Bot, Headphones, Briefcase, FileText, Code, MessageSquare, Mail, 
  Megaphone, HelpCircle, Sparkles, Globe, Trash2, Download, AlertTriangle, 
  User, Clock, Volume2, VolumeX, Copy, Check, Plus, Info, ExternalLink, 
  Mic, MicOff, Send, Square, X 
} from "lucide-react";
import { C, Card3D, Btn, Badge, globalCSS } from "./theme.jsx";

const NON_DEV_PERSONAS = [
  { id: "axxon", label: "Axxon AI Guide", icon: <Zap size={15} />, desc: "Friendly platform helper & simple AI guidance" },
  { id: "nocode", label: "No-Code Bot Builder", icon: <Bot size={15} />, desc: "Step-by-step guidance on creating & training bots without coding" },
  { id: "support", label: "Customer Support & FAQs", icon: <Headphones size={15} />, desc: "Drafting customer FAQs, welcome greetings & policy templates" },
  { id: "business", label: "Business & Sales Growth", icon: <Briefcase size={15} />, desc: "Sales copy, marketing plans & customer acquisition strategies" },
  { id: "creative", label: "Content & Copywriter", icon: <FileText size={15} />, desc: "Blog posts, social media captions & email newsletters" },
];

const DEV_PERSONAS = [
  { id: "code", label: "Code & Tech Architect", icon: <Code size={15} />, desc: "Software engineering, APIs, database schemas & code snippets" },
  { id: "axxon", label: "Axxon Platform Lead", icon: <Zap size={15} />, desc: "Technical platform architecture & API integrations" },
];

const NON_DEV_SUGGESTED_PROMPTS = [
  { icon: <Bot size={18} color="#22c55e" />, title: "Create Bot Without Code", prompt: "How do I create, train, and launch an AI chatbot for my business in 3 easy steps without coding?" },
  { icon: <MessageSquare size={18} color="#3b82f6" />, title: "Customer Support FAQs", prompt: "Generate 5 high-converting customer support questions and friendly answers for an online shop." },
  { icon: <Mail size={18} color="#8b5cf6" />, title: "Bot Welcome & Greetings", prompt: "Draft a warm welcome greeting and a polite fallback message for my customer service chatbot." },
  { icon: <Megaphone size={18} color="#f59e0b" />, title: "Sales & Marketing Copy", prompt: "Write a 3-paragraph product announcement email to promote a new service to my customers." },
];

const DEV_SUGGESTED_PROMPTS = [
  { icon: <Code size={18} color="#6366f1" />, title: "React & Express Widget", prompt: "Write an example React component and Express API endpoint for embedding a chatbot widget." },
  { icon: <Zap size={18} color="#3b82f6" />, title: "Axxon OS Architecture", prompt: "Explain how Axxon OS handles FAQ matching, tokenization, and Gemini AI fallback." },
];

const QUICK_TEMPLATES = [
  { icon: <MessageSquare size={13} />, label: "Generate 5 FAQs", prompt: "Generate 5 common customer support questions and clear, friendly answers for my business." },
  { icon: <Bot size={13} />, label: "How to Train Bot", prompt: "Explain in simple steps how I can train my chatbot using my business FAQs and website link." },
  { icon: <Mail size={13} />, label: "Draft Welcome Greeting", prompt: "Draft 3 friendly welcome messages for my chatbot to greet website visitors." },
  { icon: <Megaphone size={13} />, label: "Write Sales Pitch", prompt: "Write a short, high-converting product pitch for my online business." },
  { icon: <HelpCircle size={13} />, label: "Explain AI Simply", prompt: "Explain how AI chatbots work in simple, non-technical plain English with analogies." },
];

const GLOSSARY_TERMS = [
  { term: "AI Chatbot", def: "An automated assistant that talks with your website visitors 24/7 to answer questions and capture leads." },
  { term: "Knowledge Base (FAQs)", def: "A list of Question & Answer pairs that your chatbot uses to immediately answer customer questions." },
  { term: "Fallback Contact", def: "A phone number, email, or WhatsApp link your chatbot gives customers when it encounters a question not covered in your FAQs." },
  { term: "Embed Widget", def: "A small code snippet you paste onto your website to display a floating chat bubble in the bottom corner." },
  { term: "Web Search Grounding", def: "Enables Gemini AI to search the live internet in real-time to retrieve up-to-date facts and news." },
  { term: "No-Code Training", def: "Adding questions and answers directly through visual forms without needing to write programming code." },
];

function formatRelativeTime(createdAt, nowTime) {
  if (!createdAt) return "just now";
  const elapsed = Math.max(0, Math.floor((nowTime - createdAt) / 1000));
  if (elapsed < 5) return "just now";
  if (elapsed < 60) return `${elapsed}s ago`;
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatExactTime(createdAt) {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatFullDateTime(createdAt) {
  if (!createdAt) return "";
  return new Date(createdAt).toLocaleString([], {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}

// Simple parser to pull Q&A pairs from AI Markdown output for 1-click saving to bot
function parseFaqsFromText(text) {
  if (!text) return [];
  const faqs = [];
  const lines = text.split('\n');
  let currentQ = "";
  let currentA = "";

  for (let line of lines) {
    const trimmed = line.trim();
    // Detect question patterns like "Q1:", "Q:", "**Question 1:**", "1. Question?"
    if (/^(Q\d*:|\*\*Q\d*:|\*\*Question\s*\d*:?|\d+\.\s*\*\*|\d+\.\s*Q:)/i.test(trimmed) || (trimmed.endsWith('?') && trimmed.length < 120)) {
      if (currentQ && currentA) {
        faqs.push({ q: currentQ.trim(), a: currentA.trim() });
        currentQ = ""; currentA = "";
      }
      currentQ = trimmed.replace(/^(Q\d*:|\*\*Q\d*:|\*\*Question\s*\d*:?|\d+\.\s*\*\*|\d+\.\s*Q:|\*\*)/gi, '').replace(/\*\*/g, '').trim();
    } else if (currentQ) {
      const cleanLine = trimmed.replace(/^(A\d*:|\*\*A\d*:|\*\*Answer\s*\d*:?|A:|\*\*)/gi, '').replace(/\*\*/g, '').trim();
      if (cleanLine) {
        currentA += (currentA ? "\n" : "") + cleanLine;
      }
    }
  }
  if (currentQ && currentA) {
    faqs.push({ q: currentQ.trim(), a: currentA.trim() });
  }
  return faqs;
}

export default function GeminiChat() {
  const [now, setNow] = useState(Date.now());
  const [audienceMode, setAudienceMode] = useState("nocode"); // "nocode" (Non-Developer) | "dev" (Developer)
  const [persona, setPersona] = useState("nocode");
  const [webSearch, setWebSearch] = useState(false);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [errorNotice, setErrorNotice] = useState(null);

  // Speech Recognition (Voice Input) State
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [speechError, setSpeechError] = useState(null);

  // Speech Synthesis (Read Aloud) State
  const [speakingMsgId, setSpeakingMsgId] = useState(null);

  // Knowledge Base Save Modal State
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [parsedFaqs, setParsedFaqs] = useState([]);
  const [userBots, setUserBots] = useState([]);
  const [selectedBotId, setSelectedBotId] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  // Glossary Modal
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);
  const recognitionRef = useRef(null);

  const currentPersonas = audienceMode === "nocode" ? NON_DEV_PERSONAS : DEV_PERSONAS;
  const currentSuggestedPrompts = audienceMode === "nocode" ? NON_DEV_SUGGESTED_PROMPTS : DEV_SUGGESTED_PROMPTS;

  const [messages, setMessages] = useState([
    {
      id: "welcome-1",
      role: "model",
      text: "Hello! Welcome to **Axxon Gemini 3.6 AI**. I am your personal AI assistant ready to help you create chatbots, write customer FAQs, draft sales copy, or answer any questions in clear, simple language.",
      createdAt: Date.now(),
      persona: "nocode"
    }
  ]);

  // Sync persona when switching audience mode
  useEffect(() => {
    if (audienceMode === "nocode") {
      setPersona("nocode");
    } else {
      setPersona("code");
    }
  }, [audienceMode]);

  // Live relative time timer
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Web Speech API initialization for microphone voice input
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Fetch user bots for Knowledge Base saving feature
  useEffect(() => {
    const token = localStorage.getItem("axxon_token");
    if (token) {
      fetch("/api/bots", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data)) {
            setUserBots(data);
            if (data.length > 0) setSelectedBotId(data[0].id);
          }
        })
        .catch(() => {});
    }

    const handleInsertPrompt = (e) => {
      if (e.detail?.prompt) {
        setInput(e.detail.prompt);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    };
    window.addEventListener("axxon_insert_prompt", handleInsertPrompt);
    return () => window.removeEventListener("axxon_insert_prompt", handleInsertPrompt);
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setErrorNotice("Web Speech API is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    try {
      setSpeechError(null);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      let initialBaseText = input ? input.trim() + " " : "";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            currentFinal += transcriptText + " ";
          } else {
            currentInterim += transcriptText;
          }
        }

        if (currentFinal) {
          initialBaseText += currentFinal;
        }

        setInput(initialBaseText + currentInterim);
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        if (event.error === "no-speech") {
          setSpeechError("No speech detected. Please speak clearly into your microphone.");
        } else if (event.error === "not-allowed" || event.error === "permission-denied") {
          setSpeechError("Microphone permission denied. Please allow microphone access in browser settings.");
        } else {
          setSpeechError(`Speech error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setSpeechError("Failed to initialize microphone voice input.");
      setIsListening(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Handle Text-To-Speech (Read Aloud)
  const handleReadAloud = (msgId, text) => {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) {
      setErrorNotice("Text-To-Speech is not supported in this browser.");
      return;
    }

    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    // Remove markdown symbols for clean speech output
    const cleanText = text.replace(/[*_#`~>\[\]()\-]/g, ' ').replace(/\n+/g, '. ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);

    setSpeakingMsgId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Magic Polish feature: rewrites short/rough input into a detailed, high-performing prompt
  const handleMagicPolish = () => {
    if (!input.trim()) return;
    const raw = input.trim();
    let polished = "";

    if (/faq|question/i.test(raw)) {
      polished = `Act as an expert customer service lead. Generate 5 common customer questions and clear, helpful, high-converting answers for my business regarding "${raw}". Format as Q: and A: pairs.`;
    } else if (/bot|chatbot|train/i.test(raw)) {
      polished = `Act as a No-Code AI Bot Consultant. Explain step-by-step in simple, jargon-free plain English how I can set up, train, and launch an AI chatbot for "${raw}" without writing any programming code.`;
    } else if (/email|pitch|sell|market/i.test(raw)) {
      polished = `Act as a top business copywriter. Draft a high-converting 3-paragraph marketing email and promotional pitch for "${raw}". Keep the tone engaging, clear, and professional.`;
    } else {
      polished = `Act as a helpful business consultant. Provide a clear, structured, step-by-step response for: "${raw}". Explain everything in plain, easy-to-understand English without technical jargon.`;
    }

    setInput(polished);
  };

  // One-click action to request Gemini to explain previous answer in simple terms
  const handleExplainSimply = (previousText) => {
    const prompt = `Please re-explain the previous answer using simple, plain English without any technical jargon. Use short paragraphs and simple bullet points:\n\n"${previousText.slice(0, 300)}..."`;
    handleSend(prompt, true);
  };

  // Open Save to Bot Knowledge Base Modal
  const handleOpenSaveModal = (text) => {
    const parsed = parseFaqsFromText(text);
    if (parsed.length === 0) {
      // Fallback: create 1 Q&A pair from summary
      setParsedFaqs([{ q: "General Information", a: text.slice(0, 300) }]);
    } else {
      setParsedFaqs(parsed);
    }
    setSaveStatus("");
    setSaveModalOpen(true);
  };

  // Save parsed FAQs to selected Bot
  const handleSaveFaqsToBot = async () => {
    if (parsedFaqs.length === 0) return;
    setSaveStatus("Saving...");
    const token = localStorage.getItem("axxon_token");

    if (selectedBotId && userBots.length > 0) {
      const targetBot = userBots.find(b => b.id === selectedBotId);
      if (targetBot) {
        const existingFaqs = Array.isArray(targetBot.faqs) ? targetBot.faqs : [];
        const updatedFaqs = [...existingFaqs, ...parsedFaqs];
        try {
          const res = await fetch(`/api/bots/${selectedBotId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              name: targetBot.name,
              website: targetBot.website,
              fallback_contact: targetBot.fallback_contact,
              faqs: updatedFaqs
            })
          });
          if (res.ok) {
            setSaveStatus("Successfully saved to your bot FAQs!");
            setTimeout(() => setSaveModalOpen(false), 1800);
            return;
          }
        } catch (err) {
          console.error("Save error:", err);
        }
      }
    }

    // Local Storage draft fallback
    try {
      const localKey = "axxon_draft_faqs";
      const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
      localStorage.setItem(localKey, JSON.stringify([...existing, ...parsedFaqs]));
      setSaveStatus("Saved to your local FAQ draft library!");
      setTimeout(() => setSaveModalOpen(false), 1800);
    } catch {
      setSaveStatus("Failed to save FAQs.");
    }
  };

  // Handle Send Message via SSE Streaming
  const handleSend = async (textToSend, forceSimple = false) => {
    const promptText = (textToSend || input).trim();
    if (!promptText || isGenerating) return;

    setErrorNotice(null);
    setInput("");

    const nowMs = Date.now();
    const userMsgId = `user-${nowMs}`;
    const userMsg = {
      id: userMsgId,
      role: "user",
      text: promptText,
      createdAt: nowMs
    };

    const aiMsgId = `ai-${nowMs + 1}`;
    const aiMsg = {
      id: aiMsgId,
      role: "model",
      text: "",
      streaming: true,
      persona,
      createdAt: nowMs + 1,
      groundingChunks: []
    };

    setMessages(prev => [...prev, userMsg, aiMsg]);
    setIsGenerating(true);

    abortControllerRef.current = new AbortController();

    try {
      const historyForApi = messages
        .filter(m => !m.error)
        .map(m => ({ role: m.role, text: m.text }));

      const response = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: promptText,
          history: historyForApi,
          persona,
          webSearch,
          temperature: 0.7,
          simpleMode: audienceMode === "nocode" || forceSimple
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";
      let groundingList = [];

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunkString = decoder.decode(value, { stream: true });
        const lines = chunkString.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.replace("data: ", "").trim();
            if (dataStr === "[DONE]") {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.chunk) {
                accumulatedText += parsed.chunk;
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiMsgId
                      ? { ...msg, text: accumulatedText }
                      : msg
                  )
                );
              }
              if (parsed.groundingChunks) {
                groundingList = [...groundingList, ...parsed.groundingChunks];
                setMessages(prev =>
                  prev.map(msg =>
                    msg.id === aiMsgId
                      ? { ...msg, groundingChunks: groundingList }
                      : msg
                  )
                );
              }
            } catch {
              // Ignore chunk parse glitch
            }
          }
        }
      }

      // Finalize streaming
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMsgId
            ? { ...msg, streaming: false, text: accumulatedText || "No response received." }
            : msg
        )
      );
    } catch (err) {
      if (err.name === "AbortError") {
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMsgId
              ? { ...msg, streaming: false, text: (msg.text || "") + " _[Generation stopped by user]_" }
              : msg
          )
        );
      } else {
        console.error("AI Stream Error:", err);
        setErrorNotice(err.message || "Failed to communicate with Gemini AI");
        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMsgId
              ? {
                  ...msg,
                  streaming: false,
                  error: true,
                  text: `**Error:** ${err.message || "Unable to fetch AI response. Please verify server connection."}`
                }
              : msg
          )
        );
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClear = () => {
    const nowMs = Date.now();
    setMessages([
      {
        id: `welcome-${nowMs}`,
        role: "model",
        text: "Chat cleared! How can I assist you today with Gemini 3.6 AI?",
        createdAt: nowMs,
        persona
      }
    ]);
  };

  const handleCopyText = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `axxon_gemini_chat_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const activePersonaObj = currentPersonas.find(p => p.id === persona) || currentPersonas[0];

  // Markdown renderer supporting code blocks, lists, tables, bold/italic, blockquotes, links
  const renderFormattedContent = (content) => {
    if (!content) return null;

    return (
      <div className="markdown-body" style={{ color: C.text, fontSize: 14, lineHeight: 1.65 }}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            pre({ children }) {
              return <>{children}</>;
            },
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const codeString = String(children).replace(/\n$/, '');
              const isBlock = match || codeString.includes('\n') || (node && node.position && node.position.start.line !== node.position.end.line);

              if (!isBlock && !match) {
                return (
                  <code
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      color: "#a5b4fc",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontFamily: "'Fira Code', 'Courier New', monospace",
                      fontSize: "0.88em",
                      border: "1px solid rgba(99,102,241,0.25)",
                      wordBreak: "break-word"
                    }}
                    {...props}
                  >
                    {children}
                  </code>
                );
              }

              const lang = match ? match[1] : 'code';
              const blockId = `code-block-${Math.random().toString(36).substring(2, 8)}`;

              return (
                <div style={{
                  margin: "12px 0",
                  background: "#080b14",
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  overflow: "hidden"
                }}>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "6px 14px", background: "rgba(255,255,255,0.03)",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    fontSize: 11, fontFamily: "'Orbitron', monospace", color: C.indigo
                  }}>
                    <span style={{ textTransform: "lowercase" }}>{lang}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyText(blockId, codeString)}
                      style={{
                        background: "transparent", border: "none", color: C.muted,
                        cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4
                      }}
                    >
                      {copiedId === blockId ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                  <pre style={{
                    padding: "12px 16px", margin: 0, overflowX: "auto",
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    fontSize: 13, lineHeight: 1.6, color: "#e2e8f0"
                  }}>
                    <code>{codeString}</code>
                  </pre>
                </div>
              );
            },
            p({ children }) {
              return <p style={{ margin: "0 0 10px 0", lineHeight: 1.65 }}>{children}</p>;
            },
            h1({ children }) {
              return <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, color: "#ffffff", margin: "16px 0 8px 0" }}>{children}</h1>;
            },
            h2({ children }) {
              return <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 700, color: "#f3f4f6", margin: "14px 0 8px 0" }}>{children}</h2>;
            },
            h3({ children }) {
              return <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 700, color: C.indigo, margin: "12px 0 6px 0" }}>{children}</h3>;
            },
            ul({ children }) {
              return <ul style={{ margin: "6px 0 12px 0", paddingLeft: 22, listStyleType: "disc" }}>{children}</ul>;
            },
            ol({ children }) {
              return <ol style={{ margin: "6px 0 12px 0", paddingLeft: 22, listStyleType: "decimal" }}>{children}</ol>;
            },
            li({ children }) {
              return <li style={{ marginBottom: 4 }}>{children}</li>;
            },
            blockquote({ children }) {
              return (
                <blockquote style={{
                  margin: "10px 0",
                  padding: "10px 16px",
                  background: "rgba(99,102,241,0.08)",
                  borderLeft: `3px solid ${C.indigo}`,
                  borderRadius: "0 8px 8px 0",
                  fontStyle: "italic",
                  color: C.muted
                }}>
                  {children}
                </blockquote>
              );
            },
            table({ children }) {
              return (
                <div style={{ overflowX: "auto", margin: "12px 0" }}>
                  <table style={{
                    width: "100%", borderCollapse: "collapse",
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${C.border}`,
                    borderRadius: 8, fontSize: 13
                  }}>
                    {children}
                  </table>
                </div>
              );
            },
            th({ children }) {
              return (
                <th style={{
                  padding: "8px 12px", border: `1px solid ${C.border}`,
                  background: "rgba(255,255,255,0.05)", color: "#fff",
                  fontWeight: 700, textAlign: "left"
                }}>
                  {children}
                </th>
              );
            },
            td({ children }) {
              return (
                <td style={{ padding: "8px 12px", border: `1px solid ${C.border}`, color: C.text }}>
                  {children}
                </td>
              );
            },
            a({ href, children }) {
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#60a5fa", textDecoration: "underline", textUnderlineOffset: 3 }}
                >
                  {children}
                </a>
              );
            },
            strong({ children }) {
              return <strong style={{ color: "#ffffff", fontWeight: 700 }}>{children}</strong>;
            },
            em({ children }) {
              return <em style={{ fontStyle: "italic", color: "#e2e8f0" }}>{children}</em>;
            },
            hr() {
              return <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "16px 0" }} />;
            }
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div style={{ width: "100%", maxWidth: 1080, margin: "0 auto", animation: "fadeUp 0.5s ease both" }}>
      
      {/* ── AUDIENCE MODE SELECTION BANNER ───────────────────────────────── */}
      <Card3D intensity={2} style={{
        background: "rgba(10,12,24,0.88)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${C.border}`, borderRadius: 20,
        padding: "20px 24px", marginBottom: 20,
        display: "flex", flexDirection: "column", gap: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: audienceMode === "nocode" ? "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(99,102,241,0.25))" : "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(59,130,246,0.2))",
              border: `1px solid ${audienceMode === "nocode" ? "#22c55e" : C.indigo}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: audienceMode === "nocode" ? "0 0 16px rgba(34,197,94,0.3)" : "0 0 16px rgba(99,102,241,0.25)"
            }}>
              {audienceMode === "nocode" ? <Sparkles size={20} color="#22c55e" /> : <Zap size={20} color={C.indigo} />}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2 style={{
                  fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900,
                  color: C.text, letterSpacing: "0.08em", margin: 0
                }}>
                  GEMINI AI CHAT
                </h2>
                <Badge color={audienceMode === "nocode" ? "#22c55e" : C.indigo}>
                  {audienceMode === "nocode" ? "BUSINESS & NO-CODE MODE" : "DEVELOPER MODE"}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui", marginTop: 2 }}>
                {audienceMode === "nocode"
                  ? "Tailored for business owners, creators & teams — plain English, zero code required"
                  : "Tailored for software engineers — API integrations, JSON schemas & code snippets"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Audience Mode Switcher */}
            <div style={{
              display: "flex", background: "rgba(0,0,0,0.4)",
              padding: 4, borderRadius: 12, border: `1px solid ${C.border}`
            }}>
              <button
                type="button"
                onClick={() => setAudienceMode("nocode")}
                style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: audienceMode === "nocode" ? "linear-gradient(135deg, #22c55e, #16a34a)" : "transparent",
                  color: audienceMode === "nocode" ? "#000" : C.muted,
                  fontSize: 11, fontWeight: 800, fontFamily: "system-ui",
                  border: "none", cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", gap: 5
                }}
              >
                <Sparkles size={12} />
                <span>Non-Developer / Creators</span>
              </button>
              <button
                type="button"
                onClick={() => setAudienceMode("dev")}
                style={{
                  padding: "6px 14px", borderRadius: 8,
                  background: audienceMode === "dev" ? C.grad : "transparent",
                  color: audienceMode === "dev" ? "#fff" : C.muted,
                  fontSize: 11, fontWeight: 800, fontFamily: "system-ui",
                  border: "none", cursor: "pointer", transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", gap: 5
                }}
              >
                <Code size={12} />
                <span>Developer</span>
              </button>
            </div>

            {/* Non-Tech Glossary Helper Modal Trigger */}
            <button
              type="button"
              onClick={() => setGlossaryOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "8px 12px", borderRadius: 10,
                background: "rgba(99,102,241,0.1)",
                border: "1px solid rgba(99,102,241,0.3)",
                color: C.indigo, fontSize: 12, fontWeight: 700, cursor: "pointer"
              }}
              title="Open Jargon Glossary"
            >
              <HelpCircle size={13} />
              <span>Terms Glossary</span>
            </button>

            {/* Search Grounding Toggle */}
            <button
              type="button"
              onClick={() => setWebSearch(!webSearch)}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 12px", borderRadius: 10,
                background: webSearch ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${webSearch ? "#22c55e" : C.border}`,
                color: webSearch ? "#4ade80" : C.muted,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s ease"
              }}
              title="Enable live Google Search grounding for real-time facts"
            >
              <Globe size={13} />
              <span>Web Search</span>
              <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 6,
                background: webSearch ? "#22c55e" : C.dim, color: "#000", fontWeight: 800
              }}>
                {webSearch ? "ON" : "OFF"}
              </span>
            </button>

            <Btn onClick={handleClear} variant="ghost" style={{ padding: "8px 12px", fontSize: 11, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 5 }}>
              <Trash2 size={12} /> Clear
            </Btn>
            <Btn onClick={handleExportJson} variant="ghost" style={{ padding: "8px 12px", fontSize: 11, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 5 }}>
              <Download size={12} /> Export
            </Btn>
          </div>
        </div>

        {/* Persona Mode Pills */}
        <div>
          <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, fontFamily: "'Orbitron', monospace", marginBottom: 8, letterSpacing: "0.05em" }}>
            SELECT ASSISTANT SPECIALTY:
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {currentPersonas.map(p => (
              <button
                key={p.id}
                onClick={() => setPersona(p.id)}
                style={{
                  padding: "8px 14px", borderRadius: 10,
                  background: persona === p.id ? (audienceMode === "nocode" ? "linear-gradient(135deg, rgba(34,197,94,0.2), rgba(99,102,241,0.2))" : C.grad) : "rgba(255,255,255,0.03)",
                  border: `1px solid ${persona === p.id ? (audienceMode === "nocode" ? "#22c55e" : C.indigo) : C.border}`,
                  color: persona === p.id ? "#fff" : C.muted,
                  fontSize: 12, fontWeight: persona === p.id ? 700 : 500,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                  whiteSpace: "nowrap", transition: "all 0.2s ease"
                }}
                title={p.desc}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Card3D>

      {/* ── CHAT MESSAGES CONTAINER ────────────────────────────────────── */}
      <Card3D intensity={1} style={{
        background: "rgba(6,8,18,0.85)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        border: `1px solid ${C.border}`, borderRadius: 20,
        padding: "24px", minHeight: 460, maxHeight: 600,
        overflowY: "auto", display: "flex", flexDirection: "column", gap: 20,
        position: "relative"
      }}>
        {errorNotice && (
          <div style={{
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5", padding: "12px 16px", borderRadius: 12, fontSize: 13,
            display: "flex", alignItems: "center", justifyContent: "space-between"
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><AlertTriangle size={14} /> {errorNotice}</span>
            <button onClick={() => setErrorNotice(null)} style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", display: "inline-flex", alignItems: "center" }}>
              <X size={14} />
            </button>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isUser ? "row-reverse" : "row",
                gap: 14, alignItems: "flex-start",
                animation: "fadeUp 0.3s ease both"
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: isUser
                  ? "linear-gradient(135deg, #3b82f6, #1d4ed8)"
                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff",
                boxShadow: isUser ? "0 0 12px rgba(59,130,246,0.3)" : "0 0 12px rgba(99,102,241,0.3)"
              }}>
                {isUser ? <User size={18} /> : (activePersonaObj.icon || <Bot size={18} />)}
              </div>

              {/* Bubble Content */}
              <div style={{
                maxWidth: "85%",
                background: isUser
                  ? "rgba(59,130,246,0.12)"
                  : "rgba(255,255,255,0.035)",
                border: `1px solid ${isUser ? "rgba(59,130,246,0.3)" : C.border}`,
                borderRadius: isUser ? "18px 4px 18px 18px" : "4px 18px 18px 18px",
                padding: "16px 20px",
                color: C.text, fontSize: 14, lineHeight: 1.65, fontFamily: "system-ui",
                boxShadow: isUser ? "0 4px 20px rgba(59,130,246,0.1)" : "0 4px 20px rgba(0,0,0,0.2)"
              }}>
                {/* Message Meta Header */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  marginBottom: 10, fontSize: 11, color: C.dim, fontFamily: "'Orbitron', monospace",
                  flexWrap: "wrap", gap: 6
                }}>
                  <span>{isUser ? "YOU" : `GEMINI AI (${activePersonaObj.label.toUpperCase()})`}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {/* Timestamp Badge */}
                    <span
                      title={formatFullDateTime(msg.createdAt)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "2px 8px", borderRadius: 6,
                        background: isUser ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.06)",
                        border: `1px solid ${isUser ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.1)"}`,
                        color: isUser ? "#93c5fd" : C.indigo,
                        fontSize: 10, fontWeight: 600, letterSpacing: "0.02em"
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={10} /> {formatExactTime(msg.createdAt || Date.now())}
                      </span>
                      <span style={{ opacity: 0.5 }}>•</span>
                      <span style={{ color: isUser ? "#bfdbfe" : "#a5b4fc", fontWeight: 700 }}>
                        {formatRelativeTime(msg.createdAt, now)}
                      </span>
                    </span>

                    {!isUser && msg.text && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {/* Voice Read Aloud Button */}
                        <button
                          onClick={() => handleReadAloud(msg.id, msg.text)}
                          style={{
                            background: speakingMsgId === msg.id ? "rgba(239,68,68,0.2)" : "transparent",
                            border: `1px solid ${speakingMsgId === msg.id ? "#f87171" : "transparent"}`,
                            borderRadius: 6, color: speakingMsgId === msg.id ? "#f87171" : C.indigo,
                            cursor: "pointer", fontSize: 11, padding: "2px 6px", display: "flex", alignItems: "center", gap: 4
                          }}
                          title="Listen to response read aloud"
                        >
                          {speakingMsgId === msg.id ? <><VolumeX size={11} /> Stop Voice</> : <><Volume2 size={11} /> Listen</>}
                        </button>

                        {/* Copy Button */}
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          style={{
                            background: "transparent", border: "none", color: C.indigo,
                            cursor: "pointer", fontSize: 11, padding: 0, display: "flex", alignItems: "center", gap: 3
                          }}
                        >
                          {copiedId === msg.id ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Body Text */}
                <div>
                  {renderFormattedContent(msg.text)}
                  {msg.streaming && (
                    <span style={{
                      display: "inline-block", width: 8, height: 16,
                      background: C.indigo, marginLeft: 4, verticalAlign: "middle",
                      animation: "pulse 0.8s infinite"
                    }} />
                  )}
                </div>

                {/* Non-Developer Helpful Quick Actions on AI Response */}
                {!isUser && msg.text && !msg.streaming && (
                  <div style={{
                    marginTop: 14, paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center"
                  }}>
                    {/* Explain Simply Button */}
                    <button
                      type="button"
                      onClick={() => handleExplainSimply(msg.text)}
                      style={{
                        padding: "5px 10px", borderRadius: 8,
                        background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)",
                        color: C.indigo, fontSize: 11, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4
                      }}
                      title="Re-explain this response in plain English without jargon"
                    >
                      <HelpCircle size={12} />
                      <span>Explain Simply (No Jargon)</span>
                    </button>

                    {/* Save to Bot Knowledge Base */}
                    <button
                      type="button"
                      onClick={() => handleOpenSaveModal(msg.text)}
                      style={{
                        padding: "5px 10px", borderRadius: 8,
                        background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
                        color: "#4ade80", fontSize: 11, fontWeight: 700, cursor: "pointer",
                        display: "flex", alignItems: "center", gap: 4
                      }}
                      title="Extract and save FAQs directly to your chatbot knowledge base"
                    >
                      <Plus size={12} />
                      <span>Save to Bot Knowledge Base</span>
                    </button>
                  </div>
                )}

                {/* Grounding Web Sources */}
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                  <div style={{
                    marginTop: 14, paddingTop: 10,
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                    fontSize: 11, color: C.muted
                  }}>
                    <div style={{ fontWeight: 700, color: C.indigo, marginBottom: 4, fontFamily: "'Orbitron', monospace", display: "flex", alignItems: "center", gap: 4 }}>
                      <Globe size={12} /> GROUNDED SOURCES:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {msg.groundingChunks.map((chunk, cIdx) => {
                        const web = chunk.web;
                        if (!web) return null;
                        return (
                          <a
                            key={cIdx}
                            href={web.uri}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              padding: "3px 8px", borderRadius: 6,
                              background: "rgba(255,255,255,0.05)",
                              border: `1px solid ${C.border}`,
                              color: "#60a5fa", textDecoration: "none", fontSize: 11,
                              display: "inline-flex", alignItems: "center", gap: 4
                            }}
                          >
                            <ExternalLink size={10} /> {web.title || web.uri}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Suggested Starter Cards when chat is minimal */}
        {messages.length <= 1 && (
          <div style={{ marginTop: 12 }}>
            <div style={{
              fontSize: 11, letterSpacing: "0.2em", color: C.dim,
              fontFamily: "'Orbitron', monospace", marginBottom: 12
            }}>
              ◆ SUGGESTED PROMPTS ({audienceMode === "nocode" ? "BUSINESS & NO-CODE" : "DEVELOPER"})
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              {currentSuggestedPrompts.map((sp, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSend(sp.prompt)}
                  style={{
                    padding: "14px 16px", borderRadius: 14,
                    background: "rgba(255,255,255,0.025)",
                    border: `1px solid ${C.border}`,
                    cursor: "pointer", transition: "all 0.2s ease"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = C.indigo;
                    e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = C.border;
                    e.currentTarget.style.background = "rgba(255,255,255,0.025)";
                  }}
                >
                  <div style={{ marginBottom: 6 }}>{sp.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4, fontFamily: "system-ui" }}>
                    {sp.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui", lineHeight: 1.4 }}>
                    {sp.prompt}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </Card3D>

      {/* ── QUICK TEMPLATE GENERATOR PILLS ───────────────────────────── */}
      <div style={{ marginTop: 14, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Orbitron', monospace", alignSelf: "center", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
          <Zap size={11} /> QUICK TEMPLATES:
        </span>
        {QUICK_TEMPLATES.map((qt, qIdx) => (
          <button
            key={qIdx}
            type="button"
            onClick={() => handleSend(qt.prompt)}
            style={{
              padding: "6px 12px", borderRadius: 18,
              background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
              color: C.text, fontSize: 11, fontWeight: 600, fontFamily: "system-ui",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
              transition: "all 0.2s ease"
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.indigo)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
          >
            <span>{qt.icon}</span>
            <span>{qt.label}</span>
          </button>
        ))}
      </div>

      {/* ── INPUT CONTROL BAR ────────────────────────────────────────── */}
      <Card3D intensity={2} style={{
        background: "rgba(10,12,24,0.85)",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${C.border}`, borderRadius: 20,
        padding: "16px 20px", marginTop: 12
      }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ display: "flex", gap: 10, alignItems: "center" }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={
              audienceMode === "nocode"
                ? `Ask Gemini AI (${activePersonaObj.label}) in plain English... e.g. "Draft 5 FAQs for my store"`
                : `Message Gemini 3.6 AI (${activePersonaObj.label})... Press Enter to send.`
            }
            rows={2}
            disabled={isGenerating}
            style={{
              flex: 1, background: "rgba(0,0,0,0.5)",
              border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "12px 16px", color: C.text, fontSize: 14,
              fontFamily: "system-ui", outline: "none", resize: "none",
              transition: "border-color 0.2s ease"
            }}
            onFocus={(e) => (e.target.style.borderColor = C.indigo)}
            onBlur={(e) => (e.target.style.borderColor = C.border)}
          />

          {/* Magic Prompt Polish Button */}
          <button
            type="button"
            onClick={handleMagicPolish}
            disabled={!input.trim() || isGenerating}
            title="Magic Polish: Upgrade your rough input into a structured, high-performing AI prompt"
            style={{
              height: 52, padding: "0 14px", borderRadius: 12,
              background: input.trim() ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${input.trim() ? C.indigo : "rgba(255,255,255,0.05)"}`,
              color: input.trim() ? C.indigo : C.dim,
              fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron', monospace",
              cursor: input.trim() && !isGenerating ? "pointer" : "not-allowed",
              display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap"
            }}
          >
            <Sparkles size={13} />
            <span>Magic Polish</span>
          </button>

          {/* Microphone Voice Input Button */}
          <button
            type="button"
            onClick={toggleListening}
            disabled={isGenerating || !speechSupported}
            title={
              !speechSupported
                ? "Web Speech API is not supported in this browser"
                : isListening
                ? "Stop voice input"
                : "Voice input via microphone (Web Speech API)"
            }
            style={{
              height: 52,
              padding: isListening ? "0 18px" : "0 16px",
              borderRadius: 12,
              background: isListening
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : speechSupported
                ? "rgba(255,255,255,0.05)"
                : "rgba(255,255,255,0.02)",
              border: `1px solid ${isListening ? "#f87171" : speechSupported ? C.border : "rgba(255,255,255,0.05)"}`,
              color: isListening ? "#fff" : speechSupported ? C.text : C.dim,
              cursor: speechSupported && !isGenerating ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              boxShadow: isListening ? "0 0 18px rgba(239,68,68,0.5)" : "none",
              transition: "all 0.2s ease"
            }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            {isListening && (
              <span style={{ fontSize: 11, fontFamily: "'Orbitron', monospace", letterSpacing: "0.05em" }}>
                REC...
              </span>
            )}
          </button>

          {isGenerating ? (
            <Btn
              type="button"
              onClick={handleStop}
              style={{
                height: 52, padding: "0 24px",
                background: "linear-gradient(135deg, #ef4444, #dc2626)",
                boxShadow: "0 4px 16px rgba(239,68,68,0.4)",
                display: "flex", alignItems: "center", gap: 6
              }}
            >
              <Square size={13} /> Stop
            </Btn>
          ) : (
            <Btn
              type="submit"
              disabled={!input.trim()}
              style={{
                height: 52, padding: "0 26px",
                opacity: !input.trim() ? 0.5 : 1,
                display: "flex", alignItems: "center", gap: 6
              }}
            >
              <span>Send</span>
              <Send size={14} />
            </Btn>
          )}
        </form>

        {/* Status bar */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
          marginTop: 10, fontSize: 11, color: C.dim, fontFamily: "system-ui"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Press Shift + Enter for new line &nbsp;·&nbsp; Mode: </span>
            <span style={{ color: audienceMode === "nocode" ? "#4ade80" : C.indigo, fontWeight: 700 }}>
              {audienceMode === "nocode" ? "Non-Developer Friendly" : "Developer Technical"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isListening && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#f87171", fontWeight: 600 }}>
                <span style={{
                  display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                  background: "#ef4444", animation: "pulse 0.8s infinite"
                }} />
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mic size={12} /> Listening... Speak into microphone</span>
              </div>
            )}

            {speechError && !isListening && (
              <div style={{ color: "#fca5a5", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                <AlertTriangle size={12} />
                <span>{speechError}</span>
                <button
                  onClick={() => setSpeechError(null)}
                  style={{ background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", padding: 0, display: "inline-flex", alignItems: "center" }}
                  aria-label="Dismiss speech error"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {isGenerating && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: C.indigo }}>
                <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: C.indigo }} />
                <span>Streaming response...</span>
              </div>
            )}
          </div>
        </div>
      </Card3D>

      {/* ── SAVE TO BOT KNOWLEDGE BASE MODAL ─────────────────────────── */}
      {saveModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <Card3D intensity={4} style={{
            maxWidth: 540, width: "100%", background: "#0b0e1b",
            border: "1px solid rgba(34,197,94,0.4)", borderRadius: 20,
            padding: "28px", boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Plus size={20} color="#22c55e" />
                <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: "#fff", margin: 0 }}>
                  Save to Bot Knowledge Base
                </h3>
              </div>
              <button
                onClick={() => setSaveModalOpen(false)}
                style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 20 }}>
              Easily import these generated Q&A pairs into your chatbot's FAQ memory so your chatbot can immediately answer them for visitors.
            </p>

            {/* Target Bot Selection */}
            {userBots.length > 0 ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.indigo, fontFamily: "'Orbitron', monospace", display: "block", marginBottom: 6 }}>
                  SELECT YOUR BOT:
                </label>
                <select
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    background: "rgba(0,0,0,0.5)", border: `1px solid ${C.border}`,
                    color: "#fff", fontSize: 13, outline: "none"
                  }}
                >
                  {userBots.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.faqs?.length || 0} FAQs)</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{
                padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.03)",
                border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, marginBottom: 16,
                display: "flex", alignItems: "center", gap: 6
              }}>
                <Info size={14} color={C.indigo} /> No active online bots found. FAQs will be saved as a local draft so you can attach them when creating a bot.
              </div>
            )}

            {/* Q&A Preview List */}
            <div style={{
              maxHeight: 220, overflowY: "auto", background: "rgba(0,0,0,0.4)",
              border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px",
              marginBottom: 20, display: "flex", flexDirection: "column", gap: 10
            }}>
              {parsedFaqs.map((f, idx) => (
                <div key={idx} style={{ padding: "8px 10px", background: "rgba(255,255,255,0.02)", borderRadius: 8, borderLeft: "3px solid #22c55e" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>Q: {f.q}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>A: {f.a}</div>
                </div>
              ))}
            </div>

            {saveStatus && (
              <div style={{ fontSize: 12, fontWeight: 700, color: saveStatus.includes("Successfully") || saveStatus.includes("Saved") ? "#4ade80" : "#fca5a5", marginBottom: 16, textAlign: "center" }}>
                {saveStatus}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <Btn variant="ghost" onClick={() => setSaveModalOpen(false)} style={{ fontSize: 12 }}>
                Cancel
              </Btn>
              <Btn onClick={handleSaveFaqsToBot} style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#000", fontWeight: 800, fontSize: 12 }}>
                Confirm & Add {parsedFaqs.length} Q&A Pairs
              </Btn>
            </div>
          </Card3D>
        </div>
      )}

      {/* ── JARGON GLOSSARY MODAL ─────────────────────────────────────── */}
      {glossaryOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999,
          background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20
        }}>
          <Card3D intensity={4} style={{
            maxWidth: 580, width: "100%", background: "#0b0e1b",
            border: `1px solid ${C.indigo}`, borderRadius: 20,
            padding: "28px", boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <HelpCircle size={20} color={C.indigo} />
                <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: "#fff", margin: 0 }}>
                  Non-Developer AI Terms Glossary
                </h3>
              </div>
              <button
                onClick={() => setGlossaryOpen(false)}
                style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", display: "inline-flex", alignItems: "center" }}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.5, marginBottom: 20 }}>
              A simple guide explaining common AI and chatbot terms in plain English:
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12,
              maxHeight: 340, overflowY: "auto", paddingRight: 4
            }}>
              {GLOSSARY_TERMS.map((g, idx) => (
                <div key={idx} style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.indigo, fontFamily: "'Orbitron', monospace", marginBottom: 4 }}>
                    {g.term}
                  </div>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                    {g.def}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, textAlign: "right" }}>
              <Btn onClick={() => setGlossaryOpen(false)} style={{ fontSize: 12 }}>
                Got it, close
              </Btn>
            </div>
          </Card3D>
        </div>
      )}

      <style>{globalCSS}</style>
    </div>
  );
}
