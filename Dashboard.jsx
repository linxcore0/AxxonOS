import { useState, useEffect } from "react";
import { 
  Lock, Zap, Sparkles, CreditCard, LayoutDashboard, Bot, MessageSquare, 
  UserCheck, Lightbulb, Gift, Check, ArrowRight, Layers, Shield, HelpCircle 
} from "lucide-react";
import { C, SceneBg, Card3D, Glass, Btn, Badge, StatCard, globalCSS } from "./theme.jsx";
import Navbar from "./Navbar";
import BotBuilder    from "./BotBuilder";
import PaymentModal  from "./PaymentModal";
import PaymentStatus from "./PaymentStatus";
import GeminiChat    from "./GeminiChat";
import { subscribeToPricing } from "./pricingService.js";
import { CURRENCIES, convertUSD } from "./currencyUtils.js";

const API = "";
const PAID_PLANS = ["trial", "starter", "basic", "spark", "super", "king", "ultra"];
const planColors  = { starter: C.cyan, basic: C.blue, spark: C.indigo, super: C.violet, king: C.blue, ultra: C.pink };

function PlansTab({ userPlan, onSelectPlan, currentCurrency, onCurrencyChange }) {
  const [plans, setPlans] = useState([]);
  const [markupPercent, setMarkupPercent] = useState(15);
  const [userCurrency, setUserCurrency] = useState(
    currentCurrency || localStorage.getItem("axxon_currency") || "USD"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCurrency) setUserCurrency(currentCurrency);
  }, [currentCurrency]);

  useEffect(() => {
    const DEFAULT_PLANS = [
      { id: "starter", name: "Starter Plan", price: 34, duration: "1 Month", messages: "3,000", bots: "1", color: "#06b6d4", tagline: "1 Chatbot for 1 full month", features: ["1 Chatbot", "3,000 Messages / month", "1 Month Access (30 Days)", "Basic Analytics", "Standard Support", "FAQ Training"] },
      { id: "basic", name: "Basic Plan", price: 100, duration: "7 Days", messages: "5,000", bots: "2", color: "#3b82f6", tagline: "Perfect for evaluation and testing", features: ["2 Chatbots", "5,000 Messages / month", "7 Day Access", "Basic Analytics", "Standard Support"] },
      { id: "spark", name: "Spark Plan", price: 300, duration: "30 Days", messages: "50,000", bots: "6", color: "#06b6d4", tagline: "For growing businesses", features: ["6 Chatbots", "50,000 Messages / month", "30 Day Access", "Advanced Analytics", "Priority Support"] },
      { id: "super", name: "Super Plan", price: 700, duration: "30 Days", messages: "200,000", bots: "20", color: "#10b981", tagline: "For teams & scaling agencies", features: ["20 Chatbots", "200,000 Messages / month", "30 Day Access", "Real-time Analytics", "Human Handoff"] },
      { id: "king", name: "King Plan", price: 4000, duration: "1 Year", messages: "20,000,000", bots: "Unlimited", color: "#3b82f6", tagline: "For high-volume operations", features: ["Unlimited Chatbots", "20M Messages / year", "1 Year Access", "White Label", "API Access"], featured: true },
      { id: "ultra", name: "Ultra Plan", price: 20000, duration: "Lifetime", messages: "Unlimited", bots: "Unlimited", color: "#6366f1", tagline: "Unrestricted lifetime access", features: ["Unlimited Chatbots", "Unlimited Messages", "Lifetime Access", "24/7 VIP Support", "White Label"] },
    ];

    const unsubscribe = subscribeToPricing(({ prices, markup_percent }) => {
      setPlans(DEFAULT_PLANS.map(p => ({
        ...p,
        price: prices[p.id] ?? p.price,
      })));
      if (markup_percent !== undefined) setMarkupPercent(markup_percent);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCurrencyChange = (newCurr) => {
    setUserCurrency(newCurr);
    localStorage.setItem("axxon_currency", newCurr);
    if (onCurrencyChange) onCurrencyChange(newCurr);
  };

  if (loading) {
    return <div style={{ color: C.muted, padding: 30, textAlign: "center", fontFamily: "system-ui" }}>Loading live plan pricing...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "'Orbitron',monospace", fontSize: 18, color: C.text, fontWeight: 900 }}>
            Subscription Plans & Pricing
          </h2>
          <p style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui", marginTop: 4 }}>
            Live plan pricing converted to your selected currency.
          </p>
        </div>
        <div style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 10, padding: "4px 8px" }}>
          <span style={{ fontSize: 11, color: C.muted, marginRight: 6 }}>Currency:</span>
          <select
            value={userCurrency}
            onChange={e => handleCurrencyChange(e.target.value)}
            style={{
              background: "transparent", border: "none", color: C.text,
              fontSize: 12, fontWeight: 700, fontFamily: "system-ui",
              outline: "none", cursor: "pointer",
            }}
          >
            {CURRENCIES.map(c => (
              <option key={c.code} value={c.code} style={{ background: "#0a0a1a", color: "#fff" }}>
                {c.code} ({c.symbol})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {plans.map(p => {
          const isCurrent = userPlan === p.id;
          const converted = convertUSD(p.price, userCurrency, markupPercent);
          return (
            <Card3D key={p.id} glowColor={p.color} style={{
              background: isCurrent ? "rgba(99,102,241,0.08)" : C.surface,
              border: `1px solid ${isCurrent ? C.indigo : C.border}`,
              borderRadius: 18, padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: p.color, fontFamily: "'Orbitron',monospace" }}>{p.name}</span>
                  {isCurrent && <Badge color="#22c55e">ACTIVE</Badge>}
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 2 }}>
                  {converted.formatted}
                </div>
                {!converted.isNormal && (
                  <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>
                    ≈ ${p.price.toLocaleString()} USD base rate
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 16 }}>{p.duration}</div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px 0", fontSize: 12, color: C.muted, display: "flex", flexDirection: "column", gap: 6 }}>
                  {p.features.map((f, idx) => (
                    <li key={idx} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Check size={13} style={{ color: C.indigo }} /> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Btn onClick={() => onSelectPlan(p)} variant={isCurrent ? "ghost" : "primary"} style={{ width: "100%", fontSize: 11 }}>
                {isCurrent ? "Current Plan" : `Upgrade to ${p.name}`}
              </Btn>
            </Card3D>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({ user, onLogout, onSubscribe, onTrial }) {
  const [profile, setProfile] = useState(null);
  const [dbUser,  setDbUser]  = useState(null);
  const [tab,     setTab]     = useState("overview");
  const [modalPlan, setModalPlan] = useState(null);
  const [currency, setCurrency] = useState(
    user?.currency || localStorage.getItem("axxon_currency") || "USD"
  );

  useEffect(() => {
    try { setProfile(JSON.parse(atob(user.token.split(".")[1]))); } catch {}
  }, [user]);

  useEffect(() => {
    if (!user.token) return;
    fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(r => r.json()).then(d => {
        setDbUser(d);
        if (d?.currency) {
          setCurrency(d.currency);
          localStorage.setItem("axxon_currency", d.currency);
        }
      }).catch(() => {});
  }, [user.token]);

  const plan         = dbUser?.plan || user.plan || "free";
  const isPaid       = PAID_PLANS.includes(plan);
  const botAllowance = dbUser?.bot_allowance ?? user.bots ?? 0;
  const planColor    = planColors[plan] || C.indigo;

  // ── Not subscribed ─────────────────────────────────────────────────────────
  if (!isPaid) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", position: "relative" }}>
        <SceneBg />
        <Navbar
          page="dashboard"
          user={{ ...user, email: profile?.email }}
          onLogout={onLogout}
          currentCurrency={currency}
          onCurrencyChange={setCurrency}
        />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px 60px", position: "relative", zIndex: 1 }}>
          <Card3D style={{
            maxWidth: 460, width: "100%",
            background: "rgba(8,8,20,0.85)",
            backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
            border: `1px solid ${C.border}`, borderRadius: 24,
            padding: "52px 44px", textAlign: "center",
            animation: "fadeUp 0.6s ease both",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(99,102,241,0.12)", border: `1px solid rgba(99,102,241,0.3)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Lock size={28} style={{ color: C.indigo }} />
            </div>
            <h2 style={{
              fontFamily: "'Orbitron',monospace", fontSize: 18, fontWeight: 900,
              color: C.text, letterSpacing: "0.1em", marginBottom: 12,
            }}>Subscription Required</h2>
            <p style={{ fontSize: 14, color: C.muted, fontFamily: "system-ui", lineHeight: 1.7, marginBottom: 28 }}>
              Activate your 3-day free trial or select a subscription plan to access the Axxon OS Dashboard.
            </p>

            <Btn
              onClick={onTrial}
              style={{
                width: "100%", marginBottom: 12,
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: "0 6px 20px rgba(34,197,94,0.35)",
                color: "#000", fontWeight: 900,
              }}
            >
              <Zap size={15} /> Start 3-Day Free Trial
            </Btn>

            <Btn onClick={onSubscribe} variant="ghost" style={{ width: "100%", marginBottom: 12, border: `1px solid ${C.border}` }}>
              <Layers size={14} /> View Paid Plans →
            </Btn>

            <Btn onClick={onLogout} variant="ghost" style={{ width: "100%", color: C.dim }}>
              Sign Out
            </Btn>
          </Card3D>
        </div>
        <style>{globalCSS}</style>
      </div>
    );
  }

  const TABS = [
    { id: "overview",  icon: LayoutDashboard, label: "Overview"          },
    { id: "aichat",    icon: Sparkles,        label: "AI Assistant"      },
    { id: "bots",      icon: Bot,             label: "My Chatbots"       },
    { id: "plans",     icon: Layers,          label: "Plans & Pricing"   },
    { id: "payments",  icon: CreditCard,      label: "Payments"          },
  ];

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column" }}>
      <SceneBg />

      {/* Global Responsive Navigation Bar */}
      <Navbar
        page="dashboard"
        user={{ ...user, email: profile?.email }}
        onLogout={onLogout}
        activeTab={tab}
        onTabChange={setTab}
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
      />

      {/* ── PAGE BODY ───────────────────────────────────────────── */}
      <div style={{ maxWidth: 1040, margin: "0 auto", width: "100%", padding: "115px 24px 60px", position: "relative", zIndex: 1 }}>

        {/* Welcome banner */}
        <div style={{ marginBottom: 24, animation: "fadeUp 0.5s ease both" }}>
          <h1 style={{
            fontFamily: "'Orbitron',monospace", fontWeight: 900,
            fontSize: "clamp(20px,4vw,32px)", letterSpacing: "0.08em",
            background: C.grad, WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Welcome back</h1>
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
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Gift size={18} style={{ color: "#fbbf24" }} />
                </div>
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
          width: "fit-content", flexWrap: "wrap",
          animation: "fadeUp 0.5s ease 0.1s both",
        }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: "10px 20px", borderRadius: 10,
                background: tab === t.id ? C.grad : "transparent",
                border: "none",
                color: tab === t.id ? "#fff" : C.muted,
                fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
                fontFamily: "system-ui,sans-serif", cursor: "pointer",
                boxShadow: tab === t.id ? "0 4px 16px rgba(99,102,241,0.35)" : "none",
                transition: "all 0.2s", display: "flex", alignItems: "center", gap: 7,
              }}>
                <Icon size={14} style={{ color: tab === t.id ? "#fff" : C.indigo }} />
                <span>{t.label}</span>
              </button>
            );
          })}
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
                icon={<Bot size={22} color={C.indigo} />}
                label="Chatbots on your plan"
                value={botAllowance === 999 ? "∞" : botAllowance}
                sub="Create up to this many bots"
                color={C.indigo}
              />
              <StatCard
                icon={<MessageSquare size={22} color={C.blue} />}
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
                icon={<UserCheck size={22} color={C.violet} />}
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
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(99,102,241,0.15)", border: `1px solid rgba(99,102,241,0.3)`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Lightbulb size={22} style={{ color: C.indigo }} />
                </div>
                <div style={{ flex: 1 }}>
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

        {/* ── GEMINI AI CHAT TAB ──────────────────────────────────── */}
        {tab === "aichat" && (
          <div style={{ animation: "fadeUp 0.5s ease both" }}>
            <GeminiChat />
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

        {/* ── PLANS & PRICING TAB ─────────────────────────────────── */}
        {tab === "plans" && (
          <div style={{ animation: "fadeUp 0.5s ease both" }}>
            <PlansTab 
              userPlan={plan} 
              onSelectPlan={setModalPlan} 
              currentCurrency={currency}
              onCurrencyChange={setCurrency}
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

      {modalPlan && (
        <PaymentModal
          plan={modalPlan}
          token={user.token}
          userCurrency={currency || localStorage.getItem("axxon_currency") || "USD"}
          onClose={() => setModalPlan(null)}
          onSuccess={() => {
            setModalPlan(null);
            if (user.token) {
              fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${user.token}` } })
                .then(r => r.json()).then(d => setDbUser(d)).catch(() => {});
            }
          }}
        />
      )}

      <style>{globalCSS}</style>
    </div>
  );
}

