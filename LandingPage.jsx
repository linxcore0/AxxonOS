import React, { useState, useRef } from "react";
import {
  Brain,
  Zap,
  Globe,
  Users,
  BarChart3,
  ShieldCheck,
  UserPlus,
  Bot,
  Code2,
  Check,
  ArrowRight,
  Sparkles,
  Mail,
  Lock,
} from "lucide-react";
import Navbar from "./Navbar";
import PaymentModal from "./PaymentModal";
import { C, SceneBg, Card3D, Glass, Btn, SectionHeading, globalCSS } from "./theme.jsx";
import { subscribeToPricing } from "./pricingService.js";
import { CURRENCIES, convertUSD } from "./currencyUtils.js";

const DEFAULT_PLANS = [
  {
    id: "starter", name: "Starter Plan", price: 34, duration: "1 Month",
    messages: "3,000", bots: "1", color: "#06b6d4",
    tagline: "1 Chatbot for 1 full month",
    features: ["1 Chatbot", "3,000 Messages / month", "1 Month Access (30 Days)", "Basic Analytics", "Standard Support", "FAQ Training"],
  },
  {
    id: "basic", name: "Basic Plan", price: 100, duration: "7 Days",
    messages: "5,000", bots: "2", color: "#3b82f6",
    tagline: "Perfect for evaluation and testing",
    features: ["2 Chatbots", "5,000 Messages / month", "7 Day Access", "Basic Analytics", "Standard Support", "FAQ Training"],
  },
  {
    id: "spark", name: "Spark Plan", price: 300, duration: "30 Days",
    messages: "50,000", bots: "6", color: "#06b6d4",
    tagline: "For growing businesses",
    features: ["6 Chatbots", "50,000 Messages / month", "30 Day Access", "Advanced Analytics", "Priority Support", "FAQ Training"],
  },
  {
    id: "super", name: "Super Plan", price: 700, duration: "30 Days",
    messages: "200,000", bots: "20", color: "#10b981",
    tagline: "For teams & scaling agencies",
    features: ["20 Chatbots", "200,000 Messages / month", "30 Day Access", "Real-time Analytics", "Priority Support", "Human Handoff", "Custom Branding"],
  },
  {
    id: "king", name: "King Plan", price: 4000, duration: "1 Year",
    messages: "20,000,000", bots: "Unlimited", color: "#3b82f6",
    tagline: "For high-volume operations",
    features: ["Unlimited Chatbots", "20M Messages / year", "1 Year Access", "Real-time Analytics", "Dedicated Support", "Human Handoff", "White Label", "API Access"],
    featured: true,
  },
  {
    id: "ultra", name: "Ultra Plan", price: 20000, duration: "Lifetime",
    messages: "Unlimited", bots: "Unlimited", color: "#6366f1",
    tagline: "Unrestricted lifetime access",
    features: ["Unlimited Chatbots", "Unlimited Messages", "Lifetime Access", "Real-time Analytics", "24/7 VIP Support", "Human Handoff", "White Label", "API Access", "Custom Integrations"],
  },
];

const FEATURES = [
  { icon: <Brain size={26} color="#06b6d4" />, title: "Context-Aware Intelligence", desc: "Your chatbot learns directly from your FAQs and knowledge base to deliver accurate answers." },
  { icon: <Zap size={26} color="#0ea5e9" />, title: "Instant Deployment", desc: "Embed in under 5 minutes with a single script tag. No complex development or backend setup required." },
  { icon: <Globe size={26} color="#10b981" />, title: "Universal Platform Support", desc: "Works seamlessly across Shopify, WordPress, Wix, Webflow, React, or any custom website." },
  { icon: <Users size={26} color="#3b82f6" />, title: "Smart Human Handoff", desc: "When complex queries arise, the bot intelligently routes the interaction to your support team." },
  { icon: <BarChart3 size={26} color="#06b6d4" />, title: "Real-Time Query Analytics", desc: "Track customer sentiment, popular questions, and conversion performance with live metrics." },
  { icon: <ShieldCheck size={26} color="#10b981" />, title: "Enterprise Security & Privacy", desc: "Your data and customer conversations remain private, encrypted, and isolated to your instance." },
];

export default function LandingPage({ onGetStarted, onAdmin }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [userCurrency, setUserCurrency] = useState(
    localStorage.getItem("axxon_currency") || "USD"
  );
  const [socials, setSocials] = useState({
    telegram: "", x: "", farcaster: "", linkedin: "", github: "", tiktok: "", discord: "",
  });

  const [markupPercent, setMarkupPercent] = useState(15);

  const handleCurrencyChange = (newCurr) => {
    setUserCurrency(newCurr);
    localStorage.setItem("axxon_currency", newCurr);
  };

  React.useEffect(() => {
    fetch("/api/admin/socials").then(r => r.json()).then(d => setSocials(s => ({ ...s, ...d }))).catch(() => {});
    const unsubscribe = subscribeToPricing(({ prices, markup_percent }) => {
      if (prices) {
        setPlans(DEFAULT_PLANS.map(p => ({
          ...p,
          price: prices[p.id] ?? p.price,
        })));
      }
      if (markup_percent !== undefined) setMarkupPercent(markup_percent);
    });
    return () => unsubscribe();
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

      {/* ── RESPONSIVE GLOBAL NAVBAR ───────────────────────────────── */}
      <Navbar
        page="landing"
        currentCurrency={userCurrency}
        onCurrencyChange={handleCurrencyChange}
        onAuth={() => onGetStarted()}
        onNavigate={() => onGetStarted()}
      />

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "92vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        textAlign: "center", padding: "110px clamp(16px,4vw,48px) 70px",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 999, padding: "6px 16px",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", color: C.indigo,
          fontFamily: "system-ui, sans-serif", marginBottom: 28,
          animation: "fadeUp 0.6s ease both",
        }}>
          <Sparkles size={13} />
          <span>ENTERPRISE AI CHATBOT SYSTEM</span>
        </div>

        <h1 style={{
          fontFamily: "'Orbitron', sans-serif", fontWeight: 900,
          fontSize: "clamp(38px,8vw,88px)", letterSpacing: "0.08em",
          lineHeight: 1.08,
          background: C.grad,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          animation: "logoGlow 3s ease-in-out infinite, fadeUp 0.6s ease 0.1s both",
          marginBottom: 10,
        }}>AXXON</h1>
        <div style={{
          fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(13px,2.5vw,18px)",
          letterSpacing: "0.35em", color: C.muted, fontWeight: 600, marginBottom: 28,
          animation: "fadeUp 0.6s ease 0.2s both",
        }}>OPERATING SYSTEM</div>

        <p style={{
          fontSize: "clamp(15px,2vw,18px)", color: C.muted,
          fontFamily: "system-ui, sans-serif", lineHeight: 1.7,
          maxWidth: 600, marginBottom: 40,
          animation: "fadeUp 0.6s ease 0.3s both",
        }}>
          Deploy autonomous AI support agents on your web application in minutes. Train on custom knowledge bases, handle real-time customer queries, and scale operations 24/7.
        </p>

        <div style={{
          display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.6s ease 0.4s both",
        }}>
          <Btn onClick={onGetStarted} style={{ padding: "14px 32px", fontSize: 13 }}>
            <span>Start Free Trial</span>
            <ArrowRight size={14} />
          </Btn>
          <Btn variant="ghost" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} style={{ padding: "14px 32px", fontSize: 13 }}>
            View Pricing
          </Btn>
        </div>

        {/* Trust row */}
        <div style={{
          display: "flex", gap: 28, marginTop: 56, flexWrap: "wrap", justifyContent: "center",
          animation: "fadeUp 0.6s ease 0.5s both",
        }}>
          {["Zero coding required", "Deploy in under 5 minutes", "Complimentary trial included"].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 8, color: C.muted, fontSize: 13, fontFamily: "system-ui, sans-serif" }}>
              <Check size={14} style={{ color: "#10b981" }} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "80px clamp(16px,4vw,48px)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <SectionHeading
            eyebrow="CAPABILITIES"
            title="Designed for Enterprise Reliability"
            sub="Comprehensive tools to construct, train, and deploy intelligent AI conversational agents."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
            {FEATURES.map((f, i) => (
              <Card3D key={f.title} glowColor={C.indigo} style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "28px 24px",
                animation: `fadeUp 0.5s ease ${0.08 * i}s both`,
              }}>
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <h3 style={{
                  fontFamily: "system-ui, sans-serif", fontSize: 16, fontWeight: 700,
                  color: C.text, marginBottom: 8, lineHeight: 1.3,
                }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui, sans-serif", lineHeight: 1.65 }}>
                  {f.desc}
                </p>
              </Card3D>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section style={{ padding: "70px clamp(16px,4vw,48px)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <SectionHeading
            eyebrow="WORKFLOW"
            title="Streamlined Setup Process"
            sub="Launch a customized AI conversational bot with simple configuration steps."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 20 }}>
            {[
              { step:"01", icon:<UserPlus size={24} color="#6366f1" />, title:"Select Subscription", desc:"Choose a flexible plan structured for your traffic requirements. Upgrade or cancel anytime." },
              { step:"02", icon:<Bot size={24} color="#3b82f6" />, title:"Configure Knowledge", desc:"Input business knowledge, FAQs, and response tone. Your bot assimilates guidelines instantly." },
              { step:"03", icon:<Code2 size={24} color="#8b5cf6" />, title:"Embed & Activate", desc:"Paste a single line of JS code into your HTML header. Your bot operates autonomously." },
            ].map((s, i) => (
              <Card3D key={s.step} glowColor={C.blue} style={{
                background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 16, padding: "28px 24px",
                animation: `fadeUp 0.5s ease ${0.1 * i}s both`,
              }}>
                <div style={{
                  fontFamily: "'Orbitron', sans-serif", fontSize: 11, letterSpacing: "0.2em",
                  color: C.indigo, marginBottom: 14, fontWeight: 700,
                }}>STEP {s.step}</div>
                <div style={{ marginBottom: 14 }}>{s.icon}</div>
                <h3 style={{ fontFamily:"system-ui, sans-serif", fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>{s.title}</h3>
                <p style={{ fontSize:13, color:C.muted, fontFamily:"system-ui, sans-serif", lineHeight:1.6 }}>{s.desc}</p>
              </Card3D>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT / PLATFORM ARCHITECTURE ───────────────────────── */}
      <section id="about" style={{ padding: "80px clamp(16px,4vw,48px)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <SectionHeading
            eyebrow="ARCHITECTURE"
            title="Next-Generation Conversational Engine"
            sub="Built on low-latency neural tokenizers and high-availability serverless cloud edge networks."
          />
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20,
          }}>
            <Glass style={{ padding: "30px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(99,102,241,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock size={20} color={C.indigo} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>Data Privacy</h3>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, fontFamily: "system-ui" }}>
                Conversations are never sold or pooled into public training corpuses. Tenant data isolation is strictly enforced.
              </p>
            </Glass>

            <Glass style={{ padding: "30px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Zap size={20} color="#10b981" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>Sub-50ms Responses</h3>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, fontFamily: "system-ui" }}>
                Hybrid inverted index and vector search algorithm delivers prompt answers to common customer inquiries instantly.
              </p>
            </Glass>

            <Glass style={{ padding: "30px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(59,130,246,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Globe size={20} color="#3b82f6" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "system-ui" }}>Global Delivery</h3>
              </div>
              <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, fontFamily: "system-ui" }}>
                Worldwide CDN edge distribution guarantees high speed and uptime regardless of visitor geographical origin.
              </p>
            </Glass>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "80px clamp(16px,4vw,48px)", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <SectionHeading
            eyebrow="TRANSPARENT PRICING"
            title="Flexible Subscription Options"
            sub="Choose the optimal plan to support your customer communication volume."
          />
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 20,
          }}>
            {plans.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                userCurrency={userCurrency}
                markupPercent={markupPercent}
                onSelect={() => setSelectedPlan(plan)}
                delay={0.06 * i}
              />
            ))}
          </div>
          <p style={{ textAlign:"center", marginTop:28, fontSize:12, color:C.muted, fontFamily:"system-ui, sans-serif" }}>
            Payment processing supported in USDT (Crypto) and standard payment cards. Select preferred currency in header.
          </p>
        </div>
      </section>

      {/* ── CONTACT ──────────────────────────────────────────────── */}
      <section id="contact" style={{ padding: "60px clamp(16px,4vw,48px) 80px", position: "relative", zIndex: 1 }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <SectionHeading
            eyebrow="CONTACT"
            title="Connect With Support"
            sub="Need assistance setting up your AI chatbot? Our team is available 24/7."
          />
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            padding: "16px 28px", borderRadius: 16,
            background: "rgba(255,255,255,0.03)", border: `1px solid ${C.border}`,
          }}>
            <Mail size={20} color={C.indigo} />
            <span style={{ fontSize: 14, color: C.text, fontFamily: "system-ui", fontWeight: 600 }}>
              support@axxon.io
            </span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer style={{
        position: "relative", zIndex: 1,
        padding: "40px clamp(16px,4vw,48px)",
        borderTop: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 20,
      }}>
        <div>
          <div style={{
            fontFamily: "'Orbitron', sans-serif", fontWeight: 800, fontSize: 16,
            background: C.grad, WebkitBackgroundClip:"text",
            WebkitTextFillColor:"transparent", backgroundClip:"text",
            marginBottom: 4,
          }}>AXXON OS</div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily:"system-ui, sans-serif" }}>
            Enterprise AI Chatbot Infrastructure
          </div>
        </div>
        {activeSocials.length > 0 && (
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {activeSocials.map(p => (
              <a key={p.key} href={p.url(socials[p.key])} target="_blank" rel="noopener noreferrer"
                title={p.label}
                style={{
                  width:38, height:38, borderRadius:10,
                  background:`${p.color}12`, border:`1px solid ${p.color}25`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:p.color, textDecoration:"none", transition:"all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background=`${p.color}24`; e.currentTarget.style.transform="translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background=`${p.color}12`; e.currentTarget.style.transform="none"; }}
              >{p.icon}</a>
            ))}
          </div>
        )}
        <button
          onClick={onAdmin}
          style={{
            background:"none", border:"none", color: C.dim,
            fontSize:10, letterSpacing:"0.15em", cursor:"pointer",
            fontFamily:"system-ui, sans-serif",
          }}
        >System Administration</button>
      </footer>

      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          userCurrency={userCurrency}
          markupPercent={markupPercent}
          onClose={() => setSelectedPlan(null)}
          onGetStarted={onGetStarted}
        />
      )}

      <style>{globalCSS}</style>
    </div>
  );
}

function PlanCard({ plan, userCurrency = "USD", markupPercent = 15, onSelect, delay }) {
  const [hov, setHov] = useState(false);
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const converted = convertUSD(plan.price, userCurrency, markupPercent);

  function onMove(e) {
    const r  = ref.current.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    setTilt({ rx: -dy * 8, ry: dx * 8 });
  }
  function onLeave() { setTilt({ rx:0, ry:0 }); setHov(false); }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={() => setHov(true)}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${hov ? 6 : 0}px)`,
        transition: hov ? "transform 0.08s ease, box-shadow 0.2s" : "transform 0.5s ease, box-shadow 0.3s",
        transformStyle: "preserve-3d",
        background: plan.featured
          ? `linear-gradient(160deg, rgba(59,130,246,0.1), rgba(99,102,241,0.1))`
          : C.surface,
        border: plan.featured
          ? `1px solid rgba(99,102,241,0.4)`
          : `1px solid ${C.border}`,
        borderRadius: 18,
        padding: "28px 24px",
        display: "flex", flexDirection: "column",
        boxShadow: hov
          ? `0 0 0 1px ${plan.color}50, 0 12px 40px ${plan.color}20, 0 0 60px rgba(0,0,0,0.5)`
          : plan.featured
            ? `0 6px 30px rgba(99,102,241,0.15)`
            : `0 4px 20px rgba(0,0,0,0.3)`,
        animation: `fadeUp 0.5s ease ${delay}s both`,
        cursor: "pointer",
        position: "relative", overflow: "hidden",
      }}
      onClick={onSelect}
    >
      {plan.featured && (
        <div style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          background: C.grad, color: "#fff",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.15em",
          fontFamily: "system-ui, sans-serif",
          padding: "4px 16px", borderRadius: "0 0 10px 10px",
        }}>MOST POPULAR</div>
      )}

      <div style={{ marginTop: plan.featured ? 12 : 0 }}>
        <div style={{
          fontSize: 12, letterSpacing: "0.1em", color: plan.color,
          fontFamily: "system-ui, sans-serif", marginBottom: 4, fontWeight: 700,
        }}>{plan.name.toUpperCase()}</div>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui, sans-serif", marginBottom: 16 }}>
          {plan.tagline}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:2, marginBottom: 8 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span style={{
              fontSize: converted.code === "NGN" || converted.code === "JPY" || converted.code === "INR" ? 28 : 32,
              fontWeight: 800,
              fontFamily: "'Orbitron', sans-serif", color: C.text,
            }}>{converted.formatted}</span>
          </div>
          {!converted.isNormal && (
            <div style={{ fontSize: 11, color: C.dim, fontFamily: "system-ui, sans-serif" }}>
              ≈ ${plan.price.toLocaleString()} USD base rate
            </div>
          )}
        </div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:"system-ui, sans-serif", marginBottom:20, marginTop: 4 }}>
          {plan.duration} &nbsp;·&nbsp; {plan.bots} {plan.bots === "Unlimited" ? "bots" : "chatbots"} &nbsp;·&nbsp; {plan.messages} msgs
        </div>

        <ul style={{ listStyle:"none", marginBottom:24 }}>
          {plan.features.map(f => (
            <li key={f} style={{
              display:"flex", alignItems:"center", gap:8,
              fontSize:12, color: C.muted, fontFamily:"system-ui, sans-serif",
              padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.03)`,
            }}>
              <Check size={13} style={{ color:"#10b981", flexShrink:0 }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button style={{
          width: "100%", padding: "12px 0",
          background: plan.featured ? C.grad : `${plan.color}15`,
          border: plan.featured ? "none" : `1px solid ${plan.color}35`,
          borderRadius: 10, color: "#fff",
          fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
          fontFamily: "system-ui, sans-serif", cursor: "pointer",
          boxShadow: plan.featured ? `0 4px 16px ${plan.color}40` : "none",
          transition: "all 0.2s",
        }}>
          Select Plan
        </button>
      </div>
    </div>
  );
}
