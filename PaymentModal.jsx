import { useState, useEffect } from "react";
import { CheckCircle, Check, Copy, X } from "lucide-react";
import { CURRENCIES, convertUSD } from "./currencyUtils.js";
import { usePricing } from "./pricingService.js";

const CRYPTO_CURRENCIES = ["USDT", "BTC", "ETH", "SOL"];

export default function PaymentModal({ plan, user, userCurrency = "USD", markupPercent: propMarkup, onClose, onGetStarted }) {
  const { prices: livePrices, markupPercent: liveMarkup } = usePricing();
  const [step, setStep] = useState("select");
  const [currency, setCurrency] = useState("USDT");
  const [selectedCurr, setSelectedCurr] = useState(
    userCurrency || localStorage.getItem("axxon_currency") || "USD"
  );
  const [renewalType, setRenewalType] = useState("one-off");
  const [wallets, setWallets] = useState({ USDT: "", BTC: "", ETH: "", SOL: "" });
  const [orderId, setOrderId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/admin/wallets").then(r => r.json()).then(setWallets).catch(() => {});
  }, []);

  if (!plan) return null;

  const currentPrice = livePrices && plan.id ? (livePrices[plan.id] ?? plan.price) : plan.price;
  const currentMarkup = propMarkup !== undefined ? propMarkup : (liveMarkup ?? 15);

  const token = localStorage.getItem("axxon_token");
  const converted = convertUSD(currentPrice, selectedCurr, currentMarkup);

  const handleCurrencyChange = (newCode) => {
    setSelectedCurr(newCode);
    localStorage.setItem("axxon_currency", newCode);
  };

  async function handleInitialize() {
    if (!token) {
      if (onGetStarted) onGetStarted();
      onClose();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: plan.id, currency, renewal_type: renewalType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initialize payment");
      setOrderId(data.order_id);
      setStep("pay");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/payments/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ order_id: orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirmation failed");
      setStep("done");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function copyAddress() {
    const addr = wallets[currency];
    if (addr) {
      navigator.clipboard.writeText(addr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    }
  }

  const accent = plan.color || "#6366f1";

  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  };
  const boxStyle = {
    background: "linear-gradient(145deg, #0a0a1a, #050510)",
    border: `1px solid ${accent}40`,
    borderRadius: 20, padding: "40px 36px",
    width: "100%", maxWidth: 460,
    boxShadow: `0 0 80px ${accent}20, 0 24px 60px rgba(0,0,0,0.8)`,
    fontFamily: "'Orbitron', monospace",
    color: "#fff", position: "relative",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={boxStyle}>
        <button onClick={onClose} style={{
          position: "absolute", top: 16, right: 16,
          background: "none", border: "none", color: "#64748b",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={18} />
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.3em", color: accent, marginBottom: 6 }}>◆ {plan.name} PLAN</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#fff", marginBottom: 2 }}>
              {converted.formatted}
            </div>
          </div>
          {/* Currency Dropdown Selector inside Modal */}
          <div style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${accent}50`, borderRadius: 10, padding: "4px 8px", flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: "#94a3b8", fontFamily: "system-ui", marginBottom: 2 }}>Pay Currency:</div>
            <select
              value={selectedCurr}
              onChange={e => handleCurrencyChange(e.target.value)}
              style={{
                background: "transparent", border: "none", color: "#60a5fa",
                fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron',monospace",
                outline: "none", cursor: "pointer",
              }}
            >
              {CURRENCIES.map(c => (
                <option key={c.code} value={c.code} style={{ background: "#0a0a1a", color: "#fff" }}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!converted.isNormal ? (
          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "system-ui", marginBottom: 10, lineHeight: 1.5 }}>
            ≈ ${currentPrice.toLocaleString()} USD base price &nbsp;·&nbsp; <span style={{ color: "#60a5fa" }}>{converted.rateText}</span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: "#94a3b8", fontFamily: "system-ui", marginBottom: 10 }}>
            US Dollar Base Rate
          </div>
        )}
        <div style={{ fontSize: 10, color: "#475569", marginBottom: 24, letterSpacing: "0.1em" }}>{plan.duration} access</div>

        {step === "select" && (
          <>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#475569", marginBottom: 10 }}>PAY WITH CRYPTO</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {CRYPTO_CURRENCIES.map(c => (
                  <button key={c} onClick={() => setCurrency(c)} style={{
                    padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                    fontSize: 10, letterSpacing: "0.15em", fontWeight: 700,
                    fontFamily: "'Orbitron', monospace",
                    background: currency === c ? accent : "rgba(255,255,255,0.04)",
                    border: `1px solid ${currency === c ? accent : "rgba(255,255,255,0.1)"}`,
                    color: currency === c ? "#fff" : "#94a3b8",
                  }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#475569", marginBottom: 10 }}>RENEWAL TYPE</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["one-off", "recurring"].map(r => (
                  <button key={r} onClick={() => setRenewalType(r)} style={{
                    padding: "8px 16px", borderRadius: 8, cursor: "pointer",
                    fontSize: 9, letterSpacing: "0.15em", fontWeight: 700,
                    fontFamily: "'Orbitron', monospace",
                    background: renewalType === r ? accent : "rgba(255,255,255,0.04)",
                    border: `1px solid ${renewalType === r ? accent : "rgba(255,255,255,0.1)"}`,
                    color: renewalType === r ? "#fff" : "#94a3b8",
                  }}>{r.toUpperCase()}</button>
                ))}
              </div>
            </div>

            {error && <div style={{ color: "#ef4444", fontSize: 11, marginBottom: 16, fontFamily: "system-ui" }}>{error}</div>}

            <button onClick={handleInitialize} disabled={loading} style={{
              width: "100%", padding: "14px 0", borderRadius: 10,
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
              border: "none", color: "#fff", fontSize: 11, fontWeight: 700,
              letterSpacing: "0.2em", cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "'Orbitron', monospace",
              boxShadow: `0 0 20px ${accent}40`,
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "INITIALIZING..." : token ? "PROCEED TO PAYMENT" : "GET STARTED"}
            </button>
          </>
        )}

        {step === "pay" && (
          <>
            <div style={{
              background: "rgba(255,255,255,0.03)", border: `1px solid ${accent}30`,
              borderRadius: 12, padding: 20, marginBottom: 20,
            }}>
              <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#475569", marginBottom: 8 }}>SEND {currency} TO</div>
              <div style={{
                fontSize: 11, color: "#94a3b8", wordBreak: "break-all",
                fontFamily: "monospace", lineHeight: 1.6, marginBottom: 12,
              }}>
                {wallets[currency] || "Wallet address not configured. Contact support."}
              </div>
              {wallets[currency] && (
                <button onClick={copyAddress} style={{
                  padding: "6px 14px", borderRadius: 6, cursor: "pointer",
                  fontSize: 10, letterSpacing: "0.1em", fontWeight: 600,
                  background: copied ? "#22c55e20" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${copied ? "#22c55e" : "rgba(255,255,255,0.1)"}`,
                  color: copied ? "#22c55e" : "#94a3b8",
                  fontFamily: "system-ui, sans-serif",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  {copied ? (
                    <>
                      <Check size={12} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} />
                      <span>Copy Address</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div style={{
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 20,
              fontSize: 10, color: "#475569", lineHeight: 1.7, fontFamily: "system-ui",
            }}>
              Order ID: <span style={{ color: "#60a5fa", fontFamily: "monospace" }}>{orderId}</span><br/>
              Amount: <span style={{ color: "#fff" }}>${currentPrice.toLocaleString()} USD {!converted.isNormal && `(${converted.formatted})`} in {currency}</span>
            </div>

            <div style={{ fontSize: 10, color: "#475569", fontFamily: "system-ui", marginBottom: 20, lineHeight: 1.6 }}>
              After sending payment, click confirm below. Our team will verify and activate your plan.
            </div>

            {error && <div style={{ color: "#ef4444", fontSize: 11, marginBottom: 16, fontFamily: "system-ui" }}>{error}</div>}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("select")} style={{
                flex: 1, padding: "12px 0", borderRadius: 10, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
                color: "#94a3b8", fontSize: 10, letterSpacing: "0.15em",
                fontFamily: "'Orbitron', monospace",
              }}>BACK</button>
              <button onClick={handleConfirm} disabled={loading} style={{
                flex: 2, padding: "12px 0", borderRadius: 10, cursor: loading ? "not-allowed" : "pointer",
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                border: "none", color: "#fff", fontSize: 10, letterSpacing: "0.2em",
                fontFamily: "'Orbitron', monospace",
                opacity: loading ? 0.7 : 1,
              }}>
                {loading ? "CONFIRMING..." : "I HAVE PAID"}
              </button>
            </div>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <CheckCircle size={48} color="#22c55e" />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.15em", color: "#22c55e", marginBottom: 12 }}>
              PAYMENT CONFIRMED
            </div>
            <div style={{ fontSize: 11, color: "#475569", fontFamily: "system-ui", lineHeight: 1.7, marginBottom: 28 }}>
              Your {plan.name} plan will be activated shortly. You'll receive a confirmation email.
            </div>
            <button onClick={() => { onClose(); if (onGetStarted) onGetStarted(); }} style={{
              padding: "12px 32px", borderRadius: 10, cursor: "pointer",
              background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
              border: "none", color: "#fff", fontSize: 10, letterSpacing: "0.2em",
              fontFamily: "'Orbitron', monospace",
            }}>
              GO TO DASHBOARD
            </button>
          </div>
        )}

        <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');`}</style>
      </div>
    </div>
  );
}
