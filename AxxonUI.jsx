import { useState, useEffect } from "react";
import LandingPage  from "./LandingPage";
import AuthPage     from "./AuthPage";
import Dashboard    from "./Dashboard";
import SubscribePage from "./SubscribePage";
import AdminPanel   from "./AdminPanel";
import BotPage      from "./BotPage";
import TrialPage    from "./TrialPage";
import { globalCSS, C } from "./theme.jsx";

const PAID_PLANS = ["trial", "starter", "basic", "spark", "super", "king", "ultra"];

export default function AxxonUI() {
  const [loading, setLoading] = useState(false);
  const [page,    setPage]    = useState("landing");
  const [user,    setUser]    = useState(null);
  const [botId,   setBotId]   = useState(null);

  useEffect(() => {
    const pathname = window.location.pathname;
    if (pathname.startsWith("/bot/")) {
      const id = pathname.slice(5);
      if (id) { setBotId(id); setPage("botpage"); return; }
    }
    try {
      const token = localStorage.getItem("axxon_token");
      const plan  = localStorage.getItem("axxon_plan") || "free";
      const bots  = parseInt(localStorage.getItem("axxon_bots") || "0", 10);
      const currency = localStorage.getItem("axxon_currency") || "USD";
      if (token) {
        setUser({ token, plan, bots, currency });
        setPage(PAID_PLANS.includes(plan) ? "dashboard" : "trial");

        // Fetch live profile to sync currency & plan
        fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            if (data && data.currency) {
              localStorage.setItem("axxon_currency", data.currency);
              setUser(prev => prev ? { ...prev, currency: data.currency, plan: data.plan || prev.plan } : prev);
            }
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const handleLogin  = (token, plan, bots, currency) => {
    const userCur = currency || "USD";
    localStorage.setItem("axxon_token", token);
    localStorage.setItem("axxon_plan",  plan || "free");
    localStorage.setItem("axxon_bots",  bots ?? 0);
    localStorage.setItem("axxon_currency", userCur);
    const u = { token, plan: plan || "free", bots: bots ?? 0, currency: userCur };
    setUser(u);
    // Directly direct customers to Trial page after login if not already on a paid/trial plan!
    setPage(PAID_PLANS.includes(plan) ? "dashboard" : "trial");
  };
  const handleLogout = () => {
    localStorage.removeItem("axxon_token");
    localStorage.removeItem("axxon_plan");
    localStorage.removeItem("axxon_bots");
    localStorage.removeItem("axxon_currency");
    setUser(null); setPage("landing");
  };
  const userEmail = (() => {
    try { return JSON.parse(atob(user?.token?.split(".")[1]))?.email; } catch { return ""; }
  })();

  return (
    <>
      {/* ── SPLASH SCREEN ─────────────────────────────────────── */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: C.bg,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        transition: "opacity 1.5s ease, visibility 1.5s ease",
        opacity: loading ? 1 : 0,
        visibility: loading ? "visible" : "hidden",
        pointerEvents: loading ? "all" : "none",
        overflow: "hidden",
      }}>
        {/* Aurora blobs */}
        <div style={{
          position: "absolute", top: "15%", left: "20%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 65%)",
          animation: "floatA 12s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "15%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)",
          animation: "floatB 16s ease-in-out infinite",
        }} />
        {/* Grid */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.022, pointerEvents: "none",
          backgroundImage: "linear-gradient(rgba(99,102,241,1) 1px,transparent 1px), linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)",
          backgroundSize: "56px 56px",
        }} />
        {/* Corner brackets */}
        {[
          { top: 28, left: 28,  borderTop: `1px solid ${C.indigo}`, borderLeft: `1px solid ${C.indigo}` },
          { top: 28, right: 28, borderTop: `1px solid ${C.indigo}`, borderRight: `1px solid ${C.indigo}` },
          { bottom: 28, left: 28,  borderBottom: `1px solid ${C.indigo}`, borderLeft: `1px solid ${C.indigo}` },
          { bottom: 28, right: 28, borderBottom: `1px solid ${C.indigo}`, borderRight: `1px solid ${C.indigo}` },
        ].map((s, i) => (
          <div key={i} style={{ position: "absolute", width: 36, height: 36, opacity: 0.4, ...s }} />
        ))}

        {/* 3-D floating ring */}
        <div style={{
          position: "absolute",
          width: 220, height: 220,
          border: `1px solid rgba(99,102,241,0.25)`,
          borderRadius: "50%",
          animation: "spin 18s linear infinite",
          transform: "perspective(600px) rotateX(70deg)",
          boxShadow: "0 0 40px rgba(99,102,241,0.15)",
        }} />
        <div style={{
          position: "absolute",
          width: 160, height: 160,
          border: `1px solid rgba(99,102,241,0.18)`,
          borderRadius: "50%",
          animation: "spin 12s linear infinite reverse",
          transform: "perspective(600px) rotateX(70deg)",
        }} />

        {/* Logo content */}
        <div style={{ position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{
            fontFamily: "'Orbitron',monospace", fontSize: 10,
            letterSpacing: "0.5em", color: C.dim, marginBottom: 32,
            animation: "fadeUp 0.8s ease 0.2s both",
          }}>◆ &nbsp; INITIALIZING &nbsp; ◆</div>

          <div style={{
            fontFamily: "'Orbitron',monospace", fontWeight: 900,
            fontSize: "clamp(68px,14vw,130px)", letterSpacing: "0.18em", lineHeight: 1,
            background: C.grad,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            animation: "logoGlow 2.5s ease-in-out infinite, fadeUp 0.8s ease 0.4s both",
          }}>AXXON</div>

          <div style={{
            width: 100, height: 1, margin: "24px auto",
            background: `linear-gradient(90deg, transparent, ${C.indigo}, transparent)`,
            animation: "fadeUp 0.8s ease 0.6s both",
          }} />
          <div style={{
            fontFamily: "'Orbitron',monospace", fontSize: 11,
            letterSpacing: "0.7em", color: C.dim,
            animation: "fadeUp 0.8s ease 0.7s both",
          }}>O &nbsp; S</div>

          <div style={{
            marginTop: 48,
            display: "flex", gap: 10, justifyContent: "center",
            animation: "fadeUp 0.8s ease 1s both",
          }}>
            {[[C.indigo,"0s"],[C.blue,"0.2s"],[C.violet,"0.4s"]].map(([bg, delay], i) => (
              <div key={i} style={{
                width: 7, height: 7, borderRadius: "50%", background: bg,
                boxShadow: `0 0 10px ${bg}`,
                animation: `bounceDot 1.4s ease-in-out ${delay} infinite`,
              }} />
            ))}
          </div>
        </div>

        <div style={{
          position: "absolute", bottom: 36,
          fontFamily: "'Orbitron',monospace", fontSize: 9,
          letterSpacing: "0.35em", color: C.dim,
          animation: "fadeIn 1s ease 1.5s both",
        }}>V 1.0.0 &nbsp;◆&nbsp; AXXON OS</div>
      </div>

      {/* ── MAIN APP ─────────────────────────────────────────────── */}
      <div style={{ minHeight: "100vh", background: C.bg }}>
        {page === "botpage"   && <BotPage botId={botId} />}
        {page === "landing"   && <LandingPage onGetStarted={() => setPage("auth")} onAdmin={() => setPage("admin")} />}
        {page === "auth"      && <AuthPage onLogin={handleLogin} onBack={() => setPage("landing")} />}
        {page === "trial"     && (
          <TrialPage
            user={{ ...user, email: userEmail }}
            onTrialActivated={(updated) => {
              setUser(prev => ({ ...prev, ...updated }));
              setPage("dashboard");
            }}
            onSubscribe={() => setPage("subscribe")}
            onDashboard={() => setPage("dashboard")}
            onLogout={handleLogout}
          />
        )}
        {page === "subscribe" && (
          <SubscribePage
            user={{ ...user, email: userEmail }}
            onLogout={handleLogout}
            onDashboard={() => setPage("dashboard")}
          />
        )}
        {page === "dashboard" && (
          <Dashboard
            user={user}
            onLogout={handleLogout}
            onSubscribe={() => setPage("subscribe")}
            onTrial={() => setPage("trial")}
          />
        )}
        {page === "admin"     && <AdminPanel onBack={() => setPage("landing")} />}
      </div>

      <style>{globalCSS}</style>
    </>
  );
}
