/**
 * Axxon OS — 3D Design System
 * Shared design tokens, components, and utilities.
 */

import { useRef, useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

// ── Colour tokens ─────────────────────────────────────────────────────────────
export const C = {
  bg:        "var(--bg, #0a0e17)",
  surface:   "var(--surface, rgba(255,255,255,0.035))",
  surfaceHi: "var(--surface-hi, rgba(255,255,255,0.07))",
  border:    "var(--border, rgba(255,255,255,0.08))",
  borderHi:  "var(--border-hi, rgba(99,102,241,0.5))",
  blue:      "#3b82f6",
  indigo:    "#6366f1",
  emerald:   "#10b981",
  cyan:      "#06b6d4",
  violet:    "#8b5cf6",
  amber:     "#f59e0b",
  pink:      "#ec4899",
  text:      "var(--text, #f8fafc)",
  muted:     "var(--muted, #94a3b8)",
  dim:       "var(--dim, #64748b)",
  cardBg:    "var(--card-bg, rgba(15,23,42,0.92))",
  grad:      "linear-gradient(135deg, #6366f1 0%, #3b82f6 45%, #10b981 100%)",
  gradGlow:  "rgba(99,102,241,0.35)",
};

// Initialize theme on script load
try {
  const savedTheme = localStorage.getItem("axxon_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
} catch {}

export function ThemeToggle({ style = {}, compact = false, showLabel = true, className = "" }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("axxon_theme") || "dark";
    } catch {
      return "dark";
    }
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("axxon_theme", theme);
    } catch {}
  }, [theme]);

  const isDark = theme === "dark";

  const toggle = () => {
    const next = isDark ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("axxon_theme", next);
    } catch {}
  };

  return (
    <button
      onClick={toggle}
      type="button"
      className={className}
      title={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      aria-label={`Switch to ${isDark ? "Light" : "Dark"} Mode`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: compact ? "8px" : "6px 14px",
        minWidth: compact ? 42 : "auto",
        minHeight: 42,
        borderRadius: compact ? 12 : 20,
        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
        color: isDark ? "#e2e8f0" : "#1e293b",
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "system-ui, sans-serif",
        cursor: "pointer",
        transition: "all 0.25s ease",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        touchAction: "manipulation",
        ...style,
      }}
    >
      {isDark ? (
        <>
          <Sun size={15} style={{ color: "#fbbf24", flexShrink: 0 }} />
          {showLabel && !compact && <span>Light Mode</span>}
        </>
      ) : (
        <>
          <Moon size={15} style={{ color: "#6366f1", flexShrink: 0 }} />
          {showLabel && !compact && <span>Dark Mode</span>}
        </>
      )}
    </button>
  );
}

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
    ? `0 0 0 1px ${glowColor}50, 0 8px 30px ${glowColor}20, 0 24px 60px rgba(0,0,0,0.5)`
    : `0 4px 20px rgba(0,0,0,0.4), 0 0 0 1px ${C.border}`;

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        transform:      `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) translateZ(${t.over ? 4 : 0}px)`,
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
      borderRadius:      16,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Executive Ambient background ───────────────────────────────────────────────
export function SceneBg() {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none", background: C.bg }}>
      {/* Soft executive ambient colorful spotlights */}
      <div style={{
        position: "absolute", top: "-20%", left: "15%",
        width: 850, height: 850, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(59,130,246,0.03) 45%, transparent 70%)",
        animation: "floatA 18s ease-in-out infinite",
        filter: "blur(65px)",
      }} />
      <div style={{
        position: "absolute", bottom: "-15%", right: "10%",
        width: 800, height: 800, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, rgba(6,182,212,0.02) 50%, transparent 70%)",
        animation: "floatB 22s ease-in-out infinite",
        filter: "blur(75px)",
      }} />
      <div style={{
        position: "absolute", top: "40%", right: "30%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 65%)",
        animation: "floatA 25s ease-in-out 4s infinite",
        filter: "blur(50px)",
      }} />
      {/* Precision micro grid overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
        backgroundSize: "32px 32px",
      }} />
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = "primary", style = {}, disabled }) {
  const [hov, setHov] = useState(false);
  const base = {
    border: "none", borderRadius: 10, fontFamily: "system-ui, sans-serif",
    fontSize: 12, fontWeight: 600, letterSpacing: "0.05em",
    cursor: disabled ? "not-allowed" : "pointer", transition: "all 0.2s ease",
    padding: "12px 24px", display: "inline-flex", alignItems: "center",
    justifyContent: "center", gap: 8,
  };
  const styles = {
    primary: {
      background: hov ? "linear-gradient(135deg, #4f46e5 0%, #2563eb 50%, #059669 100%)" : C.grad,
      color: "#fff",
      boxShadow: hov
        ? "0 6px 24px rgba(99,102,241,0.45)"
        : "0 2px 14px rgba(99,102,241,0.25)",
      transform: hov ? "translateY(-1px)" : "none",
      opacity: disabled ? 0.45 : 1,
    },
    ghost: {
      background: hov ? "rgba(255,255,255,0.06)" : "transparent",
      border: "1px solid rgba(255,255,255,0.12)",
      color: hov ? "#fff" : "#94a3b8",
      transform: hov ? "translateY(-1px)" : "none",
    },
    danger: {
      background: hov ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.1)",
      border: "1px solid rgba(239,68,68,0.3)",
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
    <div style={{ marginBottom: 16 }}>
      {label && (
        <label style={{
          display: "block", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em",
          color: C.muted, marginBottom: 6, fontFamily: "system-ui, sans-serif",
        }}>{label}</label>
      )}
      <input
        {...props}
        style={{
          width: "100%", background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
          color: C.text, fontSize: 13, padding: "11px 14px",
          fontFamily: "system-ui, sans-serif", outline: "none",
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
      background: `${color}15`, border: `1px solid ${color}30`,
      borderRadius: 999, padding: "3px 10px",
      fontSize: 10, fontWeight: 700, letterSpacing: "0.05em",
      color, fontFamily: "system-ui, sans-serif",
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
      borderRadius: 16, padding: "24px 20px",
    }}>
      {icon && <div style={{ fontSize: 22, color, marginBottom: 10 }}>{icon}</div>}
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: C.muted, marginBottom: 8, fontFamily: "system-ui, sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: C.text, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.dim, marginTop: 8, fontFamily: "system-ui" }}>{sub}</div>}
    </Card3D>
  );
}

// ── Section heading ───────────────────────────────────────────────────────────
export function SectionHeading({ eyebrow, title, sub }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 48 }}>
      {eyebrow && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: 999, padding: "5px 16px",
          fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", color: C.indigo,
          fontFamily: "system-ui, sans-serif", marginBottom: 16, textTransform: "uppercase"
        }}>{eyebrow}</div>
      )}
      <h2 style={{
        fontSize: "clamp(26px,4.5vw,42px)", fontWeight: 800,
        background: C.grad, WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent", backgroundClip: "text",
        fontFamily: "'Orbitron', sans-serif", letterSpacing: "0.02em",
        marginBottom: 12, lineHeight: 1.2,
      }}>{title}</h2>
      {sub && (
        <p style={{ fontSize: 14, color: C.muted, fontFamily: "system-ui, sans-serif", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Global CSS ─────────────────────────────────────────────────────────────────
export const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Inter:wght@300;400;500;600;700&display=swap');

  :root {
    --bg: #0b0f19;
    --surface: rgba(255,255,255,0.035);
    --surface-hi: rgba(255,255,255,0.07);
    --border: rgba(255,255,255,0.08);
    --border-hi: rgba(59,130,246,0.5);
    --text: #f8fafc;
    --muted: #94a3b8;
    --dim: #64748b;
    --card-bg: rgba(15,23,42,0.92);
  }

  [data-theme="light"] {
    --bg: #f8fafc;
    --surface: rgba(255,255,255,0.9);
    --surface-hi: rgba(241,245,249,0.95);
    --border: rgba(0,0,0,0.08);
    --border-hi: rgba(37,99,235,0.5);
    --text: #0f172a;
    --muted: #475569;
    --dim: #94a3b8;
    --card-bg: rgba(255,255,255,0.98);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; background: var(--bg); color: var(--text); transition: background-color 0.3s ease, color 0.3s ease; }
  body { font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.25); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.45); }
  input::placeholder, textarea::placeholder { color: var(--muted); }

  @keyframes floatA {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(20px,-15px) scale(1.03); }
  }
  @keyframes floatB {
    0%,100% { transform: translate(0,0) scale(1); }
    50%      { transform: translate(-15px,15px) scale(0.98); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; } to { opacity: 1; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes logoGlow {
    0%,100% { filter: drop-shadow(0 0 20px rgba(99,102,241,0.4)); }
    50%     { filter: drop-shadow(0 0 35px rgba(99,102,241,0.7)); }
  }
`;

