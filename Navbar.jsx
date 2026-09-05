import { useState, useEffect, useRef } from "react";
import { 
  Menu, X, LogOut, Sun, Moon, DollarSign, User, Shield, 
  Bot, Sparkles, CreditCard, LayoutDashboard, Home, ArrowRight, Check,
  Search, BookOpen, MessageSquare, HelpCircle, Command, Globe, ChevronDown,
  Layers, SlidersHorizontal, ChevronRight, LogIn, UserPlus
} from "lucide-react";
import { C, ThemeToggle, Badge, Btn } from "./theme.jsx";
import { CURRENCIES, convertUSD } from "./currencyUtils.js";
import SearchModal from "./SearchModal.jsx";

export default function Navbar({
  page = "landing",
  user = null,
  onNavigate = () => {},
  onLogout = () => {},
  onAuth = () => {},
  activeTab = "overview",
  onTabChange = () => {},
  currentCurrency = "USD",
  onCurrencyChange = () => {},
  hideCurrencyBar = false,
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [curr, setCurr] = useState(currentCurrency || "USD");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState("");

  // Touch swipe gesture refs
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    if (currentCurrency) setCurr(currentCurrency);
  }, [currentCurrency]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Global keyboard shortcut for search (Ctrl+K, Command+K, or /)
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      } else if (e.key === "/" && !isInput) {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === "Escape") {
        if (searchOpen) setSearchOpen(false);
        if (mobileOpen) setMobileOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen, mobileOpen]);

  // Handle touch swipe across header
  const handleHeaderTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleHeaderTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Detect horizontal swipe (at least 35px, primarily horizontal)
    if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 800) {
      // Swiping across header opens or toggles the menu bar
      setMobileOpen(prev => !prev);
    }
  };

  // Handle touch swipe inside drawer to dismiss
  const handleDrawerTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleDrawerTouchEnd = (e) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Swipe up or swipe right dismisses the menu bar
    if ((dy < -50 || Math.abs(dx) > 60) && dt < 800) {
      setMobileOpen(false);
    }
  };

  const handleCurrencySelect = (newCode) => {
    setCurr(newCode);
    localStorage.setItem("axxon_currency", newCode);
    if (onCurrencyChange) onCurrencyChange(newCode);

    const token = localStorage.getItem("axxon_token");
    if (token) {
      fetch("/api/user/update-currency", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currency: newCode }),
      }).catch(() => {});
    }
  };

  const userEmail = (() => {
    if (user?.email) return user.email;
    try {
      const tok = localStorage.getItem("axxon_token");
      if (tok) {
        return JSON.parse(atob(tok.split(".")[1]))?.email || "Account";
      }
    } catch {}
    return "Account";
  })();

  const userInitial = (userEmail || "A").charAt(0).toUpperCase();
  const isAuthenticated = !!(user || (typeof window !== "undefined" && localStorage.getItem("axxon_token")));

  const navTabs = [
    { id: "overview", label: "Overview", icon: LayoutDashboard, desc: "System summary & quick metrics" },
    { id: "bots",     label: "Chatbots", icon: Bot, desc: "Manage & embed your custom bots" },
    { id: "aichat",   label: "AI Assistant", icon: Sparkles, desc: "Enterprise conversational workspace" },
    { id: "payments", label: "Billing & Plans", icon: CreditCard, desc: "Subscription status & usage" },
  ];

  // Quick currencies for the Sub-Header ticker
  const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "CAD", "AUD", "ZAR", "INR", "JPY", "GHS", "KES", "AED"];

  // Converted 1 USD rate for live preview in sub-header
  const rateInfo = convertUSD(1, curr);

  return (
    <>
      {/* ── MAIN HEADER BAR (SWIPEABLE & FOCUSED) ──────────────────── */}
      <header 
        onTouchStart={handleHeaderTouchStart}
        onTouchEnd={handleHeaderTouchEnd}
        title="Swipe left or right across header to toggle Menu Bar"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
          height: "clamp(58px, 7vh, 66px)",
          background: "var(--surface, rgba(11,15,25,0.94))",
          backdropFilter: "blur(22px)", WebkitBackdropFilter: "blur(22px)",
          borderBottom: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 clamp(12px, 3vw, 28px)",
          boxSizing: "border-box",
          transition: "background-color 0.3s ease, border-color 0.3s ease",
          userSelect: "none",
          touchAction: "pan-y",
        }}
      >
        {/* ── FAR LEFT: PROMINENT "GET STARTED" / "DASHBOARD" BUTTON ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {isAuthenticated ? (
            page !== "dashboard" ? (
              <button
                onClick={() => onNavigate("dashboard")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px clamp(12px, 2.5vw, 18px)", minHeight: 40,
                  borderRadius: 10,
                  background: C.grad,
                  color: "#ffffff",
                  fontSize: "clamp(12px, 2.4vw, 13px)",
                  fontWeight: 700,
                  fontFamily: "system-ui",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 14px rgba(99,102,241,0.4)",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                  whiteSpace: "nowrap",
                }}
              >
                <LayoutDashboard size={14} />
                <span>Dashboard</span>
              </button>
            ) : (
              <button
                onClick={() => onNavigate("landing")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px clamp(10px, 2.2vw, 14px)", minHeight: 40,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  fontSize: "clamp(11px, 2.2vw, 12px)",
                  fontWeight: 600,
                  fontFamily: "system-ui",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                  whiteSpace: "nowrap",
                }}
              >
                <Home size={13} />
                <span>Home</span>
              </button>
            )
          ) : (
            page !== "auth" && (
              <button
                onClick={() => onAuth("signup")}
                style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "8px clamp(14px, 3vw, 20px)", minHeight: 40,
                  borderRadius: 10,
                  background: C.grad,
                  color: "#ffffff",
                  fontSize: "clamp(12px, 2.6vw, 13px)",
                  fontWeight: 700,
                  fontFamily: "system-ui",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 16px rgba(99,102,241,0.45)",
                  transition: "all 0.2s ease",
                  touchAction: "manipulation",
                  whiteSpace: "nowrap",
                }}
              >
                <span>Get Started</span>
                <ArrowRight size={14} />
              </button>
            )
          )}
        </div>

        {/* ── CENTER: BRAND LOGO + SWIPE CUE ── */}
        <div 
          onClick={() => {
            if (mobileOpen) setMobileOpen(false);
            onNavigate(isAuthenticated ? "dashboard" : "landing");
          }}
          style={{
            display: "flex", alignItems: "center", gap: 8, cursor: "pointer",
            userSelect: "none", flexShrink: 0,
            padding: "4px 8px",
          }}
        >
          <span style={{
            fontFamily: "'Orbitron', monospace", fontWeight: 900,
            fontSize: "clamp(16px, 3.5vw, 21px)",
            letterSpacing: "0.14em",
            background: C.grad, WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
            filter: "drop-shadow(0 0 14px rgba(99,102,241,0.35))",
          }}>
            AXXON
          </span>
          <Badge color={C.indigo} style={{ padding: "2px 6px", fontSize: 9 }}>OS</Badge>
        </div>

        {/* ── RIGHT: SWIPEABLE MENU BAR TRIGGER BUTTON ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu bar" : "Open menu bar"}
            title="Open Menu Bar (or swipe across header)"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "7px 14px", minHeight: 40, borderRadius: 10,
              background: mobileOpen ? "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(59,130,246,0.3))" : "rgba(255,255,255,0.06)",
              border: `1px solid ${mobileOpen ? C.indigo : C.border}`,
              color: mobileOpen ? "#fff" : C.text,
              cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "system-ui",
              transition: "all 0.2s ease",
              touchAction: "manipulation",
              boxShadow: mobileOpen ? "0 0 14px rgba(99,102,241,0.35)" : "none",
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            <span className="hidden xs:inline">Menu</span>
          </button>
        </div>
      </header>

      {/* ── SUB-HEADER: CURRENCY & REGIONAL BAR ── */}
      {!hideCurrencyBar && (
        <div 
          onTouchStart={handleHeaderTouchStart}
          onTouchEnd={handleHeaderTouchEnd}
          style={{
            position: "fixed",
            top: "clamp(58px, 7vh, 66px)",
            left: 0, right: 0,
            zIndex: 990,
            height: 38,
            background: "var(--surface-hi, rgba(8, 12, 22, 0.95))",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            borderBottom: `1px solid ${C.border}`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "0 clamp(10px, 3vw, 24px)",
            boxSizing: "border-box",
            overflow: "hidden",
            touchAction: "pan-y",
          }}
        >
          {/* Left Currency Label & Horizontal Quick Switcher */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            overflowX: "auto", WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none", msOverflowStyle: "none",
            flex: 1, paddingRight: 8,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10, fontWeight: 800, color: C.indigo,
              fontFamily: "'Orbitron', monospace", letterSpacing: "0.08em",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              <Globe size={12} style={{ color: C.indigo }} />
              <span>CURRENCY:</span>
            </div>

            {/* Quick Currency Selection Chips */}
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              {POPULAR_CURRENCIES.map(code => {
                const item = CURRENCIES.find(c => c.code === code) || { symbol: "", code };
                const isSelected = curr === code;
                return (
                  <button
                    key={code}
                    onClick={() => handleCurrencySelect(code)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      padding: "2px 8px", borderRadius: 6,
                      background: isSelected 
                        ? "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.35))"
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${isSelected ? C.borderHi : "rgba(255,255,255,0.07)"}`,
                      color: isSelected ? "#fff" : C.muted,
                      fontSize: 11, fontWeight: isSelected ? 700 : 500,
                      fontFamily: "'Orbitron', monospace",
                      cursor: "pointer", whiteSpace: "nowrap",
                      transition: "all 0.15s ease",
                      touchAction: "manipulation",
                    }}
                  >
                    <span>{item.symbol}</span>
                    <span>{code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Dropdown for All Currencies & Live Exchange Summary */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
            borderLeft: `1px solid ${C.border}`, paddingLeft: 8,
          }}>
            {curr !== "USD" && (
              <div className="hidden md:flex" style={{
                fontSize: 10, color: C.dim, fontFamily: "system-ui",
                whiteSpace: "nowrap", marginRight: 4,
              }}>
                {rateInfo.rateText}
              </div>
            )}

            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select
                value={curr}
                onChange={(e) => handleCurrencySelect(e.target.value)}
                aria-label="Select Currency from All"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  padding: "2px 20px 2px 8px",
                  color: C.text,
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: "'Orbitron', monospace",
                  cursor: "pointer",
                  outline: "none",
                  appearance: "none",
                  WebkitAppearance: "none",
                }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: "#0b0f19", color: "#fff" }}>
                    {c.symbol} {c.code} - {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={11} style={{ position: "absolute", right: 6, color: C.muted, pointerEvents: "none" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── THE COMPLETE MENU BAR (HOUSES ALL NAVIGATION, AUTH, TABS & CONTROLS) ── */}
      {mobileOpen && (
        <div 
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
          style={{
            position: "fixed",
            top: "clamp(58px, 7vh, 66px)",
            left: 0, right: 0, bottom: 0,
            zIndex: 998,
            background: "var(--card-bg, rgba(8, 12, 22, 0.98))",
            backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "20px clamp(14px, 4vw, 36px) 50px",
            display: "flex", flexDirection: "column", gap: 18,
            animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {/* Top Bar inside Menu: Quick Theme Switcher & Search Bar Trigger */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "10px 14px",
            justifyContent: "space-between",
          }}>
            <div 
              onClick={() => {
                setMobileOpen(false);
                setSearchOpen(true);
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                color: C.muted, fontSize: 13, fontFamily: "system-ui",
                cursor: "pointer", flex: 1,
              }}
            >
              <Search size={16} style={{ color: C.indigo }} />
              <span>Search knowledge, logs, FAQs...</span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: `1px solid ${C.border}`, paddingLeft: 10 }}>
              <span style={{ fontSize: 11, color: C.dim, fontFamily: "system-ui" }}>Theme:</span>
              <ThemeToggle compact={true} />
            </div>
          </div>

          {/* SECTION 1: DASHBOARD MODULES (IF ON DASHBOARD OR LOGGED IN) */}
          {isAuthenticated && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: 11, fontWeight: 700, color: C.indigo,
                textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: 10, fontFamily: "'Orbitron', monospace",
              }}>
                <span>Dashboard Modules</span>
                <span style={{ fontSize: 10, color: C.dim, textTransform: "none", fontFamily: "system-ui" }}>Tap to navigate</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                {navTabs.map(tab => {
                  const Icon = tab.icon;
                  const active = page === "dashboard" && (activeTab === tab.id || (activeTab === "gemini" && tab.id === "aichat"));
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        if (page !== "dashboard") onNavigate("dashboard");
                        onTabChange(tab.id);
                        setMobileOpen(false);
                      }}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: "14px 16px", borderRadius: 14,
                        minHeight: 64,
                        background: active ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(99,102,241,0.25))" : "rgba(255,255,255,0.03)",
                        border: `1px solid ${active ? C.borderHi : C.border}`,
                        color: active ? "#fff" : C.text,
                        cursor: "pointer",
                        textAlign: "left",
                        boxShadow: active ? "0 4px 16px rgba(99,102,241,0.25)" : "none",
                        transition: "all 0.18s ease",
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: active ? C.indigo : "rgba(255,255,255,0.06)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 2,
                      }}>
                        <Icon size={18} color={active ? "#fff" : C.indigo} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: active ? 700 : 600, fontFamily: "system-ui", color: active ? "#fff" : C.text }}>
                          {tab.label}
                        </div>
                        <div style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tab.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION 2: MAIN SITE NAVIGATION LINKS */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.indigo,
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginBottom: 10, fontFamily: "'Orbitron', monospace",
            }}>
              Site Navigation
            </div>
            <div style={{
              display: "flex", flexDirection: "column", gap: 6,
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "8px",
            }}>
              {[
                { label: "Overview & Landing", action: () => onNavigate("landing"), active: page === "landing" },
                { label: "Features & Architecture", href: "#features", action: () => { if (page !== "landing") onNavigate("landing"); } },
                { label: "Pricing & Plans", href: "#pricing", action: () => { if (page !== "landing") onNavigate("landing"); } },
                { label: "About Axxon OS", href: "#about", action: () => { if (page !== "landing") onNavigate("landing"); } },
                { label: "Contact Support", href: "#contact", action: () => { if (page !== "landing") onNavigate("landing"); } },
              ].map((link, idx) => (
                <a
                  key={idx}
                  href={link.href || "#"}
                  onClick={(e) => {
                    if (link.action) link.action();
                    setMobileOpen(false);
                  }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 14px", borderRadius: 10,
                    color: link.active ? "#fff" : C.text,
                    background: link.active ? "rgba(99,102,241,0.12)" : "transparent",
                    fontSize: 14, fontWeight: link.active ? 700 : 600,
                    textDecoration: "none", fontFamily: "system-ui",
                    minHeight: 46,
                  }}
                >
                  <span>{link.label}</span>
                  <ChevronRight size={15} style={{ color: link.active ? C.indigo : C.dim }} />
                </a>
              ))}
            </div>
          </div>

          {/* SECTION 3: CURRENCY & REGIONAL SETTINGS */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: C.muted, fontFamily: "system-ui" }}>
                <Globe size={14} style={{ color: C.indigo }} />
                <span>Regional Currency</span>
              </div>
              <span style={{ fontSize: 11, color: C.dim }}>Live Rates</span>
            </div>

            <div style={{ position: "relative" }}>
              <select
                value={curr}
                onChange={(e) => handleCurrencySelect(e.target.value)}
                style={{
                  width: "100%", minHeight: 46,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${C.borderHi}`,
                  borderRadius: 10, padding: "10px 14px",
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  fontFamily: "system-ui",
                  outline: "none", cursor: "pointer",
                  appearance: "none", WebkitAppearance: "none",
                }}
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code} style={{ background: "#0b0f19", color: "#fff" }}>
                    {c.symbol} {c.code} — {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} style={{ position: "absolute", right: 14, top: 15, color: C.muted, pointerEvents: "none" }} />
            </div>
          </div>

          {/* SECTION 4: USER ACCOUNT & AUTHENTICATION CONTROLS */}
          {isAuthenticated ? (
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: `1px solid ${C.border}`,
              borderRadius: 14, padding: "16px",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: "50%",
                  background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: 16, fontWeight: 800,
                  flexShrink: 0,
                }}>
                  {userInitial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {userEmail}
                  </div>
                  <div style={{ fontSize: 11, color: "#4ade80", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />
                    Logged In
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                {page !== "dashboard" && (
                  <Btn 
                    onClick={() => {
                      onNavigate("dashboard");
                      setMobileOpen(false);
                    }}
                    style={{ flex: 1, padding: "12px 0", minHeight: 46, fontSize: 13 }}
                  >
                    Dashboard
                  </Btn>
                )}

                <button
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                  style={{
                    flex: 1, minHeight: 46,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    padding: "12px 0", borderRadius: 10,
                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                    color: "#f87171", fontSize: 13, fontWeight: 700, fontFamily: "system-ui",
                    cursor: "pointer",
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn 
                onClick={() => {
                  onAuth("signup");
                  setMobileOpen(false);
                }} 
                style={{ width: "100%", padding: "14px 0", minHeight: 48, fontSize: 14 }}
              >
                Create Account
              </Btn>

              <button
                onClick={() => {
                  onAuth("login");
                  setMobileOpen(false);
                }}
                style={{
                  width: "100%", minHeight: 48,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "12px 0", borderRadius: 12,
                  background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`,
                  color: C.text, fontSize: 13, fontWeight: 700, fontFamily: "system-ui",
                  cursor: "pointer",
                }}
              >
                <LogIn size={15} />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {/* SWIPE TO CLOSE HINT */}
          <div style={{
            textAlign: "center", fontSize: 11, color: C.dim,
            marginTop: 4, fontFamily: "system-ui",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span>Swipe up or tap outside to close Menu Bar</span>
          </div>
        </div>
      )}

      {/* ── SEARCH COMMAND PALETTE MODAL ───────────────────────── */}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={onNavigate}
        onTabChange={onTabChange}
        initialQuery={searchInitialQuery}
        user={user}
      />
    </>
  );
}
