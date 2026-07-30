import { useState, useEffect } from "react";
import { C, SceneBg, Card3D, Glass, Btn, Badge, StatCard, globalCSS } from "./theme.jsx";
import BotBuilder    from "./BotBuilder";
import PaymentModal  from "./PaymentModal";
import PaymentStatus from "./PaymentStatus";

const API = "";
const PAID_PLANS = ["trial", "basic", "spark", "super", "king", "ultra"];
const planColors  = { basic: C.blue, spark: C.indigo, super: C.violet, king: C.blue, ultra: C.pink };

export default function Dashboard({ user, onLogout, onSubscribe }) {
  const [profile, setProfile] = useState(null);
  const [dbUser,  setDbUser]  = useState(null);
  const [tab,     setTab]     = useState("overview");

  useEffect(() => {
    try { setProfile(JSON.parse(atob(user.token.split(".")[1]))); } catch {}
  }, [user]);

  useEffect(() => {
    if (!user.token) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(r => r.json()).then(d => setDbUser(d)).catch(() => {});
  }, [user.token]);

  const plan         = dbUser?.plan || user.plan || "free";
  const isPaid       = PAID_PLANS.includes(plan);
  const botAllowance = dbUser?.bot_allowance ?? user.bots ?? 0;
  const planColor    = planColors[plan] || C.indigo;

  // ── Not subscribed ─────────────────────────────────────────────────────────
  if (!isPaid) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
        <SceneBg />
        <Card3D style={{
          position: "relative", zIndex: 1,
          maxWidth: 460, width: "100%",
          background: "rgba(8,8,20,0.85)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          border: `1px solid ${C.border}`, borderRadius: 24,
          padding: "52px 44px", textAlign: "center",
          animation: "fadeUp 0.6s ease both",
        }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
          <h2 style={{
            fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 900,
            color: C.text, letterSpacing: "0.1em", marginBottom: 12,
          }}>Subscription Required</h2>
          <p style={{ fontSize: 14, color: C.muted, fontFamily: "system-ui", lineHeight: 1.7, marginBottom: 36 }}>
            The dashboard is only available with an active plan.
            Pick a plan to start deploying your AI chatbots.
          </p>
          <Btn onClick={onSubscribe} style={{ width: "100%", marginBottom: 12 }}>
            View Plans →
          </Btn>
          <Btn onClick={onLogout} variant="ghost" style={{ width: "100%" }}>
            Sign Out
          </Btn>
        </Card3D>
        <style>{globalCSS}</style>
      </div>
    );
  }

  const TABS = [
    { id: "overview",  icon: "📊", label: "Overview"       },
    { id: "bots",      icon: "🤖", label: "My Chatbots"    },
    { id: "payments",  icon: "💳", label: "Payments"       },
  ];

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <SceneBg />

      {/* ── NAV ─────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 68, padding: "0 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(3,3,8,0.80)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 22,
          letterSpacing: "0.2em",
          background: C.grad,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 12px rgba(99,102,241,0.5))",
        }}>AXXON</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui" }}>
            {profile?.email}
          </span>
          <Badge color={planColor}>◆ {plan.toUpperCase()}</Badge>
          <Btn onClick={onLogout} variant="ghost" style={{ padding: "8px 16px", fontSize: 10 }}>
            Sign Out
          </Btn>
        </div>
      </nav>

      {/* ── PAGE BODY ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "100px 24px 60px", position: "relative", zIndex: 1 }}>

        {/* Welcome banner */}
        <div style={{ marginBottom: 24, animation: "fadeUp 0.5s ease both" }}>
          <h1 style={{
            fontFamily: "'Orbitron',monospace", fontWeight: 900,
            fontSize: "clamp(20px,4vw,32px)", letterSpacing: "0.08em",
            background: C.grad, WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Welcome back 👋</h1>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 6, fontFamily: "system-ui" }}>
            {dbUser?.plan_expires_at
              ? `Your plan is active until ${new Date(dbUser.plan_expires_at).toLocaleDateString(undefined, { year:"numeric", month:"long", day:"numeric" })}`
              : "Manage your AI chatbots from here"}
          </p>
        </div>

        {/* Trial banner */}
        {plan === "trial" && (() => {
          const expiresAt = dbUser?.plan_expires_at ? new Date(dbUser.plan_expires_at) : null;
          const daysLeft  = expiresAt ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 86400000)) : null;
          return (
            <Card3D intensity={4} glowColor="#fbbf24" style={{
              background: "rgba(251,191,36,0.06)",
              border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: 16, padding: "16px 22px",
              marginBottom: 24,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 12,
              animation: "fadeUp 0.5s ease 0.05s both",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 22 }}>🎁</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fbbf24", fontFamily: "system-ui" }}>
                    Free 3-Day Trial Active
                    {daysLeft !== null && ` — ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui", marginTop: 2 }}>
                    You have 2 chatbots and 5,000 messages to try everything out.
                  </div>
                </div>
              </div>
              <Btn onClick={onSubscribe} style={{ padding: "9px 20px", fontSize: 11, flexShrink: 0 }}>
                Upgrade Now →
              </Btn>
            </Card3D>
          );
        })()}

        {/* ── TABS ───────────────────────────────────────────────── */}
        <div style={{
          display: "flex", gap: 6, marginBottom: 32,
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${C.border}`,
          borderRadius: 14, padding: 5,
          width: "fit-content",
          animation: "fadeUp 0.5s ease 0.1s both",
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 22px", borderRadius: 10,
              background: tab === t.id ? C.grad : "transparent",
              border: "none",
              color: tab === t.id ? "#fff" : C.muted,
              fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
              fontFamily: "system-ui,sans-serif", cursor: "pointer",
              boxShadow: tab === t.id ? "0 4px 16px rgba(99,102,241,0.35)" : "none",
              transition: "all 0.2s", display: "flex", alignItems: "center", gap: 7,
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ────────────────────────────────────────── */}
        {tab === "overview" && (
          <div style={{ animation: "fadeUp 0.5s ease both" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 20, marginBottom: 28,
            }}>
              <StatCard
                icon="🤖"
                label="Chatbots on your plan"
                value={botAllowance === 999 ? "∞" : botAllowance}
                sub="Create up to this many bots"
                color={C.indigo}
              />
              <StatCard
                icon="💬"
                label="Monthly message quota"
                value={dbUser?.message_allowance != null
                  ? Number(dbUser.message_allowance) >= 1e9
                    ? "∞"
                    : Number(dbUser.message_allowance).toLocaleString()
                  : "—"}
                sub="Messages your bots can answer"
                color={C.blue}
              />
              <StatCard
                icon="🙋"
                label="Handoffs to a human"
                value="0"
                sub="Times a bot escalated to you"
                color={C.violet}
              />
            </div>

            {/* Info card */}
            <Card3D style={{
              background: "rgba(99,102,241,0.05)",
              border: `1px solid rgba(99,102,241,0.15)`,
              borderRadius: 16, padding: "20px 24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 24 }}>💡</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: "system-ui", marginBottom: 4 }}>
                    Ready to build your first chatbot?
                  </div>
                  <div style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui" }}>
                    Switch to the <strong style={{ color: "#a5b4fc" }}>My Chatbots</strong> tab to create, train, and launch a bot in minutes — no coding needed.
                  </div>
                </div>
                <Btn onClick={() => setTab("bots")} style={{ flexShrink: 0, padding: "10px 18px", fontSize: 11 }}>
                  Go →
                </Btn>
              </div>
            </Card3D>
          </div>
        )}

        {/* ── BOTS TAB ────────────────────────────────────────────── */}
        {tab === "bots" && (
          <div style={{ animation: "fadeUp 0.5s ease both" }}>
            <BotBuilder
              token={user.token}
              botAllowance={botAllowance}
              plan={plan}
              planExpiresAt={dbUser?.plan_expires_at}
              onSubscribe={onSubscribe}
            />
          </div>
        )}

        {/* ── PAYMENTS TAB ────────────────────────────────────────── */}
        {tab === "payments" && (
          <div style={{ animation: "fadeUp 0.5s ease both", maxWidth: 720 }}>
            <PaymentStatus token={user.token} />
          </div>
        )}
      </div>

      <style>{globalCSS}</style>
    </div>
  );
}
