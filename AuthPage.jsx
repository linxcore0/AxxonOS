import { useState } from "react";
import { Sparkles, Gift, Mail, Zap, Check, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import { C, SceneBg, Card3D, Btn, Input, ThemeToggle, globalCSS } from "./theme.jsx";
import { CURRENCIES } from "./currencyUtils.js";
import Navbar from "./Navbar";

const API = "";

export default function AuthPage({ onLogin, onBack }) {
  const [mode,      setMode]      = useState("login");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [currency,  setCurrency]  = useState(localStorage.getItem("axxon_currency") || "USD");
  const [otp,       setOtp]       = useState(["","","","","",""]);
  const [devOtp,    setDevOtp]    = useState("");
  const [step,      setStep]      = useState("form");
  const [loading,   setLoading]   = useState(false);
  const [resending, setResending] = useState(false);
  const [error,     setError]     = useState("");
  const [info,      setInfo]      = useState("");

  async function handleSubmit() {
    setError(""); setInfo(""); setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      if (mode === "signup") {
        const res  = await fetch(`${API}/api/auth/signup`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password, currency }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.devOtp) {
          setDevOtp(data.devOtp);
          // Auto fill OTP for seamless experience if devOtp provided
          setOtp(String(data.devOtp).split(""));
        }
        setInfo(data.message || "Verification code sent. Valid for 10 minutes.");
        setStep("otp");
      } else {
        const res  = await fetch(`${API}/api/auth/login`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        onLogin(data.token, data.plan, data.bot_allowance, data.currency || currency || "USD");
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleOTP() {
    setError(""); setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res  = await fetch(`${API}/api/auth/verify-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, otp: otp.join("") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onLogin(data.token, "trial", 2, data.currency || currency || "USD");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function handleResend() {
    setError(""); setInfo(""); setResending(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res  = await fetch(`${API}/api/auth/resend-otp`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.devOtp) {
        setDevOtp(data.devOtp);
        setOtp(String(data.devOtp).split(""));
      } else {
        setOtp(["","","","","",""]);
      }
      setInfo(data.message || "New code sent — check your inbox.");
    } catch (err) { setError(err.message); }
    finally { setResending(false); }
  }

  function handleOtpChange(val, idx) {
    const next = [...otp]; next[idx] = val.slice(-1); setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  }
  function handleOtpKey(e, idx) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0)
      document.getElementById(`otp-${idx - 1}`)?.focus();
  }
  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      const arr = pasted.split("");
      while (arr.length < 6) arr.push("");
      setOtp(arr);
    }
  }

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column" }}>
      <SceneBg />

      {/* Global Responsive Navigation Bar */}
      <Navbar
        page="auth"
        onNavigate={onBack}
        onAuth={(m) => { setMode(m); setStep("form"); }}
        currentCurrency={currency}
        onCurrencyChange={(c) => setCurrency(c)}
      />

      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "100px 24px 60px", position: "relative", zIndex: 1,
      }}>
        <Card3D intensity={8} style={{
          width: "100%", maxWidth: 440,
          background: "rgba(8,8,20,0.85)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          border: `1px solid ${C.border}`,
          borderRadius: 24,
          padding: "40px 36px",
          animation: "fadeUp 0.6s ease both",
        }}>
          {/* Back button */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <button onClick={onBack} style={{
              background: "none", border: "none", color: C.muted,
              fontSize: 11, letterSpacing: "0.15em", cursor: "pointer",
              padding: 0, fontFamily: "'Orbitron',monospace",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <ArrowLeft size={13} />
              <span>Back to Home</span>
            </button>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: "'Orbitron',monospace", letterSpacing: "0.1em" }}>
              SECURE ACCESS
            </span>
          </div>

          {/* Logo */}
          <div style={{
            fontSize: 26, fontWeight: 900, letterSpacing: "0.2em",
            background: C.grad, WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
            fontFamily: "'Orbitron',monospace", marginBottom: 4,
            filter: "drop-shadow(0 0 14px rgba(99,102,241,0.5))",
          }}>AXXON</div>
          <div style={{ fontSize: 11, color: C.muted, letterSpacing: "0.25em", fontFamily: "'Orbitron',monospace", marginBottom: 28 }}>
            {step === "form" ? (mode === "login" ? "WELCOME BACK" : "CREATE ACCOUNT") : "VERIFY EMAIL"}
          </div>

          {step === "form" ? (
            <>
              {/* Mode toggle */}
              <div style={{
                display: "flex", marginBottom: 24,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${C.border}`, borderRadius: 12, padding: 4,
              }}>
                {[
                  { id: "login",  label: "Sign In" },
                  { id: "signup", label: "Create Account" },
                ].map(m => (
                  <button key={m.id} onClick={() => { setMode(m.id); setError(""); }} style={{
                    flex: 1, padding: "10px 0",
                    background: mode === m.id ? C.grad : "transparent",
                    border: "none", borderRadius: 9,
                    color: mode === m.id ? "#fff" : C.muted,
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                    fontFamily: "'Orbitron',monospace", cursor: "pointer", transition: "all 0.2s",
                    boxShadow: mode === m.id ? "0 2px 12px rgba(99,102,241,0.4)" : "none",
                  }}>{m.label}</button>
                ))}
              </div>

              <Input
                label="Email Address"
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <Input
                label="Password"
                type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />

              {mode === "signup" && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{
                    display: "block", fontSize: 11, fontWeight: 700,
                    color: C.muted, fontFamily: "'Orbitron',monospace",
                    letterSpacing: ".1em", marginBottom: 6,
                  }}>
                    Preferred Account Currency
                  </label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12,
                      background: "rgba(0,0,0,0.5)", border: `1px solid ${C.border}`,
                      color: "#fff", fontSize: 13, fontFamily: "system-ui",
                      outline: "none", cursor: "pointer",
                    }}
                  >
                    {CURRENCIES.map(c => (
                      <option key={c.code} value={c.code} style={{ background: "#0a0a1a", color: "#fff" }}>
                        {c.code} — {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontFamily: "system-ui", display: "flex", alignItems: "center", gap: 5 }}>
                    <Sparkles size={12} style={{ color: C.indigo }} />
                    <span>Plan pricing automatically converts to {currency}.</span>
                  </div>
                </div>
              )}

              {error && <Alert type="error">{error}</Alert>}
              {info  && <Alert type="info">{info}</Alert>}

              <Btn onClick={handleSubmit} disabled={loading} style={{ width: "100%", marginTop: 8 }}>
                {loading ? "Please wait…" : mode === "login" ? "Sign In →" : "Create My Account →"}
              </Btn>

              {mode === "signup" && (
                <div style={{
                  marginTop: 16, borderRadius: 12, padding: "12px 16px",
                  background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)",
                  display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <Gift size={18} style={{ color: C.indigo, flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui", lineHeight: 1.65, margin: 0 }}>
                    <strong style={{ color: C.text }}>Free 3-day trial included.</strong>{" "}
                    After verifying your email you get 2 chatbots and 5,000 messages — no payment needed to start.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* OTP step */
            <div style={{ textAlign: "center" }}>
              {/* Step indicator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 28 }}>
                {["Enter details", "Verify email", "You're in!"].map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: i === 1 ? C.grad : i < 1 ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.06)",
                      border: i === 1 ? "none" : `1px solid ${i < 1 ? C.indigo + "60" : C.border}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700, color: i <= 1 ? "#fff" : C.dim,
                      fontFamily: "'Orbitron',monospace",
                      boxShadow: i === 1 ? "0 0 14px rgba(99,102,241,0.5)" : "none",
                    }}>{i < 1 ? <Check size={11} /> : i + 1}</div>
                    {i < 2 && <div style={{ width: 20, height: 1, background: i < 1 ? C.indigo + "50" : C.border }} />}
                  </div>
                ))}
              </div>

              <div style={{
                width: 56, height: 56, borderRadius: "50%",
                background: "rgba(99,102,241,0.12)",
                border: `1px solid rgba(99,102,241,0.35)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
                boxShadow: "0 0 24px rgba(99,102,241,0.2)",
              }}>
                <Mail size={22} style={{ color: C.indigo }} />
              </div>

              <h3 style={{
                fontSize: 16, fontWeight: 900, color: C.text,
                fontFamily: "'Orbitron',monospace", letterSpacing: "0.08em", marginBottom: 10,
              }}>Check Your Email</h3>
              <p style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui", lineHeight: 1.65, marginBottom: 28 }}>
                We sent a 6-digit verification code to<br />
                <span style={{ color: C.indigo, fontWeight: 600 }}>{email}</span>
                <br /><span style={{ fontSize: 11, color: C.dim }}>Expires in 5 minutes</span>
              </p>

              {/* OTP boxes */}
              <div onPaste={handlePaste} style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 24 }}>
                {otp.map((digit, i) => (
                  <input
                    key={i} id={`otp-${i}`}
                    type="text" inputMode="numeric"
                    maxLength={1} value={digit}
                    onChange={e => handleOtpChange(e.target.value, i)}
                    onKeyDown={e => handleOtpKey(e, i)}
                    onPaste={handlePaste}
                    style={{
                      width: 48, height: 58,
                      background: digit ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.04)",
                      border: digit ? `1px solid rgba(99,102,241,0.6)` : `1px solid ${C.border}`,
                      borderRadius: 12, color: C.text, fontSize: 24, fontWeight: 700,
                      textAlign: "center", fontFamily: "'Orbitron',monospace",
                      outline: "none", transition: "all 0.2s",
                      boxShadow: digit ? "0 0 14px rgba(99,102,241,0.3)" : "none",
                    }}
                  />
                ))}
              </div>

              {devOtp && (
                <div style={{
                  marginBottom: 20, padding: "12px 16px", borderRadius: 12,
                  background: "rgba(99,102,241,0.12)", border: "1px dashed rgba(99,102,241,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                }}>
                  <div style={{ textAlign: "left" }}>
                    <span style={{ fontSize: 11, color: C.indigo, fontWeight: 700, fontFamily: "'Orbitron',monospace", display: "flex", alignItems: "center", gap: 5 }}>
                      <Zap size={12} /> VERIFICATION CODE
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: "#fff", fontFamily: "'Orbitron',monospace", letterSpacing: "2px" }}>
                      {devOtp}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOtp(String(devOtp).split(""))}
                    style={{
                      background: C.grad, border: "none", borderRadius: 8, padding: "8px 14px",
                      color: "#fff", fontSize: 11, fontWeight: 700, fontFamily: "'Orbitron',monospace",
                      cursor: "pointer", boxShadow: "0 2px 10px rgba(99,102,241,0.3)",
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <Check size={12} />
                    <span>Auto-fill</span>
                  </button>
                </div>
              )}

              {error && <Alert type="error">{error}</Alert>}
              {info  && <Alert type="info">{info}</Alert>}

              <Btn
                onClick={handleOTP}
                disabled={loading || otp.join("").length < 6}
                style={{ width: "100%" }}
              >
                {loading ? "Verifying…" : "Confirm & Enter →"}
              </Btn>

              <button onClick={handleResend} disabled={resending} style={{
                background: "none", border: `1px solid rgba(99,102,241,0.25)`,
                borderRadius: 10, color: resending ? C.dim : C.indigo,
                fontSize: 11, letterSpacing: "0.1em", cursor: resending ? "default" : "pointer",
                marginTop: 12, fontFamily: "'Orbitron',monospace",
                padding: "11px 0", width: "100%", transition: "all 0.2s",
              }}>{resending ? "Sending…" : "↺ Resend Code"}</button>

              <button onClick={() => { setStep("form"); setOtp(["","","","","",""]); setError(""); setInfo(""); }} style={{
                background: "none", border: "none", color: C.dim,
                fontSize: 11, letterSpacing: "0.1em", cursor: "pointer",
                marginTop: 10, fontFamily: "'Orbitron',monospace",
              }}>← Change email</button>
            </div>
          )}
        </Card3D>
      </div>

      <style>{globalCSS}</style>
    </div>
  );
}

function Alert({ children, type }) {
  const s = type === "error"
    ? { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: "#f87171" }
    : { bg: "rgba(34,197,94,0.08)",  border: "rgba(34,197,94,0.25)",  color: "#4ade80" };
  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: 10, padding: "10px 14px", marginBottom: 16,
      fontSize: 13, color: s.color, fontFamily: "system-ui", textAlign: "left",
    }}>{children}</div>
  );
}

