import React, { useState, useRef } from "react";
import PaymentModal from "./PaymentModal";
import { C, SceneBg, Card3D, Glass, Btn, SectionHeading, globalCSS } from "./theme.jsx";

const PLANS = [
  {
    id: "basic", name: "Starter", price: 100, duration: "7 Days",
    messages: "5,000", bots: "2", color: "#6366f1",
    tagline: "Perfect for trying it out",
    features: ["2 Chatbots", "5,000 Messages / month", "7 Day Access", "Basic Analytics", "Email Support", "FAQ Training"],
  },
  {
    id: "spark", name: "Spark", price: 300, duration: "30 Days",
    messages: "50,000", bots: "6", color: "#3b82f6",
    tagline: "For growing businesses",
    features: ["6 Chatbots", "50,000 Messages / month", "30 Day Access", "Advanced Analytics", "Priority Support", "FAQ Training"],
  },
  {
    id: "super", name: "Super", price: 700, duration: "30 Days",
    messages: "200,000", bots: "20", color: "#8b5cf6",
    tagline: "For teams & agencies",
    features: ["20 Chatbots", "200,000 Messages / month", "30 Day Access", "Real-time Analytics", "Priority Support", "Human Handoff", "Custom Branding"],
  },
  {
    id: "king", name: "King 👑", price: 4000, duration: "1 Year",
    messages: "20,000,000", bots: "Unlimited", color: "#3b82f6",
    tagline: "For serious operations",
    features: ["Unlimited Chatbots", "20M Messages / year", "1 Year Access", "Real-time Analytics", "Dedicated Support", "Human Handoff", "White Label", "API Access"],
    featured: true,
  },
  {
    id: "ultra", name: "Ultra ⚡", price: 20000, duration: "Lifetime",
    messages: "Unlimited", bots: "Unlimited", color: "#6366f1",
    tagline: "Own it forever",
    features: ["Unlimited Chatbots", "Unlimited Messages", "Lifetime Access", "Real-time Analytics", "24/7 VIP Support", "Human Handoff", "White Label", "API Access", "Custom Integrations"],
  },
];

const FEATURES = [
  { icon: "🧠", title: "AI That Actually Understands", desc: "Your bot learns from your own FAQs and answers questions the way you would." },
  { icon: "⚡", title: "Live in Under 5 Minutes", desc: "No code, no complicated setup. Just paste a snippet on your site and you're done." },
  { icon: "🌐", title: "Works on Any Website", desc: "One small embed code that works on Shopify, WordPress, Wix, or any custom site." },
  { icon: "🤝", title: "Hands Off to You When Needed", desc: "When a question is too complex, the bot gracefully passes it to a real human." },
  { icon: "📊", title: "See What Your Customers Ask", desc: "Live analytics show you exactly what people ask, so you can improve over time." },
  { icon: "🔒", title: "Your Data Stays Private", desc: "All conversations and training data belong to you. No sharing, no selling." },
];

export default function LandingPage({ onGetStarted, onAdmin }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [socials, setSocials] = useState({
    telegram: "", x: "", farcaster: "", linkedin: "", github: "", tiktok: "", discord: "",
  });

  React.useEffect(() => {
    fetch("/api/admin/socials").then(r => r.json()).then(d => setSocials(s => ({ ...s, ...d }))).catch(() => {});
  }, []);

  const PLATFORMS = [
    { key:"telegram",  label:"Telegram",   color:"#229ED9",
      url: v => v.startsWith("http") ? v : `https://t.me/${v.replace("@","")}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.9-.74 1.12-1.5.69l-4.14-3.06-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg> },
    { key:"x",         label:"X / Twitter", color:"#e7e9ea",
      url: v => v.startsWith("http") ? v : `https://x.com/${v.replace("@","")}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { key:"linkedin",  label:"LinkedIn",    color:"#0A66C2",
      url: v => v.startsWith("http") ? v : `https://linkedin.com/in/${v.replace("@","")}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg> },
    { key:"github",    label:"GitHub",      color:"#f0f6fc",
      url: v => v.startsWith("http") ? v : `https://github.com/${v.replace("@","")}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg> },
    { key:"discord",   label:"Discord",     color:"#5865F2",
      url: v => v.startsWith("http") ? v : `https://discord.gg/${v}`,
      icon: <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.034.055A20.03 20.03 0 0 0 6.16 20.84a.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.201 13.201 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 20.012 20.012 0 0 0 6.028-3.078.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg> },
  ];

  const activeSocials = PLATFORMS.filter(p => socials[p.key]);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      <SceneBg />

      {/* ── NAV ──────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 70, padding: "0 clamp(16px,4vw,48px)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(3,3,8,0.75)",
        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 22,
          letterSpacing: "0.2em",
          background: C.grad,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          filter: "drop-shadow(0 0 12px rgba(99,102,241,0.55))",
        }}>AXXON</div>
        <Btn onClick={onGetStarted} style={{ padding: "10px 24px", fontSize: 11 }}>
          Get Started Free →
        </Btn>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "120px clamp(16px,4vw,48px) 80px",
        position: "relative", zIndex: 1,
      }}>
        {/* Floating 3-D rings behind logo */}
        <div style={{
          position: "absolute", width: 380, height: 380,
          border: `1px solid rgba(99,102,241,0.12)`,
          borderRadius: "50%",
          transform: "perspective(800px) rotateX(65deg)",
          animation: "spin 30s linear infinite",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", width: 260, height: 260,
          border: `1px solid rgba(99,102,241,0.09)`,
          borderRadius: "50%",
          transform: "perspective(800px) rotateX(65deg)",
          animation: "spin 20s linear infinite reverse",
          pointerEvents: "none",
        }} />

        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 999, padding: "7px 20px",
          fontSize: 11, letterSpacing: "0.25em", color: C.indigo,
          fontFamily: "'Orbitron',monospace", marginBottom: 32,
          animation: "fadeUp 0.7s ease 0.2s both",
        }}>◆ AI CHATBOT PLATFORM</div>

        <h1 style={{
          fontFamily: "'Orbitron',monospace", fontWeight: 900,
          fontSize: "clamp(42px,10vw,100px)", letterSpacing: "0.12em",
          lineHeight: 1.05,
          background: C.grad,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          animation: "logoGlow 3s ease-in-out infinite, fadeUp 0.7s ease 0.3s both",
          marginBottom: 12,
        }}>AXXON</h1>
        <div style={{
          fontFamily: "'Orbitron',monospace", fontSize: "clamp(14px,3vw,22px)",
          letterSpacing: "0.4em", color: C.dim, marginBottom: 32,
          animation: "fadeUp 0.7s ease 0.4s both",
        }}>OS</div>

        <p style={{
          fontSize: "clamp(15px,2.5vw,19px)", color: C.muted,
          fontFamily: "system-ui,sans-serif", lineHeight: 1.75,
          maxWidth: 580, marginBottom: 48,
          animation: "fadeUp 0.7s ease 0.5s both",
        }}>
          Deploy AI chatbots on your website in minutes — no coding needed.
          Train them on your own FAQs, accept payments with crypto or card, and watch them work 24/7.
        </p>

        <div style={{
          display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.7s ease 0.6s both",
        }}>
          <Btn onClick={onGetStarted} style={{ padding: "15px 36px", fontSize: 12 }}>
            🚀 Start Free Today
          </Btn>
          <Btn variant="ghost" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "15px 36px", fontSize: 12 }}>
            See Pricing ↓
          </Btn>
        </div>

        {/* Trust row */}
        <div style={{
          display: "flex", gap: 32, marginTop: 64, flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.7s ease 0.8s both",
        }}>
          {["No coding required", "Live in 5 minutes", "Free 3-day trial included"].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 7, color: C.muted, fontSize: 13, fontFamily: "system-ui" }}>
              <span style={{ color: "#4ade80", fontSize: 15 }}>✓</span> {t}
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section style={{ padding: "100px clamp(16px,4vw,48px)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHeading
            eyebrow="◆ WHAT YOU GET"
            title="Everything You Need"
            sub="All the tools to put a smart chatbot on your site — without hiring a developer."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Card3D key={f.title} glowColor={C.indigo} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 20, padding: "28px 28px",
                animation: `fadeUp 0.6s ease ${0.1 * i}s both`,
              }}>
                <div style={{ fontSize: 32, marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{
                  fontFamily: "system-ui,sans-serif", fontSize: 16, fontWeight: 700,
                  color: C.text, marginBottom: 10, lineHeight: 1.3,
                }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, fontFamily: "system-ui", lineHeight: 1.7 }}>
                  {f.desc}
                </p>
              </Card3D>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{ padding: "80px clamp(16px,4vw,48px)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <SectionHeading
            eyebrow="◆ HOW IT WORKS"
            title="Three Steps to Launch"
            sub="You'll have a working chatbot before your next coffee break."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {[
              { step:"01", icon:"📝", title:"Sign up & pick a plan", desc:"Create your account and choose the plan that fits your needs. No contracts, cancel any time." },
              { step:"02", icon:"🧠", title:"Train your chatbot", desc:"Add your FAQs and business info. Your bot will learn exactly how to answer your customers." },
              { step:"03", icon:"🚀", title:"Paste & go live", desc:"Copy one line of code onto your site. Your chatbot is now live, answering questions 24/7." },
            ].map((s, i) => (
              <Card3D key={s.step} glowColor={C.blue} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 20, padding: "32px 28px",
                animation: `fadeUp 0.6s ease ${0.15 * i}s both`,
              }}>
                <div style={{
                  fontFamily: "'Orbitron',monospace", fontSize: 11, letterSpacing: "0.3em",
                  color: C.indigo, marginBottom: 16, opacity: 0.7,
                }}>STEP {s.step}</div>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{s.icon}</div>
                <h3 style={{ fontFamily:"system-ui",fontSize:16,fontWeight:700,color:C.text,marginBottom:10 }}>{s.title}</h3>
                <p style={{ fontSize:14, color:C.muted, fontFamily:"system-ui", lineHeight:1.7 }}>{s.desc}</p>
              </Card3D>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "100px clamp(16px,4vw,48px)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionHeading
            eyebrow="◆ PRICING"
            title="Simple, Honest Pricing"
            sub="Pay once, use immediately. No monthly gotchas on lower plans."
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 20,
          }}>
            {PLANS.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={() => setSelectedPlan(plan)}
                delay={0.08 * i}
              />
            ))}
          </div>
          <p style={{ textAlign:"center", marginTop:32, fontSize:13, color:C.dim, fontFamily:"system-ui" }}>
            💳 Payments accepted via crypto (USDT) and card &nbsp;·&nbsp; Prices in USD
          </p>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{
        position: "relative", zIndex: 1,
        padding: "48px clamp(16px,4vw,48px)",
        borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 24,
      }}>
        <div>
          <div style={{
            fontFamily: "'Orbitron',monospace", fontWeight: 900, fontSize: 18,
            background: C.grad, WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent", backgroundClip:"text",
            marginBottom: 6,
          }}>AXXON OS</div>
          <div style={{ fontSize: 12, color: C.dim, fontFamily:"system-ui" }}>
            AI chatbots for everyone. Made by Ahmad.
          </div>
        </div>
        {activeSocials.length > 0 && (
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {activeSocials.map(p => (
              <a key={p.key} href={p.url(socials[p.key])} target="_blank" rel="noopener noreferrer"
                title={p.label}
                style={{
                  width:42, height:42, borderRadius:12,
                  background:`${p.color}14`, border:`1px solid ${p.color}30`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:p.color, textDecoration:"none", transition:"all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background=`${p.color}28`; e.currentTarget.style.transform="scale(1.1)"; }}
                onMouseLeave={e => { e.currentTarget.style.background=`${p.color}14`; e.currentTarget.style.transform="scale(1)"; }}
              >{p.icon}</a>
            ))}
          </div>
        )}
        <button
          onClick={onAdmin}
          style={{
            background:"none", border:"none", color: C.dim,
            fontSize:9, letterSpacing:"0.25em", cursor:"pointer",
            fontFamily:"'Orbitron',monospace", opacity:0.4,
          }}
        >Axxon is a trademark of Wanfortindustries</button>
      </footer>

      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          onClose={() => setSelectedPlan(null)}
          onGetStarted={onGetStarted}
        />
      )}

      <style>{globalCSS}</style>
    </div>
  );
}

function PlanCard({ plan, onSelect, delay }) {
  const [hov, setHov] = useState(false);
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  function onMove(e) {
    const r  = ref.current.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    setTilt({ rx: -dy * 10, ry: dx * 10 });
  }
  function onLeave() { setTilt({ rx:0, ry:0 }); setHov(false); }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={() => setHov(true)}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${hov ? 8 : 0}px)`,
        transition: hov ? "transform 0.08s ease, box-shadow 0.2s" : "transform 0.5s ease, box-shadow 0.3s",
        transformStyle: "preserve-3d",
        background: plan.featured
          ? `linear-gradient(160deg, rgba(59,130,246,0.12), rgba(99,102,241,0.12))`
          : C.surface,
        border: plan.featured
          ? `1px solid rgba(99,102,241,0.45)`
          : `1px solid ${C.border}`,
        borderRadius: 22,
        padding: "32px 28px",
        display: "flex", flexDirection: "column",
        boxShadow: hov
          ? `0 0 0 1px ${plan.color}60, 0 16px 50px ${plan.color}25, 0 0 80px rgba(0,0,0,0.6)`
          : plan.featured
            ? `0 8px 40px rgba(99,102,241,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`
            : `0 4px 24px rgba(0,0,0,0.4)`,
        animation: `fadeUp 0.6s ease ${delay}s both`,
        cursor: "pointer",
        position: "relative", overflow: "hidden",
      }}
      onClick={onSelect}
    >
      {plan.featured && (
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          background: C.grad, color: "#fff",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.25em",
          fontFamily: "'Orbitron',monospace",
          padding: "5px 20px", borderRadius: "0 0 12px 12px",
        }}>MOST POPULAR</div>
      )}

      {/* Glow line top */}
      <div style={{
        position: "absolute", top: 0, left: "20%", right: "20%", height: 1,
        background: `linear-gradient(90deg, transparent, ${plan.color}80, transparent)`,
        opacity: hov ? 1 : 0.4, transition: "opacity 0.3s",
      }} />

      <div style={{ marginTop: plan.featured ? 16 : 0 }}>
        <div style={{
          fontSize: 11, letterSpacing: "0.2em", color: plan.color,
          fontFamily: "'Orbitron',monospace", marginBottom: 6, fontWeight: 700,
        }}>{plan.name.toUpperCase()}</div>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui", marginBottom: 20 }}>
          {plan.tagline}
        </div>

        <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom: 8 }}>
          <span style={{
            fontSize: 40, fontWeight: 900,
            fontFamily: "'Orbitron',monospace", color: C.text,
          }}>${plan.price.toLocaleString()}</span>
        </div>
        <div style={{ fontSize:12, color:C.dim, fontFamily:"system-ui", marginBottom:24 }}>
          {plan.duration} &nbsp;·&nbsp; {plan.bots} {plan.bots === "Unlimited" ? "bots" : "chatbots"} &nbsp;·&nbsp; {plan.messages} messages
        </div>

        <ul style={{ listStyle:"none", marginBottom:28 }}>
          {plan.features.map(f => (
            <li key={f} style={{
              display:"flex", alignItems:"center", gap:10,
              fontSize:13, color: C.muted, fontFamily:"system-ui",
              padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.04)`,
            }}>
              <span style={{ color:"#4ade80", fontSize:12, flexShrink:0 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <button style={{
          width: "100%", padding: "14px 0",
          background: plan.featured ? C.grad : `${plan.color}18`,
          border: plan.featured ? "none" : `1px solid ${plan.color}45`,
          borderRadius: 12, color: "#fff",
          fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
          fontFamily: "'Orbitron',monospace", cursor: "pointer",
          boxShadow: plan.featured ? `0 4px 20px ${plan.color}50` : "none",
          transition: "all 0.2s",
        }}>
          Get Started →
        </button>
      </div>
    </div>
  );
}
