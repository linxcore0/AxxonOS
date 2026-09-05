import { useState, useEffect, useRef } from "react";
import { Brain, Zap, Globe, BarChart3, Users, ShieldCheck, Check, CreditCard } from "lucide-react";
import PaymentModal from "./PaymentModal";
import { C, SceneBg, Card3D, Btn, SectionHeading, Badge, globalCSS } from "./theme.jsx";
import Navbar from "./Navbar";
import { CURRENCIES, convertUSD } from "./currencyUtils.js";
import { subscribeToPricing } from "./pricingService.js";

const DEFAULT_PLANS = [
  {
    id: "starter", name: "Starter Plan", price: 34, duration: "1 Month",
    messages: "3,000", bots: "1", color: "#06b6d4",
    tagline: "1 Chatbot for 1 full month",
    features: ["1 Chatbot", "3,000 Messages / month", "1 Month Access (30 Days)", "Basic Analytics", "Email Support", "FAQ Training"],
  },
  {
    id: "basic", name: "Basic Plan", price: 100, duration: "7 Days",
    messages: "5,000", bots: "2", color: "#6366f1",
    tagline: "Perfect for trying it out",
    features: ["2 Chatbots", "5,000 Messages / month", "7 Day Access", "Basic Analytics", "Email Support", "FAQ Training"],
  },
  {
    id: "spark", name: "Spark Plan", price: 300, duration: "30 Days",
    messages: "50,000", bots: "6", color: "#3b82f6",
    tagline: "For growing businesses",
    features: ["6 Chatbots", "50,000 Messages / month", "30 Day Access", "Advanced Analytics", "Priority Support", "FAQ Training"],
  },
  {
    id: "super", name: "Super Plan", price: 700, duration: "30 Days",
    messages: "200,000", bots: "20", color: "#8b5cf6",
    tagline: "For teams & agencies",
    features: ["20 Chatbots", "200,000 Messages / month", "30 Day Access", "Real-time Analytics", "Priority Support", "Human Handoff", "Custom Branding"],
  },
  {
    id: "king", name: "King Plan", price: 4000, duration: "1 Year",
    messages: "20,000,000", bots: "Unlimited", color: "#3b82f6",
    tagline: "For serious operations",
    features: ["Unlimited Chatbots", "20M Messages / year", "1 Year Access", "Real-time Analytics", "Dedicated Support", "Human Handoff", "White Label", "API Access"],
    featured: true,
  },
  {
    id: "ultra", name: "Ultra Plan", price: 20000, duration: "Lifetime",
    messages: "Unlimited", bots: "Unlimited", color: "#6366f1",
    tagline: "Own it forever",
    features: ["Unlimited Chatbots", "Unlimited Messages", "Lifetime Access", "Real-time Analytics", "24/7 VIP Support", "Human Handoff", "White Label", "API Access", "Custom Integrations"],
  },
];

const PERKS = [
  { icon: Brain, title:"AI-Powered", desc:"Trained on your own FAQs" },
  { icon: Zap, title:"Instant Deploy", desc:"Live in under 5 minutes" },
  { icon: Globe, title:"Any Website", desc:"Works on any platform" },
  { icon: BarChart3, title:"Analytics", desc:"See what customers ask" },
  { icon: Users, title:"Human Handoff", desc:"Escalates when needed" },
  { icon: ShieldCheck, title:"Private & Secure", desc:"Your data, your rules" },
];

export default function SubscribePage({ user, onLogout, onDashboard }) {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [markupPercent, setMarkupPercent] = useState(15);
  const [userCurrency, setUserCurrency] = useState(
    user?.currency || localStorage.getItem("axxon_currency") || "USD"
  );

  useEffect(() => {
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

  const handleCurrencyChange = async (newCurr) => {
    setUserCurrency(newCurr);
    localStorage.setItem("axxon_currency", newCurr);
    const token = localStorage.getItem("axxon_token");
    if (token) {
      try {
        await fetch("/api/user/update-currency", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ currency: newCurr }),
        });
      } catch {}
    }
  };

  return (
    <div style={{ minHeight:"100vh", position:"relative", display: "flex", flexDirection: "column" }}>
      <SceneBg />

      {/* Global Responsive Navigation Bar */}
      <Navbar
        page="subscribe"
        user={user}
        onLogout={onLogout}
        onNavigate={(p) => {
          if (p === "dashboard" && onDashboard) onDashboard();
        }}
        currentCurrency={userCurrency}
        onCurrencyChange={handleCurrencyChange}
      />

      <div style={{ maxWidth:1200, margin:"0 auto", width: "100%", padding:"115px clamp(16px,4vw,40px) 80px", position:"relative", zIndex:1 }}>

        {/* Hero */}
        <div style={{ textAlign:"center", marginBottom:72 }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:8,
            background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)",
            borderRadius:999, padding:"6px 18px",
            fontSize:10, letterSpacing:"0.3em", color:C.indigo,
            fontFamily:"'Orbitron',monospace", marginBottom:24,
          }}>◆ CHOOSE YOUR PLAN</div>
          <h1 style={{
            fontFamily:"'Orbitron',monospace", fontWeight:900,
            fontSize:"clamp(28px,6vw,56px)", letterSpacing:"0.06em",
            background:C.grad, WebkitBackgroundClip: "text",
            WebkitTextFillColor:"transparent", backgroundClip:"text",
            lineHeight:1.15, marginBottom:18,
          }}>Activate Your Account</h1>
          <p style={{ fontSize:15, color:C.muted, fontFamily:"system-ui", lineHeight:1.75, maxWidth:520, margin:"0 auto 36px" }}>
            Pick the plan that fits your needs. Pay once with crypto or card and your chatbots go live immediately.
          </p>
          {/* Feature pills */}
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
            {PERKS.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.title} style={{
                  display:"flex", alignItems:"center", gap:8,
                  background:C.surface, border:`1px solid ${C.border}`,
                  borderRadius:999, padding:"7px 16px",
                  fontSize:12, color:C.muted, fontFamily:"system-ui",
                }}>
                  <Icon size={14} style={{ color: C.indigo }} />
                  <span style={{ color:C.text, fontWeight:600 }}>{p.title}</span>
                  <span style={{ color:C.dim }}>— {p.desc}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pricing grid */}
        <div style={{
          display:"grid",
          gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))",
          gap:20, marginBottom:36,
        }}>
          {plans.map((plan, i) => (
            <SubPlanCard
              key={plan.id}
              plan={plan}
              userCurrency={userCurrency}
              markupPercent={markupPercent}
              onSelect={() => setSelectedPlan(plan)}
              delay={0.08 * i}
            />
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, color: C.dim, fontFamily: "system-ui", textAlign: "center" }}>
          <CreditCard size={15} style={{ color: C.indigo }} />
          <span>Payments accepted via USDT (crypto) and card · Prices converted for {userCurrency}</span>
        </div>
      </div>

      {selectedPlan && (
        <PaymentModal
          plan={selectedPlan}
          user={user}
          userCurrency={userCurrency}
          markupPercent={markupPercent}
          onClose={() => setSelectedPlan(null)}
        />
      )}

      <style>{globalCSS}</style>
    </div>
  );
}

function SubPlanCard({ plan, userCurrency = "USD", markupPercent = 15, onSelect, delay }) {
  const [hov, setHov] = useState(false);
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ rx:0, ry:0 });

  const converted = convertUSD(plan.price, userCurrency, markupPercent);

  function onMove(e) {
    const r = ref.current.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width/2) / (r.width/2);
    const dy = (e.clientY - r.top - r.height/2) / (r.height/2);
    setTilt({ rx: -dy * 10, ry: dx * 10 });
  }
  function onLeave() { setTilt({ rx:0, ry:0 }); setHov(false); }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onMouseEnter={() => setHov(true)}
      onClick={onSelect}
      style={{
        transform:`perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) translateZ(${hov ? 8 : 0}px)`,
        transition: hov ? "transform 0.08s ease, box-shadow 0.2s" : "transform 0.5s ease, box-shadow 0.3s",
        transformStyle:"preserve-3d",
        background: plan.featured
          ? "linear-gradient(160deg, rgba(59,130,246,0.12), rgba(99,102,241,0.12))"
          : C.surface,
        border: plan.featured ? `1px solid rgba(99,102,241,0.45)` : `1px solid ${C.border}`,
        borderRadius:22, padding:"32px 26px",
        display:"flex", flexDirection:"column",
        boxShadow: hov
          ? `0 0 0 1px ${plan.color}60, 0 16px 50px ${plan.color}25`
          : plan.featured ? "0 8px 40px rgba(99,102,241,0.2)" : "0 4px 24px rgba(0,0,0,0.4)",
        cursor:"pointer", position:"relative", overflow:"hidden",
        animation:`fadeUp 0.6s ease ${delay}s both`,
      }}
    >
      {plan.featured && (
        <div style={{
          position:"absolute", top:0, left:"50%", transform:"translateX(-50%)",
          background:C.grad, color:"#fff",
          fontSize:9, fontWeight:700, letterSpacing:"0.25em", fontFamily:"'Orbitron',monospace",
          padding:"5px 20px", borderRadius:"0 0 12px 12px",
        }}>BEST VALUE</div>
      )}
      <div style={{
        position:"absolute", top:0, left:"20%", right:"20%", height:1,
        background:`linear-gradient(90deg, transparent, ${plan.color}80, transparent)`,
        opacity: hov ? 1 : 0.4, transition:"opacity 0.3s",
      }} />

      <div style={{ marginTop: plan.featured ? 16 : 0 }}>
        <div style={{
          fontSize:11, letterSpacing:"0.2em", color:plan.color,
          fontFamily:"'Orbitron',monospace", marginBottom:4, fontWeight:700,
        }}>{plan.name.toUpperCase()}</div>
        <div style={{ fontSize:12, color:C.muted, fontFamily:"system-ui", marginBottom:18 }}>{plan.tagline}</div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display:"flex", alignItems:"baseline", gap:6, flexWrap: "wrap" }}>
            <span style={{ fontSize:32, fontWeight:900, fontFamily:"'Orbitron',monospace", color:C.text }}>
              {converted.formatted}
            </span>
            <span style={{ fontSize:12, fontWeight:700, color:C.indigo, fontFamily:"'Orbitron',monospace" }}>
              {converted.code}
            </span>
          </div>
          {!converted.isNormal && (
            <div style={{ fontSize:11, color:C.dim, fontFamily:"system-ui", marginTop:2 }}>
              ≈ ${plan.price.toLocaleString()} USD
            </div>
          )}
        </div>
        <div style={{ fontSize:12, color:C.dim, fontFamily:"system-ui", marginBottom:22 }}>
          {plan.duration} &nbsp;·&nbsp; {plan.bots} bots &nbsp;·&nbsp; {plan.messages} msgs
        </div>

        <ul style={{ listStyle:"none", marginBottom:26 }}>
          {plan.features.map(f => (
            <li key={f} style={{
              display:"flex", alignItems:"center", gap:9,
              fontSize:13, color:C.muted, fontFamily:"system-ui",
              padding:"5px 0", borderBottom:`1px solid rgba(255,255,255,0.04)`,
            }}>
              <Check size={13} style={{ color: "#4ade80", flexShrink: 0 }} />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <button style={{
          width:"100%", padding:"14px 0",
          background: plan.featured ? C.grad : `${plan.color}18`,
          border: plan.featured ? "none" : `1px solid ${plan.color}45`,
          borderRadius:12, color:"#fff",
          fontSize:11, fontWeight:700, letterSpacing:"0.2em",
          fontFamily:"'Orbitron',monospace", cursor:"pointer",
          boxShadow: plan.featured ? `0 4px 20px ${plan.color}50` : "none",
          transition:"all 0.2s",
        }}>Activate Now →</button>
      </div>
    </div>
  );
}

