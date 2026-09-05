/**
 * EmbedGuide — plain-language embed helper for non-developers.
 *
 * Shows:
 *  • A prominent "Test your bot" button (opens live bot page)
 *  • Shareable direct link with one-click copy
 *  • Platform picker (WordPress / Shopify / Wix / Squarespace / Custom HTML)
 *  • Step-by-step instructions tailored to the chosen platform
 *  • The embed snippet with a large copy button + visual confirmation
 *
 * Props:
 *   botId    — string  (required)
 *   botName  — string  (required)
 *   baseUrl  — string  (required, e.g. "https://...")
 *   compact  — bool    (optional, tighter layout for the bot-list cards)
 */
import { useState } from "react";
import { Globe, ShoppingBag, Layout, Code, Link, ExternalLink, FileCode, Sparkles, Copy, Check } from "lucide-react";
import { C, Card3D, globalCSS } from "./theme.jsx";

const PLATFORMS = [
  { id: "wordpress",   label: "WordPress",   icon: <Layout size={14} /> },
  { id: "shopify",     label: "Shopify",      icon: <ShoppingBag size={14} /> },
  { id: "wix",         label: "Wix",          icon: <Layout size={14} /> },
  { id: "squarespace", label: "Squarespace",  icon: <Layout size={14} /> },
  { id: "html",        label: "Custom HTML",  icon: <Globe size={14} /> },
];

function getSteps(platform, snippet) {
  switch (platform) {
    case "wordpress":
      return [
        { text: 'Log in to your WordPress admin panel (your-site.com/wp-admin).' },
        { text: 'Install the free plugin "Insert Headers and Footers" — search for it under Plugins → Add New.' },
        { text: 'Go to Settings → Insert Headers and Footers.' },
        { text: 'Paste the code (below) into the "Scripts in Footer" box.' },
        { text: 'Click Save. Your chatbot will appear on every page of your site immediately.' },
      ];
    case "shopify":
      return [
        { text: 'In your Shopify admin, go to Online Store → Themes.' },
        { text: 'Click the three-dot menu next to your active theme, then "Edit code".' },
        { text: 'In the left sidebar, open the Layout folder and click "theme.liquid".' },
        { text: 'Scroll to the very bottom and find the </body> tag.' },
        { text: 'Paste the code (below) on the line just above </body>.' },
        { text: 'Click Save. Your chatbot is now live on your Shopify store.' },
      ];
    case "wix":
      return [
        { text: 'Open your Wix Editor and go to Settings (gear icon in the top menu).' },
        { text: 'Click "Custom Code" → "+ Add Custom Code".' },
        { text: 'Paste the code (below) into the code box.' },
        { text: 'Set "Add Code to Pages" to "All Pages" and "Place Code in" to "Body — end".' },
        { text: 'Click Apply, then Publish your site. Done!' },
      ];
    case "squarespace":
      return [
        { text: 'In your Squarespace dashboard, go to Settings → Advanced → Code Injection.' },
        { text: 'Find the "Footer" text box at the bottom of that page.' },
        { text: 'Paste the code (below) into the Footer box.' },
        { text: 'Click Save. Your chatbot will appear on every page automatically.' },
      ];
    default: // html
      return [
        { text: 'Open your website\'s main HTML file (often called index.html) in any text editor.' },
        { text: 'Use Ctrl+F (or Cmd+F on Mac) to search for the text: </body>' },
        { text: 'Paste the code (below) on the line directly above </body>.' },
        { text: 'Save the file and upload it back to your hosting provider.' },
        { text: 'Refresh your website — the chat widget will appear in the bottom-right corner.' },
      ];
  }
}

export default function EmbedGuide({ botId, botName, baseUrl, compact = false }) {
  const [platform, setPlatform]   = useState("html");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [open, setOpen]           = useState(!compact); // compact = collapsed by default

  const botUrl  = `${baseUrl}/bot/${botId}`;
  const snippet = `<script src="${baseUrl}/widget.js" data-bot-id="${botId}"></script>`;
  const steps   = getSteps(platform, snippet);

  function copy(text, setFlag) {
    navigator.clipboard.writeText(text).then(() => {
      setFlag(true);
      setTimeout(() => setFlag(false), 2500);
    });
  }

  // ── Compact mode: collapsed card with expand toggle ──────────────────────
  if (compact) {
    return (
      <div style={{ marginTop: 16 }}>
        {/* Always-visible action row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: open ? 14 : 0 }}>
          <a
            href={botUrl} target="_blank" rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 10, textDecoration: "none",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              color: "#fff", fontSize: 12, fontWeight: 700,
              fontFamily: "system-ui", boxShadow: "0 4px 16px rgba(34,197,94,0.3)",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
            onMouseLeave={e => e.currentTarget.style.transform = "none"}
          >
            <ExternalLink size={13} /> Test Bot
          </a>

          <button
            onClick={() => copy(botUrl, setCopiedLink)}
            style={smallCopyBtn(copiedLink)}
          >
            {copiedLink ? <><Check size={12} /> Link Copied!</> : <><Link size={12} /> Copy Link</>}
          </button>

          <button
            onClick={() => copy(snippet, setCopiedCode)}
            style={smallCopyBtn(copiedCode, true)}
          >
            {copiedCode ? <><Check size={12} /> Code Copied!</> : <><Code size={12} /> Copy Embed Code</>}
          </button>

          <button
            onClick={() => setOpen(v => !v)}
            style={{
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 8, color: C.muted, cursor: "pointer",
              fontSize: 11, padding: "8px 14px", fontFamily: "system-ui",
              transition: "all 0.2s",
              display: "inline-flex", alignItems: "center", gap: 5
            }}
          >
            {open ? "▲ Less" : <><FileCode size={12} /> How to add to my site</>}
          </button>
        </div>

        {open && <InstallGuide platform={platform} setPlatform={setPlatform} steps={steps} snippet={snippet} copiedCode={copiedCode} onCopyCode={() => copy(snippet, setCopiedCode)} />}
        <style>{globalCSS}</style>
      </div>
    );
  }

  // ── Full mode: used in create-success and edit views ────────────────────
  return (
    <div>
      {/* Success header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(34,197,94,0.07)",
        border: "1px solid rgba(34,197,94,0.25)",
        borderRadius: 16, padding: "18px 22px", marginBottom: 24,
      }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Sparkles size={28} color="#4ade80" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#4ade80", fontFamily: "system-ui", marginBottom: 3 }}>
            {botName} is live!
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: "system-ui" }}>
            Your chatbot is ready. Test it or add it to your website using the guide below.
          </div>
        </div>
        <a
          href={botUrl} target="_blank" rel="noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "12px 22px", borderRadius: 12, textDecoration: "none",
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            color: "#fff", fontSize: 13, fontWeight: 700,
            fontFamily: "system-ui", boxShadow: "0 4px 20px rgba(34,197,94,0.35)",
            flexShrink: 0, transition: "all 0.2s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px rgba(34,197,94,0.45)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "0 4px 20px rgba(34,197,94,0.35)"; }}
        >
          <ExternalLink size={14} /> Test Your Bot →
        </a>
      </div>

      {/* Direct link */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: "0.15em", fontFamily: "'Orbitron',monospace", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Link size={12} color={C.indigo} /> SHAREABLE LINK
        </div>
        <div style={{
          display: "flex", gap: 10, alignItems: "center",
          background: "rgba(0,0,0,0.35)", border: `1px solid ${C.border}`,
          borderRadius: 12, padding: "12px 16px",
        }}>
          <span style={{ flex: 1, fontSize: 13, color: "#94a3b8", fontFamily: "system-ui", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {botUrl}
          </span>
          <BigCopyBtn copied={copiedLink} onClick={() => copy(botUrl, setCopiedLink)} label="Copy Link" />
        </div>
        <p style={{ fontSize: 12, color: C.dim, fontFamily: "system-ui", marginTop: 8, lineHeight: 1.6 }}>
          Share this link with customers or on social media — they can chat with your bot directly.
        </p>
      </div>

      {/* Install guide */}
      <InstallGuide
        platform={platform}
        setPlatform={setPlatform}
        steps={steps}
        snippet={snippet}
        copiedCode={copiedCode}
        onCopyCode={() => copy(snippet, setCopiedCode)}
      />

      <style>{globalCSS}</style>
    </div>
  );
}

// ── Shared install guide (platform tabs + steps + code) ──────────────────────
function InstallGuide({ platform, setPlatform, steps, snippet, copiedCode, onCopyCode }) {
  return (
    <div style={{
      background: "rgba(99,102,241,0.05)",
      border: `1px solid rgba(99,102,241,0.18)`,
      borderRadius: 16, padding: "20px 22px",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: C.text, fontFamily: "system-ui", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <FileCode size={14} color={C.indigo} /> Add to your website
      </div>
      <div style={{ fontSize: 12, color: C.muted, fontFamily: "system-ui", marginBottom: 18 }}>
        Pick your website platform and follow the steps — no coding knowledge needed.
      </div>

      {/* Platform tabs */}
      <div style={{
        display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22,
      }}>
        {PLATFORMS.map(p => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            style={{
              padding: "8px 14px", borderRadius: 10, cursor: "pointer",
              background: platform === p.id
                ? "linear-gradient(135deg,#3b82f6,#6366f1)"
                : "rgba(255,255,255,0.04)",
              border: platform === p.id
                ? "none"
                : `1px solid ${C.border}`,
              color: platform === p.id ? "#fff" : C.muted,
              fontSize: 12, fontFamily: "system-ui", fontWeight: 600,
              boxShadow: platform === p.id ? "0 4px 14px rgba(99,102,241,0.35)" : "none",
              transition: "all 0.18s",
              display: "flex", alignItems: "center", gap: 6,
            }}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <ol style={{ listStyle: "none", marginBottom: 22, display: "flex", flexDirection: "column", gap: 10, padding: 0 }}>
        {steps.map((step, i) => (
          <li key={i} style={{
            display: "flex", gap: 12, alignItems: "flex-start",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
              background: "rgba(99,102,241,0.15)",
              border: "1px solid rgba(99,102,241,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#a5b4fc",
              fontFamily: "'Orbitron',monospace",
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: "#cbd5e1", fontFamily: "system-ui", lineHeight: 1.65, paddingTop: 4 }}>
              {step.text}
            </span>
          </li>
        ))}
      </ol>

      {/* Code snippet + big copy button */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 11, color: C.muted, fontFamily: "system-ui", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Code size={13} color={C.indigo} /> <strong style={{ color: C.text }}>Copy this code</strong> and paste it where the instructions above say:
        </div>
        <div style={{
          background: "rgba(0,0,0,0.5)", border: `1px solid rgba(99,102,241,0.25)`,
          borderRadius: 12, overflow: "hidden",
        }}>
          {/* Code display */}
          <div style={{
            padding: "14px 18px",
            fontFamily: "'Courier New', Courier, monospace",
            fontSize: 13, color: "#a5b4fc", lineHeight: 1.6,
            overflowX: "auto", whiteSpace: "nowrap",
            borderBottom: `1px solid rgba(99,102,241,0.15)`,
          }}>
            {snippet}
          </div>
          {/* Copy bar */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 18px", gap: 12, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 11, color: C.dim, fontFamily: "system-ui" }}>
              {copiedCode ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#22c55e" }}>
                  <Check size={12} /> Copied to clipboard!
                </span>
              ) : (
                "Click the button to copy the embed snippet"
              )}
            </span>
            <button
              onClick={onCopyCode}
              style={{
                padding: "10px 24px", borderRadius: 10, cursor: "pointer",
                background: copiedCode
                  ? "linear-gradient(135deg,#22c55e,#16a34a)"
                  : "linear-gradient(135deg,#3b82f6,#6366f1)",
                border: "none", color: "#fff",
                fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
                fontFamily: "system-ui",
                boxShadow: copiedCode
                  ? "0 4px 16px rgba(34,197,94,0.4)"
                  : "0 4px 16px rgba(99,102,241,0.4)",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 7,
              }}
            >
              {copiedCode ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Code</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small copy button (compact mode) ─────────────────────────────────────────
function smallCopyBtn(active, isCode = false) {
  return {
    padding: "8px 14px", borderRadius: 10, cursor: "pointer",
    background: active
      ? "rgba(34,197,94,0.12)"
      : isCode ? "rgba(99,102,241,0.1)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${active ? "rgba(34,197,94,0.4)" : isCode ? "rgba(99,102,241,0.3)" : C.border}`,
    color: active ? "#4ade80" : isCode ? "#a5b4fc" : C.muted,
    fontSize: 12, fontWeight: 600, fontFamily: "system-ui",
    transition: "all 0.2s", whiteSpace: "nowrap",
    display: "inline-flex", alignItems: "center", gap: 5,
  };
}

// ── Big copy button (full mode) ───────────────────────────────────────────────
function BigCopyBtn({ copied, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 20px", borderRadius: 10, cursor: "pointer", flexShrink: 0,
        background: copied
          ? "linear-gradient(135deg,#22c55e,#16a34a)"
          : "rgba(99,102,241,0.15)",
        border: `1px solid ${copied ? "rgba(34,197,94,0.5)" : "rgba(99,102,241,0.35)"}`,
        color: copied ? "#fff" : "#a5b4fc",
        fontSize: 12, fontWeight: 700, fontFamily: "system-ui",
        boxShadow: copied ? "0 4px 14px rgba(34,197,94,0.3)" : "none",
        transition: "all 0.2s",
        display: "flex", alignItems: "center", gap: 6,
      }}
    >
      {copied ? <><Check size={13} /> Copied!</> : <><Copy size={13} /> {label}</>}
    </button>
  );
}
