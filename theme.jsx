/**
 * Axxon OS — 3D Design System
 * Shared design tokens, components, and utilities.
 */

import { useRef, useState } from "react";

// ── Colour tokens ─────────────────────────────────────────────────────────────
export const C = {
  bg:        "#030308",
  surface:   "rgba(255,255,255,0.035)",
  surfaceHi: "rgba(255,255,255,0.065)",
  border:    "rgba(255,255,255,0.08)",
  borderHi:  "rgba(99,102,241,0.45)",
  blue:      "#3b82f6",
  indigo:    "#6366f1",
  violet:    "#8b5cf6",
  pink:      "#ec4899",
  text:      "#f1f5f9",
  muted:     "#64748b",
  dim:       "#334155",
  grad:      "linear-gradient(135deg,#3b82f6 0%,#6366f1 55%,#8b5cf6 100%)",
  gradGlow:  "rgba(99,102,241,0.35)",
};

// ── 3-D tilt card ─────────────────────────────────────────────────────────────
/**
 * Wraps children in a card that tilts toward the cursor in 3-D space.
 * intensity  — max tilt angle in degrees (default 12)
 * glowColor  — CSS colour for the edge glow on hover
 */
export function Card3D({ children, style = {}, intensity = 12, glowColor = C.indigo, onClick }) {
  const ref   = useRef(null);
  const [t, setT] = useState({ rx: 0, ry: 0, over: false });

  function onMove(e) {
    const r  = ref.current.getBoundingClientRect();
    const dx = (e.clientX - r.left  - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top   - r.height / 2) / (r.height / 2);
    setT({ rx: -dy * intensity, ry: dx * intensity, over: true });
  }
  function onLeave() { setT({ rx: 0, ry: 0, over: false }); }

  const glow = t.over
    ? `0 0 0 1px ${glowColor}60, 0 8px 40px ${glowColor}30, 0 32px 80px rgba(0,0,0,0.6)`
    : `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`;

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform:      `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(${t.over ? 6 : 0}px)`,
        transition:     t.over ? "transform 0.08s ease, box-shadow 0.2s ease" : "transform 0.5s ease, box-shadow 0.3s ease",
        transformStyle: "preserve-3d",
        boxShadow:      glow,
        willChange:     "transform",
        cursor:         onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Glass surface ─────────────────────────────────────────────────────────────
export function Glass({ children, style = {}, accent }) {
  return (
    <div style={{
      background:        C.surface,
      backdropFilter:    "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border:            `1px solid ${accent ? C.borderHi : C.border}`,
      borderRadius:      20,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Animated 3-D background ───────────────────────────────────────────────────
export function SceneBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none", background: C.bg }}>
      {/* Aurora blobs */}
      <div style={{
        position: "absolute", top: "-10%", left: "15%",
        width: 700, height: 700, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 65%)",
        animation: "floatA 14s ease-in-out infinite",
        filter: "blur(1px)",
      }} />
      <div style={{
        position: "absolute", bottom: "0%", right: "10%",
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)",
        animation: "floatB 18s ease-in-out infinite",
        filter: "blur(1px)",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "-5%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 65%)",
        animation: "floatA 22s ease-in-out 4s infinite",
      }} />
      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.018,
        backgroundImage:
          "linear-gradient(rgba(99,102,241,1) 1px,transparent 1px), linear-gradient(90deg,rgba(99,102,241,1) 1px,transparent 1px)",
        backgroundSize: "56px 56px",
      }} />
      {/* Floating dots */}
      {[
        { top:"12%", left:"8%",  size:3, delay:"0s",  dur:"6s"  },
        { top:"28%", right:"12%",size:2, delay:"1.5s", dur:"8s"  },
        { top:"68%", left:"22%", size:3, delay:"3s",  dur:"7s"  },
        { top:"82%", right:"25%",size:2, delay:"0.8s", dur:"9s"  },
        { top:"45%", left:"60%", size:2, delay:"2s",  dur:"11s" },
        { top:"18%", left:"75%", size:3, delay:"4s",  dur:"7.5s"},
      ].map((d, i) => (
        <div key={i} style={{
          position: "absolute",
          top: d.top, left: d.left, right: d.right,
          width: d.size, height: d.size, borderRadius: "50%",
          background: C.indigo,
          opacity: 0.4,
          boxShadow: `0 0 ${d.size * 3}px ${C.indigo}`,
          animation: `floatDot ${d.dur} ease-in-out ${d.delay} infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "primary", style = {}, disabled }) {
  const [hov, setHov] = useState(false);
  const base = {
    border: "none", borderRadius: 12, fontFamily: "'Orbitron',monospace",
    fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s",
    padding: "13px 28px", display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8,
  };
  const styles = {
    primary: {
      background: hov ? "linear-gradient(135deg,#4f93ff,#7c7ef7,#a07cf7)" : C.grad,
      color: "#fff",
      boxShadow: hov
        ? "0 8px 32px rgba(99,102,241,0.55), 0 0 0 1px rgba(99,102,241,0.3)"
        : "0 4px 20px rgba(99,102,241,0.35)",
      transform: hov ? "translateY(-2px)" : "none",
      opacity: disabled ? 0.45 : 1,
    },
    ghost: {
      background: hov ? "rgba(255,255,255,0.07)" : "transparent",
      border: "1px solid rgba(255,255,255,0.15)",
      color: hov ? "#fff" : "#94a3b8",
      transform: hov ? "translateY(-1px)" : "none",
    },
    danger: {
      background: hov ? "rgba(239,68,68,0.25)" : "rgba(239,68,68,0.12)",
      border: "1px solid rgba(239,68,68,0.4)",
      color: "#f87171",
    },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...styles[variant], ...style }}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────
export function Input({ label, ...props }) {
  return (
    <div style={{ marginBottom: 18 }}>
      {label && (
        <label style={{
          display: "block", fontSize: 10, letterSpacing: "0.2em",
          color: C.muted, marginBottom: 8, fontFamily: "'Orbitron',monospace",
        }}>{label}</label>
      )}
      <input
        {...props}
        style={{
          width: "100%", background: "rgba(255,255,255,0.045)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12,
          color: C.text, fontSize: 14, padding: "13px 16px",
          fontFamily: "system-ui,sans-serif", outline: "none",
          transition: "border-color 0.2s, box-shadow 0.2s",
          ...(props.style || {}),
        }}
        onFocus={e  => { e.target.style.borderColor = C.borderHi; e.target.style.boxShadow = `0 0 0 3px rgba(99,102,241,0.12)`; }}
        onBlur={e   => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.boxShadow = "none"; }}
      />
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
export function Badge({ children, color = C.indigo }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: `${color}18`, border: `1px solid ${color}35`,
      borderRadius: 999, padding: "4px 12px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
      color, fontFamily: "'Orbitron',monospace",
    }}>
      {children}
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color = C.indigo }) {
  return (
    <Card3D glowColor={color} style={{
      background: C.surface, border: `1px solid ${C.border}`,
      borderRadius: 20, padding: "28px 24px",
    }}>
      <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 10, letterSpacing: "0.2em", color: C.muted, marginBottom: 10, fontFamily: "'Orbitron',monospace" }}>
        {label}
      </div>
      <div style={{ fontSize: 34, fontWeight: 900, color: C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: "system-ui" }}>{sub}</div>}
    </Card3D>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionHeading({ eyebrow, title, sub }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 56 }}>
      {eyebrow && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.25)",
          borderRadius: 999, padding: "6px 18px",
          fontSize: 10, letterSpacing: "0.3em", color: C.indigo,
          fontFamily: "'Orbitron',monospace", marginBottom: 20,
        }}>{eyebrow}</div>
      )}
      <h2 style={{
        fontSize: "clamp(28px,5vw,48px)", fontWeight: 900,
        background: C.grad, WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent", backgroundClip: "text",
        fontFamily: "'Orbitron',monospace", letterSpacing: "0.05em",
        marginBottom: 16, lineHeight: 1.15,
      }}>{title}</h2>
      {sub && (
        <p style={{ fontSize: 15, color: C.muted, fontFamily: "system-ui", maxWidth: 540, margin: "0 auto", lineHeight: 1.75 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Global CSS (animations + resets) ─────────────────────────────────────────
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: #030308; color: #f1f5f9; }
  body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }
  input::placeholder, textarea::placeholder { color: #334155; }

  @keyframes floatA {
    0%,100% { transform: translate(0,0) scale(1); }
    33%      { transform: translate(30px,-20px) scale(1.05); }
    66%      { transform: translate(-20px,15px) scale(0.97); }
  }
  @keyframes floatB {
    0%,100% { transform: translate(0,0) scale(1); }
    40%      { transform: translate(-25px,20px) scale(1.04); }
    70%      { transform: translate(20px,-10px) scale(0.98); }
  }
  @keyframes floatDot {
    0%,100% { transform: translateY(0); opacity: 0.4; }
    50%      { transform: translateY(-12px); opacity: 0.8; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes pulse3d {
    0%,100% { box-shadow: 0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1); }
    50%     { box-shadow: 0 0 60px rgba(99,102,241,0.6), 0 0 100px rgba(99,102,241,0.25); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes bounceDot {
    0%,80%,100% { transform: scale(0.6); opacity: 0.3; }
    40%         { transform: scale(1.3); opacity: 1; }
  }
  @keyframes logoGlow {
    0%,100% { filter: drop-shadow(0 0 24px rgba(99,102,241,0.5)) drop-shadow(0 0 48px rgba(99,102,241,0.2)); }
    50%     { filter: drop-shadow(0 0 60px rgba(99,102,241,0.9)) drop-shadow(0 0 100px rgba(99,102,241,0.4)); }
  }
`;
