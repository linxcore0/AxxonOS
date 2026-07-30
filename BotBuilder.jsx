import { useState, useEffect } from "react";
import AnalyticsPanel from "./AnalyticsPanel";
import EmbedGuide from "./EmbedGuide";
import { C, Card3D, Glass, Btn, Input, Badge, SceneBg, globalCSS } from "./theme.jsx";

const API = "";

export default function BotBuilder({ token, botAllowance, plan, planExpiresAt, onSubscribe }) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // "list" | "create" | "edit"
  const [copied, setCopied] = useState({});

  // Create form state
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [fallback, setFallback] = useState("");
  const [faqs, setFaqs] = useState([{ q: "", a: "" }]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: false });
  const [newBot, setNewBot] = useState(null);

  // Edit form state
  const [editBot, setEditBot] = useState(null);
  const [editName, setEditName] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editFallback, setEditFallback] = useState("");
  const [editFaqs, setEditFaqs] = useState([{ q: "", a: "" }]);
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState({ text: "", ok: false });
  const [editCopied, setEditCopied] = useState({});

  // Analytics state: { [botId]: { data, loading } }
  const [analyticsMap, setAnalyticsMap] = useState({});

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.host}`
    : "";

  const [socials, setSocials] = useState({});
  useEffect(() => {
    loadBots();
    fetch(`${API}/api/admin/socials`).then(r => r.json()).then(d => setSocials(d)).catch(() => {});
  }, []);

  async function loadBots() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/bots`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setBots(Array.isArray(data) ? data : []);
    } catch { setBots([]); }
    setLoading(false);
  }

  function addFAQ() { setFaqs(f => [...f, { q: "", a: "" }]); }
  function removeFAQ(i) { setFaqs(f => f.filter((_, idx) => idx !== i)); }
  function updateFAQ(i, field, val) {
    setFaqs(f => f.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }

  async function handleSave() {
    setMsg({ text: "", ok: false });
    if (!name.trim()) return setMsg({ text: "Bot name is required", ok: false });
    const validFaqs = faqs.filter(f => f.q.trim() && f.a.trim());
    if (validFaqs.length === 0) return setMsg({ text: "Add at least one complete FAQ", ok: false });
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/bots`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), website: website.trim(), faqs: validFaqs, fallback_contact: fallback.trim() }),
      });
      const data = await res.json();
      if (res.ok) { setNewBot(data.bot); setMsg({ text: "Bot created!", ok: true }); loadBots(); }
      else setMsg({ text: data.error || "Failed to create bot", ok: false });
    } catch { setMsg({ text: "Request failed", ok: false }); }
    setSaving(false);
  }

  async function handleDelete(botId) {
    if (!window.confirm("Delete this bot? This cannot be undone.")) return;
    try {
      await fetch(`${API}/api/bots/${botId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      loadBots();
    } catch {}
  }

  function copyText(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(c => ({ ...c, [key]: true }));
      setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000);
    });
  }

  function resetForm() {
    setName(""); setWebsite(""); setFallback("");
    setFaqs([{ q: "", a: "" }]);
    setMsg({ text: "", ok: false }); setNewBot(null);
    setView("list");
  }

  function startEdit(bot) {
    setEditBot(bot); setEditName(bot.name || ""); setEditWebsite(bot.website || "");
    setEditFallback(bot.fallback_contact || "");
    const f = Array.isArray(bot.faqs) ? bot.faqs : [];
    setEditFaqs(f.length > 0 ? f : [{ q: "", a: "" }]);
    setEditMsg({ text: "", ok: false }); setEditCopied({});
    setView("edit");
  }

  function cancelEdit() { setEditBot(null); setView("list"); }
  function addEditFAQ() { setEditFaqs(f => [...f, { q: "", a: "" }]); }
  function removeEditFAQ(i) { setEditFaqs(f => f.filter((_, idx) => idx !== i)); }
  function updateEditFAQ(i, field, val) {
    setEditFaqs(f => f.map((row, idx) => idx === i ? { ...row, [field]: val } : row));
  }
  function copyEditText(key, text) {
    navigator.clipboard.writeText(text).then(() => {
      setEditCopied(c => ({ ...c, [key]: true }));
      setTimeout(() => setEditCopied(c => ({ ...c, [key]: false })), 2000);
    });
  }

  async function handleUpdate() {
    setEditMsg({ text: "", ok: false });
    if (!editName.trim()) return setEditMsg({ text: "Bot name is required", ok: false });
    const validFaqs = editFaqs.filter(f => f.q.trim() && f.a.trim());
    if (validFaqs.length === 0) return setEditMsg({ text: "Add at least one complete FAQ", ok: false });
    setEditSaving(true);
    try {
      const res = await fetch(`${API}/api/bots/${editBot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: editName.trim(), website: editWebsite.trim(), faqs: validFaqs, fallback_contact: editFallback.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditMsg({ text: "Bot updated!", ok: true });
        setEditBot(prev => ({ ...prev, name: editName, website: editWebsite, faqs: validFaqs, fallback_contact: editFallback }));
        loadBots();
      } else setEditMsg({ text: data.error || "Failed to update bot", ok: false });
    } catch { setEditMsg({ text: "Request failed", ok: false }); }
    setEditSaving(false);
  }

  async function toggleAnalytics(botId) {
    const current = analyticsMap[botId];
    if (current && current.data) { setAnalyticsMap(m => ({ ...m, [botId]: null })); return; }
    setAnalyticsMap(m => ({ ...m, [botId]: { loading: true, data: null } }));
    try {
      const res = await fetch(`${API}/api/bots/${botId}/analytics`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setAnalyticsMap(m => ({ ...m, [botId]: { loading: false, data: res.ok ? data : null } }));
    } catch { setAnalyticsMap(m => ({ ...m, [botId]: { loading: false, data: null } })); }
  }

  const canCreate = botAllowance === 999 || bots.length < botAllowance;
  const trialDaysLeft = (() => {
    if (plan !== "trial" || !planExpiresAt) return null;
    return Math.max(0, Math.ceil((new Date(planExpiresAt) - Date.now()) / 86400000));
  })();

  // ── LIST VIEW ──────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <div>
        {/* Trial expiry banner */}
        {plan === "trial" && trialDaysLeft !== null && (
          <Card3D
            intensity={4}
            glowColor={trialDaysLeft <= 1 ? "#f87171" : trialDaysLeft <= 2 ? "#fb923c" : "#a5b4fc"}
            style={{
              background: trialDaysLeft <= 1 ? "rgba(239,68,68,0.08)"
                : trialDaysLeft <= 2 ? "rgba(251,146,60,0.08)" : "rgba(99,102,241,0.08)",
              border: `1px solid ${trialDaysLeft <= 1 ? "rgba(239,68,68,0.35)"
                : trialDaysLeft <= 2 ? "rgba(251,146,60,0.35)" : "rgba(99,102,241,0.3)"}`,
              borderRadius: 16, padding: "16px 22px", marginBottom: 24,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: 12, flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{trialDaysLeft <= 1 ? "🚨" : trialDaysLeft <= 2 ? "⚠️" : "⚡"}</span>
              <div>
                <div style={{
                  fontSize: 12, fontWeight: 700,
                  color: trialDaysLeft <= 1 ? "#f87171" : trialDaysLeft <= 2 ? "#fb923c" : "#a5b4fc",
                  fontFamily: "'Orbitron',monospace", letterSpacing: "0.12em", marginBottom: 3,
                }}>
                  {trialDaysLeft === 0 ? "TRIAL EXPIRES TODAY" : `FREE TRIAL — ${trialDaysLeft} DAY${trialDaysLeft !== 1 ? "S" : ""} LEFT`}
                </div>
                <div style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui" }}>
                  2 bots &amp; 5,000 messages on your trial. Upgrade to keep access.
                </div>
              </div>
            </div>
            {onSubscribe && (
              <Btn onClick={onSubscribe} style={{ padding: "9px 20px", fontSize: 10 }}>UPGRADE NOW →</Btn>
            )}
          </Card3D>
        )}

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h2 style={{
              fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 18,
              letterSpacing: "0.08em", color: C.text, marginBottom: 4,
            }}>🤖 My Chatbots</h2>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui" }}>
              {bots.length} / {botAllowance === 999 ? "∞" : botAllowance} bots used
            </div>
          </div>
          {canCreate && <Btn onClick={() => setView("create")}>+ Create Bot</Btn>}
        </div>

        {loading ? (
          <div style={{ color: C.muted, fontSize: 13, fontFamily: "system-ui", padding: "40px 0", textAlign: "center" }}>
            Loading your bots…
          </div>
        ) : bots.length === 0 ? (
          <Card3D intensity={3} style={{
            background: C.surface, border: `1px dashed rgba(99,102,241,0.3)`,
            borderRadius: 20, padding: "56px 32px", textAlign: "center",
          }}>
            <div style={{ fontSize: 44, marginBottom: 18 }}>🤖</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "system-ui", marginBottom: 8 }}>No bots yet</div>
            <div style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui", lineHeight: 1.7 }}>
              Create your first chatbot to get started.
            </div>
            {canCreate && (
              <div style={{ marginTop: 24 }}>
                <Btn onClick={() => setView("create")}>Create My First Bot</Btn>
              </div>
            )}
          </Card3D>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {bots.map(bot => (
              <Card3D key={bot.id} intensity={5} glowColor={C.indigo} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20, padding: "24px 28px",
                backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
              }}>
                {/* Bot header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
                  <div>
                    <div style={{
                      fontSize: 16, fontWeight: 700, color: C.text,
                      fontFamily: "system-ui", marginBottom: 6,
                    }}>{bot.name}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Badge color={C.indigo}>{Array.isArray(bot.faqs) ? bot.faqs.length : 0} FAQs</Badge>
                      {bot.website && (
                        <Badge color="#22c55e">🌐 {bot.website.replace(/^https?:\/\//, "").split("/")[0]}</Badge>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button onClick={() => toggleAnalytics(bot.id)} style={{
                      ...miniBtn,
                      background: analyticsMap[bot.id]?.data ? "rgba(99,102,241,0.15)" : "transparent",
                      borderColor: analyticsMap[bot.id]?.data ? "rgba(99,102,241,0.5)" : "rgba(99,102,241,0.25)",
                      color: analyticsMap[bot.id]?.data ? "#a5b4fc" : C.muted,
                    }}>📊 Stats</button>
                    <button onClick={() => startEdit(bot)} style={{ ...miniBtn, borderColor: "rgba(99,102,241,0.35)", color: "#a5b4fc" }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(bot.id)} style={{ ...miniBtn, borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}>
                      🗑 Delete
                    </button>
                  </div>
                </div>

                <EmbedGuide botId={bot.id} botName={bot.name} baseUrl={baseUrl} compact />

                {analyticsMap[bot.id] && (
                  <div style={{ marginTop: 16 }}>
                    <AnalyticsPanel stats={analyticsMap[bot.id].data} loading={analyticsMap[bot.id].loading} />
                  </div>
                )}
              </Card3D>
            ))}
          </div>
        )}

        <SocialFooter socials={socials} />
        <style>{globalCSS}</style>
      </div>
    );
  }

  // ── EDIT VIEW ──────────────────────────────────────────────────────────────
  if (view === "edit" && editBot) {
    return (
      <div>
        <Btn variant="ghost" onClick={cancelEdit} style={{ marginBottom: 28, padding: "9px 18px", fontSize: 11 }}>
          ← Back to Bots
        </Btn>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 18,
            letterSpacing: "0.08em", color: C.text, marginBottom: 4,
          }}>✏️ Edit — {editBot.name}</h2>
          <p style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui" }}>
            Update your bot's name, website, or FAQs. Changes take effect immediately.
          </p>
        </div>

        {/* Embed guide */}
        <div style={{ marginBottom: 28 }}>
          <EmbedGuide botId={editBot.id} botName={editBot.name} baseUrl={baseUrl} />
        </div>

        {/* Config card */}
        <Card3D intensity={4} glowColor={C.indigo} style={{
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 20, padding: "32px 28px",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        }}>
          <SectionLabel icon="⚙️" text="Bot Configuration" />

          <div style={{ display: "grid", gap: 4, marginBottom: 28 }}>
            <Input label="Bot Name *" value={editName} onChange={e => setEditName(e.target.value)} placeholder="e.g. Support Bot" />
            <Input label="Website URL (optional)" value={editWebsite} onChange={e => setEditWebsite(e.target.value)} placeholder="https://your-website.com" />
            <div>
              <Input label="Fallback Contact Link" value={editFallback} onChange={e => setEditFallback(e.target.value)}
                placeholder="https://wa.me/1234567890 or mailto:you@email.com" />
              <p style={{ fontSize: 12, color: C.dim, fontFamily: "system-ui", marginTop: -10, marginBottom: 18 }}>
                When the bot can't answer, users see a button linking here
              </p>
            </div>
          </div>

          <FAQEditor faqs={editFaqs} onChange={updateEditFAQ} onAdd={addEditFAQ} onRemove={removeEditFAQ} />

          {editMsg.text && <MsgBox ok={editMsg.ok} text={editMsg.text} />}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Btn onClick={handleUpdate} disabled={editSaving}>
              {editSaving ? "Saving…" : "Save & Retrain Bot"}
            </Btn>
            <Btn variant="ghost" onClick={cancelEdit}>Cancel</Btn>
          </div>
        </Card3D>

        <SocialFooter socials={socials} />
        <style>{globalCSS}</style>
      </div>
    );
  }

  // ── CREATE VIEW ────────────────────────────────────────────────────────────
  return (
    <div>
      <Btn variant="ghost" onClick={resetForm} style={{ marginBottom: 28, padding: "9px 18px", fontSize: 11 }}>
        ← Back to Bots
      </Btn>

      {/* Success panel */}
      {newBot && (
        <div style={{ marginBottom: 28 }}>
          <EmbedGuide botId={newBot.id} botName={newBot.name} baseUrl={baseUrl} />
          <div style={{ marginTop: 16 }}>
            <Btn variant="ghost" onClick={resetForm} style={{ fontSize: 11, padding: "9px 18px" }}>
              ← View All My Bots
            </Btn>
          </div>
        </div>
      )}

      {/* Create form */}
      <Card3D intensity={4} glowColor={C.indigo} style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 20, padding: "32px 28px",
        backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      }}>
        <SectionLabel icon="⚙️" text="Bot Configuration" />

        <div style={{ display: "grid", gap: 4, marginBottom: 28 }}>
          <Input label="Bot Name *" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Support Bot" />
          <Input label="Website URL (optional)" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://your-website.com" />
          <div>
            <Input label="Fallback Contact Link" value={fallback} onChange={e => setFallback(e.target.value)}
              placeholder="https://wa.me/1234567890  or  mailto:you@email.com  or  +1234567890" />
            <p style={{ fontSize: 12, color: C.dim, fontFamily: "system-ui", marginTop: -10, marginBottom: 18 }}>
              When the bot can't answer, users see a button linking here
            </p>
          </div>
        </div>

        <FAQEditor faqs={faqs} onChange={updateFAQ} onAdd={addFAQ} onRemove={removeFAQ} />

        {msg.text && <MsgBox ok={msg.ok} text={msg.text} />}

        <Btn onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save & Generate Bot"}
        </Btn>
      </Card3D>

      <SocialFooter socials={socials} />
      <style>{globalCSS}</style>
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function SectionLabel({ icon, text }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{
        fontFamily: "'Orbitron',monospace", fontWeight: 700, fontSize: 13,
        letterSpacing: "0.15em", color: C.text,
      }}>{icon} {text}</h3>
      <div style={{ width: 40, height: 2, background: C.grad, borderRadius: 2, marginTop: 8 }} />
    </div>
  );
}

function FAQEditor({ faqs, onChange, onAdd, onRemove }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: C.muted,
        fontFamily: "'Orbitron',monospace", marginBottom: 16,
      }}>FAQ TRAINING DATA</div>
      <div style={{ display: "grid", gap: 12 }}>
        {faqs.map((faq, i) => (
          <Glass key={i} style={{
            background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)",
            borderRadius: 14, padding: "18px 20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <Badge color={C.indigo}>FAQ #{i + 1}</Badge>
              {faqs.length > 1 && (
                <button onClick={() => onRemove(i)} style={{
                  background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 8, color: "#f87171", cursor: "pointer",
                  fontSize: 13, padding: "4px 10px", lineHeight: 1,
                }}>✕</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={labelSt("#6366f1")}>QUESTION</label>
                <textarea value={faq.q} onChange={e => onChange(i, "q", e.target.value)}
                  placeholder="e.g. What are your business hours?"
                  style={textAreaStyle} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={labelSt("#22c55e")}>ANSWER</label>
                <textarea value={faq.a} onChange={e => onChange(i, "a", e.target.value)}
                  placeholder="e.g. We are open Monday to Friday, 9am – 6pm."
                  style={textAreaStyle} />
              </div>
            </div>
          </Glass>
        ))}
      </div>
      <button
        onClick={onAdd}
        style={{
          marginTop: 12, width: "100%", padding: "14px 0",
          background: "transparent", border: "1px dashed rgba(99,102,241,0.4)",
          borderRadius: 12, color: C.indigo, fontSize: 11, fontWeight: 700,
          letterSpacing: "0.15em", fontFamily: "'Orbitron',monospace", cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(99,102,241,0.08)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        + Add New FAQ
      </button>
    </div>
  );
}

function MsgBox({ ok, text }) {
  return (
    <div style={{
      padding: "13px 18px", borderRadius: 12, marginBottom: 20,
      background: ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
      border: `1px solid ${ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
      color: ok ? "#4ade80" : "#f87171",
      fontSize: 13, fontFamily: "system-ui",
    }}>{text}</div>
  );
}

const SOCIAL_PLATFORMS = [
  { key:"telegram", label:"Telegram", color:"#229ED9", buildUrl: v => v.startsWith("http") ? v : `https://t.me/${v.replace(/^@/,"")}`,
    icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.9-.74 1.12-1.5.69l-4.14-3.06-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg> },
  { key:"x", label:"X", color:"#e7e9ea", buildUrl: v => v.startsWith("http") ? v : `https://x.com/${v.replace(/^@/,"")}`,
    icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
  { key:"farcaster", label:"Farcaster", color:"#8A63D2", buildUrl: v => v.startsWith("http") ? v : `https://warpcast.com/${v.replace(/^@/,"")}`,
    icon:<svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" width="18" height="18"><path d="M11.988 0C5.366 0 0 5.373 0 12s5.366 12 11.988 12C18.628 24 24 18.627 24 12S18.628 0 11.988 0zM18 16.5h-2.14l-.857-3.15-.862 3.15H12l-.857-3.15-.862 3.15H8.14L6 8.5h2.857l.857 3.5.857-3.5h2.858l.857 3.5.857-3.5H18l-2.143 8z"/></svg> },
  { key:"linkedin", label:"LinkedIn", color:"#0A66C2", buildUrl: v => v.startsWith("http") ? v : `https://linkedin.com/in/${v.replace(/^@/,"")}`,
    icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
  { key:"github", label:"GitHub", color:"#e6edf3", buildUrl: v => v.startsWith("http") ? v : `https://github.com/${v.replace(/^@/,"")}`,
    icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg> },
  { key:"tiktok", label:"TikTok", color:"#ff0050", buildUrl: v => v.startsWith("http") ? v : `https://tiktok.com/@${v.replace(/^@/,"")}`,
    icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg> },
  { key:"discord", label:"Discord", color:"#5865F2", buildUrl: v => v.startsWith("http") ? v : `https://discord.gg/${v.replace(/^@/,"")}`,
    icon:<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg> },
];

function SocialFooter({ socials }) {
  const active = SOCIAL_PLATFORMS.filter(p => socials[p.key] && socials[p.key].trim());
  if (!active.length) return null;
  return (
    <div style={{ marginTop: 48, paddingTop: 28, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{ fontSize: 9, letterSpacing: "0.25em", color: C.dim, fontWeight: 600, fontFamily: "'Orbitron',monospace" }}>CONNECT WITH US</div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        {active.map(p => (
          <a key={p.key} href={p.buildUrl(socials[p.key])} target="_blank" rel="noreferrer" title={p.label}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 44, height: 44, borderRadius: 12,
              border: `1px solid ${C.border}`, background: C.surface,
              color: p.color, textDecoration: "none", transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = p.color; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 24px ${p.color}30`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
          >{p.icon}</a>
        ))}
      </div>
    </div>
  );
}

// ── Style helpers ──────────────────────────────────────────────────────────────
const miniBtn = {
  background: "transparent", border: `1px solid ${C.border}`,
  borderRadius: 8, color: C.muted, fontSize: 11, fontWeight: 600,
  fontFamily: "system-ui", padding: "7px 14px", cursor: "pointer",
  transition: "all 0.2s",
};
const textAreaStyle = {
  width: "100%", boxSizing: "border-box", height: 90, resize: "vertical",
  background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
  borderRadius: 10, color: C.text, fontSize: 13, padding: "12px 14px",
  fontFamily: "system-ui", lineHeight: 1.6, outline: "none", transition: "border-color 0.2s",
};
const labelSt = (color) => ({
  display: "block", fontSize: 9, letterSpacing: "0.2em", fontWeight: 700,
  color, marginBottom: 8, fontFamily: "'Orbitron',monospace",
});
