import { useState, useEffect } from "react";
import AnalyticsPanelComp from "./AnalyticsPanel";
import EmbedGuide from "./EmbedGuide";
import { C, Card3D, Glass, Btn, Input, Badge, SceneBg, ThemeToggle, globalCSS } from "./theme.jsx";
import { subscribeToPricing, updatePricingInFirestore } from "./pricingService.js";
import {
  Tag, CreditCard, KeyRound, Users, Bot, Share2, Lock, BarChart3, Activity,
  ArrowLeft, RefreshCw, Trash2, Edit3, ExternalLink, Globe, DollarSign,
  Target, AlertTriangle, Clock, Search, Zap, Check, X, ShieldAlert, Coins,
  ArrowDown, ArrowUp, ArrowRight, UserPlus, Star, UserCheck
} from "lucide-react";

const API = "";
const PLANS   = ["starter","basic","spark","super","king","ultra"];
const CRYPTOS = ["USDT","BTC","ETH","SOL"];
const CRYPTO_ICONS = { USDT: "₮", BTC: "₿", ETH: "Ξ", SOL: "◎" };
const CRYPTO_COLORS = { USDT:"#26a17b", BTC:"#f7931a", ETH:"#627eea", SOL:"#9945ff" };

export default function AdminPanel({ onBack }) {
  const [auth, setAuth]           = useState(false);
  const [passcode, setPasscode]   = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState("payments");

  // Users
  const [users, setUsers]               = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userMsg, setUserMsg]           = useState({ text:"", ok:false });
  const [userSearch, setUserSearch]     = useState("");
  const [showAddUser, setShowAddUser]   = useState(false);
  const [newEmail, setNewEmail]         = useState("");
  const [newPlan, setNewPlan]           = useState("starter");
  const [newUserPw, setNewUserPw]       = useState("2712");
  const [addingUser, setAddingUser]     = useState(false);

  // Payment settings
  const [planAPIs, setPlanAPIs] = useState({ starter:"", basic:"", spark:"", super:"", king:"", ultra:"" });
  const [wallets, setWallets]   = useState({ USDT:"", BTC:"", ETH:"", SOL:"" });
  const [paymentMsg, setPaymentMsg] = useState({ text:"", ok:false });

  // Plan Prices
  const [planPrices, setPlanPrices] = useState({ starter: 34, basic: 100, spark: 300, super: 700, king: 4000, ultra: 20000 });
  const [markupPercent, setMarkupPercent] = useState(15);
  const [priceMsg, setPriceMsg]     = useState({ text:"", ok:false });
  const [pricesSaving, setPricesSaving] = useState(false);

  // Reports
  const [reportSending, setReportSending] = useState(false);
  const [reportMsg, setReportMsg]         = useState({ text:"", ok:false });

  // Chain monitor
  const [chainLoading, setChainLoading] = useState(false);
  const [chainData, setChainData]       = useState(null);
  const [chainError, setChainError]     = useState("");

  // Password
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg]         = useState({ text:"", ok:false });

  // Socials
  const [telegram, setTelegram]   = useState("@Wanfortindustries");
  const [xHandle, setXHandle]     = useState("");
  const [farcaster, setFarcaster] = useState("");
  const [linkedin, setLinkedin]   = useState("");
  const [github, setGithub]       = useState("");
  const [tiktok, setTiktok]       = useState("");
  const [discord, setDiscord]     = useState("");
  const [socialMsg, setSocialMsg] = useState({ text:"", ok:false });

  // Chatbot builder
  const [botName, setBotName]         = useState("");
  const [botSite, setBotSite]         = useState("");
  const [botFallback, setBotFallback] = useState("");
  const [botFAQs, setBotFAQs]         = useState([{ q:"", a:"" }]);
  const [botMsg, setBotMsg]           = useState({ text:"", ok:false });
  const [createdBot, setCreatedBot]   = useState(null);

  // Existing bots + edit
  const [adminBots, setAdminBots]       = useState([]);
  const [editingBot, setEditingBot]     = useState(null);
  const [editName, setEditName]         = useState("");
  const [editSite, setEditSite]         = useState("");
  const [editFAQs, setEditFAQs]         = useState([{ q:"", a:"" }]);
  const [editMsg, setEditMsg]           = useState({ text:"", ok:false });
  const [editSaving, setEditSaving]     = useState(false);
  const [analyticsMap, setAnalyticsMap] = useState({});

  useEffect(() => {
    if (!auth) return;
    fetch(`${API}/api/admin/socials`).then(r => r.json()).then(d => {
      if (d.telegram  !== undefined) setTelegram(d.telegram   || "");
      if (d.x         !== undefined) setXHandle(d.x           || "");
      if (d.farcaster !== undefined) setFarcaster(d.farcaster || "");
      if (d.linkedin  !== undefined) setLinkedin(d.linkedin   || "");
      if (d.github    !== undefined) setGithub(d.github       || "");
      if (d.tiktok    !== undefined) setTiktok(d.tiktok       || "");
      if (d.discord   !== undefined) setDiscord(d.discord     || "");
    }).catch(() => {});
    fetch(`${API}/api/admin/wallets`).then(r => r.json()).then(d => {
      setWallets({ USDT: d.USDT||"", BTC: d.BTC||"", ETH: d.ETH||"", SOL: d.SOL||"" });
    }).catch(() => {});
    const unsubscribePricing = subscribeToPricing(({ prices, markup_percent }) => {
      if (prices) setPlanPrices(prev => ({ ...prev, ...prices }));
      if (markup_percent !== undefined) setMarkupPercent(markup_percent);
    });
    loadAdminBots();
    loadUsers();
    return () => unsubscribePricing();
  }, [auth]);

  useEffect(() => {
    if (auth && activeTab === "users") {
      loadUsers();
    }
  }, [auth, activeTab]);

  function handleAdminLogin() {
    if (passcode === "2712") { setAuth(true); setAuthError(""); }
    else setAuthError("Incorrect passcode. Try again.");
  }

  async function handleSavePrices() {
    setPriceMsg({ text:"", ok:false });
    setPricesSaving(true);
    try {
      // Sync real-time pricing to Firestore first
      await updatePricingInFirestore(planPrices, markupPercent);

      const res = await fetch(`${API}/api/admin/update-prices`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ prices: planPrices, markup_percent: markupPercent }),
      });
      const data = await res.json();
      setPriceMsg({ text: data.message || data.error || "Prices & markup saved live to Firestore", ok: true });
    } catch { setPriceMsg({ text:"Request failed", ok:false }); }
    finally { setPricesSaving(false); }
  }

  async function handleSavePayments() {
    setPaymentMsg({ text:"", ok:false });
    try {
      const res  = await fetch(`${API}/api/admin/update-payments`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ planAPIs, wallets }),
      });
      const data = await res.json();
      setPaymentMsg({ text: data.message || data.error, ok: res.ok });
    } catch { setPaymentMsg({ text:"Request failed", ok:false }); }
  }

  async function handleUpdatePassword() {
    setPwMsg({ text:"", ok:false });
    if (newPw !== confirmPw) { setPwMsg({ text:"Passwords do not match", ok:false }); return; }
    try {
      const res  = await fetch(`${API}/api/admin/update-password`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ current_password:currentPw, new_password:newPw, confirm_password:confirmPw }),
      });
      const data = await res.json();
      setPwMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) { setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
    } catch { setPwMsg({ text:"Request failed", ok:false }); }
  }

  async function handleUpdateSocials() {
    setSocialMsg({ text:"", ok:false });
    try {
      const res  = await fetch(`${API}/api/admin/update-socials`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ telegram, x:xHandle, farcaster, linkedin, github, tiktok, discord }),
      });
      const data = await res.json();
      setSocialMsg({ text: data.message || data.error, ok: res.ok });
    } catch { setSocialMsg({ text:"Request failed", ok:false }); }
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const res  = await fetch(`${API}/api/admin/users`);
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    setUsersLoading(false);
  }

  async function handleVerifyUser(user_id) {
    setUserMsg({ text:"", ok:false });
    try {
      const res  = await fetch(`${API}/api/admin/verify-user`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ user_id }),
      });
      const data = await res.json();
      setUserMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) loadUsers();
    } catch { setUserMsg({ text:"Request failed", ok:false }); }
  }

  async function handleDeleteUser(user_id) {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    setUserMsg({ text:"", ok:false });
    try {
      const res  = await fetch(`${API}/api/admin/delete-user`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ user_id }),
      });
      const data = await res.json();
      setUserMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) loadUsers();
    } catch { setUserMsg({ text:"Request failed", ok:false }); }
  }

  async function handleUpdateUserPlan(user_id, plan) {
    setUserMsg({ text:"", ok:false });
    try {
      const res = await fetch(`${API}/api/admin/update-user-plan`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ user_id, plan }),
      });
      const data = await res.json();
      setUserMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) loadUsers();
    } catch { setUserMsg({ text:"Failed to update plan", ok:false }); }
  }

  async function handleAddUser(e) {
    if (e) e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setUserMsg({ text:"Please enter a valid email address", ok:false });
      return;
    }
    setAddingUser(true);
    setUserMsg({ text:"", ok:false });
    try {
      const res = await fetch(`${API}/api/admin/add-user`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ email: newEmail.trim(), plan: newPlan, password: newUserPw || "2712" }),
      });
      const data = await res.json();
      setUserMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) {
        setNewEmail("");
        setShowAddUser(false);
        loadUsers();
      }
    } catch { setUserMsg({ text:"Failed to create user", ok:false }); }
    finally { setAddingUser(false); }
  }

  async function loadAdminBots() {
    try {
      const res  = await fetch(`${API}/api/admin/bots`);
      const data = await res.json();
      setAdminBots(Array.isArray(data) ? data : []);
    } catch { setAdminBots([]); }
  }

  async function toggleAdminAnalytics(botId) {
    const current = analyticsMap[botId];
    if (current && current.data) { setAnalyticsMap(m => ({ ...m, [botId]: null })); return; }
    setAnalyticsMap(m => ({ ...m, [botId]: { loading:true, data:null } }));
    try {
      const res  = await fetch(`${API}/api/admin/bots/${botId}/analytics`);
      const data = await res.json();
      setAnalyticsMap(m => ({ ...m, [botId]: { loading:false, data: res.ok ? data : null } }));
    } catch { setAnalyticsMap(m => ({ ...m, [botId]: { loading:false, data:null } })); }
  }

  function startEdit(bot) {
    setEditingBot(bot); setEditName(bot.name||""); setEditSite(bot.website||"");
    const faqs = Array.isArray(bot.faqs) ? bot.faqs : [];
    setEditFAQs(faqs.length > 0 ? faqs : [{ q:"", a:"" }]);
    setEditMsg({ text:"", ok:false }); setCreatedBot(null);
  }
  function cancelEdit() { setEditingBot(null); setEditMsg({ text:"", ok:false }); }
  function addEditFAQ()  { setEditFAQs(f => [...f, { q:"", a:"" }]); }
  function removeEditFAQ(i) { setEditFAQs(f => f.filter((_,idx) => idx !== i)); }
  function updateEditFAQ(i, field, val) {
    setEditFAQs(f => f.map((row,idx) => idx === i ? { ...row, [field]:val } : row));
  }

  async function handleSaveEdit() {
    setEditMsg({ text:"", ok:false });
    const validFaqs = editFAQs.filter(f => f.q.trim() && f.a.trim());
    if (!editName || validFaqs.length === 0) {
      setEditMsg({ text:"Bot name and at least one complete FAQ are required", ok:false }); return;
    }
    setEditSaving(true);
    try {
      const res  = await fetch(`${API}/api/admin/bots/${editingBot.id}`, {
        method:"PUT", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name:editName, website:editSite, faqs:validFaqs }),
      });
      const data = await res.json();
      setEditMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) { await loadAdminBots(); setEditingBot(prev => ({ ...prev, name:editName, website:editSite, faqs:validFaqs })); }
    } catch { setEditMsg({ text:"Request failed", ok:false }); }
    setEditSaving(false);
  }

  function addAdminFAQ()  { setBotFAQs(f => [...f, { q:"", a:"" }]); }
  function removeAdminFAQ(i) { setBotFAQs(f => f.filter((_,idx) => idx !== i)); }
  function updateAdminFAQ(i, field, val) {
    setBotFAQs(f => f.map((row,idx) => idx === i ? { ...row, [field]:val } : row));
  }

  async function handleCreateBot() {
    setBotMsg({ text:"", ok:false });
    const validFaqs = botFAQs.filter(f => f.q.trim() && f.a.trim());
    if (!botName || validFaqs.length === 0) {
      setBotMsg({ text:"Bot name and at least one complete FAQ are required", ok:false }); return;
    }
    try {
      const res  = await fetch(`${API}/api/admin/create-bot`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ name:botName, website:botSite, faqs:validFaqs, fallback_contact:botFallback.trim() }),
      });
      const data = await res.json();
      setBotMsg({ text: data.message || data.error, ok: res.ok });
      if (res.ok) {
        setCreatedBot(data.bot);
        setBotName(""); setBotSite(""); setBotFallback(""); setBotFAQs([{ q:"", a:"" }]);
      }
    } catch { setBotMsg({ text:"Request failed", ok:false }); }
  }

  async function sendReportNow() {
    setReportSending(true); setReportMsg({ text:"", ok:false });
    try {
      const r = await fetch("/api/admin/send-weekly-report", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ passcode }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setReportMsg({ text: d.message, ok:true });
    } catch(e) { setReportMsg({ text: e.message, ok:false }); }
    finally { setReportSending(false); }
  }

  async function fetchChainData() {
    setChainLoading(true); setChainError(""); setChainData(null);
    try {
      const r = await fetch("/api/admin/blockchain-txs", {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ passcode }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Failed");
      setChainData(d);
    } catch(e) { setChainError(e.message); }
    finally { setChainLoading(false); }
  }

  const tabs = [
    { id:"prices",   icon: Tag,        full:"Plan Prices"     },
    { id:"payments", icon: CreditCard, full:"Payments"       },
    { id:"wallets",  icon: KeyRound,   full:"Wallets"        },
    { id:"users",    icon: Users,      full:"Users"          },
    { id:"chatbot",  icon: Bot,        full:"My Chatbot"     },
    { id:"socials",  icon: Share2,     full:"Socials"        },
    { id:"security", icon: Lock,       full:"Security"       },
    { id:"reports",  icon: BarChart3,  full:"Reports"        },
    { id:"chain",    icon: Activity,   full:"Chain Monitor"  },
  ];

  // ── AUTH GATE ──────────────────────────────────────────────────────────────
  if (!auth) {
    return (
      <div style={{ position:"relative", minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <SceneBg />
        {/* Red tint overlay */}
        <div style={{ position:"fixed", inset:0, background:"radial-gradient(circle at 50% 45%, rgba(239,68,68,0.07) 0%, transparent 65%)", pointerEvents:"none", zIndex:1 }} />
        <div style={{ position:"relative", zIndex:2, width:"100%", maxWidth:400 }}>
          <Card3D intensity={6} glowColor="#ef4444" style={{
            background: "rgba(10,8,20,0.92)",
            backdropFilter:"blur(32px)", WebkitBackdropFilter:"blur(32px)",
            border:"1px solid rgba(239,68,68,0.2)",
            borderRadius:24, padding:"48px 40px",
          }}>
            <button onClick={onBack} style={backLink}>← Back</button>

            {/* Icon */}
            <div style={{
              width:56, height:56, borderRadius:16, marginBottom:28,
              background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Lock size={24} color="#ef4444" />
            </div>

            <div style={{ fontSize:10, color:"#ef4444", letterSpacing:".3em", marginBottom:8, fontFamily:"'Orbitron',monospace" }}>
              ◆ RESTRICTED ACCESS
            </div>
            <h2 style={{
              fontSize:22, fontWeight:900, letterSpacing:".1em",
              fontFamily:"'Orbitron',monospace", color:C.text, marginBottom:36,
            }}>Admin Console</h2>

            <Input
              label="Master Passcode"
              type="password"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              onKeyDown={e => e.key==="Enter" && handleAdminLogin()}
              placeholder="••••"
            />
            {authError && <AMsg ok={false} text={authError} />}
            <Btn
              onClick={handleAdminLogin}
              style={{ width:"100%", marginTop:8, background:"linear-gradient(135deg,#ef4444,#dc2626)", boxShadow:"0 4px 20px rgba(239,68,68,0.35)" }}
            >
              Authenticate
            </Btn>
          </Card3D>
        </div>
        <style>{globalCSS}</style>
      </div>
    );
  }

  // ── MAIN PANEL ─────────────────────────────────────────────────────────────
  return (
    <div style={{ position:"relative", minHeight:"100vh" }}>
      <SceneBg />
      <div style={{ position:"relative", zIndex:1, maxWidth:960, margin:"0 auto", padding:"40px 20px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:40 }}>
          <div>
            <div style={{ fontSize:10, color:"#ef4444", letterSpacing:".3em", marginBottom:6, fontFamily:"'Orbitron',monospace" }}>
              ◆ ADMIN CONSOLE
            </div>
            <h1 style={{
              fontSize:28, fontWeight:900, letterSpacing:".15em",
              fontFamily:"'Orbitron',monospace",
              background: C.grad, WebkitBackgroundClip:"text",
              WebkitTextFillColor:"transparent", backgroundClip:"text",
            }}>AXXON</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <ThemeToggle />
            <Btn variant="ghost" onClick={onBack} style={{ fontSize:11 }}>← Exit</Btn>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:32 }}>
          {tabs.map(t => {
            const TabIcon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                style={{
                  padding:"10px 18px", borderRadius:12, cursor:"pointer",
                  background: activeTab===t.id ? "linear-gradient(135deg,#3b82f6,#6366f1)" : C.surface,
                  border: activeTab===t.id ? "none" : `1px solid ${C.border}`,
                  color: activeTab===t.id ? "#fff" : C.muted,
                  fontSize:12, fontWeight:700, letterSpacing:".12em",
                  fontFamily:"'Orbitron',monospace",
                  boxShadow: activeTab===t.id ? "0 4px 18px rgba(99,102,241,0.4)" : "none",
                  transition:"all 0.18s",
                  backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}
              >
                <TabIcon size={14} />
                <span>{t.full}</span>
              </button>
            );
          })}
        </div>

        {/* ── PLAN PRICES TAB ── */}
        {activeTab==="prices" && (
          <TabCard title="Plan Price Configuration" desc="Set custom prices (in USD) for each plan. Changes immediately update the public pricing page, checkout modals, and payment calculations.">
            <div style={{ display:"grid", gap:14, marginBottom:16 }}>
              {[
                { id:"starter", name:"Starter Plan (1 Month / 1 Bot / 3k msgs)", defaultVal:34 },
                { id:"basic",   name:"Basic Plan (7 Days / 2 Bots / 5k msgs)", defaultVal:100 },
                { id:"spark",   name:"Spark Plan (30 Days / 6 Bots / 50k msgs)", defaultVal:300 },
                { id:"super",   name:"Super Plan (30 Days / 20 Bots / 200k msgs)", defaultVal:700 },
                { id:"king",    name:"King Plan (1 Year / Unlimited Bots / 20M msgs)", defaultVal:4000 },
                { id:"ultra",   name:"Ultra Plan (Lifetime / Unlimited Bots & msgs)", defaultVal:20000 },
              ].map(plan => (
                <Card3D key={plan.id} intensity={3} glowColor={C.indigo} style={{
                  background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 16, padding: "16px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  flexWrap: "wrap", gap: 12,
                }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "system-ui", marginBottom: 4 }}>
                      {plan.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui" }}>
                      Current Live Price: <strong style={{ color: "#4ade80" }}>${planPrices[plan.id] ?? plan.defaultVal} USD</strong>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, color: C.text, fontWeight: 700, fontFamily: "'Orbitron',monospace" }}>$</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={planPrices[plan.id] ?? ""}
                      onChange={e => setPlanPrices(prev => ({ ...prev, [plan.id]: e.target.value }))}
                      placeholder={String(plan.defaultVal)}
                      style={{
                        width: 130, padding: "10px 14px", borderRadius: 10,
                        background: "rgba(0,0,0,0.4)", border: `1px solid ${C.border}`,
                        color: "#fff", fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron',monospace",
                      }}
                    />
                    <span style={{ fontSize: 11, color: C.dim, fontFamily: "'Orbitron',monospace" }}>USD</span>
                  </div>
                </Card3D>
              ))}

              {/* Currency Markup Rate Card */}
              <Card3D intensity={3} glowColor="#f59e0b" style={{
                background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 16, padding: "16px 20px",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 12, marginTop: 8,
              }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "system-ui", marginBottom: 4 }}>
                    Non-USD Currency Exchange Markup (%)
                  </div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui" }}>
                    Markup percentage applied to non-USD local currency rates (e.g. 15% higher rate).
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={markupPercent}
                    onChange={e => setMarkupPercent(e.target.value)}
                    placeholder="15"
                    style={{
                      width: 100, padding: "10px 14px", borderRadius: 10,
                      background: "rgba(0,0,0,0.5)", border: "1px solid rgba(245,158,11,0.4)",
                      color: "#fbbf24", fontSize: 14, fontWeight: 700, fontFamily: "'Orbitron',monospace",
                    }}
                  />
                  <span style={{ fontSize: 13, color: "#fbbf24", fontWeight: 700, fontFamily: "'Orbitron',monospace" }}>%</span>
                </div>
              </Card3D>
            </div>
            {priceMsg.text && <AMsg ok={priceMsg.ok} text={priceMsg.text} />}
            <Btn onClick={handleSavePrices} disabled={pricesSaving} style={{ marginTop:8 }}>
              {pricesSaving ? "Saving Configuration…" : "Save Plan Prices & Exchange Rates"}
            </Btn>
          </TabCard>
        )}

        {/* ── PAYMENTS TAB ── */}
        {activeTab==="payments" && (
          <TabCard title="Card / Fiat Payment API" desc="Enter your payment gateway API key for each plan. Clients paying by card use this key — it auto-converts to local currency at live rates.">
            <div style={{ display:"grid", gap:4 }}>
              {PLANS.map(plan => (
                <div key={plan}>
                  <Input
                    label={`${plan.toUpperCase()} Plan — API Key`}
                    value={planAPIs[plan]}
                    onChange={e => setPlanAPIs(p => ({ ...p, [plan]:e.target.value }))}
                    placeholder={`Paste your ${plan} plan gateway API key here`}
                  />
                </div>
              ))}
            </div>
            {paymentMsg.text && <AMsg ok={paymentMsg.ok} text={paymentMsg.text} />}
            <Btn onClick={handleSavePayments} style={{ marginTop:8 }}>Save Payment Settings</Btn>
          </TabCard>
        )}

        {/* ── WALLETS TAB ── */}
        {activeTab==="wallets" && (
          <TabCard title="Crypto Wallet Addresses" desc="Funds from crypto payments are sent directly to these addresses. Prices are auto-calculated from USDT plan prices using live market rates.">
            <div style={{ display:"grid", gap:16, marginBottom:8 }}>
              {CRYPTOS.map(coin => (
                <Card3D key={coin} intensity={4} glowColor={CRYPTO_COLORS[coin]} style={{
                  background: `${CRYPTO_COLORS[coin]}08`,
                  border:`1px solid ${CRYPTO_COLORS[coin]}25`,
                  borderRadius:16, padding:"18px 20px",
                }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                    <div style={{
                      width:40, height:40, borderRadius:10, flexShrink:0,
                      background:`${CRYPTO_COLORS[coin]}18`, border:`1px solid ${CRYPTO_COLORS[coin]}30`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:20, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: CRYPTO_COLORS[coin]
                    }}>{CRYPTO_ICONS[coin]}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:"'Orbitron',monospace", letterSpacing:".1em" }}>
                      {coin}
                    </div>
                    {wallets[coin] && (
                      <Badge color={CRYPTO_COLORS[coin]} style={{ display:"inline-flex", alignItems:"center", gap:3 }}>
                        <Check size={10} /> Saved
                      </Badge>
                    )}
                  </div>
                  <input
                    type="text"
                    value={wallets[coin]}
                    onChange={e => setWallets(w => ({ ...w, [coin]:e.target.value }))}
                    placeholder={`Enter your ${coin} wallet address`}
                    style={{ ...rawInput, fontFamily:"'Courier New',monospace", fontSize:12 }}
                    onFocus={e  => { e.target.style.borderColor = CRYPTO_COLORS[coin]; e.target.style.boxShadow = `0 0 0 3px ${CRYPTO_COLORS[coin]}20`; }}
                    onBlur={e   => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                  />
                  {wallets[coin] && (
                    <div style={{ fontSize:11, color:CRYPTO_COLORS[coin], marginTop:8, fontFamily:"monospace", display:"flex", alignItems:"center", gap:4 }}>
                      <Check size={11} /> {wallets[coin].slice(0,18)}…{wallets[coin].slice(-8)}
                    </div>
                  )}
                </Card3D>
              ))}
            </div>
            {paymentMsg.text && <AMsg ok={paymentMsg.ok} text={paymentMsg.text} />}
            <Btn onClick={handleSavePayments}>Save Wallet Addresses</Btn>
          </TabCard>
        )}

        {/* ── USERS TAB ── */}
        {activeTab==="users" && (() => {
          const filteredUsers = users.filter(u => {
            if (!userSearch.trim()) return true;
            const q = userSearch.toLowerCase().trim();
            return (u.email || "").toLowerCase().includes(q) || (u.plan || "").toLowerCase().includes(q);
          });
          const verifiedCount = users.filter(u => u.email_verified).length;
          const paidCount = users.filter(u => u.plan && u.plan !== "free" && u.plan !== "trial").length;

          return (
            <TabCard
              title="User Management"
              desc="Manage registered client accounts, verify users, assign subscription plans, or grant custom allowances."
              action={
                <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                  <Btn
                    variant="ghost"
                    onClick={() => setShowAddUser(s => !s)}
                    style={{ fontSize:11, padding:"9px 15px", display:"inline-flex", alignItems:"center", gap:6 }}
                  >
                    <UserPlus size={12} /> {showAddUser ? "Close Form" : "Add User"}
                  </Btn>
                  <Btn
                    variant="ghost"
                    onClick={loadUsers}
                    style={{ fontSize:11, padding:"9px 15px", display:"inline-flex", alignItems:"center", gap:6 }}
                  >
                    <RefreshCw size={12} style={{ animation: usersLoading ? "spin 1s linear infinite" : "none" }} /> Refresh
                  </Btn>
                </div>
              }
            >
              {userMsg.text && <AMsg ok={userMsg.ok} text={userMsg.text} />}

              {/* ADD USER COLLAPSIBLE FORM */}
              {showAddUser && (
                <div style={{
                  background:C.surface, border:`1px solid rgba(99,102,241,0.3)`,
                  borderRadius:16, padding:"20px 24px", marginBottom:20,
                  boxShadow:"0 8px 30px rgba(0,0,0,0.25)"
                }}>
                  <div style={{ fontSize:14, fontWeight:600, color:C.text, fontFamily:"system-ui", marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
                    <UserPlus size={16} color={C.indigo} /> Create & Verify Client Account
                  </div>
                  <form onSubmit={handleAddUser} style={{ display:"grid", gap:14 }}>
                    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12 }}>
                      <div>
                        <label style={{ display:"block", fontSize:11, color:C.muted, marginBottom:5, fontFamily:"system-ui" }}>Email Address *</label>
                        <input
                          type="email"
                          required
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          placeholder="client@company.com"
                          style={{ ...rawInput, width:"100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ display:"block", fontSize:11, color:C.muted, marginBottom:5, fontFamily:"system-ui" }}>Subscription Plan</label>
                        <select
                          value={newPlan}
                          onChange={e => setNewPlan(e.target.value)}
                          style={{ ...rawInput, width:"100%", background:C.surface, cursor:"pointer" }}
                        >
                          <option value="starter">Starter (1 Bot · 500 msgs · $34/mo)</option>
                          <option value="basic">Basic (2 Bots · 2,500 msgs)</option>
                          <option value="spark">Spark (4 Bots · 6,000 msgs)</option>
                          <option value="super">Super (10 Bots · 15,000 msgs)</option>
                          <option value="king">King (Unlimited Bots)</option>
                          <option value="ultra">Ultra (Dedicated AI cluster)</option>
                          <option value="trial">Trial (2 Bots · 3 Days)</option>
                          <option value="free">Free Tier</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display:"block", fontSize:11, color:C.muted, marginBottom:5, fontFamily:"system-ui" }}>Initial Password</label>
                        <input
                          type="text"
                          value={newUserPw}
                          onChange={e => setNewUserPw(e.target.value)}
                          placeholder="2712"
                          style={{ ...rawInput, width:"100%" }}
                        />
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:4 }}>
                      <Btn variant="ghost" type="button" onClick={() => setShowAddUser(false)}>Cancel</Btn>
                      <Btn type="submit" disabled={addingUser} style={{ padding:"9px 20px" }}>
                        {addingUser ? "Adding…" : "Create & Authorize User"}
                      </Btn>
                    </div>
                  </form>
                </div>
              )}

              {/* SEARCH & METRICS BAR */}
              <div style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                flexWrap:"wrap", gap:14, marginBottom:18, padding:"12px 16px",
                background:C.surface, border:`1px solid ${C.border}`, borderRadius:14
              }}>
                <div style={{ position:"relative", flex:1, minWidth:220 }}>
                  <Search size={14} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:C.dim }} />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search by email or plan..."
                    style={{ ...rawInput, paddingLeft:34, fontSize:12, width:"100%", background:"transparent" }}
                  />
                </div>
                <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                  <span style={{ fontSize:12, color:C.muted, fontFamily:"system-ui" }}>
                    Total: <strong style={{ color:C.text }}>{users.length}</strong>
                  </span>
                  <span style={{ fontSize:12, color:"#22c55e", fontFamily:"system-ui" }}>
                    Verified: <strong>{verifiedCount}</strong>
                  </span>
                  <span style={{ fontSize:12, color:C.indigo, fontFamily:"system-ui" }}>
                    Active Plans: <strong>{paidCount}</strong>
                  </span>
                </div>
              </div>

              {usersLoading ? (
                <div style={{ color:C.muted, fontSize:13, fontFamily:"system-ui", padding:"36px 0", textAlign:"center" }}>
                  <RefreshCw size={20} style={{ animation:"spin 1s linear infinite", margin:"0 auto 10px", display:"block", color:C.indigo }} />
                  Loading accounts from database & Firestore…
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{
                  textAlign:"center", padding:"44px 24px",
                  background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:16, color:C.muted, fontSize:13, fontFamily:"system-ui",
                }}>
                  {userSearch ? "No users matching search query." : "No users found in database."}
                  <div style={{ marginTop:14 }}>
                    <Btn onClick={loadUsers} style={{ fontSize:11, padding:"8px 16px" }}>Refresh Now</Btn>
                  </div>
                </div>
              ) : (
                <div style={{ display:"grid", gap:12 }}>
                  {filteredUsers.map(u => {
                    const isOwner = (u.email || "").toLowerCase() === "distinctstarschoolsdevices@gmail.com";
                    return (
                      <Card3D key={u.id || u.email} intensity={3}
                        glowColor={isOwner ? "#f59e0b" : (u.email_verified ? "#22c55e" : "#ef4444")}
                        style={{
                          background:C.surface,
                          border:`1px solid ${isOwner ? "rgba(245,158,11,0.35)" : (u.email_verified ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)")}`,
                          borderRadius:14, padding:"16px 20px",
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          flexWrap:"wrap", gap:14,
                          backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
                        }}>
                        <div style={{ flex:1, minWidth:260 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6, flexWrap:"wrap" }}>
                            <span style={{ fontSize:14, fontWeight:600, color:C.text, fontFamily:"system-ui", wordBreak:"break-all" }}>
                              {u.email}
                            </span>
                            {isOwner && (
                              <Badge color="#f59e0b" style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:10, padding:"2px 8px" }}>
                                <Star size={10} /> Workspace Owner
                              </Badge>
                            )}
                          </div>
                          <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginTop:4 }}>
                            <Badge color={u.email_verified ? "#22c55e" : "#ef4444"} style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                              {u.email_verified ? <Check size={10} /> : <X size={10} />}
                              {u.email_verified ? "Verified" : "Unverified"}
                            </Badge>

                            {/* PLAN SWITCHER SELECT */}
                            <select
                              value={u.plan || "free"}
                              onChange={e => handleUpdateUserPlan(u.id, e.target.value)}
                              title="Change user plan"
                              style={{
                                background:"rgba(99,102,241,0.15)",
                                border:`1px solid ${C.indigo}`,
                                color:C.text,
                                borderRadius:8,
                                padding:"3px 8px",
                                fontSize:11,
                                fontWeight:600,
                                textTransform:"uppercase",
                                cursor:"pointer",
                                outline:"none"
                              }}
                            >
                              <option value="starter">STARTER ($34/mo)</option>
                              <option value="basic">BASIC</option>
                              <option value="spark">SPARK</option>
                              <option value="super">SUPER</option>
                              <option value="king">KING</option>
                              <option value="ultra">ULTRA</option>
                              <option value="trial">TRIAL</option>
                              <option value="free">FREE</option>
                            </select>

                            <span style={{ fontSize:11, color:C.dim, fontFamily:"system-ui" }}>
                              Bots: <strong style={{ color:C.text }}>{u.bot_allowance ?? 0}</strong> · Msgs: <strong style={{ color:C.text }}>{Number(u.message_allowance || 0).toLocaleString()}</strong>
                            </span>

                            <span style={{ fontSize:11, color:C.dim, fontFamily:"system-ui" }}>
                              Joined: {u.created_at ? new Date(u.created_at).toLocaleDateString() : "Active"}
                            </span>
                          </div>
                        </div>

                        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                          {!u.email_verified && (
                            <Btn onClick={() => handleVerifyUser(u.id)} style={{
                              background:"linear-gradient(135deg,#22c55e,#16a34a)",
                              boxShadow:"0 4px 14px rgba(34,197,94,0.3)",
                              padding:"8px 14px", fontSize:11, display:"inline-flex", alignItems:"center", gap:5,
                            }}>
                              <Check size={12} /> Verify Account
                            </Btn>
                          )}
                          <Btn variant="danger" onClick={() => handleDeleteUser(u.id)} style={{ padding:"8px 14px", fontSize:11, display:"inline-flex", alignItems:"center", gap:5 }}>
                            <Trash2 size={12} /> Delete
                          </Btn>
                        </div>
                      </Card3D>
                    );
                  })}
                </div>
              )}
            </TabCard>
          );
        })()}

        {/* ── MY CHATBOT TAB ── */}
        {activeTab==="chatbot" && (() => {
          const baseUrl = window.location.protocol + "//" + window.location.host;

          // EDIT MODE
          if (editingBot) {
            return (
              <TabCard title={`Edit Bot — ${editingBot.name}`} desc="Update the name, website, or FAQ training data. Changes take effect immediately.">
                <div style={{ marginBottom:28 }}>
                  <EmbedGuide botId={editingBot.id} botName={editingBot.name} baseUrl={baseUrl} />
                </div>
                <div style={{ display:"grid", gap:4, marginBottom:4 }}>
                  <Input label="Chatbot Name *" value={editName} onChange={e => setEditName(e.target.value)} />
                  <Input label="Website URL (optional)" value={editSite} onChange={e => setEditSite(e.target.value)} placeholder="https://your-website.com" />
                </div>
                <AdminFAQEditor faqs={editFAQs} onChange={updateEditFAQ} onAdd={addEditFAQ} onRemove={removeEditFAQ} />
                {editMsg.text && <AMsg ok={editMsg.ok} text={editMsg.text} />}
                <div style={{ display:"flex", gap:12 }}>
                  <Btn onClick={handleSaveEdit} disabled={editSaving}>{editSaving ? "Saving…" : "Save Changes"}</Btn>
                  <Btn variant="ghost" onClick={cancelEdit}>Cancel</Btn>
                </div>
              </TabCard>
            );
          }

          // DEFAULT VIEW
          return (
            <TabCard title="My Chatbot (Free)" desc="Build your own chatbot — free, no plan required. Train it with FAQs and deploy it on your website.">

              {/* Existing bots */}
              {adminBots.length > 0 && (
                <div style={{ marginBottom:28 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:".2em", color:C.muted, fontFamily:"'Orbitron',monospace", marginBottom:14 }}>
                    YOUR EXISTING BOTS
                  </div>
                  <div style={{ display:"grid", gap:10 }}>
                    {adminBots.map(bot => {
                      const botUrl = `${baseUrl}/bot/${bot.id}`;
                      const faqs = Array.isArray(bot.faqs) ? bot.faqs : [];
                      return (
                        <Card3D key={bot.id} intensity={4} glowColor={C.indigo} style={{
                          background:C.surface, border:`1px solid ${C.border}`,
                          borderRadius:16, padding:"18px 22px",
                          backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)",
                        }}>
                          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
                            <div>
                              <div style={{ fontSize:14, fontWeight:700, color:C.text, fontFamily:"system-ui", marginBottom:6 }}>{bot.name}</div>
                              <div style={{ display:"flex", gap:8 }}>
                                <Badge color={C.indigo}>{faqs.length} FAQ{faqs.length !== 1 ? "s" : ""}</Badge>
                                {bot.website && (
                                  <Badge color="#22c55e">
                                    <span style={{ display:"inline-flex", alignItems:"center", gap:4 }}>
                                      <Globe size={11} /> {bot.website.replace(/^https?:\/\//,"").split("/")[0]}
                                    </span>
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                              <a href={botUrl} target="_blank" rel="noreferrer" style={{ ...chipLink, borderColor:"rgba(34,197,94,0.35)", color:"#4ade80" }}>
                                <ExternalLink size={12} style={{ marginRight: 4 }} /> Test
                              </a>
                              <button onClick={() => toggleAdminAnalytics(bot.id)} style={{
                                ...chip,
                                background: analyticsMap[bot.id]?.data ? "rgba(99,102,241,0.15)" : "transparent",
                                borderColor: analyticsMap[bot.id]?.data ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.25)",
                                color: analyticsMap[bot.id]?.data ? "#a5b4fc" : C.muted,
                                display: "inline-flex", alignItems: "center", gap: 5
                              }}>
                                <BarChart3 size={12} /> Stats
                              </button>
                              <button onClick={() => startEdit(bot)} style={{ ...chip, borderColor:"rgba(99,102,241,0.35)", color:"#a5b4fc", display:"inline-flex", alignItems:"center", gap:5 }}>
                                <Edit3 size={12} /> Edit
                              </button>
                            </div>
                          </div>
                          {analyticsMap[bot.id] && (
                            <div style={{ marginTop:16 }}>
                              <AnalyticsPanelComp stats={analyticsMap[bot.id].data} loading={analyticsMap[bot.id].loading} />
                            </div>
                          )}
                        </Card3D>
                      );
                    })}
                  </div>
                  <div style={{ borderTop:`1px solid ${C.border}`, margin:"28px 0" }} />
                </div>
              )}

              {/* Create success */}
              {createdBot && (
                <div style={{ marginBottom:28 }}>
                  <EmbedGuide botId={createdBot.id} botName={createdBot.name} baseUrl={baseUrl} />
                  <div style={{ marginTop:14 }}>
                    <Btn variant="ghost" onClick={() => setCreatedBot(null)} style={{ fontSize:11, padding:"9px 18px" }}>
                      + Create Another Bot
                    </Btn>
                  </div>
                </div>
              )}

              {/* Create form */}
              <div style={{ display:"grid", gap:4, marginBottom:4 }}>
                <Input label="Chatbot Name *" type="text" value={botName} onChange={e => setBotName(e.target.value)} placeholder="e.g. Axxon Support Bot" />
                <Input label="Website URL (optional)" type="text" value={botSite} onChange={e => setBotSite(e.target.value)} placeholder="https://your-website.com" />
                <div>
                  <Input label="Fallback Contact (when bot can't answer)" type="text" value={botFallback}
                    onChange={e => setBotFallback(e.target.value)}
                    placeholder="https://wa.me/1234567890  or  mailto:you@email.com" />
                  <p style={{ fontSize:12, color:C.dim, fontFamily:"system-ui", marginTop:-12, marginBottom:18 }}>
                    Users see a "Contact Support" button linking here when the bot can't answer
                  </p>
                </div>
              </div>
              <AdminFAQEditor faqs={botFAQs} onChange={updateAdminFAQ} onAdd={addAdminFAQ} onRemove={removeAdminFAQ} />
              {botMsg.text && <AMsg ok={botMsg.ok} text={botMsg.text} />}
              <Btn onClick={handleCreateBot}>Create Chatbot</Btn>
            </TabCard>
          );
        })()}

        {/* ── SOCIALS TAB ── */}
        {activeTab==="socials" && (
          <TabCard title="Social Handles" desc="Configure your official social handles — these power the chatbot live-agent button and all public-facing profile links.">
            <div style={{ display:"grid", gap:10, marginBottom:8 }}>
              {[
                { key:"telegram", label:"Telegram",   value:telegram,  set:setTelegram,  color:"#229ED9", placeholder:"@handle or https://t.me/handle",
                  icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.9-.74 1.12-1.5.69l-4.14-3.06-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg> },
                { key:"x",        label:"X (Twitter)", value:xHandle,   set:setXHandle,   color:"#e7e9ea", placeholder:"@handle or https://x.com/handle",
                  icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
                { key:"farcaster",label:"Farcaster",  value:farcaster, set:setFarcaster, color:"#8A63D2", placeholder:"@handle or https://warpcast.com/handle",
                  icon:<svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" width="18" height="18"><path d="M11.988 0C5.366 0 0 5.373 0 12s5.366 12 11.988 12C18.628 24 24 18.627 24 12S18.628 0 11.988 0zM18 16.5h-2.14l-.857-3.15-.862 3.15H12l-.857-3.15-.862 3.15H8.14L6 8.5h2.857l.857 3.5.857-3.5h2.858l.857 3.5.857-3.5H18l-2.143 8z"/></svg> },
                { key:"linkedin", label:"LinkedIn",   value:linkedin,  set:setLinkedin,  color:"#0A66C2", placeholder:"https://linkedin.com/in/yourprofile",
                  icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
                { key:"github",   label:"GitHub",     value:github,    set:setGithub,    color:"#e6edf3", placeholder:"https://github.com/yourhandle",
                  icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> },
                { key:"tiktok",   label:"TikTok",     value:tiktok,    set:setTiktok,    color:"#EE1D52", placeholder:"@handle or https://tiktok.com/@handle",
                  icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
                { key:"discord",  label:"Discord",    value:discord,   set:setDiscord,   color:"#5865F2", placeholder:"https://discord.gg/yourserver or @username",
                  icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
              ].map(({ key, label, value, set, placeholder, color, icon }) => (
                <Glass key={key} style={{
                  display:"flex", alignItems:"center", gap:14,
                  border:`1px solid ${C.border}`, borderRadius:16, padding:"14px 18px",
                  transition:"border-color .2s",
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = color + "50"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{
                    width:40, height:40, borderRadius:10, flexShrink:0,
                    background:`${color}14`, border:`1px solid ${color}30`,
                    display:"flex", alignItems:"center", justifyContent:"center", color,
                  }}>{icon}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:".2em", color:C.muted, fontFamily:"'Orbitron',monospace", marginBottom:8 }}>
                      {label.toUpperCase()}
                    </div>
                    <input type="text" value={value} onChange={e => set(e.target.value)} placeholder={placeholder}
                      style={{ ...rawInput, padding:"10px 14px", fontSize:12 }}
                      onFocus={e  => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 3px ${color}20`; }}
                      onBlur={e   => { e.target.style.borderColor = C.border; e.target.style.boxShadow = "none"; }}
                    />
                  </div>
                </Glass>
              ))}
            </div>
            {socialMsg.text && <AMsg ok={socialMsg.ok} text={socialMsg.text} />}
            <Btn onClick={handleUpdateSocials}>Save Social Handles</Btn>
          </TabCard>
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab==="security" && (
          <TabCard title="Security Settings" desc="Update the master admin panel passcode.">
            <div style={{ display:"grid", gap:4, marginBottom:8 }}>
              <Input label="Current Password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password" />
              <Input label="New Password"     type="password" value={newPw}      onChange={e => setNewPw(e.target.value)}      placeholder="Enter new password" />
              <Input label="Confirm New Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" />
            </div>
            {pwMsg.text && <AMsg ok={pwMsg.ok} text={pwMsg.text} />}
            <Btn onClick={handleUpdatePassword} style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)", boxShadow:"0 4px 20px rgba(239,68,68,0.35)" }}>
              Update Password
            </Btn>
          </TabCard>
        )}

        {/* ── REPORTS TAB ── */}
        {activeTab==="reports" && (
          <TabCard title="Weekly Analytics Report" desc="Every Monday at 8:00 AM, Axxon emails you a full week summary — messages, match rate, top questions, unmatched queries, payments, and revenue.">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:24 }}>
              {[
                { icon: <Bot size={22} color={C.indigo} />, label:"Messages",   desc:"Total chat volume this week"  },
                { icon: <Target size={22} color="#38bdf8" />, label:"Match Rate",  desc:"FAQ hits vs AI fallbacks"     },
                { icon: <DollarSign size={22} color="#4ade80" />, label:"Revenue",     desc:"Completed payments this week" },
                { icon: <AlertTriangle size={22} color="#f59e0b" />,  label:"Unmatched",   desc:"Questions needing new FAQs"  },
              ].map(item => (
                <Card3D key={item.label} intensity={5} glowColor={C.indigo} style={{
                  background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:16, padding:"20px 18px",
                }}>
                  <div style={{ marginBottom:10 }}>{item.icon}</div>
                  <div style={{ fontSize:10, color:C.indigo, letterSpacing:".2em", fontWeight:700, fontFamily:"'Orbitron',monospace" }}>{item.label}</div>
                  <div style={{ fontSize:12, color:C.muted, marginTop:5, fontFamily:"system-ui" }}>{item.desc}</div>
                </Card3D>
              ))}
            </div>
            <Glass style={{ padding:"14px 18px", marginBottom:24, borderRadius:14 }}>
              <p style={{ fontSize:13, color:"#60a5fa", fontFamily:"system-ui", lineHeight:1.7, margin:0 }}>
                <Clock size={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
                Auto-sends every <strong>Monday at 8:00 AM</strong> to your admin Gmail.<br/>
                Use the button below to trigger a report right now for testing.
              </p>
            </Glass>
            {reportMsg.text && <AMsg ok={reportMsg.ok} text={reportMsg.text} />}
            <Btn onClick={sendReportNow} disabled={reportSending} style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
              <Zap size={14} />
              {reportSending ? "Sending…" : "Send Report Now"}
            </Btn>
          </TabCard>
        )}

        {/* ── CHAIN MONITOR TAB ── */}
        {activeTab==="chain" && (
          <TabCard title="Blockchain Monitor" desc="View recent on-chain transactions to your configured crypto wallets in real time. Supports BTC, ETH, SOL, and USDT (auto-detects Tron vs ERC-20).">
            {chainError && <AMsg ok={false} text={chainError} />}
            <Btn onClick={fetchChainData} disabled={chainLoading} style={{ marginBottom:28, display:"inline-flex", alignItems:"center", gap:6 }}>
              <Search size={14} />
              {chainLoading ? "Fetching…" : "Fetch Latest Transactions"}
            </Btn>

            {chainData && (
              <div style={{ display:"grid", gap:20 }}>
                {["BTC","ETH","SOL","USDT"].map(coin => {
                  const addr = chainData.wallets?.[coin];
                  const txs  = chainData.results?.[coin];
                  const color = CRYPTO_COLORS[coin];
                  if (!addr) return (
                    <Card3D key={coin} intensity={3} style={{
                      background:C.surface, border:`1px solid ${C.border}`,
                      borderRadius:14, padding:"16px 20px",
                    }}>
                      <span style={{ fontSize:12, color:C.dim, fontFamily:"system-ui" }}>
                        {CRYPTO_ICONS[coin]} {coin} — No wallet configured
                      </span>
                    </Card3D>
                  );
                  const hasError = txs?.error;
                  const rows = Array.isArray(txs) ? txs : [];
                  return (
                    <Card3D key={coin} intensity={4} glowColor={color} style={{
                      background:`${color}06`, border:`1px solid ${color}25`,
                      borderRadius:18, overflow:"hidden",
                    }}>
                      {/* Coin header */}
                      <div style={{
                        padding:"16px 22px", borderBottom:`1px solid ${color}18`,
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                      }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                          <div style={{
                            width:38, height:38, borderRadius:10, flexShrink:0,
                            background:`${color}18`, border:`1px solid ${color}30`,
                            display:"flex", alignItems:"center", justifyContent:"center",
                            fontSize:20, fontWeight: 700, fontFamily: "'Orbitron', monospace", color
                          }}>{CRYPTO_ICONS[coin]}</div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:"'Orbitron',monospace", letterSpacing:".1em" }}>{coin}</div>
                            <div style={{ fontSize:11, color:C.dim, fontFamily:"monospace", maxWidth:220, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{addr}</div>
                          </div>
                        </div>
                        <a
                          href={coin==="BTC" ? `https://www.blockchain.com/explorer/addresses/btc/${addr}`
                            : coin==="ETH" ? `https://etherscan.io/address/${addr}`
                            : coin==="SOL" ? `https://solscan.io/account/${addr}`
                            : addr.startsWith("T") ? `https://tronscan.org/#/address/${addr}`
                            : `https://etherscan.io/address/${addr}`}
                          target="_blank" rel="noopener noreferrer"
                          style={{ fontSize:11, color:color, textDecoration:"none", fontFamily:"system-ui", fontWeight:600 }}
                        >
                          View Explorer ↗
                        </a>
                      </div>

                      {hasError && (
                        <div style={{ padding:"14px 22px", fontSize:13, color:"#f87171", fontFamily:"system-ui", display:"flex", alignItems:"center", gap:6 }}>
                          <AlertTriangle size={14} /> {txs.error}
                        </div>
                      )}
                      {!hasError && rows.length === 0 && (
                        <div style={{ padding:"22px", fontSize:13, color:C.dim, fontFamily:"system-ui", textAlign:"center" }}>No recent transactions found</div>
                      )}
                      {rows.map((tx, i) => {
                        const isRcv = tx.type==="received";
                        const isFail = tx.status==="failed";
                        return (
                          <div key={i} style={{
                            padding:"12px 22px",
                            borderBottom: i < rows.length-1 ? `1px solid ${C.border}` : "none",
                            display:"flex", alignItems:"center", gap:12,
                          }}>
                            <div style={{
                              width:34, height:34, borderRadius:"50%", flexShrink:0,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              background: isFail ? "rgba(239,68,68,0.12)" : isRcv ? "rgba(52,211,153,0.12)" : "rgba(239,68,68,0.12)",
                              border:`1px solid ${isFail ? "rgba(239,68,68,0.3)" : isRcv ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)"}`,
                            }}>
                              {isFail ? (
                                <X size={14} color="#f87171" />
                              ) : isRcv ? (
                                <ArrowDown size={14} color="#34d399" />
                              ) : tx.type==="transaction" ? (
                                <ArrowRight size={14} color="#a5b4fc" />
                              ) : (
                                <ArrowUp size={14} color="#f87171" />
                              )}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                                <Badge color={isFail ? "#f87171" : isRcv ? "#34d399" : "#a5b4fc"}>
                                  {isFail ? "FAILED" : tx.type==="transaction" ? "TX" : tx.type.toUpperCase()}
                                </Badge>
                                <span style={{ fontSize:13, color:C.text, fontFamily:"system-ui" }}>{tx.amount}</span>
                                {tx.memo && <span style={{ fontSize:11, color:C.muted, fontFamily:"system-ui" }}>({tx.memo})</span>}
                              </div>
                              <div style={{ fontSize:11, color:C.dim, fontFamily:"system-ui", marginTop:3 }}>
                                {tx.time ? new Date(tx.time).toLocaleString() : "—"}
                              </div>
                            </div>
                            <a href={tx.explorer} target="_blank" rel="noopener noreferrer"
                              style={{
                                fontSize:11, color:color, textDecoration:"none", flexShrink:0,
                                background:`${color}12`, border:`1px solid ${color}30`,
                                borderRadius:8, padding:"5px 11px", fontFamily:"system-ui", fontWeight:600,
                                display:"inline-flex", alignItems:"center", gap:4,
                              }}
                            >
                              <span>TX</span>
                              <ExternalLink size={10} />
                            </a>
                          </div>
                        );
                      })}
                    </Card3D>
                  );
                })}
              </div>
            )}
          </TabCard>
        )}

      </div>
      <style>{globalCSS}</style>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

/** Full-width section card used by every tab */
function TabCard({ title, desc, children, action }) {
  return (
    <Card3D intensity={3} glowColor={C.indigo} style={{
      background: C.surface,
      backdropFilter:"blur(24px)", WebkitBackdropFilter:"blur(24px)",
      border:`1px solid ${C.border}`,
      borderRadius:20, padding:"32px 28px", marginBottom:24,
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap" }}>
        <div>
          <h3 style={{ fontFamily:"'Orbitron',monospace", fontWeight:700, fontSize:14, letterSpacing:".15em", color:C.text, marginBottom:8 }}>
            {title}
          </h3>
          <div style={{ width:40, height:2, background:C.grad, borderRadius:2, marginBottom:14 }} />
          {desc && <p style={{ fontSize:13, color:C.muted, fontFamily:"system-ui", lineHeight:1.7, maxWidth:600 }}>{desc}</p>}
        </div>
        {action && <div style={{ flexShrink:0 }}>{action}</div>}
      </div>
      {children}
    </Card3D>
  );
}

/** FAQ editor reused in both create and edit modes */
function AdminFAQEditor({ faqs, onChange, onAdd, onRemove }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:".2em", color:C.muted, fontFamily:"'Orbitron',monospace", marginBottom:14 }}>
        FAQ TRAINING DATA
      </div>
      <div style={{ display:"grid", gap:12 }}>
        {faqs.map((faq, i) => (
          <Glass key={i} style={{ background:"rgba(99,102,241,0.06)", border:"1px solid rgba(99,102,241,0.18)", borderRadius:14, padding:"16px 18px" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
              <Badge color={C.indigo}>FAQ #{i+1}</Badge>
              {faqs.length > 1 && (
                <button onClick={() => onRemove(i)} style={{
                  background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)",
                  borderRadius:8, color:"#f87171", cursor:"pointer", padding:"4px 8px",
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                }} title="Remove FAQ">
                  <X size={13} />
                </button>
              )}
            </div>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <div style={{ flex:1, minWidth:180 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, letterSpacing:".2em", color:"#6366f1", fontFamily:"'Orbitron',monospace", marginBottom:8 }}>QUESTION</label>
                <textarea value={faq.q} onChange={e => onChange(i,"q",e.target.value)}
                  placeholder="e.g. What are your business hours?"
                  style={ta} />
              </div>
              <div style={{ flex:1, minWidth:180 }}>
                <label style={{ display:"block", fontSize:9, fontWeight:700, letterSpacing:".2em", color:"#22c55e", fontFamily:"'Orbitron',monospace", marginBottom:8 }}>ANSWER</label>
                <textarea value={faq.a} onChange={e => onChange(i,"a",e.target.value)}
                  placeholder="e.g. We are open Mon–Fri, 9am–6pm."
                  style={ta} />
              </div>
            </div>
          </Glass>
        ))}
      </div>
      <button onClick={onAdd} style={{
        marginTop:12, width:"100%", padding:"13px 0",
        background:"transparent", border:"1px dashed rgba(99,102,241,0.4)",
        borderRadius:12, color:C.indigo, fontSize:10, fontWeight:700,
        letterSpacing:".15em", fontFamily:"'Orbitron',monospace", cursor:"pointer",
        transition:"all 0.2s",
      }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.08)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >+ Add FAQ</button>
    </div>
  );
}

/** Inline alert/status message */
function AMsg({ ok, text }) {
  return (
    <div style={{
      padding:"12px 16px", borderRadius:12, marginBottom:20,
      background: ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      border:`1px solid ${ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: ok ? "#4ade80" : "#f87171",
      fontSize:13, fontFamily:"system-ui",
    }}>{text}</div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────
const rawInput = {
  width:"100%", background:"rgba(255,255,255,0.04)",
  border:`1px solid ${C.border}`, borderRadius:10,
  color:C.text, fontSize:13, padding:"13px 16px",
  fontFamily:"system-ui,sans-serif", outline:"none", transition:"border-color 0.2s, box-shadow 0.2s",
  boxSizing:"border-box",
};
const ta = {
  width:"100%", boxSizing:"border-box", height:88, resize:"vertical",
  background:"rgba(255,255,255,0.04)", border:`1px solid ${C.border}`,
  borderRadius:10, color:C.text, fontSize:13, padding:"11px 14px",
  fontFamily:"system-ui", lineHeight:1.6, outline:"none",
};
const chip = {
  background:"transparent", border:`1px solid ${C.border}`,
  borderRadius:8, color:C.muted, fontSize:11, fontWeight:600,
  fontFamily:"system-ui", padding:"7px 13px", cursor:"pointer", transition:"all 0.2s",
};
const chipLink = {
  ...chip, textDecoration:"none", display:"inline-flex", alignItems:"center",
};
const backLink = {
  background:"none", border:"none", color:C.muted, fontSize:12,
  letterSpacing:".15em", cursor:"pointer", marginBottom:28,
  padding:0, fontFamily:"'Orbitron',monospace", display:"block",
};
