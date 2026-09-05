/*!
 * Axxon Chatbot Widget
 * Drop this script tag into any website:
 * <script src="https://your-domain.com/widget.js" data-bot-id="YOUR_BOT_ID"></script>
 */
(function () {
  const API = "https://your-api-domain.com"; // Replace with your backend URL
  const botId = document.currentScript?.getAttribute("data-bot-id") || "default";

  // ── STYLES ──────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&display=swap');

    #axxon-widget-btn {
      position: fixed; bottom: 28px; right: 28px; z-index: 99998;
      width: 60px; height: 60px; border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border: none; cursor: pointer;
      box-shadow: 0 4px 24px rgba(99,102,241,0.6), 0 0 0 0 rgba(99,102,241,0.4);
      animation: axxon-pulse 2.5s infinite;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s;
    }
    #axxon-widget-btn:hover { transform: scale(1.08); }
    #axxon-widget-btn svg { width: 26px; height: 26px; fill: #fff; }

    @keyframes axxon-pulse {
      0%   { box-shadow: 0 4px 24px rgba(99,102,241,0.6), 0 0 0 0 rgba(99,102,241,0.4); }
      70%  { box-shadow: 0 4px 24px rgba(99,102,241,0.6), 0 0 0 14px rgba(99,102,241,0); }
      100% { box-shadow: 0 4px 24px rgba(99,102,241,0.6), 0 0 0 0 rgba(99,102,241,0); }
    }

    #axxon-widget-panel {
      position: fixed; bottom: 100px; right: 28px; z-index: 99999;
      width: 370px; max-height: 560px;
      background: rgba(6,6,16,0.97);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(99,102,241,0.25);
      border-radius: 20px;
      box-shadow: 0 8px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.1) inset;
      display: flex; flex-direction: column;
      transform: scale(0.92) translateY(16px);
      opacity: 0; pointer-events: none;
      transition: all 0.28s cubic-bezier(0.34,1.56,0.64,1);
      font-family: system-ui, -apple-system, sans-serif;
    }
    #axxon-widget-panel.open {
      transform: scale(1) translateY(0);
      opacity: 1; pointer-events: all;
    }

    .axxon-header {
      padding: 18px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.06);
      display: flex; align-items: center; gap: 12;
    }
    .axxon-avatar {
      width: 38px; height: 38px; border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Orbitron', monospace; font-size: 11px;
      font-weight: 900; color: #fff; letter-spacing: 0.05em;
      flex-shrink: 0;
    }
    .axxon-header-text { flex: 1; }
    .axxon-header-name {
      font-family: 'Orbitron', monospace; font-size: 12px;
      font-weight: 900; color: #fff; letter-spacing: 0.15em;
    }
    .axxon-header-status {
      font-size: 11px; color: #22c55e; margin-top: 2px;
      display: flex; align-items: center; gap: 5px;
    }
    .axxon-status-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 6px #22c55e;
      animation: axxon-blink 2s infinite;
    }
    @keyframes axxon-blink {
      0%,100% { opacity:1; } 50% { opacity:0.4; }
    }
    .axxon-close {
      background: rgba(255,255,255,0.06); border: none;
      color: #666; width: 28px; height: 28px;
      border-radius: 8px; cursor: pointer; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s;
    }
    .axxon-close:hover { background: rgba(255,255,255,0.12); color: #fff; }

    .axxon-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 12;
      scrollbar-width: thin; scrollbar-color: rgba(99,102,241,0.2) transparent;
    }
    .axxon-messages::-webkit-scrollbar { width: 4px; }
    .axxon-messages::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.2); border-radius: 4px; }

    .axxon-msg {
      display: flex; flex-direction: column; max-width: 82%;
      animation: axxon-msg-in 0.22s ease;
    }
    @keyframes axxon-msg-in {
      from { opacity:0; transform: translateY(8px); }
      to   { opacity:1; transform: translateY(0); }
    }
    .axxon-msg.bot { align-self: flex-start; }
    .axxon-msg.user { align-self: flex-end; }

    .axxon-bubble {
      padding: 11px 14px; border-radius: 14px;
      font-size: 13px; line-height: 1.55; color: #e2e8f0;
    }
    .axxon-msg.bot .axxon-bubble {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      border-bottom-left-radius: 4px;
    }
    .axxon-msg.user .axxon-bubble {
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border-bottom-right-radius: 4px; color: #fff;
    }

    .axxon-suggestions {
      display: flex; flex-wrap: wrap; gap: 7px;
      padding: 4px 0 2px 0;
    }
    .axxon-suggestion-label {
      width: 100%; font-size: 10px; color: #475569;
      letter-spacing: 0.12em; margin-bottom: 2px;
    }
    .axxon-chip {
      background: rgba(99,102,241,0.1);
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 20px; padding: 6px 13px;
      color: #a5b4fc; font-size: 12px; cursor: pointer;
      font-family: system-ui; transition: all 0.18s;
      text-align: left; line-height: 1.4; max-width: 100%;
    }
    .axxon-chip:hover {
      background: rgba(99,102,241,0.22);
      border-color: rgba(99,102,241,0.6);
    }

    .axxon-handoff-btn {
      margin-top: 10px; padding: 10px 16px;
      background: rgba(99,102,241,0.1);
      border: 1px solid rgba(99,102,241,0.4);
      backdrop-filter: blur(8px);
      border-radius: 10px; color: #a5b4fc;
      font-size: 12px; font-weight: 600; cursor: pointer;
      transition: all 0.2s;
      display: flex; align-items: center; gap: 8px;
      width: fit-content;
      box-shadow: 0 0 16px rgba(99,102,241,0.15);
    }
    .axxon-handoff-btn:hover {
      background: rgba(99,102,241,0.2);
      box-shadow: 0 0 24px rgba(99,102,241,0.3);
      transform: translateY(-1px);
    }

    .axxon-typing {
      display: flex; align-items: center; gap: 5px;
      padding: 10px 14px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 14px; border-bottom-left-radius: 4px;
      width: fit-content;
    }
    .axxon-typing span {
      width: 6px; height: 6px; border-radius: 50%; background: #6366f1;
      animation: axxon-bounce 1.2s infinite;
    }
    .axxon-typing span:nth-child(2) { animation-delay: 0.2s; }
    .axxon-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes axxon-bounce {
      0%,60%,100% { transform: translateY(0); opacity:0.4; }
      30% { transform: translateY(-5px); opacity:1; }
    }

    .axxon-input-row {
      padding: 12px 14px;
      border-top: 1px solid rgba(255,255,255,0.06);
      display: flex; gap: 8px; align-items: flex-end;
    }
    .axxon-input {
      flex: 1; background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; padding: 10px 13px;
      color: #fff; font-size: 13px; resize: none;
      outline: none; font-family: inherit;
      min-height: 40px; max-height: 100px;
      transition: border-color 0.2s;
    }
    .axxon-input:focus { border-color: rgba(99,102,241,0.5); }
    .axxon-input::placeholder { color: #334155; }
    .axxon-send {
      width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s, transform 0.2s;
    }
    .axxon-send:hover { opacity: 0.85; transform: scale(1.05); }
    .axxon-send:disabled { opacity: 0.4; cursor: not-allowed; }
    .axxon-send svg { width: 16px; height: 16px; fill: #fff; }

    .axxon-powered {
      text-align: center; padding: 8px;
      font-size: 10px; color: rgba(71,85,105,0.6);
      letter-spacing: 0.05em;
    }
  `;

  // Inject styles
  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── BUILD HTML ───────────────────────────────────────────────────────────────
  const btn = document.createElement("button");
  btn.id = "axxon-widget-btn";
  btn.setAttribute("aria-label", "Open chat");
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

  const panel = document.createElement("div");
  panel.id = "axxon-widget-panel";
  panel.innerHTML = `
    <div class="axxon-header">
      <div class="axxon-avatar">AX</div>
      <div class="axxon-header-text">
        <div class="axxon-header-name">AXXON AI</div>
        <div class="axxon-header-status">
          <span class="axxon-status-dot"></span> Online
        </div>
      </div>
      <button class="axxon-close" id="axxon-close-btn" aria-label="Close chat">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>
    </div>
    <div class="axxon-messages" id="axxon-messages"></div>
    <div class="axxon-input-row">
      <textarea class="axxon-input" id="axxon-input" placeholder="Ask anything..." rows="1"></textarea>
      <button class="axxon-send" id="axxon-send-btn" aria-label="Send">
        <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
      </button>
    </div>
    <div class="axxon-powered">Powered by <strong>AXXON OS</strong></div>
  `;

  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // ── STATE ────────────────────────────────────────────────────────────────────
  let open = false;
  let typing = false;
  let socials = {};
  let botFaqs = [];
  let botName = "Axxon AI";
  let suggestionsShown = false;
  const history = []; // {role, content}

  // Fetch bot data (name + FAQs for suggestions)
  fetch(`${API}/api/bots/${botId}/public`)
    .then(r => r.json())
    .then(d => { botFaqs = Array.isArray(d.faqs) ? d.faqs : []; botName = d.name || "Axxon AI"; })
    .catch(() => {});

  // Fetch social links for handoff routing
  fetch(`${API}/api/admin/socials`)
    .then(r => r.json())
    .then(d => { socials = d; })
    .catch(() => {});

  // ── HELPERS ──────────────────────────────────────────────────────────────────
  const messagesEl = document.getElementById("axxon-messages");
  const inputEl = document.getElementById("axxon-input");
  const sendBtn = document.getElementById("axxon-send-btn");

  function scrollBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, text, showHandoff = false) {
    const wrap = document.createElement("div");
    wrap.className = `axxon-msg ${role}`;

    const bubble = document.createElement("div");
    bubble.className = "axxon-bubble";
    bubble.textContent = text;
    wrap.appendChild(bubble);

    if (showHandoff) {
      const hBtn = document.createElement("button");
      hBtn.className = "axxon-handoff-btn";
      hBtn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> <span>Talk to a Live Agent</span>`;
      hBtn.addEventListener("click", routeToHuman);
      wrap.appendChild(hBtn);
    }

    messagesEl.appendChild(wrap);
    scrollBottom();
    return wrap;
  }

  function showTyping() {
    const wrap = document.createElement("div");
    wrap.className = "axxon-msg bot";
    wrap.id = "axxon-typing-indicator";
    wrap.innerHTML = `<div class="axxon-typing"><span></span><span></span><span></span></div>`;
    messagesEl.appendChild(wrap);
    scrollBottom();
  }

  function removeTyping() {
    document.getElementById("axxon-typing-indicator")?.remove();
  }

  function routeToHuman() {
    let url = "";
    if (socials.telegram) {
      const handle = socials.telegram.replace("@", "");
      url = `https://t.me/${handle}`;
    } else if (socials.whatsapp) {
      const num = socials.whatsapp.replace(/\D/g, "");
      url = `https://wa.me/${num}`;
    } else if (socials.instagram) {
      const handle = socials.instagram.replace("@", "");
      url = `https://instagram.com/${handle}`;
    } else {
      url = "mailto:axxonofficial@gmail.com";
    }
    window.open(url, "_blank");
  }

  // ── SEND MESSAGE ─────────────────────────────────────────────────────────────
  async function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || typing) return;

    inputEl.value = "";
    inputEl.style.height = "auto";
    // Remove suggestion chips on first real send
    const sugEl = document.getElementById("axxon-suggestions");
    if (sugEl) sugEl.remove();
    addMessage("user", text);
    history.push({ role: "user", content: text });

    typing = true;
    sendBtn.disabled = true;
    showTyping();

    try {
      const res = await fetch(`${API}/api/bots/${botId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.slice(-10).map(h => ({ role: h.role === "assistant" ? "bot" : h.role, text: h.content })),
        }),
      });
      const data = await res.json();
      removeTyping();

      let reply = data.reply || "Sorry, I couldn't process that.";
      const isHandoff = reply.includes("[TRIGGER_HUMAN_HANDOFF]");

      // Strip the tag from visible text
      const cleanReply = reply
        .replace("[TRIGGER_HUMAN_HANDOFF]", "")
        .trim();

      addMessage("bot", cleanReply, isHandoff);
      history.push({ role: "assistant", content: cleanReply });

      // Show contact button if bot couldn't answer and contact info is set
      if (data.fallback && data.fallback_contact) {
        const fc = data.fallback_contact.trim();
        let href = fc;
        if (!fc.startsWith("http") && !fc.startsWith("mailto:") && fc.includes("@")) {
          href = `mailto:${fc}`;
        } else if (!fc.startsWith("http") && (fc.startsWith("+") || /^\d/.test(fc))) {
          href = `tel:${fc}`;
        }
        const lastWrap = messagesEl.lastElementChild;
        if (lastWrap) {
          const cBtn = document.createElement("a");
          cBtn.href = href;
          cBtn.target = "_blank";
          cBtn.rel = "noreferrer";
          cBtn.className = "axxon-handoff-btn";
          cBtn.style.cssText = "display:inline-flex;align-items:center;gap:6px;margin-top:8px;text-decoration:none;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;";
          cBtn.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> <span>Contact Support</span>`;
          lastWrap.appendChild(cBtn);
        }
      }
    } catch {
      removeTyping();
      addMessage("bot", "Sorry, I'm having trouble connecting. Please try again.");
    } finally {
      typing = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  // ── EVENT LISTENERS ──────────────────────────────────────────────────────────
  btn.addEventListener("click", () => {
    open = !open;
    panel.classList.toggle("open", open);
    btn.innerHTML = open
      ? `<svg viewBox="0 0 24 24" fill="#fff"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`
      : `<svg viewBox="0 0 24 24" fill="#fff"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

    if (open && messagesEl.children.length === 0) {
      setTimeout(() => {
        addMessage("bot", `Hello! I'm ${botName}. How can I help you today?`);
        // Show suggestion chips after greeting
        if (!suggestionsShown && botFaqs.length > 0) {
          suggestionsShown = true;
          const sugWrap = document.createElement("div");
          sugWrap.id = "axxon-suggestions";
          sugWrap.className = "axxon-suggestions";
          const label = document.createElement("div");
          label.className = "axxon-suggestion-label";
          label.textContent = "SUGGESTED";
          sugWrap.appendChild(label);
          botFaqs.filter(f => f.q).slice(0, 3).forEach(faq => {
            const chip = document.createElement("button");
            chip.className = "axxon-chip";
            chip.textContent = faq.q.length > 55 ? faq.q.slice(0, 55) + "…" : faq.q;
            chip.addEventListener("click", () => {
              const sugEl = document.getElementById("axxon-suggestions");
              if (sugEl) sugEl.remove();
              inputEl.value = faq.q;
              sendMessage();
            });
            sugWrap.appendChild(chip);
          });
          messagesEl.appendChild(sugWrap);
          scrollBottom();
        }
      }, 400);
    }
    if (open) inputEl.focus();
  });

  document.getElementById("axxon-close-btn").addEventListener("click", () => {
    open = false;
    panel.classList.remove("open");
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="#fff"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
  });

  sendBtn.addEventListener("click", sendMessage);

  inputEl.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  inputEl.addEventListener("input", () => {
    inputEl.style.height = "auto";
    inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + "px";
  });

})();
