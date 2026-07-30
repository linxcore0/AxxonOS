# AXXON OS — Enterprise AI Chatbot Platform

Complete SaaS platform for deploying AI chatbots with crypto & card payments, wallet integration, and admin control panel.

## 📦 What's Included

```
axxon/
├── server.js              ← Backend (Node/Express)
├── package.json           ← Dependencies
├── vite.config.js         ← Frontend build config
├── index.html             ← App entry
├── .env.example           ← Environment template
│
├── src/
│   ├── main.jsx
│   ├── AxxonUI.jsx        ← Main app + loading overlay
│   ├── components/
│   │   └── PaymentModal.jsx   ← Full crypto/card checkout
│   └── pages/
│       ├── LandingPage.jsx    ← Hero + 5-plan pricing grid + footer
│       ├── AuthPage.jsx       ← Signup/login + OTP (5 min)
│       ├── Dashboard.jsx      ← User dashboard
│       └── AdminPanel.jsx     ← Admin console (5 tabs)
│
└── public/
    └── widget.js          ← Embeddable chatbot widget
```

## 🚀 Quick Start

### 1. **Setup Environment**
Copy `.env.example` to `.env` and fill in:
```bash
# Crypto Payment Gateway
CRYPTO_API_KEY=your_gateway_api_key
CRYPTO_PUBLIC_KEY=your_public_key
IPN_SECRET=your_ipn_secret

# Email (Gmail SMTP via Nodemailer)
GMAIL_USER=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password

# Database
DATABASE_URL=postgresql://user:password@host:5432/axxon

# App
JWT_SECRET=pick_any_long_random_string
BASE_URL=https://your-replit-url.replit.app
OPENAI_API_KEY=your_openai_key
PORT=3001
```

### 2. **Install & Run**
```bash
npm install

# Terminal 1 — Backend
npm start          # or: node server.js

# Terminal 2 — Frontend
npm run dev        # runs on http://localhost:5173
```

### 3. **Access**
- **Landing Page**: http://localhost:5173
- **Admin Panel**: Click "Axxon is a trademark of Wanfortindustries" at footer → Passcode: `2712`
- **API**: http://localhost:3001

---

## 💳 Payment Features

### 5 Pricing Tiers (Fixed USDT)
| Plan | Price | Duration | Bots | Messages |
|------|-------|----------|------|----------|
| Basic | $100 | 7 days | 2 | 5,000 |
| Spark | $300 | 30 days | 6 | 50,000 |
| Super | $700 | 30 days | 20 | 200,000 |
| King | $4,000 | 1 year | Unlimited | 20M |
| Ultra | $20,000 | Lifetime | Unlimited | Unlimited |

### Payment Methods
1. **Cryptocurrency** — BTC, ETH, SOL, USDT
   - Wallet connect to major exchanges (Coinbase, Binance, Phantom, etc.)
   - Auto-fills payment details
   - Smart swap of other cryptos if balance insufficient
   - Auto-renew option saves wallet for future upgrades
   
2. **Card/Fiat** — USD, EUR, GBP, NGN, etc.
   - Uses admin-configured gateway API per plan
   - Real-time currency conversion
   - One-off or auto-renew

---

## 🛠️ Admin Panel (5 Tabs)

**Access**: Footer link → Passcode `2712`

### 1. 💳 **Payments**
- Add Card/Fiat gateway API key for each plan
- Clients paying with cards use these keys

### 2. 🔐 **Wallets**
- Input your BTC, ETH, SOL, USDT wallet addresses
- Clients paying crypto send funds here
- Auto-sync with live market rates

### 3. 🤖 **My Chatbot**
- Create free admin chatbot (no plan required)
- Train with FAQs, deploy on your website
- Full FAQ editor built-in

### 4. 🔗 **Socials**
- Telegram, WhatsApp, Instagram handles
- Powers chatbot "Talk to Live Agent" button
- Displays as footer social icons

### 5. 🔒 **Security**
- Update master passcode

---

## 📧 Email Notifications

Admin receives emails at `axxonofficial@gmail.com` for:
- ✉️ New user signup
- 💰 Payment confirmed (crypto or card)
- ⚙️ Admin settings updated

---

## 🤖 User Features

### Signup/Login
- Email + password signup
- 6-digit OTP verification (5 min expiry)
- Email verified status required to login

### Dashboard
- Display plan, bot allowance, message limit
- Track active bots, conversations, handoffs
- Upgrade prompt if on free tier

### Chatbot Creation
- Create up to plan-allowed bots
- Each bot can be for different websites or same site
- Train with FAQs
- Embed via script tag: `<script src="https://your-url.com/widget.js" data-bot-id="id"></script>`

### Widget
- Floating chat button
- AI responses from FAQs
- Fallback to "[TRIGGER_HUMAN_HANDOFF]" → Shows "Talk to Live Agent" button
- Routes to admin's Telegram/WhatsApp/Instagram

---

## 📝 Database Schema

```sql
-- Users
CREATE TABLE users (
  id, email, password_hash, email_verified, otp_code, otp_expires_at,
  plan, bot_allowance, message_allowance, plan_expires_at, renewal_type, created_at
);

-- Payments
CREATE TABLE payments (
  id, user_id, plan, currency, amount_usd, crypto_amount,
  payment_address, order_id, status, renewal_type, created_at
);

-- Admin Settings
CREATE TABLE admin_settings (
  key (api_basic, api_spark, wallet_USDT, etc.), value
);
```

---

## 🔌 API Routes

### Auth
- `POST /api/auth/signup` — Register + send OTP
- `POST /api/auth/verify-otp` — Verify email code
- `POST /api/auth/login` — Login (requires verified email)

### Payments
- `POST /api/payments/initialize` — Start crypto checkout
- `POST /api/payments/ipn` — Webhook for payment confirmation
- `POST /api/payments/card` — Card/fiat checkout

### Admin
- `POST /api/admin/update-password` — Change passcode
- `POST /api/admin/update-socials` — Update contact links
- `POST /api/admin/update-payments` — Save APIs & wallets
- `POST /api/admin/create-bot` — Create free admin bot
- `GET /api/admin/socials` — Get social links
- `GET /api/admin/wallets` — Get crypto addresses

### Chat
- `POST /api/chat` — Send message to chatbot

---

## 🎨 Branding

- **Loading Overlay**: "AXXON OS // Made by Ahmad" (animated)
- **Logo**: Gradient blue-indigo text, tracked spacing
- **Footer**: Social icons + hidden admin link
- **Colors**: Black (#000), electric blue (#3b82f6), deep indigo (#6366f1)

---

## 🚨 Important Notes

1. **OTP Expiry**: Set to 5 minutes in `server.js` line with `10 * 60 * 1000`
2. **Email Credentials**: Use Gmail App Password (not regular Gmail password)
3. **Database**: PostgreSQL required
4. **Crypto**: Integrates with NOWPayments.io (update to your gateway in `server.js`)
5. **Auto-Renew**: Saves renewal choice to profile, skips wallet selection on next upgrade

---

## 📱 Deployment

### Replit
1. Upload all files
2. Set Secrets: `CRYPTO_API_KEY`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `DATABASE_URL`, `JWT_SECRET`, `BASE_URL`, `OPENAI_API_KEY`
3. Run `npm install && npm start`
4. Frontend will auto-build on http://localhost:5173

### Production
- Use PostgreSQL managed database
- Set `BASE_URL` to production domain
- Enable HTTPS
- Update payment gateway to production mode

---

## 🆘 Troubleshooting

**Blank page on load?**
- Check browser console for errors
- Ensure `npm run dev` is running (frontend)
- Ensure `npm start` is running (backend)

**OTP not arriving?**
- Check `GMAIL_USER` and `GMAIL_APP_PASSWORD` are set in Replit Secrets
- Must be a 16-character Google App Password (not your regular Gmail password)
- Check spam folder

**Payments not working?**
- Verify CRYPTO_API_KEY and IPN_SECRET
- Check IPN webhook URL in gateway settings
- Ensure BASE_URL is correct and accessible

---

**Version**: 1.0.0  
**Created**: 2024  
**Made by**: Ahmad  
**Powered by**: Axxon OS
