import { useState, useEffect, useRef } from "react";
import { 
  Menu, X, LogOut, Sun, Moon, DollarSign, User, Shield, 
  Bot, Sparkles, CreditCard, LayoutDashboard, Home, ArrowRight, Check,
  Search, BookOpen, MessageSquare, HelpCircle, Command, Globe, ChevronDown,
  Layers, SlidersHorizontal, ChevronRight, LogIn, UserPlus, Lock
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
  const [swipeVisualActive, setSwipeVisualActive] = useState(false);

  // Touch swipe gesture refs
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isSwipingRef = useRef(false);

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

  // Touch swipe across header to open/close menu bar
  const handleHeaderTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isSwipingRef.current = true;
    setSwipeVisualActive(true);
  };

  const handleHeaderTouchMove = (e) => {
    if (!isSwipingRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    // Highlight swipe pill if dragged
    if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
      setSwipeVisualActive(true);
    }
  };

  const handleHeaderTouchEnd = (e) => {
    setSwipeVisualActive(false);
    if (!isSwipingRef.current) return;
    isSwipingRef.current = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    // Detect horizontal swipe across the header (at least 25px) or downward pull (at least 25px) within 750ms
    if ((Math.abs(dx) > 25 || dy > 25) && dt < 750) {
      setMobileOpen(prev => !prev);
    }
  };

  // Mouse drag across header to support desktop swiping/dragging
  const handleHeaderMouseDown = (e) => {
    // Only drag on header background, not when clicking interactive buttons
    if (e.target.tagName === "BUTTON" || e.target.closest("button") || e.target.tagName === "A") return;
    touchStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
    isSwipingRef.current = true;
    setSwipeVisualActive(true);
  };

  const handleHeaderMouseUp = (e) => {
    setSwipeVisualActive(false);
    if (!isSwipingRef.current) return;
    isSwipingRef.current = false;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    if ((Math.abs(dx) > 30 || dy > 30) && dt < 700) {
      setMobileOpen(prev => !prev);
    }
  };

  // Touch swipe inside drawer to dismiss
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
    if ((dy < -45 || Math.abs(dx) > 55) && dt < 800) {
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

  // Quick currencies for the Menu Bar
  const POPULAR_CURRENCIES = ["USD", "EUR", "GBP", "NGN", "CAD", "AUD", "ZAR", "INR", "JPY", "GHS", "KES", "AED"];

  // Converted 1 USD rate for live preview
  const rateInfo = convertUSD(1, curr);

  return (
    <>
      {/* ── MAIN HEADER BAR (SWIPEABLE ACROSS ENTIRE WIDTH) ──────────── */}
      <header 
        onTouchStart={handleHeaderTouchStart}
        onTouchMove={handleHeaderTouchMove}
        onTouchEnd={handleHeaderTouchEnd}
        onMouseDown={handleHeaderMouseDown}
        onMouseUp={handleHeaderMouseUp}
        title="Swipe across the header to toggle Menu Bar"
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
          height: "clamp(60px, 7.5vh, 68px)",
          background: "var(--surface, rgba(11,15,25,0.96))",
          backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          borderBottom: `1px solid ${swipeVisualActive ? C.indigo : C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 clamp(12px, 3vw, 28px)",
          boxSizing: "border-box",
          transition: "border-color 0.2s ease, background-color 0.3s ease",
          userSelect: "none",
          touchAction: "pan-x pan-y",
          cursor: "grab",
        }}
      >
        {/* ── FAR LEFT: THE "GET STARTED" BUTTON (THE KEY FEATURE ON HEADER) ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {isAuthenticated ? (
            page !== "dashboard" ? (
              <button
                onClick={() => onNavigate("dashboard")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "9px clamp(14px, 3vw, 20px)", minHeight: 42,
                  borderRadius: 12,
                  background: C.grad,
                  color: "#ffffff",
                  fontSize: "clamp(12px, 2.5vw, 13px)",
                  fontWeight: 700,
                  fontFamily: "system-ui",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 2px 14px rgba(99,102,241,0.45)",
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
                  padding: "9px clamp(12px, 2.5vw, 16px)", minHeight: 42,
                  borderRadius: 12,
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
            <button
              onClick={() => onAuth("signup")}
              id="header-get-started-btn"
              style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7,
                padding: "9px clamp(16px, 3.5vw, 22px)", minHeight: 42,
                borderRadius: 12,
                background: C.grad,
                color: "#ffffff",
                fontSize: "clamp(12px, 2.6vw, 13.5px)",
                fontWeight: 700,
                fontFamily: "system-ui",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 18px rgba(99,102,241,0.5)",
                transition: "all 0.2s ease",
                touchAction: "manipulation",
                whiteSpace: "nowrap",
              }}
            >
              <span>Get Started</span>
              <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* ── CENTER: BRAND LOGO & VISUAL SWIPE CUE BAR ── */}
        <div 
          onClick={() => setMobileOpen(prev => !prev)}
          title="Click or swipe across to open Menu Bar"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            cursor: "pointer", userSelect: "none", flex: 1, padding: "0 10px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              fontFamily: "'Orbitron', monospace", fontWeight: 900,
              fontSize: "clamp(16px, 3.4vw, 20px)",
              letterSpacing: "0.14em",
              background: C.grad, WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent", backgroundClip: "text",
              filter: "drop-shadow(0 0 14px rgba(99,102,241,0.35))",
            }}>
              AXXON
            </span>
            <Badge color={C.indigo} style={{ padding: "2px 5px", fontSize: 8 }}>OS</Badge>
          </div>

          {/* ELEGANT SWIPE INDICATOR CUE */}
          <div style={{
            marginTop: 3,
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "2px 10px", borderRadius: 999,
            background: swipeVisualActive ? "rgba(99,102,241,0.25)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${swipeVisualActive ? C.indigo : "rgba(255,255,255,0.07)"}`,
            color: swipeVisualActive ? "#fff" : C.muted,
            fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
            fontFamily: "'Orbitron', monospace",
            transition: "all 0.2s ease",
          }}>
            <span>‹</span>
            <span>SWIPE FOR MENU</span>
            <span>›</span>
          </div>
        </div>

        {/* ── RIGHT: MENU TOGGLE BUTTON (TAP ALTERNATIVE TO SWIPING) ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => setMobileOpen(prev => !prev)}
            aria-label={mobileOpen ? "Close menu bar" : "Open menu bar"}
            title="Toggle Menu Bar (or swipe across header)"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 14px", minHeight: 40, borderRadius: 11,
              background: mobileOpen ? "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(59,130,246,0.3))" : "rgba(255,255,255,0.05)",
              border: `1px solid ${mobileOpen ? C.indigo : C.border}`,
              color: mobileOpen ? "#fff" : C.text,
              cursor: "pointer",
              fontSize: 12, fontWeight: 700, fontFamily: "system-ui",
              transition: "all 0.2s ease",
              touchAction: "manipulation",
              boxShadow: mobileOpen ? "0 0 16px rgba(99,102,241,0.35)" : "none",
            }}
          >
            {mobileOpen ? <X size={16} /> : <Menu size={16} />}
            <span className="hidden xs:inline">{mobileOpen ? "Close" : "Menu"}</span>
          </button>
        </div>
      </header>

      {/* ── THE COMPLETE MENU BAR ──────────────────────────────────────
          HOUSES ALL NAVIGATION, CURRENCY PICKER, SEARCH, THEME & USER MODULES
          THAT WERE FORMERLY CLUTTERING THE HEADER ── */}
      {mobileOpen && (
        <div 
          onTouchStart={handleDrawerTouchStart}
          onTouchEnd={handleDrawerTouchEnd}
          style={{
            position: "fixed",
            top: "clamp(60px, 7.5vh, 68px)",
            left: 0, right: 0, bottom: 0,
            zIndex: 998,
            background: "var(--card-bg, rgba(8, 12, 22, 0.98))",
            backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "20px clamp(14px, 4vw, 36px) 60px",
            display: "flex", flexDirection: "column", gap: 18,
            animation: "fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {/* SECTION 1: SEARCH PALETTE SHORTCUT & THEME TOGGLE */}
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

          {/* SECTION 2: REGIONAL CURRENCIES & LIVE CONVERSION HUB (MOVED INTO MENU BAR) */}
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "16px 18px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: C.indigo, fontFamily: "'Orbitron', monospace", letterSpacing: "0.08em" }}>
                <Globe size={14} style={{ color: C.indigo }} />
                <span>REGIONAL CURRENCY & RATES</span>
              </div>
              <span style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui" }}>{rateInfo.rateText}</span>
            </div>

            {/* Quick Popular Currency Selector Chips */}
            <div>
              <div style={{ fontSize: 11, color: C.dim, marginBottom: 8, fontFamily: "system-ui" }}>
                Popular Currencies:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {POPULAR_CURRENCIES.map(code => {
                  const item = CURRENCIES.find(c => c.code === code) || { symbol: "", code };
                  const isSelected = curr === code;
                  return (
                    <button
                      key={code}
                      onClick={() => handleCurrencySelect(code)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 4,
                        padding: "5px 10px", borderRadius: 8,
                        background: isSelected 
                          ? "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(99,102,241,0.4))"
                          : "rgba(255,255,255,0.04)",
                        border: `1px solid ${isSelected ? C.borderHi : "rgba(255,255,255,0.08)"}`,
                        color: isSelected ? "#fff" : C.text,
                        fontSize: 12, fontWeight: isSelected ? 800 : 500,
                        fontFamily: "'Orbitron', monospace",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span style={{ color: isSelected ? "#fff" : C.dim }}>{item.symbol}</span>
                      <span>{code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Full All-Currencies Dropdown */}
            <div style={{ position: "relative", marginTop: 4 }}>
              <select
                value={curr}
                onChange={(e) => handleCurrencySelect(e.target.value)}
                style={{
                  width: "100%", minHeight: 44,
                  background: "rgba(255,255,255,0.04)",
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
              <ChevronDown size={16} style={{ position: "absolute", right: 14, top: 14, color: C.muted, pointerEvents: "none" }} />
            </div>
          </div>

          {/* SECTION 3: DASHBOARD MODULES (WHEN AUTHENTICATED) */}
          {isAuthenticated && (
            <div>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                fontSize: 11, fontWeight: 700, color: C.indigo,
                textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: 10, fontFamily: "'Orbitron', monospace",
              }}>
                <span>Dashboard Modules</span>
                <span style={{ fontSize: 10, color: C.dim, textTransform: "none", fontFamily: "system-ui" }}>Tap to switch tab</span>
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

          {/* SECTION 4: SITE NAVIGATION LINKS */}
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
                { label: "Overview & Home", action: () => onNavigate("landing"), active: page === "landing" },
                { label: "Features & Architecture", href: "#features", action: () => { if (page !== "landing") onNavigate("landing"); } },
                { label: "Pricing & Plans (Starter $34/mo)", href: "#pricing", action: () => { if (page !== "landing") onNavigate("landing"); } },
                { label: "About Axxon OS", href: "#about", action: () => { if (page !== "landing") onNavigate("landing"); } },
                { label: "Contact & Support", href: "#contact", action: () => { if (page !== "landing") onNavigate("landing"); } },
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

          {/* SECTION 5: USER ACCOUNT & AUTHENTICATION CONTROLS */}
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
                Create Account (Get Started)
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
            marginTop: 6, fontFamily: "system-ui",
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
