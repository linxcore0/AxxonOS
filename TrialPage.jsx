import { useState } from "react";
import { Sparkles, Bot, MessageSquare, Clock, Zap, Layers, ArrowRight, CheckCircle2 } from "lucide-react";
import { C, SceneBg, Card3D, Btn, Badge, Glass, globalCSS } from "./theme.jsx";
import Navbar from "./Navbar";

export default function TrialPage({ user, onTrialActivated, onSubscribe, onDashboard, onLogout }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState({ text: "", ok: false });
  const [currency, setCurrency] = useState(user?.currency || localStorage.getItem("axxon_currency") || "USD");

  const token = localStorage.getItem("axxon_token") || user?.token;

  async function handleClaimTrial() {
    setLoading(true);
    setMsg({ text: "", ok: false });
    try {
      const res = await fetch("/api/user/claim-trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to activate trial");

      setMsg({ text: data.message || "3-Day Free Trial activated successfully!", ok: true });
      localStorage.setItem("axxon_plan", "trial");
      localStorage.setItem("axxon_bots", "2");

      setTimeout(() => {
        if (onTrialActivated) {
          onTrialActivated({ plan: "trial", bots: 2 });
        } else if (onDashboard) {
          onDashboard();
        }
      }, 1200);
    } catch (err) {
      setMsg({ text: err.message, ok: false });
    } finally {
      setLoading(false);
    }
  }

  const userEmail = (() => {
    try {
      if (user?.email) return user.email;
      const tok = localStorage.getItem("axxon_token");
      return JSON.parse(atob(tok?.split(".")[1]))?.email || "Valued Client";
    } catch {
      return "Valued Client";
    }
  })();

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column" }}>
      <SceneBg />

      {/* Global Responsive Navigation Bar */}
      <Navbar
        page="trial"
        user={{ ...user, email: userEmail }}
        onLogout={onLogout}
        onNavigate={(p) => {
          if (p === "dashboard" && onDashboard) onDashboard();
        }}
        currentCurrency={currency}
        onCurrencyChange={(c) => {
          setCurrency(c);
          localStorage.setItem("axxon_currency", c);
        }}
      />

      {/* MAIN CONTAINER */}
      <div style={{
        flex: 1, position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "115px 20px 40px 20px", maxWidth: 900, margin: "0 auto", width: "100%",
      }}>
        <Card3D intensity={6} glowColor="#22c55e" style={{
          width: "100%",
          background: "rgba(8,8,22,0.85)",
          backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
          border: `1px solid rgba(34,197,94,0.3)`,
          borderRadius: 28,
          padding: "clamp(28px,5vw,56px)",
          boxShadow: "0 20px 80px rgba(0,0,0,0.8), 0 0 50px rgba(34,197,94,0.15)",
          animation: "fadeUp 0.6s ease both",
        }}>
          {/* Header Tag */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "6px 16px", borderRadius: 20,
              background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.3)",
              color: "#4ade80", fontSize: 11, fontWeight: 700,
              fontFamily: "'Orbitron',monospace", letterSpacing: ".2em",
              marginBottom: 16,
            }}>
              <Sparkles size={13} />
              <span>EXCLUSIVE NEW CLIENT ACCESS</span>
            </div>

            <h1 style={{
              fontSize: "clamp(28px,5vw,46px)", fontWeight: 900, letterSpacing: ".08em",
              lineHeight: 1.15, fontFamily: "'Orbitron',monospace",
              background: "linear-gradient(135deg, #ffffff 0%, #a5b4fc 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundClip: "text", margin: "0 0 12px 0",
            }}>
              Claim Your 3-Day Free Trial
            </h1>

            <p style={{
              fontSize: "clamp(14px,2vw,16px)", color: C.muted,
              maxWidth: 580, margin: "0 auto", lineHeight: 1.6, fontFamily: "system-ui",
            }}>
              Get instant, full access to train your AI chatbot, embed it on your website, and automate customer conversations with zero commitment.
            </p>
          </div>

          {/* TRIAL FEATURES GRID */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16, margin: "32px 0",
          }}>
            {[
              { icon: Bot, title: "2 AI Chatbots", desc: "Create & deploy up to 2 active bots", color: C.indigo },
              { icon: MessageSquare, title: "5,000 Messages", desc: "Generous allowance for customer chats", color: C.blue },
              { icon: Clock, title: "3 Days Access", desc: "100% free with no credit card required", color: "#10b981" },
              { icon: Zap, title: "Instant Embed", desc: "Paste 1 line of code on your website", color: "#f59e0b" },
            ].map((feat, i) => {
              const Icon = feat.icon;
              return (
                <Glass key={i} style={{
                  padding: "20px 18px", borderRadius: 16,
                  background: "rgba(255,255,255,0.025)", border: `1px solid ${C.border}`,
                  textAlign: "left", transition: "transform 0.2s ease, border-color 0.2s ease",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: `${feat.color}18`, border: `1px solid ${feat.color}35`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    marginBottom: 12,
                  }}>
                    <Icon size={22} style={{ color: feat.color }} />
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: C.text,
                    fontFamily: "'Orbitron',monospace", letterSpacing: ".05em", marginBottom: 4,
                  }}>
                    {feat.title}
                  </div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: "system-ui", lineHeight: 1.4 }}>
                    {feat.desc}
                  </div>
                </Glass>
              );
            })}
          </div>

          {/* STATUS MESSAGE */}
          {msg.text && (
            <div style={{
              padding: "14px 20px", borderRadius: 14, marginBottom: 24,
              background: msg.ok ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${msg.ok ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
              color: msg.ok ? "#4ade80" : "#f87171",
              fontSize: 13, fontWeight: 600, fontFamily: "system-ui", textAlign: "center",
            }}>
              {msg.text}
            </div>
          )}

          {/* PRIMARY ACTION BUTTON */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Btn
              onClick={handleClaimTrial}
              disabled={loading}
              style={{
                width: "100%", maxWidth: 420, padding: "18px 32px", fontSize: 14,
                background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                boxShadow: "0 8px 32px rgba(34,197,94,0.4)",
                color: "#030308", fontWeight: 900, letterSpacing: ".15em",
              }}
            >
              <Zap size={16} />
              <span>{loading ? "Activating 3-Day Trial…" : "CLAIM 3-DAY FREE TRIAL NOW"}</span>
            </Btn>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              gap: 20, flexWrap: "wrap", marginTop: 8,
            }}>
              <button
                onClick={onSubscribe}
                style={{
                  background: "none", border: "none", color: "#60a5fa",
                  fontSize: 13, fontWeight: 600, fontFamily: "system-ui",
                  cursor: "pointer", textDecoration: "underline",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <Layers size={14} />
                <span>View Premium Paid Plans</span>
              </button>

              <span style={{ color: C.dim, fontSize: 12 }}>•</span>

              <button
                onClick={onDashboard}
                style={{
                  background: "none", border: "none", color: C.muted,
                  fontSize: 13, fontFamily: "system-ui", cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                <span>Skip to Dashboard</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </Card3D>
      </div>

      <style>{globalCSS}</style>
    </div>
  );
}

