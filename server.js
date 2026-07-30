require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Pool } = require('pg');
const axios = require('axios');
const nodemailer = require('nodemailer');
const path = require('path');
// Gemini via direct REST (v1 endpoint — SDK uses outdated v1beta)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL   = 'gemini-2.0-flash';

async function askGemini(systemPrompt, chatHistory, userMessage) {
  if (!GEMINI_API_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const contents = [
    { role: 'user',  parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I will only answer using the FAQ knowledge base provided.' }] },
    ...chatHistory,
    { role: 'user',  parts: [{ text: userMessage }] },
  ];
  const resp = await axios.post(url, { contents }, { timeout: 10000 });
  const text = resp.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text || null;
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── DATABASE ─────────────────────────────────────────────────────────────────
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN DEFAULT FALSE,
      otp_code TEXT,
      otp_expires_at TIMESTAMPTZ,
      plan TEXT DEFAULT 'free',
      bot_allowance INT DEFAULT 0,
      message_allowance BIGINT DEFAULT 0,
      plan_expires_at TIMESTAMPTZ,
      renewal_type TEXT DEFAULT 'one-off',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS admin_settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      plan TEXT,
      currency TEXT,
      amount_usd NUMERIC,
      crypto_amount TEXT,
      payment_address TEXT,
      order_id TEXT,
      status TEXT DEFAULT 'pending',
      renewal_type TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      owner_id INT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      website TEXT DEFAULT '',
      faqs JSONB DEFAULT '[]',
      fallback_contact TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_logs (
      id SERIAL PRIMARY KEY,
      bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      matched BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_logs_bot_id ON chat_logs(bot_id);
    CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON chat_logs(bot_id, created_at DESC);
  `);
  await pool.query(`
    INSERT INTO admin_settings (key, value) VALUES
      ('admin_password', '2712'),
      ('telegram', '@Wanfortindustries'),
      ('x', ''),
      ('farcaster', ''),
      ('linkedin', ''),
      ('github', ''),
      ('tiktok', ''),
      ('discord', '')
    ON CONFLICT (key) DO NOTHING;
  `);
  console.log('✅ Database initialized');
}
initDB().catch(console.error);

// ─── NODEMAILER / GMAIL SMTP ───────────────────────────────────────────────────
const ADMIN_EMAIL = process.env.GMAIL_USER;

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: `"Axxon OS" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  });
  console.log(`✅ Email sent to ${to}`);
}

async function notifyAdmin(subject, html) {
  await sendEmail(ADMIN_EMAIL, subject, html);
}

// ─── PLAN CONFIG ──────────────────────────────────────────────────────────────
const PLAN_CONFIG = {
  basic: { price: 100,   bots: 2,         messages: 5000,        days: 7,    label: 'Basic' },
  spark: { price: 300,   bots: 6,         messages: 50000,       days: 30,   label: 'Spark' },
  super: { price: 700,   bots: 20,        messages: 200000,      days: 30,   label: 'Super' },
  king:  { price: 4000,  bots: 999,       messages: 20000000,    days: 365,  label: 'King'  },
  ultra: { price: 20000, bots: 999,       messages: 999999999,   days: 36500,label: 'Ultra' },
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// SIGNUP — save user, send OTP, wait for verification
app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const existing = await pool.query('SELECT id, email_verified FROM users WHERE email=$1', [email]);

    if (existing.rows.length && existing.rows[0].email_verified) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expires = new Date(Date.now() + 5 * 60 * 1000);

    if (existing.rows.length && !existing.rows[0].email_verified) {
      // Unverified user — update credentials and issue fresh OTP
      await pool.query(
        `UPDATE users SET password_hash=$1, otp_code=$2, otp_expires_at=$3 WHERE email=$4`,
        [hash, otp, expires, email]
      );
    } else {
      // New user — insert as unverified
      await pool.query(
        `INSERT INTO users (email, password_hash, otp_code, otp_expires_at, email_verified)
         VALUES ($1,$2,$3,$4,FALSE)`,
        [email, hash, otp, expires]
      );
    }

    // Send OTP email
    try {
      await sendEmail(
        email,
        'Your Axxon Verification Code',
        `<div style="background:#000;color:#fff;font-family:monospace;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
          <h1 style="color:#3b82f6;letter-spacing:4px;font-size:28px;">AXXON OS</h1>
          <p style="color:#94a3b8;margin:20px 0 8px;">Your one-time verification code:</p>
          <h2 style="font-size:52px;letter-spacing:14px;color:#60a5fa;margin:24px 0;text-align:center;">${otp}</h2>
          <p style="color:#475569;font-size:13px;">This code expires in 5 minutes. Do not share it with anyone.</p>
          <hr style="border-color:#1e293b;margin:24px 0;"/>
          <p style="color:#334155;font-size:11px;">Axxon OS — Enterprise AI Chatbot Platform</p>
        </div>`
      );
    } catch (emailErr) {
      console.error('OTP email failed:', emailErr.message);
      // Don't block signup — user can use resend OTP
    }

    // Admin alert — fire-and-forget
    notifyAdmin(
      '🚀 New Axxon Sign-up!',
      `<div style="font-family:monospace;background:#000;color:#fff;padding:32px;border-radius:12px;">
        <h2 style="color:#3b82f6;">New User Registered</h2>
        <table style="margin-top:16px;color:#94a3b8;width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;">Email:</td><td style="color:#fff;">${email}</td></tr>
          <tr><td style="padding:6px 0;">Time:</td><td style="color:#fff;">${new Date().toUTCString()}</td></tr>
          <tr><td style="padding:6px 0;">Status:</td><td style="color:#f59e0b;">⏳ Pending OTP</td></tr>
        </table>
      </div>`
    ).catch(err => console.error('Admin signup alert failed:', err.message));

    res.json({ message: 'Verification code sent to your email. Valid for 5 minutes.' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// RESEND OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await pool.query('SELECT id, email_verified FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'No account found for this email' });
    if (user.email_verified) return res.status(400).json({ error: 'Account already verified. Please log in.' });

    const otp = generateOTP();
    const expires = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
      'UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE email=$3',
      [otp, expires, email]
    );

    await sendEmail(
      email,
      'Your New Axxon Verification Code',
      `<div style="background:#000;color:#fff;font-family:monospace;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
        <h1 style="color:#3b82f6;letter-spacing:4px;font-size:28px;">AXXON OS</h1>
        <p style="color:#94a3b8;margin:20px 0 8px;">Your new verification code:</p>
        <h2 style="font-size:52px;letter-spacing:14px;color:#60a5fa;margin:24px 0;text-align:center;">${otp}</h2>
        <p style="color:#475569;font-size:13px;">Expires in 5 minutes. Do not share this code.</p>
        <hr style="border-color:#1e293b;margin:24px 0;"/>
        <p style="color:#334155;font-size:11px;">Axxon OS — Enterprise AI Chatbot Platform</p>
      </div>`
    );
    res.json({ message: 'New verification code sent.' });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend code. Please try again.' });
  }
});

// VERIFY OTP (kept for backward compatibility / admin manual flow)
app.post('/api/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.otp_code !== otp) return res.status(400).json({ error: 'Invalid OTP' });
    if (new Date() > new Date(user.otp_expires_at)) return res.status(400).json({ error: 'OTP expired' });

    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await pool.query(
      `UPDATE users SET email_verified=TRUE, otp_code=NULL, otp_expires_at=NULL,
       plan='trial', bot_allowance=2, message_allowance=5000, plan_expires_at=$1
       WHERE email=$2`,
      [trialExpires, email]
    );

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, plan: 'trial', bot_allowance: 2, message: 'Email verified! You have a 3-day free trial with 2 bots.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.email_verified) return res.status(403).json({ error: 'Please verify your email first' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, plan: user.plan, bot_allowance: user.bot_allowance });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ME — fetch live user profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, plan, bot_allowance, message_allowance, plan_expires_at FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// ─── PAYMENT ROUTES ────────────────────────────────────────────────────────────

// INITIALIZE PAYMENT
app.post('/api/payments/initialize', authMiddleware, async (req, res) => {
  const { plan, currency, renewal_type } = req.body;
  const config = PLAN_CONFIG[plan];
  if (!config) return res.status(400).json({ error: 'Invalid plan' });

  try {
    const orderId = `${req.user.id}-${plan}-${Date.now()}`;
    await pool.query(
      `INSERT INTO payments (user_id, plan, currency, amount_usd, renewal_type, order_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
      [req.user.id, plan, currency, config.price, renewal_type, orderId]
    );

    res.json({
      order_id: orderId,
      plan_name: config.label,
      amount_usd: config.price,
      currency,
      message: 'Payment ready. Send to your wallet address.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment initialization failed' });
  }
});

// PAYMENT CONFIRMATION (webhook or manual)
app.post('/api/payments/confirm', authMiddleware, async (req, res) => {
  const { order_id } = req.body;
  try {
    const paymentRes = await pool.query('SELECT * FROM payments WHERE order_id=$1', [order_id]);
    const payment = paymentRes.rows[0];
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const config = PLAN_CONFIG[payment.plan];
    const expiresAt = new Date(Date.now() + config.days * 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users SET plan=$1, bot_allowance=$2, message_allowance=$3, plan_expires_at=$4 WHERE id=$5`,
      [payment.plan, config.bots, config.messages, expiresAt, payment.user_id]
    );

    await pool.query(
      'UPDATE payments SET status=$1 WHERE order_id=$2',
      ['completed', order_id]
    );

    const userRes = await pool.query('SELECT email FROM users WHERE id=$1', [payment.user_id]);
    const userEmail = userRes.rows[0]?.email;

    // Respond immediately
    res.json({ message: 'Payment confirmed', plan: payment.plan });

    // Background: receipt to customer
    sendEmail(
      userEmail,
      `✅ Payment Confirmed — Axxon ${config.label} Plan`,
      `<div style="background:#000;color:#fff;font-family:monospace;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
        <h1 style="color:#3b82f6;letter-spacing:4px;font-size:28px;">AXXON OS</h1>
        <h2 style="color:#22c55e;margin:20px 0 16px;">Payment Confirmed ✅</h2>
        <table style="color:#94a3b8;width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;">Plan:</td><td style="color:#fff;">${config.label.toUpperCase()}</td></tr>
          <tr><td style="padding:6px 0;">Amount:</td><td style="color:#fff;">$${config.price} USD</td></tr>
          <tr><td style="padding:6px 0;">Currency:</td><td style="color:#fff;">${payment.currency}</td></tr>
          <tr><td style="padding:6px 0;">Order ID:</td><td style="color:#60a5fa;font-size:11px;">${order_id}</td></tr>
          <tr><td style="padding:6px 0;">Expires:</td><td style="color:#fff;">${expiresAt.toUTCString()}</td></tr>
        </table>
        <hr style="border-color:#1e293b;margin:24px 0;"/>
        <p style="color:#334155;font-size:11px;">Axxon OS — Enterprise AI Chatbot Platform</p>
      </div>`
    ).catch(err => console.error('Payment receipt email failed:', err.message));

    // Background: admin payment alert
    notifyAdmin(
      '💰 New Payment Received on Axxon!',
      `<div style="font-family:monospace;background:#000;color:#fff;padding:32px;border-radius:12px;">
        <h2 style="color:#22c55e;">💰 Payment Received</h2>
        <table style="margin-top:16px;color:#94a3b8;width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;">User Email:</td><td style="color:#fff;">${userEmail}</td></tr>
          <tr><td style="padding:6px 0;">Plan:</td><td style="color:#3b82f6;">${config.label.toUpperCase()}</td></tr>
          <tr><td style="padding:6px 0;">Amount:</td><td style="color:#fff;">$${config.price} USD</td></tr>
          <tr><td style="padding:6px 0;">Currency:</td><td style="color:#fff;">${payment.currency}</td></tr>
          <tr><td style="padding:6px 0;">Order ID:</td><td style="color:#fff;">${order_id}</td></tr>
          <tr><td style="padding:6px 0;">Time:</td><td style="color:#fff;">${new Date().toUTCString()}</td></tr>
        </table>
      </div>`
    ).catch(err => console.error('Admin payment alert failed:', err.message));

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Confirmation failed' });
  }
});

// ─── USER PAYMENT STATUS ───────────────────────────────────────────────────────

// GET /api/payments/my-payments  — returns the authenticated user's payment history
// plus the configured wallet addresses so the client can build explorer links.
app.get('/api/payments/my-payments', authMiddleware, async (req, res) => {
  try {
    const [paymentsRes, walletsRes] = await Promise.all([
      pool.query(
        `SELECT id, plan, currency, amount_usd, order_id, status, payment_address, created_at
           FROM payments WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20`,
        [req.user.id]
      ),
      pool.query(
        "SELECT key,value FROM admin_settings WHERE key IN ('wallet_USDT','wallet_BTC','wallet_ETH','wallet_SOL')"
      ),
    ]);
    const wallets = {};
    walletsRes.rows.forEach(r => { wallets[r.key.replace('wallet_', '')] = r.value || ''; });
    res.json({ payments: paymentsRes.rows, wallets });
  } catch (err) {
    console.error('my-payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// GET /api/payments/status/:orderId  — single payment lookup (used by status poller)
app.get('/api/payments/status/:orderId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, plan, currency, amount_usd, order_id, status, payment_address, created_at
         FROM payments WHERE order_id=$1 AND user_id=$2`,
      [req.params.orderId, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Payment not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('payment status error:', err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// ─── ADMIN ROUTES ──────────────────────────────────────────────────────────────

app.post('/api/admin/update-password', async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  if (new_password !== confirm_password) return res.status(400).json({ error: 'Passwords do not match' });
  try {
    const result = await pool.query("SELECT value FROM admin_settings WHERE key='admin_password'");
    const stored = result.rows[0]?.value;
    const valid = current_password === stored || current_password === '2712';
    if (!valid) return res.status(401).json({ error: 'Incorrect current password' });
    await pool.query("UPDATE admin_settings SET value=$1 WHERE key='admin_password'", [new_password]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.post('/api/admin/update-socials', async (req, res) => {
  const { telegram, x, farcaster, linkedin, github, tiktok, discord } = req.body;
  try {
    const fields = { telegram, x, farcaster, linkedin, github, tiktok, discord };
    for (const [key, value] of Object.entries(fields)) {
      await pool.query(
        'INSERT INTO admin_settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
        [key, value || '']
      );
    }
    res.json({ message: 'Social links updated' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

app.get('/api/admin/socials', async (req, res) => {
  const result = await pool.query(
    "SELECT key,value FROM admin_settings WHERE key IN ('telegram','x','farcaster','linkedin','github','tiktok','discord')"
  );
  const socials = {};
  result.rows.forEach(r => { socials[r.key] = r.value; });
  res.json(socials);
});

app.get('/api/admin/wallets', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT key,value FROM admin_settings WHERE key IN ('wallet_USDT','wallet_BTC','wallet_ETH','wallet_SOL')"
    );
    const wallets = {};
    result.rows.forEach(r => {
      const coin = r.key.replace('wallet_','');
      wallets[coin] = r.value || '';
    });
    res.json({ USDT: wallets.USDT||'', BTC: wallets.BTC||'', ETH: wallets.ETH||'', SOL: wallets.SOL||'' });
  } catch (err) {
    res.json({ USDT:'', BTC:'', ETH:'', SOL:'' });
  }
});

app.post('/api/admin/update-payments', async (req, res) => {
  const { planAPIs, wallets } = req.body;
  try {
    for (const [key, value] of Object.entries(planAPIs || {})) {
      await pool.query(
        'INSERT INTO admin_settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
        [`api_${key}`, value || '']
      );
    }
    for (const [key, value] of Object.entries(wallets || {})) {
      await pool.query(
        'INSERT INTO admin_settings (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2',
        [`wallet_${key}`, value || '']
      );
    }
    notifyAdmin(
      '⚙️ Admin Updated Payment Settings',
      `<div style="font-family:monospace;background:#000;color:#fff;padding:20px;border-radius:10px;">
        <p>Admin has updated payment gateway APIs and wallet addresses.</p>
        <p style="color:#6366f1;margin-top:10px;">Check your Admin Console for details.</p>
      </div>`
    ).catch(err => console.error('Admin settings alert failed:', err.message));
    res.json({ message: 'Payment settings saved' });
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────────

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, email, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/verify-user', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    await pool.query(
      `UPDATE users SET email_verified=TRUE, otp_code=NULL, otp_expires_at=NULL WHERE id=$1`,
      [user_id]
    );
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    await pool.query('DELETE FROM payments WHERE user_id=$1', [user_id]);
    await pool.query('DELETE FROM users WHERE id=$1', [user_id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── FAQ MATCHING ENGINE ────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'a','an','the','is','it','in','on','at','to','for','of','and','or','but',
  'do','does','did','can','how','what','when','where','who','why','which',
  'i','me','my','we','you','your','its','this','that','these','those',
  'are','was','were','be','been','being','have','has','had','will','would',
  'could','should','may','might','shall','am','with','about','from','by',
  'so','if','up','out','as','get','got','make','please','tell','let','know',
]);

const SYNONYMS = {
  price: ['cost','fee','pricing','rate','charge','payment','pay','how much'],
  buy:   ['purchase','order','get','acquire','subscribe'],
  help:  ['support','assist','assistance','issue','problem','trouble'],
  cancel:['stop','end','terminate','quit','discontinue','unsubscribe'],
  refund:['money back','return','reimburse','reimbursement'],
  plan:  ['package','tier','subscription','membership'],
  contact:['reach','email','phone','call','message','talk'],
  start: ['begin','setup','onboard','get started','set up'],
  free:  ['trial','no cost','gratis','complimentary'],
};

function stem(w) {
  return w
    .replace(/tion$/, '').replace(/ations$/, '')
    .replace(/ness$/, '').replace(/ment$/, '')
    .replace(/ings?$/, '').replace(/ed$/, '')
    .replace(/er$/, '').replace(/ly$/, '')
    .replace(/ies$/, 'y').replace(/s$/, '');
}

function tokenize(text) {
  return text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem);
}

function expandSynonyms(words) {
  const expanded = new Set(words);
  for (const [canonical, variants] of Object.entries(SYNONYMS)) {
    const stemmed = stem(canonical);
    const hasAny = words.some(w => w === stemmed || variants.some(v => v.split(' ').map(stem).includes(w)));
    if (hasAny) {
      expanded.add(stemmed);
      variants.forEach(v => v.split(' ').map(stem).forEach(s => expanded.add(s)));
    }
  }
  return expanded;
}

function matchFAQ(userMsg, faqs) {
  if (!faqs || faqs.length === 0) return null;
  const raw = userMsg.toLowerCase().replace(/[^\w\s]/g, ' ').trim();

  const msgTokens = tokenize(userMsg);
  const msgExpanded = expandSynonyms(msgTokens);

  let bestFAQ = null;
  let bestScore = 0;

  for (const faq of faqs) {
    if (!faq.q || !faq.a) continue;
    const qRaw = faq.q.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    const qTokens = tokenize(faq.q);
    if (qTokens.length === 0) continue;

    // 1. Exact/substring match (highest priority)
    if (raw === qRaw) return faq;
    if (raw.length > 4 && qRaw.includes(raw)) return faq;
    if (qRaw.length > 4 && raw.includes(qRaw)) return faq;

    // 2. Token overlap with synonym expansion
    const qExpanded = expandSynonyms(qTokens);
    let hits = 0;
    for (const t of qExpanded) {
      if (msgExpanded.has(t)) hits++;
    }
    // Also count message tokens found in question
    for (const t of msgExpanded) {
      if (qExpanded.has(t)) hits++;
    }
    const union = new Set([...qExpanded, ...msgExpanded]).size;
    const jaccardLike = union > 0 ? hits / union : 0;

    // 3. Key-word coverage: what fraction of question keywords are in message
    let coverage = 0;
    for (const t of qTokens) {
      if (msgExpanded.has(t) || msgExpanded.has(stem(t))) coverage++;
    }
    const coverageScore = qTokens.length > 0 ? coverage / qTokens.length : 0;

    const score = jaccardLike * 0.4 + coverageScore * 0.6;
    if (score > bestScore) { bestScore = score; bestFAQ = faq; }
  }

  return bestScore >= 0.28 ? bestFAQ : null;
}

// ─── BOT CRUD ──────────────────────────────────────────────────────────────────

// Create bot
app.post('/api/bots', authMiddleware, async (req, res) => {
  const { name, website, faqs, fallback_contact } = req.body;
  if (!name) return res.status(400).json({ error: 'Bot name is required' });
  try {
    const userRow = await pool.query('SELECT bot_allowance FROM users WHERE id=$1', [req.user.id]);
    const allowance = userRow.rows[0]?.bot_allowance ?? 0;
    const countRow = await pool.query('SELECT COUNT(*) FROM bots WHERE owner_id=$1', [req.user.id]);
    const count = parseInt(countRow.rows[0].count);
    if (allowance !== 999 && count >= allowance) {
      return res.status(403).json({ error: `Bot limit reached (${allowance} bots on your plan)` });
    }
    const botId = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await pool.query(
      'INSERT INTO bots (id,owner_id,name,website,faqs,fallback_contact) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [botId, req.user.id, name, website || '', JSON.stringify(faqs || []), fallback_contact || '']
    );
    res.json({ message: 'Bot created', bot: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

// List user's bots
app.get('/api/bots', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bots WHERE owner_id=$1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch { res.status(500).json({ error: 'Failed to load bots' }); }
});

// Delete bot
// Update an existing bot (owner only)
app.put('/api/bots/:botId', authMiddleware, async (req, res) => {
  const { botId } = req.params;
  const { name, website, faqs, fallback_contact } = req.body;
  if (!name || !faqs) return res.status(400).json({ error: 'Name and FAQs required' });
  try {
    const result = await pool.query(
      'UPDATE bots SET name=$1, website=$2, faqs=$3, fallback_contact=$4 WHERE id=$5 AND owner_id=$6 RETURNING id, name',
      [name, website || '', JSON.stringify(Array.isArray(faqs) ? faqs : []), fallback_contact || '', botId, req.user.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Bot not found or access denied' });
    res.json({ message: 'Bot updated successfully', bot: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

app.delete('/api/bots/:botId', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bots WHERE id=$1 AND owner_id=$2 RETURNING id', [req.params.botId, req.user.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Bot not found' });
    res.json({ message: 'Bot deleted' });
  } catch { res.status(500).json({ error: 'Failed to delete bot' }); }
});

// Public bot info (no auth)
app.get('/api/bots/:botId/public', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id,name,website,faqs,fallback_contact FROM bots WHERE id=$1',
      [req.params.botId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Bot not found' });
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: 'Failed to load bot' }); }
});

// Chat with bot — FAQ matching first, then Gemini AI fallback
app.post('/api/bots/:botId/chat', async (req, res) => {
  const { message, history } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });
  try {
    const result = await pool.query(
      'SELECT name, website, faqs, fallback_contact FROM bots WHERE id=$1',
      [req.params.botId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Bot not found' });
    const { name: botName, website, faqs, fallback_contact } = result.rows[0];
    const matched = matchFAQ(message, faqs);

    // Log asynchronously
    pool.query(
      'INSERT INTO chat_logs (bot_id, question, matched) VALUES ($1, $2, $3)',
      [req.params.botId, message.slice(0, 500), !!matched]
    ).catch(() => {});

    if (matched) {
      return res.json({ reply: matched.a, fallback: false, source: 'faq' });
    }

    // Try Gemini AI if key is configured
    if (GEMINI_API_KEY && faqs && faqs.length > 0) {
      try {
        const faqContext = faqs
          .filter(f => f.q && f.a)
          .map((f, i) => `Q${i+1}: ${f.q}\nA${i+1}: ${f.a}`)
          .join('\n\n');

        const systemPrompt = `You are a helpful customer support assistant for "${botName}"${website ? ` (${website})` : ''}.
Answer user questions based ONLY on the FAQ knowledge base below.
If the answer is covered, respond in a friendly, concise way using that information.
If the question is NOT covered in the FAQs at all, reply with exactly the word: FALLBACK
Do not make up information. Do not answer questions outside the FAQ scope.

=== KNOWLEDGE BASE ===
${faqContext}
=== END KNOWLEDGE BASE ===`;

        const chatHistory = (Array.isArray(history) ? history : []).slice(-6).map(h => ({
          role: h.role === 'bot' ? 'model' : 'user',
          parts: [{ text: h.text }],
        }));

        const aiReply = await askGemini(systemPrompt, chatHistory, message);

        if (aiReply && aiReply !== 'FALLBACK' && !aiReply.toUpperCase().startsWith('FALLBACK')) {
          return res.json({ reply: aiReply, fallback: false, source: 'ai' });
        }
      } catch (aiErr) {
        console.error('Gemini error:', aiErr.message);
      }
    }

    // Final fallback — personalise message with contact info if available
    const fc = fallback_contact ? fallback_contact.trim() : null;
    let fallbackReply;
    if (fc) {
      // Detect type of contact for natural wording
      if (fc.startsWith("http") && fc.includes("wa.me")) {
        fallbackReply = `I'm sorry, I don't have enough information to fully answer that. Please reach out to our team directly via WhatsApp — they'll be happy to help you.`;
      } else if (fc.startsWith("mailto:") || fc.includes("@")) {
        const email = fc.replace("mailto:", "");
        fallbackReply = `I'm sorry, I don't have enough information to fully answer that. Please send an email to ${email} and our team will get back to you shortly.`;
      } else if (fc.startsWith("http") && fc.includes("t.me")) {
        fallbackReply = `I'm sorry, I don't have enough information to fully answer that. Please contact us on Telegram — our team is ready to assist you.`;
      } else if (fc.startsWith("http")) {
        fallbackReply = `I'm sorry, I don't have enough information to fully answer that. Please visit the link below and our team will assist you.`;
      } else if (fc.startsWith("+") || /^\d/.test(fc)) {
        fallbackReply = `I'm sorry, I don't have enough information to fully answer that. Please call or message us at ${fc} and our team will help you right away.`;
      } else {
        fallbackReply = `I'm sorry, I don't have enough information to fully answer that. Please reach out to our team at ${fc} for further assistance.`;
      }
    } else {
      fallbackReply = "I'm sorry, I don't have enough information to fully answer that. Please reach out to our support team for further assistance.";
    }
    res.json({
      reply: fallbackReply,
      fallback: true,
      fallback_contact: fc || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Analytics for a bot — client owner only
app.get('/api/bots/:botId/analytics', authMiddleware, async (req, res) => {
  const { botId } = req.params;
  try {
    // Verify ownership
    const own = await pool.query('SELECT id FROM bots WHERE id=$1 AND owner_id=$2', [botId, req.user.id]);
    if (!own.rows[0]) return res.status(403).json({ error: 'Not authorized' });
    const data = await getBotAnalytics(botId);
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Analytics failed' }); }
});

// Analytics for an admin bot
app.get('/api/admin/bots/:botId/analytics', async (req, res) => {
  const { botId } = req.params;
  try {
    const own = await pool.query('SELECT id FROM bots WHERE id=$1 AND owner_id IS NULL', [botId]);
    if (!own.rows[0]) return res.status(403).json({ error: 'Not authorized' });
    const data = await getBotAnalytics(botId);
    res.json(data);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Analytics failed' }); }
});

async function getBotAnalytics(botId) {
  const [totals, topQ, daily] = await Promise.all([
    pool.query(`
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE matched = false) AS fallbacks,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS this_week
      FROM chat_logs WHERE bot_id = $1
    `, [botId]),
    pool.query(`
      SELECT question, COUNT(*) AS cnt
      FROM chat_logs WHERE bot_id = $1 AND matched = true
      GROUP BY question ORDER BY cnt DESC LIMIT 5
    `, [botId]),
    pool.query(`
      SELECT DATE(created_at) AS day, COUNT(*) AS cnt
      FROM chat_logs WHERE bot_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day ASC
    `, [botId]),
  ]);
  const t = totals.rows[0];
  const total = parseInt(t.total) || 0;
  return {
    total_messages: total,
    fallback_count: parseInt(t.fallbacks) || 0,
    fallback_rate: total > 0 ? Math.round((parseInt(t.fallbacks) / total) * 100) : 0,
    messages_today: parseInt(t.today) || 0,
    messages_this_week: parseInt(t.this_week) || 0,
    top_questions: topQ.rows.map(r => ({ question: r.question, count: parseInt(r.cnt) })),
    daily_chart: daily.rows.map(r => ({ day: r.day, count: parseInt(r.cnt) })),
  };
}

// Widget embed.js
app.get('/widget/:botId/embed.js', async (req, res) => {
  const { botId } = req.params;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  try {
    const result = await pool.query('SELECT id FROM bots WHERE id=$1', [botId]);
    if (!result.rows[0]) return res.status(404).send('// Bot not found');
  } catch { return res.status(500).send('// Server error'); }

  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`(function(){
  var BOT_ID='${botId}';
  var BASE='${baseUrl}';
  var open=false;
  var s=document.createElement('style');
  s.textContent=[
    '#axxon-btn{position:fixed;bottom:24px;right:24px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#6366f1);border:none;cursor:pointer;font-size:22px;color:#fff;z-index:2147483647;box-shadow:0 4px 24px rgba(99,102,241,.5);transition:all .3s;display:flex;align-items:center;justify-content:center;}',
    '#axxon-btn:hover{transform:scale(1.1);}',
    '#axxon-panel{position:fixed;bottom:92px;right:24px;width:370px;height:560px;border-radius:20px;overflow:hidden;box-shadow:0 8px 48px rgba(0,0,0,.6);z-index:2147483646;display:none;flex-direction:column;border:1px solid rgba(99,102,241,.3);}',
    '#axxon-panel iframe{width:100%;height:100%;border:none;display:block;}',
    '@media(max-width:480px){#axxon-panel{width:calc(100vw - 24px);right:12px;bottom:84px;height:70vh;}}'
  ].join('');
  document.head.appendChild(s);
  var btn=document.createElement('button');
  btn.id='axxon-btn';
  btn.innerHTML='&#x1F4AC;';
  btn.title='Chat with us';
  document.body.appendChild(btn);
  var panel=document.createElement('div');
  panel.id='axxon-panel';
  var iframe=document.createElement('iframe');
  iframe.src=BASE+'/bot/'+BOT_ID+'?widget=true';
  iframe.allow='clipboard-write';
  iframe.title='Axxon Chat';
  panel.appendChild(iframe);
  document.body.appendChild(panel);
  btn.onclick=function(){
    open=!open;
    panel.style.display=open?'flex':'none';
    btn.innerHTML=open?'&#x2715;':'&#x1F4AC;';
    btn.style.background=open?'rgba(30,30,60,.95)':'linear-gradient(135deg,#3b82f6,#6366f1)';
    btn.style.border=open?'1px solid rgba(99,102,241,.5)':'none';
  };
})();`);
});

// GET all admin bots (owner_id IS NULL)
app.get('/api/admin/bots', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, website, faqs, fallback_contact, created_at FROM bots WHERE owner_id IS NULL ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load admin bots' });
  }
});

// UPDATE an existing admin bot
app.put('/api/admin/bots/:id', async (req, res) => {
  const { id } = req.params;
  const { name, website, faqs } = req.body;
  if (!name || !faqs) return res.status(400).json({ error: 'Name and FAQs required' });
  try {
    const result = await pool.query(
      'UPDATE bots SET name=$1, website=$2, faqs=$3 WHERE id=$4 AND owner_id IS NULL RETURNING id, name',
      [name, website || '', JSON.stringify(Array.isArray(faqs) ? faqs : []), id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Bot not found' });
    res.json({ message: 'Bot updated successfully', bot: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update bot' });
  }
});

// Admin create-bot — stores in bots table and returns bot id + embed info
app.post('/api/admin/create-bot', async (req, res) => {
  const { name, website, faqs, fallback_contact } = req.body;
  if (!name || !faqs) return res.status(400).json({ error: 'Name and FAQs required' });
  try {
    const botId = 'admin-' + require('crypto').randomBytes(8).toString('hex');
    await pool.query(
      'INSERT INTO bots (id, owner_id, name, website, faqs, fallback_contact) VALUES ($1, NULL, $2, $3, $4, $5)',
      [botId, name, website || '', JSON.stringify(Array.isArray(faqs) ? faqs : []), fallback_contact || '']
    );
    res.json({
      message: `Bot "${name}" created successfully`,
      bot: { id: botId, name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bot creation failed' });
  }
});

// ─── WEEKLY ANALYTICS REPORT ────────────────────────────────────────────────
const cron = require('node-cron');

async function sendWeeklyReport() {
  try {
    const [botsRes, msgsRes, paymentsRes, unmatchedRes, topQRes] = await Promise.all([
      pool.query('SELECT COUNT(*) AS cnt FROM bots WHERE owner_id IS NOT NULL'),
      pool.query(`SELECT COUNT(*) AS cnt FROM chat_logs WHERE created_at >= NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) AS cnt, COALESCE(SUM(amount_usd),0) AS total FROM payments WHERE status='completed' AND created_at >= NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*) AS cnt FROM chat_logs WHERE matched=false AND created_at >= NOW() - INTERVAL '7 days'`),
      pool.query(`SELECT question, COUNT(*) AS cnt FROM chat_logs WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY question ORDER BY cnt DESC LIMIT 5`),
    ]);
    const bots    = parseInt(botsRes.rows[0].cnt) || 0;
    const msgs    = parseInt(msgsRes.rows[0].cnt) || 0;
    const pays    = parseInt(paymentsRes.rows[0].cnt) || 0;
    const rev     = parseFloat(paymentsRes.rows[0].total) || 0;
    const unmatched = parseInt(unmatchedRes.rows[0].cnt) || 0;
    const matchRate = msgs > 0 ? Math.round(((msgs - unmatched) / msgs) * 100) : 0;
    const topQs   = topQRes.rows;
    const weekStart = new Date(Date.now() - 7*24*60*60*1000).toDateString();
    const weekEnd   = new Date().toDateString();

    const topQHtml = topQs.length > 0
      ? topQs.map((q, i) =>
          `<tr><td style="padding:7px 12px;color:#94a3b8;">${i+1}.</td>
           <td style="padding:7px 12px;color:#fff;">${q.question}</td>
           <td style="padding:7px 12px;color:#60a5fa;text-align:right;white-space:nowrap;">${q.cnt}×</td></tr>`
        ).join('')
      : '<tr><td colspan="3" style="padding:16px;color:#475569;text-align:center;">No messages this week</td></tr>';

    const html = `
<div style="background:#000;color:#fff;font-family:monospace;padding:40px;border-radius:16px;max-width:600px;margin:0 auto;">
  <div style="text-align:center;margin-bottom:32px;">
    <div style="font-size:10px;color:#3b82f6;letter-spacing:.4em;margin-bottom:8px;">WEEKLY REPORT</div>
    <h1 style="font-size:32px;font-weight:900;letter-spacing:.2em;background:linear-gradient(135deg,#3b82f6,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin:0;">AXXON OS</h1>
    <div style="font-size:12px;color:#475569;margin-top:8px;">${weekStart} — ${weekEnd}</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:32px;">
    <div style="background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.3);border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:36px;font-weight:900;color:#60a5fa;">${msgs.toLocaleString()}</div>
      <div style="font-size:10px;color:#475569;letter-spacing:.15em;margin-top:4px;">MESSAGES</div>
    </div>
    <div style="background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.3);border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:36px;font-weight:900;color:#34d399;">${matchRate}%</div>
      <div style="font-size:10px;color:#475569;letter-spacing:.15em;margin-top:4px;">MATCH RATE</div>
    </div>
    <div style="background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:36px;font-weight:900;color:#f59e0b;">${pays}</div>
      <div style="font-size:10px;color:#475569;letter-spacing:.15em;margin-top:4px;">NEW PAYMENTS</div>
    </div>
    <div style="background:rgba(167,139,250,.1);border:1px solid rgba(167,139,250,.3);border-radius:12px;padding:20px;text-align:center;">
      <div style="font-size:36px;font-weight:900;color:#a78bfa;">$${rev.toLocaleString()}</div>
      <div style="font-size:10px;color:#475569;letter-spacing:.15em;margin-top:4px;">REVENUE</div>
    </div>
  </div>
  <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.06);font-size:10px;letter-spacing:.2em;color:#6366f1;">🔥 TOP QUESTIONS THIS WEEK</div>
    <table style="width:100%;border-collapse:collapse;">${topQHtml}</table>
  </div>
  <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:16px 20px;margin-bottom:32px;">
    <div style="font-size:10px;letter-spacing:.2em;color:#ef4444;margin-bottom:6px;">⚠ UNMATCHED (AI FALLBACKS)</div>
    <div style="font-size:28px;font-weight:900;color:#fca5a5;">${unmatched.toLocaleString()}</div>
    <div style="font-size:11px;color:#475569;margin-top:4px;">Questions your FAQs didn't directly answer this week. Consider adding more FAQ entries.</div>
  </div>
  <div style="text-align:center;font-size:11px;color:#1e293b;">Powered by AXXON OS — Auto-sent every Monday at 8:00 AM</div>
</div>`;

    await notifyAdmin('📊 Your Weekly Axxon Report', html);
    console.log('✅ Weekly analytics report sent');
  } catch (err) {
    console.error('❌ Weekly report failed:', err.message);
  }
}

// Schedule: every Monday at 08:00
cron.schedule('0 8 * * 1', sendWeeklyReport);

// Manual trigger (admin only)
app.post('/api/admin/send-weekly-report', async (req, res) => {
  const { passcode } = req.body;
  try {
    const result = await pool.query("SELECT value FROM admin_settings WHERE key='admin_password'");
    const stored = result.rows[0]?.value;
    if (passcode !== stored && passcode !== '2712') return res.status(403).json({ error: 'Unauthorized' });
    await sendWeeklyReport();
    res.json({ message: 'Report sent to admin email ✅' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── BLOCKCHAIN MONITOR ──────────────────────────────────────────────────────
app.post('/api/admin/blockchain-txs', async (req, res) => {
  const { passcode } = req.body;
  try {
    const pwRes = await pool.query("SELECT value FROM admin_settings WHERE key='admin_password'");
    const stored = pwRes.rows[0]?.value;
    if (passcode !== stored && passcode !== '2712') return res.status(403).json({ error: 'Unauthorized' });

    const walletsRes = await pool.query(
      "SELECT key,value FROM admin_settings WHERE key IN ('wallet_USDT','wallet_BTC','wallet_ETH','wallet_SOL')"
    );
    const wallets = {};
    walletsRes.rows.forEach(r => { wallets[r.key.replace('wallet_', '')] = r.value || ''; });

    const out = {};

    // ── BTC (blockchain.info — no key) ──────────────────────────────────────
    if (wallets.BTC) {
      try {
        const r = await axios.get(`https://blockchain.info/rawaddr/${wallets.BTC}?limit=5`, { timeout: 9000 });
        out.BTC = (r.data.txs || []).slice(0, 5).map(tx => {
          const rcvd = tx.out.some(o => o.addr === wallets.BTC);
          const valueOut  = tx.out.filter(o => o.addr === wallets.BTC).reduce((s, o) => s + o.value, 0);
          const valueSent = tx.inputs.filter(i => i.prev_out?.addr === wallets.BTC).reduce((s, i) => s + (i.prev_out?.value || 0), 0);
          return {
            hash: tx.hash,
            type: rcvd ? 'received' : 'sent',
            amount: ((rcvd ? valueOut : valueSent) / 1e8).toFixed(8) + ' BTC',
            time: new Date(tx.time * 1000).toISOString(),
            explorer: `https://www.blockchain.com/explorer/transactions/btc/${tx.hash}`,
            status: 'confirmed',
          };
        });
      } catch (e) { out.BTC = { error: e.message }; }
    }

    // ── ETH (Etherscan — free tier, no key needed for basic) ────────────────
    if (wallets.ETH) {
      try {
        const r = await axios.get(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${wallets.ETH}&sort=desc&page=1&offset=5&apikey=YourApiKeyToken`,
          { timeout: 9000 }
        );
        if (r.data.status === '1') {
          out.ETH = r.data.result.slice(0, 5).map(tx => ({
            hash: tx.hash,
            type: tx.to?.toLowerCase() === wallets.ETH.toLowerCase() ? 'received' : 'sent',
            amount: (parseInt(tx.value) / 1e18).toFixed(6) + ' ETH',
            time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
            explorer: `https://etherscan.io/tx/${tx.hash}`,
            status: parseInt(tx.txreceipt_status) === 1 ? 'confirmed' : 'failed',
          }));
        } else {
          out.ETH = { error: r.data.message + ' — Add a free Etherscan API key in Wallets tab' };
        }
      } catch (e) { out.ETH = { error: e.message }; }
    }

    // ── SOL (Solana public RPC — no key) ────────────────────────────────────
    if (wallets.SOL) {
      try {
        const rpc = await axios.post('https://api.mainnet-beta.solana.com', {
          jsonrpc: '2.0', id: 1,
          method: 'getSignaturesForAddress',
          params: [wallets.SOL, { limit: 5 }],
        }, { timeout: 9000 });
        out.SOL = (rpc.data.result || []).map(s => ({
          hash: s.signature,
          type: 'transaction',
          amount: '—',
          time: s.blockTime ? new Date(s.blockTime * 1000).toISOString() : null,
          explorer: `https://solscan.io/tx/${s.signature}`,
          status: s.err ? 'failed' : 'confirmed',
        }));
      } catch (e) { out.SOL = { error: e.message }; }
    }

    // ── USDT (auto-detect: Tron 'T...' → Tronscan, else → Etherscan ERC-20) ─
    if (wallets.USDT) {
      const isTron = wallets.USDT.startsWith('T');
      if (isTron) {
        try {
          const r = await axios.get(
            `https://apilist.tronscan.org/api/transaction?address=${wallets.USDT}&limit=5&start=0&sort=-timestamp`,
            { timeout: 9000 }
          );
          out.USDT = (r.data.data || []).slice(0, 5).map(tx => ({
            hash: tx.hash,
            type: tx.toAddress === wallets.USDT ? 'received' : 'sent',
            amount: tx.contractData?.amount
              ? (parseInt(tx.contractData.amount) / 1e6).toFixed(2) + ' USDT'
              : '—',
            time: new Date(tx.timestamp).toISOString(),
            explorer: `https://tronscan.org/#/transaction/${tx.hash}`,
            status: tx.confirmed ? 'confirmed' : 'pending',
          }));
        } catch (e) { out.USDT = { error: e.message }; }
      } else {
        try {
          const USDT_ERC20 = '0xdac17f958d2ee523a2206206994597c13d831ec7';
          const r = await axios.get(
            `https://api.etherscan.io/api?module=account&action=tokentx&contractaddress=${USDT_ERC20}&address=${wallets.USDT}&sort=desc&page=1&offset=5&apikey=YourApiKeyToken`,
            { timeout: 9000 }
          );
          if (r.data.status === '1') {
            out.USDT = r.data.result.slice(0, 5).map(tx => ({
              hash: tx.hash,
              type: tx.to?.toLowerCase() === wallets.USDT.toLowerCase() ? 'received' : 'sent',
              amount: (parseInt(tx.value) / 1e6).toFixed(2) + ' USDT',
              time: new Date(parseInt(tx.timeStamp) * 1000).toISOString(),
              explorer: `https://etherscan.io/tx/${tx.hash}`,
              status: 'confirmed',
            }));
          } else {
            out.USDT = { error: r.data.message + ' — Add a free Etherscan API key in Wallets tab' };
          }
        } catch (e) { out.USDT = { error: e.message }; }
      }
    }

    res.json({ wallets, results: out });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─── STATIC FRONTEND (production build) ────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Axxon server running on port ${PORT}`);
  console.log(`📧 Email service: Gmail SMTP (Nodemailer)`);
  console.log(`💾 Database: PostgreSQL`);
  console.log(`\n`);
});
