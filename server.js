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
const fs = require('fs');
const JWT_SECRET = process.env.JWT_SECRET || 'axxon_secret_jwt_key_2026';

// Gemini AI initialization with @google/genai SDK
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_MODEL   = 'gemini-3.6-flash';

const aiClient = GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

async function askGemini(systemPrompt, chatHistory, userMessage) {
  if (!GEMINI_API_KEY || !aiClient) return null;
  try {
    const contents = [
      { role: 'user',  parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'Understood. I will only answer using the FAQ knowledge base provided.' }] },
      ...chatHistory,
      { role: 'user',  parts: [{ text: userMessage }] },
    ];
    const resp = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents,
    });
    return resp.text?.trim() || null;
  } catch (err) {
    console.error('askGemini SDK error:', err.message);
    return null;
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── FIRESTORE CLOUD DATABASE ──────────────────────────────────────────────────
let firestoreDb = null;
try {
  const { initializeApp, getApps } = require('firebase/app');
  const { getFirestore } = require('firebase/firestore');
  const fbConfigPath = path.join(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(fbConfigPath)) {
    const fbConfig = JSON.parse(fs.readFileSync(fbConfigPath, 'utf8'));
    const fbApp = getApps().length === 0 ? initializeApp(fbConfig) : getApps()[0];
    firestoreDb = getFirestore(fbApp, fbConfig.firestoreDatabaseId);
    console.log('[Firebase] Firestore initialized on database:', fbConfig.firestoreDatabaseId);
  }
} catch (fbErr) {
  console.warn('[Firebase] Firestore init warning:', fbErr.message);
}

const PRIMARY_ADMIN_EMAIL = 'distinctstarschoolsdevices@gmail.com';

async function syncUserToFirestore(userObj) {
  if (!firestoreDb || !userObj || !userObj.email) return;
  try {
    const { doc, setDoc } = require('firebase/firestore');
    const docId = String(userObj.email).toLowerCase().trim();
    await setDoc(doc(firestoreDb, 'users', docId), {
      id: userObj.id,
      email: userObj.email,
      email_verified: !!userObj.email_verified,
      plan: userObj.plan || 'free',
      bot_allowance: Number(userObj.bot_allowance) || 0,
      message_allowance: Number(userObj.message_allowance) || 0,
      plan_expires_at: userObj.plan_expires_at ? new Date(userObj.plan_expires_at).toISOString() : null,
      currency: userObj.currency || 'USD',
      created_at: userObj.created_at ? new Date(userObj.created_at).toISOString() : new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error('syncUserToFirestore error:', err.message);
  }
}

async function fetchFirestoreUsers() {
  if (!firestoreDb) return [];
  try {
    const { collection, getDocs } = require('firebase/firestore');
    const snap = await getDocs(collection(firestoreDb, 'users'));
    const list = [];
    snap.forEach(d => {
      const data = d.data();
      if (data && data.email) list.push(data);
    });
    return list;
  } catch (err) {
    console.error('fetchFirestoreUsers error:', err.message);
    return [];
  }
}

// ─── DATABASE ─────────────────────────────────────────────────────────────────
let pool;
let isUsingMemDb = false;

const STORAGE_DIR = path.join(__dirname, 'data');
const STORAGE_FILE = path.join(STORAGE_DIR, 'persistent_storage.json');

if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {}
}

async function saveDiskStorage() {
  if (!isUsingMemDb || !pool) return;
  try {
    const usersRes = await pool.query('SELECT * FROM users');
    const settingsRes = await pool.query('SELECT * FROM admin_settings');
    const paymentsRes = await pool.query('SELECT * FROM payments');
    const botsRes = await pool.query('SELECT * FROM bots');
    const chatLogsRes = await pool.query('SELECT * FROM chat_logs');

    const dump = {
      users: usersRes.rows || [],
      admin_settings: settingsRes.rows || [],
      payments: paymentsRes.rows || [],
      bots: botsRes.rows || [],
      chat_logs: chatLogsRes.rows || [],
      updatedAt: new Date().toISOString()
    };

    fs.writeFileSync(STORAGE_FILE, JSON.stringify(dump, null, 2), 'utf8');
  } catch (err) {
    console.error('Disk storage save error:', err.message);
  }
}

async function loadDiskStorage() {
  if (!isUsingMemDb || !pool) return;
  if (!fs.existsSync(STORAGE_FILE)) return;
  try {
    const dataRaw = fs.readFileSync(STORAGE_FILE, 'utf8');
    const dump = JSON.parse(dataRaw);
    
    if (dump.users && Array.isArray(dump.users)) {
      for (const u of dump.users) {
        await pool.query(`
          INSERT INTO users (id, email, password_hash, email_verified, otp_code, otp_expires_at, plan, bot_allowance, message_allowance, plan_expires_at, renewal_type, currency, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            password_hash = EXCLUDED.password_hash,
            email_verified = EXCLUDED.email_verified,
            otp_code = EXCLUDED.otp_code,
            otp_expires_at = EXCLUDED.otp_expires_at,
            plan = EXCLUDED.plan,
            bot_allowance = EXCLUDED.bot_allowance,
            message_allowance = EXCLUDED.message_allowance,
            plan_expires_at = EXCLUDED.plan_expires_at,
            renewal_type = EXCLUDED.renewal_type,
            currency = EXCLUDED.currency
        `, [u.id, u.email, u.password_hash, u.email_verified, u.otp_code, u.otp_expires_at, u.plan, u.bot_allowance, u.message_allowance, u.plan_expires_at, u.renewal_type, u.currency || 'USD', u.created_at || new Date()]);
      }
    }

    if (dump.admin_settings && Array.isArray(dump.admin_settings)) {
      for (const s of dump.admin_settings) {
        await pool.query(`
          INSERT INTO admin_settings (key, value)
          VALUES ($1, $2)
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `, [s.key, s.value]);
      }
    }

    if (dump.payments && Array.isArray(dump.payments)) {
      for (const p of dump.payments) {
        await pool.query(`
          INSERT INTO payments (id, user_id, plan, currency, amount_usd, crypto_amount, payment_address, order_id, status, renewal_type, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO UPDATE SET
            status = EXCLUDED.status,
            renewal_type = EXCLUDED.renewal_type
        `, [p.id, p.user_id, p.plan, p.currency, p.amount_usd, p.crypto_amount, p.payment_address, p.order_id, p.status, p.renewal_type, p.created_at || new Date()]);
      }
    }

    if (dump.bots && Array.isArray(dump.bots)) {
      for (const b of dump.bots) {
        const faqsJson = typeof b.faqs === 'string' ? b.faqs : JSON.stringify(b.faqs || []);
        await pool.query(`
          INSERT INTO bots (id, owner_id, name, website, faqs, fallback_contact, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            website = EXCLUDED.website,
            faqs = EXCLUDED.faqs,
            fallback_contact = EXCLUDED.fallback_contact
        `, [b.id, b.owner_id, b.name, b.website || '', faqsJson, b.fallback_contact || '', b.created_at || new Date()]);
      }
    }

    if (dump.chat_logs && Array.isArray(dump.chat_logs)) {
      for (const cl of dump.chat_logs) {
        await pool.query(`
          INSERT INTO chat_logs (id, bot_id, question, matched, created_at)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO NOTHING
        `, [cl.id, cl.bot_id, cl.question, cl.matched, cl.created_at || new Date()]);
      }
    }

    console.log('Persistent independent disk storage restored successfully.');
  } catch (err) {
    console.error('Disk storage load error:', err.message);
  }
}

function createPgMemPool() {
  console.log('Initializing persistent independent storage fallback (pg-mem + local disk JSON)...');
  isUsingMemDb = true;
  const { newDb } = require('pg-mem');
  const db = newDb();
  
  db.public.registerFunction({
    name: 'now',
    returns: db.public.getType('timestamp with time zone') || db.public.getType('timestamp'),
    implementation: () => new Date(),
  });

  const pgAdapter = db.adapters.createPg();
  const memPool = new pgAdapter.Pool();

  const originalQuery = memPool.query.bind(memPool);
  memPool.query = async function(...args) {
    const res = await originalQuery(...args);
    const sql = typeof args[0] === 'string' ? args[0] : (args[0]?.text || '');
    if (/^\s*(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE|REPLACE)/i.test(sql)) {
      setTimeout(() => { saveDiskStorage().catch(() => {}); }, 100);
    }
    return res;
  };

  return memPool;
}

async function initDB() {
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('supabase.co')) {
    let testPool;
    try {
      console.log('Connecting to DATABASE_URL...');
      testPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        connectionTimeoutMillis: 3000
      });
      testPool.on('error', () => {});
      await testPool.query('SELECT 1');
      pool = testPool;
      console.log('Connected to external database.');
    } catch (err) {
      if (testPool) {
        testPool.end().catch(() => {});
      }
      console.log('Database URL unavailable. Using embedded persistent storage database.');
      pool = createPgMemPool();
    }
  } else {
    console.log('Using embedded persistent storage database.');
    pool = createPgMemPool();
  }

  try {
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
        currency TEXT DEFAULT 'USD',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';`);
    } catch (e) {}
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
    await pool.query(`
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
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bots (
        id TEXT PRIMARY KEY,
        owner_id INT REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        website TEXT DEFAULT '',
        faqs JSONB DEFAULT '[]',
        fallback_contact TEXT DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_logs (
        id SERIAL PRIMARY KEY,
        bot_id TEXT REFERENCES bots(id) ON DELETE CASCADE,
        question TEXT NOT NULL,
        matched BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_logs_bot_id ON chat_logs(bot_id);`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_chat_logs_created ON chat_logs(bot_id, created_at DESC);`);
    } catch (e) {}

    const defaultSettings = [
      ['admin_password', '2712'],
      ['telegram', '@Wanfortindustries'],
      ['x', ''],
      ['farcaster', ''],
      ['linkedin', ''],
      ['github', ''],
      ['tiktok', ''],
      ['discord', '']
    ];
    for (const [key, value] of defaultSettings) {
      try {
        await pool.query(`INSERT INTO admin_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING;`, [key, value]);
      } catch (e) {
        try {
          const res = await pool.query(`SELECT key FROM admin_settings WHERE key = $1`, [key]);
          if (!res.rows || res.rows.length === 0) {
            await pool.query(`INSERT INTO admin_settings (key, value) VALUES ($1, $2)`, [key, value]);
          }
        } catch (e2) {}
      }
    }

    if (isUsingMemDb) {
      await loadDiskStorage();
    }

    // Ensure primary user exists and is verified in both SQL and Firestore
    try {
      const checkPrimary = await pool.query('SELECT id, email_verified, plan FROM users WHERE LOWER(email)=$1', [PRIMARY_ADMIN_EMAIL.toLowerCase()]);
      if (checkPrimary.rows.length === 0) {
        const defaultHash = await bcrypt.hash('2712', 10);
        const ins = await pool.query(`
          INSERT INTO users (email, password_hash, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency)
          VALUES ($1, $2, TRUE, 'ultra', 999, 999999999, NOW() + INTERVAL '10 years', 'USD')
          RETURNING *
        `, [PRIMARY_ADMIN_EMAIL.toLowerCase(), defaultHash]);
        console.log('[Database] Seeded primary user:', PRIMARY_ADMIN_EMAIL);
        if (ins.rows[0]) {
          await syncUserToFirestore(ins.rows[0]);
          await saveDiskStorage();
        }
      } else {
        if (!checkPrimary.rows[0].email_verified) {
          await pool.query('UPDATE users SET email_verified=TRUE WHERE id=$1', [checkPrimary.rows[0].id]);
          await saveDiskStorage();
        }
        const row = (await pool.query('SELECT * FROM users WHERE id=$1', [checkPrimary.rows[0].id])).rows[0];
        if (row) await syncUserToFirestore(row);
      }
    } catch (e) {
      console.warn('[Database] Primary user seeding warning:', e.message);
    }

    console.log('[Database] Database initialized');
  } catch (err) {
    console.warn('[Database] Database initialization warning:', err.message);
  }
}
initDB().catch(console.error);

// ─── EMAIL & SMS OTP DELIVERY PIPELINE ─────────────────────────────────────────
const ADMIN_EMAIL = process.env.GMAIL_USER || process.env.SMTP_USER;

/**
 * Creates a Nodemailer transporter with given host/port configuration.
 */
function createSmtpTransporter(options) {
  return nodemailer.createTransport({
    host: options.host,
    port: options.port,
    secure: options.secure,
    auth: {
      user: options.user,
      pass: options.pass,
    },
    tls: {
      rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });
}

/**
 * Sends an email using configured SMTP options (custom SMTP or Gmail) with port fallback.
 */
async function sendEmail(to, subject, html) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : null;
  const fromEmail = process.env.SMTP_FROM || smtpUser;

  if (!smtpUser || !smtpPass) {
    console.warn(`[OTP Email] SMTP credentials not set (GMAIL_USER/GMAIL_APP_PASSWORD or SMTP_USER/SMTP_PASS missing). Skipping email dispatch to ${to}.`);
    return false;
  }

  // Attempt 1: Port 587 (TLS/STARTTLS) - standard for container firewalls
  const primaryHost = smtpHost || 'smtp.gmail.com';
  const primaryPort = smtpPort || 587;
  const primarySecure = smtpPort === 465 ? true : false;

  try {
    const transporter = createSmtpTransporter({
      host: primaryHost,
      port: primaryPort,
      secure: primarySecure,
      user: smtpUser,
      pass: smtpPass,
    });

    await transporter.sendMail({
      from: `"Axxon OS" <${fromEmail}>`,
      to,
      subject,
      html,
    });
    console.log(`[OTP Email] Successfully sent email to ${to} via ${primaryHost}:${primaryPort}`);
    return true;
  } catch (err1) {
    console.warn(`[OTP Email] Primary dispatch attempt (${primaryHost}:${primaryPort}) failed: ${err1.message}`);

    // Attempt 2: Fallback to Port 465 (SSL) if primary was 587, or Port 587 if primary was 465
    const fallbackPort = primaryPort === 587 ? 465 : 587;
    const fallbackSecure = fallbackPort === 465;

    try {
      const fallbackTransporter = createSmtpTransporter({
        host: primaryHost,
        port: fallbackPort,
        secure: fallbackSecure,
        user: smtpUser,
        pass: smtpPass,
      });

      await fallbackTransporter.sendMail({
        from: `"Axxon OS" <${fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`[OTP Email] Fallback dispatch succeeded for ${to} via ${primaryHost}:${fallbackPort}`);
      return true;
    } catch (err2) {
      console.error(`[OTP Email] All email dispatch attempts failed for ${to}: ${err2.message}`);
      return false;
    }
  }
}

/**
 * Sends an SMS message using Twilio or a custom SMS webhook/API if configured.
 */
async function sendSMS(toPhone, message) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  const smsApiUrl = process.env.SMS_API_URL;
  const smsApiKey = process.env.SMS_API_KEY;

  if (accountSid && authToken && fromPhone) {
    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', toPhone);
      params.append('From', fromPhone);
      params.append('Body', message);

      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        params.toString(),
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      if (response.status === 201 || response.status === 200) {
        console.log(`[OTP SMS] Sent SMS to ${toPhone} via Twilio`);
        return true;
      }
    } catch (err) {
      console.error(`[OTP SMS] Twilio dispatch failed for ${toPhone}:`, err.response?.data || err.message);
    }
  }

  if (smsApiUrl) {
    try {
      await axios.post(smsApiUrl, {
        to: toPhone,
        message: message,
        apiKey: smsApiKey
      }, { timeout: 10000 });
      console.log(`[OTP SMS] Sent SMS to ${toPhone} via custom SMS gateway`);
      return true;
    } catch (err) {
      console.error(`[OTP SMS] Custom SMS gateway failed for ${toPhone}:`, err.message);
    }
  }

  console.warn(`⚠️ [OTP SMS] No active SMS gateway configured (TWILIO or SMS_API_URL). Skipping SMS to ${toPhone}.`);
  return false;
}

/**
 * Dispatches OTP via Email and/or SMS depending on recipient type and configuration.
 */
async function dispatchOTP({ email, phone, otp }) {
  const emailPromise = email ? sendEmail(
    email,
    'Your Axxon Verification Code',
    `<div style="background:#000;color:#fff;font-family:monospace;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
      <h1 style="color:#3b82f6;letter-spacing:4px;font-size:28px;">AXXON OS</h1>
      <p style="color:#94a3b8;margin:20px 0 8px;">Your one-time verification code:</p>
      <h2 style="font-size:52px;letter-spacing:14px;color:#60a5fa;margin:24px 0;text-align:center;">${otp}</h2>
      <p style="color:#475569;font-size:13px;">This code expires in 10 minutes. Do not share it with anyone.</p>
      <hr style="border-color:#1e293b;margin:24px 0;"/>
      <p style="color:#334155;font-size:11px;">Axxon OS — Enterprise AI Chatbot Platform</p>
    </div>`
  ) : Promise.resolve(false);

  const smsPromise = (phone || (email && /^\+?[0-9\s\-()]{7,15}$/.test(email))) ? sendSMS(
    phone || email,
    `Your Axxon OS verification code is: ${otp}. Valid for 10 minutes.`
  ) : Promise.resolve(false);

  const [emailSent, smsSent] = await Promise.all([emailPromise, smsPromise]);
  return { emailSent, smsSent };
}

async function notifyAdmin(subject, html) {
  if (ADMIN_EMAIL) {
    await sendEmail(ADMIN_EMAIL, subject, html);
  }
}

// ─── PLAN CONFIG ──────────────────────────────────────────────────────────────
const DEFAULT_PLAN_CONFIG = {
  starter: { price: 34,   bots: 1,         messages: 3000,        days: 30,   label: 'Starter' },
  basic:   { price: 100,  bots: 2,         messages: 5000,        days: 7,    label: 'Basic' },
  spark: { price: 300,   bots: 6,         messages: 50000,       days: 30,   label: 'Spark' },
  super: { price: 700,   bots: 20,        messages: 200000,      days: 30,   label: 'Super' },
  king:  { price: 4000,  bots: 999,       messages: 20000000,    days: 365,  label: 'King'  },
  ultra: { price: 20000, bots: 999,       messages: 999999999,   days: 36500,label: 'Ultra' },
};

async function getPlanConfig() {
  const config = JSON.parse(JSON.stringify(DEFAULT_PLAN_CONFIG));
  try {
    const result = await pool.query(
      "SELECT key, value FROM admin_settings WHERE key LIKE 'price_%'"
    );
    result.rows.forEach(r => {
      const planKey = r.key.replace('price_', '');
      if (config[planKey] && r.value !== null && r.value !== '') {
        const parsed = parseFloat(r.value);
        if (!isNaN(parsed) && parsed >= 0) {
          config[planKey].price = parsed;
        }
      }
    });
  } catch (err) {
    // fallback to defaults
  }
  return config;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────────

// SIGNUP — save user, send OTP, wait for verification
app.post('/api/auth/signup', async (req, res) => {
  const rawEmail = req.body.email || '';
  const email = String(rawEmail).toLowerCase().trim();
  const password = req.body.password;
  const currency = req.body.currency;

  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const userCurrency = (currency || 'USD').toUpperCase();
  try {
    const existing = await pool.query('SELECT id, email_verified FROM users WHERE LOWER(email)=$1', [email]);

    if (existing.rows.length && existing.rows[0].email_verified) {
      return res.status(409).json({ error: 'Email already registered. Please log in.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    if (existing.rows.length && !existing.rows[0].email_verified) {
      // Unverified user — update credentials and issue fresh OTP
      await pool.query(
        `UPDATE users SET password_hash=$1, otp_code=$2, otp_expires_at=$3, currency=$4 WHERE LOWER(email)=$5`,
        [hash, otp, expires, userCurrency, email]
      );
    } else {
      // New user — insert as unverified with safe calculated next ID
      const nextIdRes = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users');
      const nextId = nextIdRes.rows[0].next_id;
      await pool.query(
        `INSERT INTO users (id, email, password_hash, otp_code, otp_expires_at, email_verified, currency)
         VALUES ($1,$2,$3,$4,$5,FALSE,$6)`,
        [nextId, email, hash, otp, expires, userCurrency]
      );
    }

    // Dispatch OTP via Email and SMS pipeline
    let dispatchResult = { emailSent: false, smsSent: false };
    try {
      dispatchResult = await dispatchOTP({ email, phone: req.body.phone, otp });
    } catch (dispatchErr) {
      console.error('OTP dispatch failed:', dispatchErr.message);
    }

    const deliveryMethod = dispatchResult.smsSent && dispatchResult.emailSent
      ? 'email and SMS'
      : dispatchResult.smsSent
      ? 'SMS'
      : dispatchResult.emailSent
      ? 'email'
      : null;

    console.log(`[AXXON OTP] Created for ${email}: ${otp} (Email: ${dispatchResult.emailSent}, SMS: ${dispatchResult.smsSent})`);

    // Admin alert — fire-and-forget
    notifyAdmin(
      '[Axxon] New User Sign-up',
      `<div style="font-family:monospace;background:#000;color:#fff;padding:32px;border-radius:12px;">
        <h2 style="color:#3b82f6;">New User Registered</h2>
        <table style="margin-top:16px;color:#94a3b8;width:100%;border-collapse:collapse;">
          <tr><td style="padding:6px 0;">Email:</td><td style="color:#fff;">${email}</td></tr>
          <tr><td style="padding:6px 0;">Currency:</td><td style="color:#60a5fa;">${userCurrency}</td></tr>
          <tr><td style="padding:6px 0;">OTP:</td><td style="color:#60a5fa;">${otp}</td></tr>
          <tr><td style="padding:6px 0;">Time:</td><td style="color:#fff;">${new Date().toUTCString()}</td></tr>
          <tr><td style="padding:6px 0;">Status:</td><td style="color:#f59e0b;">Pending OTP Verification</td></tr>
        </table>
      </div>`
    ).catch(err => console.error('Admin signup alert failed:', err.message));

    res.json({
      message: deliveryMethod
        ? `Verification code sent to your ${deliveryMethod}. Valid for 10 minutes.`
        : 'Verification code generated! (Use code below to complete verification)',
      emailSent: dispatchResult.emailSent,
      smsSent: dispatchResult.smsSent,
      devOtp: otp,
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Signup failed. Please try again.' });
  }
});

// RESEND OTP
app.post('/api/auth/resend-otp', async (req, res) => {
  const rawEmail = req.body.email || '';
  const email = String(rawEmail).toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    const result = await pool.query('SELECT id, email_verified FROM users WHERE LOWER(email)=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'No account found for this email' });
    if (user.email_verified) return res.status(400).json({ error: 'Account already verified. Please log in.' });

    const otp = generateOTP();
    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await pool.query(
      'UPDATE users SET otp_code=$1, otp_expires_at=$2 WHERE LOWER(email)=$3',
      [otp, expires, email]
    );

    let dispatchResult = { emailSent: false, smsSent: false };
    try {
      dispatchResult = await dispatchOTP({ email, phone: req.body.phone, otp });
    } catch (e) {
      console.error('Resend dispatch error:', e.message);
    }

    const deliveryMethod = dispatchResult.smsSent && dispatchResult.emailSent
      ? 'email and SMS'
      : dispatchResult.smsSent
      ? 'SMS'
      : dispatchResult.emailSent
      ? 'email'
      : null;

    console.log(`[AXXON OTP RESEND] Generated for ${email}: ${otp} (Email: ${dispatchResult.emailSent}, SMS: ${dispatchResult.smsSent})`);

    res.json({
      message: deliveryMethod ? `New verification code sent to your ${deliveryMethod}.` : 'New verification code generated.',
      emailSent: dispatchResult.emailSent,
      smsSent: dispatchResult.smsSent,
      devOtp: otp,
    });
  } catch (err) {
    console.error('Resend OTP error:', err);
    res.status(500).json({ error: 'Failed to resend code. Please try again.' });
  }
});

// VERIFY OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  const rawEmail = req.body.email || '';
  const email = String(rawEmail).toLowerCase().trim();
  const rawOtp = req.body.otp || '';
  const otp = String(rawOtp).trim();

  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'Account not found. Please sign up again.' });

    const storedOtp = String(user.otp_code || '').trim();
    if (!storedOtp || storedOtp !== otp) {
      return res.status(400).json({ error: 'Invalid verification code. Please check and try again.' });
    }

    if (user.otp_expires_at && new Date() > new Date(user.otp_expires_at)) {
      return res.status(400).json({ error: 'Verification code expired. Please click Resend Code.' });
    }

    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const updRes = await pool.query(
      `UPDATE users SET email_verified=TRUE, otp_code=NULL, otp_expires_at=NULL,
       plan='trial', bot_allowance=2, message_allowance=5000, plan_expires_at=$1
       WHERE LOWER(email)=$2
       RETURNING *`,
      [trialExpires, email]
    );

    if (updRes.rows[0]) {
      await syncUserToFirestore(updRes.rows[0]);
      await saveDiskStorage();
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      plan: 'trial',
      bot_allowance: 2,
      currency: user.currency || 'USD',
      message: 'Email verified! You have a 3-day free trial with 2 bots.'
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  const rawEmail = req.body.email || '';
  const email = String(rawEmail).toLowerCase().trim();
  const password = req.body.password;
  try {
    const result = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.email_verified) return res.status(403).json({ error: 'Please verify your email code first.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, plan: user.plan, bot_allowance: user.bot_allowance, currency: user.currency || 'USD' });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// ME — fetch live user profile
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, plan, bot_allowance, message_allowance, plan_expires_at, currency FROM users WHERE id=$1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    const u = result.rows[0];
    res.json({ ...u, currency: u.currency || 'USD' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// UPDATE USER CURRENCY PREFERENCE
app.post('/api/user/update-currency', authMiddleware, async (req, res) => {
  const { currency } = req.body;
  if (!currency) return res.status(400).json({ error: 'Currency required' });
  try {
    const cleanCur = String(currency).trim().toUpperCase();
    await pool.query('UPDATE users SET currency=$1 WHERE id=$2', [cleanCur, req.user.id]);
    res.json({ message: 'Currency updated successfully', currency: cleanCur });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update currency' });
  }
});

// ─── USER TRIAL & PLANS ────────────────────────────────────────────────────────
app.get('/api/plans', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const config = await getPlanConfig();
    const markupRes = await pool.query("SELECT value FROM admin_settings WHERE key='currency_markup'");
    const markupPercent = parseFloat(markupRes.rows[0]?.value) || 15;
    res.json({ plans: config, markup_percent: markupPercent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plan config' });
  }
});

app.post('/api/user/claim-trial', authMiddleware, async (req, res) => {
  try {
    const userRes = await pool.query('SELECT id, plan FROM users WHERE id=$1', [req.user.id]);
    const user = userRes.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    await pool.query(
      `UPDATE users SET plan='trial', bot_allowance=2, message_allowance=5000, plan_expires_at=$1 WHERE id=$2`,
      [trialExpires, req.user.id]
    );

    res.json({
      message: '3-Day Free Trial activated. You now have 2 Bots and 5,000 Messages for 3 days.',
      plan: 'trial',
      bot_allowance: 2,
      message_allowance: 5000,
      plan_expires_at: trialExpires,
    });
  } catch (err) {
    console.error('Claim trial error:', err);
    res.status(500).json({ error: 'Failed to activate trial' });
  }
});

// ─── PAYMENT ROUTES ────────────────────────────────────────────────────────────

// INITIALIZE PAYMENT
app.post('/api/payments/initialize', authMiddleware, async (req, res) => {
  const { plan, currency, renewal_type } = req.body;
  const allConfigs = await getPlanConfig();
  const config = allConfigs[plan];
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

    const allConfigs = await getPlanConfig();
    const config = allConfigs[payment.plan];
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
      `Payment Confirmed — Axxon ${config.label} Plan`,
      `<div style="background:#000;color:#fff;font-family:monospace;padding:40px;border-radius:12px;max-width:480px;margin:0 auto;">
        <h1 style="color:#3b82f6;letter-spacing:4px;font-size:28px;">AXXON OS</h1>
        <h2 style="color:#22c55e;margin:20px 0 16px;">Payment Confirmed</h2>
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
      '[Axxon] New Payment Received',
      `<div style="font-family:monospace;background:#000;color:#fff;padding:32px;border-radius:12px;">
        <h2 style="color:#22c55e;">Payment Received</h2>
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

app.get('/api/admin/prices', async (req, res) => {
  try {
    const config = await getPlanConfig();
    const prices = {};
    for (const key in config) {
      prices[key] = config[key].price;
    }
    const markupRes = await pool.query("SELECT value FROM admin_settings WHERE key='currency_markup'");
    const markupPercent = parseFloat(markupRes.rows[0]?.value) || 15;
    res.json({ prices, markup_percent: markupPercent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plan prices' });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    const config = await getPlanConfig();
    const prices = {};
    for (const key in config) {
      prices[key] = config[key].price;
    }
    const markupRes = await pool.query("SELECT value FROM admin_settings WHERE key='currency_markup'");
    const markupPercent = parseFloat(markupRes.rows[0]?.value) || 15;
    res.json({ plans: config, prices, markup_percent: markupPercent });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

app.post('/api/admin/update-prices', async (req, res) => {
  const { prices, markup_percent } = req.body;
  if (!prices || typeof prices !== 'object') {
    return res.status(400).json({ error: 'Invalid prices payload' });
  }
  try {
    for (const [planKey, priceVal] of Object.entries(prices)) {
      const numVal = parseFloat(priceVal);
      if (!isNaN(numVal) && numVal >= 0) {
        await pool.query(
          'INSERT INTO admin_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2',
          [`price_${planKey}`, String(numVal)]
        );
      }
    }
    if (markup_percent !== undefined && !isNaN(parseFloat(markup_percent))) {
      await pool.query(
        'INSERT INTO admin_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value=$2',
        ['currency_markup', String(parseFloat(markup_percent))]
      );
    }
    res.json({ message: 'Plan prices and currency markup updated successfully' });
  } catch (err) {
    console.error('Update prices error:', err);
    res.status(500).json({ error: 'Failed to update plan prices' });
  }
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
      '[Axxon] Admin Updated Payment Settings',
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
    // 1. Ensure primary admin user is seeded and verified
    const checkPrimary = await pool.query('SELECT id, email_verified FROM users WHERE LOWER(email)=$1', [PRIMARY_ADMIN_EMAIL.toLowerCase()]);
    if (checkPrimary.rows.length === 0) {
      const defaultHash = await bcrypt.hash('2712', 10);
      const seeded = await pool.query(`
        INSERT INTO users (email, password_hash, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency)
        VALUES ($1, $2, TRUE, 'ultra', 999, 999999999, NOW() + INTERVAL '10 years', 'USD')
        RETURNING id, email, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency, created_at
      `, [PRIMARY_ADMIN_EMAIL.toLowerCase(), defaultHash]);
      if (seeded.rows[0]) {
        await syncUserToFirestore(seeded.rows[0]);
        await saveDiskStorage();
      }
    } else if (!checkPrimary.rows[0].email_verified) {
      await pool.query('UPDATE users SET email_verified=TRUE WHERE id=$1', [checkPrimary.rows[0].id]);
      await saveDiskStorage();
    }

    // 2. Fetch all users from SQL DB
    const result = await pool.query(
      `SELECT id, email, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency, created_at
       FROM users ORDER BY created_at DESC`
    );
    let allUsers = result.rows || [];

    // 3. Bidirectional sync with Firestore users
    try {
      const fsUsers = await fetchFirestoreUsers();
      let hasNew = false;
      for (const fsu of fsUsers) {
        if (fsu.email && !allUsers.some(u => u.email.toLowerCase() === fsu.email.toLowerCase())) {
          const fakeHash = await bcrypt.hash('2712', 10);
          const ins = await pool.query(`
            INSERT INTO users (email, password_hash, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, email, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency, created_at
          `, [
            fsu.email.toLowerCase(), fakeHash, fsu.email_verified !== false,
            fsu.plan || 'free', Number(fsu.bot_allowance) || 0, Number(fsu.message_allowance) || 0,
            fsu.plan_expires_at ? new Date(fsu.plan_expires_at) : null,
            fsu.currency || 'USD', fsu.created_at ? new Date(fsu.created_at) : new Date()
          ]);
          if (ins.rows[0]) {
            allUsers.push(ins.rows[0]);
            hasNew = true;
          }
        }
      }
      if (hasNew) await saveDiskStorage();
    } catch (fsErr) {
      console.warn('Firestore user fetch warning:', fsErr.message);
    }

    // Background sync all current users to Firestore
    for (const u of allUsers) {
      syncUserToFirestore(u).catch(() => {});
    }

    res.json(allUsers);
  } catch (err) {
    console.error('Failed to fetch users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/admin/add-user', async (req, res) => {
  const { email, plan, password, currency } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  const cleanEmail = email.toLowerCase().trim();
  const selectedPlan = (plan || 'starter').toLowerCase();
  const userCurrency = currency || 'USD';

  try {
    const existing = await pool.query('SELECT id FROM users WHERE LOWER(email)=$1', [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'A user with this email already exists' });
    }

    const planConfig = await getPlanConfig();
    const cfg = planConfig[selectedPlan] || planConfig['starter'] || { bots: 1, messages: 500, days: 30 };
    const expiresAt = new Date(Date.now() + (cfg.days || 30) * 86400000);
    const hash = await bcrypt.hash(password || '2712', 10);

    const nextIdRes = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM users');
    const nextId = nextIdRes.rows[0].next_id;

    const result = await pool.query(`
      INSERT INTO users (id, email, password_hash, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency)
      VALUES ($1, $2, $3, TRUE, $4, $5, $6, $7, $8)
      RETURNING id, email, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency, created_at
    `, [nextId, cleanEmail, hash, selectedPlan, cfg.bots, cfg.messages, expiresAt, userCurrency]);

    const newUser = result.rows[0];
    await syncUserToFirestore(newUser);
    await saveDiskStorage();

    res.json({ message: `User ${cleanEmail} created successfully with ${selectedPlan.toUpperCase()} plan`, user: newUser });
  } catch (err) {
    console.error('Admin add-user error:', err);
    res.status(500).json({ error: 'Failed to add user: ' + (err.message || String(err)) });
  }
});

app.post('/api/admin/update-user-plan', async (req, res) => {
  const { user_id, plan } = req.body;
  if (!user_id || !plan) {
    return res.status(400).json({ error: 'user_id and plan are required' });
  }
  const selectedPlan = plan.toLowerCase();

  try {
    const planConfig = await getPlanConfig();
    const cfg = planConfig[selectedPlan] || { bots: 1, messages: 500, days: 30 };
    const expiresAt = new Date(Date.now() + (cfg.days || 30) * 86400000);

    const result = await pool.query(`
      UPDATE users
      SET plan=$1, bot_allowance=$2, message_allowance=$3, plan_expires_at=$4
      WHERE id=$5
      RETURNING id, email, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency, created_at
    `, [selectedPlan, cfg.bots, cfg.messages, expiresAt, user_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = result.rows[0];
    await syncUserToFirestore(updatedUser);
    await saveDiskStorage();

    res.json({ message: `User plan updated to ${selectedPlan.toUpperCase()}`, user: updatedUser });
  } catch (err) {
    console.error('Update user plan error:', err);
    res.status(500).json({ error: 'Failed to update user plan' });
  }
});

app.post('/api/admin/verify-user', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    const result = await pool.query(
      `UPDATE users SET email_verified=TRUE, otp_code=NULL, otp_expires_at=NULL WHERE id=$1
       RETURNING id, email, email_verified, plan, bot_allowance, message_allowance, plan_expires_at, currency, created_at`,
      [user_id]
    );
    if (result.rows[0]) {
      await syncUserToFirestore(result.rows[0]);
      await saveDiskStorage();
    }
    res.json({ message: 'User verified successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

app.post('/api/admin/delete-user', async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });
  try {
    const userRes = await pool.query('SELECT email FROM users WHERE id=$1', [user_id]);
    const userEmail = userRes.rows[0]?.email;

    await pool.query('DELETE FROM payments WHERE user_id=$1', [user_id]);
    await pool.query('DELETE FROM users WHERE id=$1', [user_id]);

    if (userEmail && firestoreDb) {
      try {
        const { doc, deleteDoc } = require('firebase/firestore');
        await deleteDoc(doc(firestoreDb, 'users', userEmail.toLowerCase().trim()));
      } catch (e) {}
    }
    await saveDiskStorage();

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

// Universal Search Endpoint (Chat Logs, Bots, FAQs)
app.get('/api/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  const token = req.headers.authorization?.split(' ')[1];
  let userId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch {}
  }

  try {
    let logs = [];
    let matchingBots = [];

    if (query.length > 0) {
      const searchParam = `%${query}%`;

      if (userId) {
        // User's own bot chat logs
        const logsRes = await pool.query(
          `SELECT cl.id, cl.bot_id, cl.question, cl.matched, cl.created_at, b.name AS bot_name
           FROM chat_logs cl
           JOIN bots b ON cl.bot_id = b.id
           WHERE b.owner_id = $1 AND cl.question ILIKE $2
           ORDER BY cl.created_at DESC LIMIT 20`,
          [userId, searchParam]
        );
        logs = logsRes.rows || [];

        // User's own bots and FAQs
        const botsRes = await pool.query(
          `SELECT id, name, website, faqs, fallback_contact, created_at
           FROM bots
           WHERE owner_id = $1 AND (name ILIKE $2 OR website ILIKE $2 OR faqs::text ILIKE $2)
           ORDER BY created_at DESC LIMIT 10`,
          [userId, searchParam]
        );
        matchingBots = (botsRes.rows || []).map(b => {
          const faqs = Array.isArray(b.faqs) ? b.faqs : [];
          const matchedFaqs = faqs.filter(f => 
            (f.q && f.q.toLowerCase().includes(query.toLowerCase())) ||
            (f.a && f.a.toLowerCase().includes(query.toLowerCase()))
          );
          return {
            ...b,
            matchedFaqs
          };
        });
      } else {
        // Public/recent logs preview
        const logsRes = await pool.query(
          `SELECT cl.id, cl.bot_id, cl.question, cl.matched, cl.created_at, b.name AS bot_name
           FROM chat_logs cl
           LEFT JOIN bots b ON cl.bot_id = b.id
           WHERE cl.question ILIKE $1
           ORDER BY cl.created_at DESC LIMIT 15`,
          [searchParam]
        );
        logs = logsRes.rows || [];
      }
    } else if (userId) {
      // Return recent 10 chat logs for this user
      const logsRes = await pool.query(
        `SELECT cl.id, cl.bot_id, cl.question, cl.matched, cl.created_at, b.name AS bot_name
         FROM chat_logs cl
         JOIN bots b ON cl.bot_id = b.id
         WHERE b.owner_id = $1
         ORDER BY cl.created_at DESC LIMIT 10`,
        [userId]
      );
      logs = logsRes.rows || [];
    }

    res.json({
      query,
      logs,
      bots: matchingBots,
    });
  } catch (err) {
    console.error('Search API error:', err.message);
    res.status(500).json({ error: 'Search failed', logs: [], bots: [] });
  }
});

// Fetch recent chat logs for the active user
app.get('/api/chat-logs/recent', authMiddleware, async (req, res) => {
  try {
    const logsRes = await pool.query(
      `SELECT cl.id, cl.bot_id, cl.question, cl.matched, cl.created_at, b.name AS bot_name
       FROM chat_logs cl
       JOIN bots b ON cl.bot_id = b.id
       WHERE b.owner_id = $1
       ORDER BY cl.created_at DESC LIMIT 50`,
      [req.user.id]
    );
    res.json(logsRes.rows || []);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat logs' });
  }
});

// ─── DIRECT GEMINI INTERACTIVE AI CHAT ENDPOINTS ────────────────────────────────

app.post('/api/ai/chat/stream', async (req, res) => {
  const { message, history = [], persona = 'axxon', webSearch = false, temperature = 0.7, simpleMode = false } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let systemInstruction = "You are Axxon AI Assistant, an intelligent, helpful, and friendly AI created for the Axxon OS platform. Provide clear, well-structured, and easy-to-understand responses.";
  if (persona === 'nocode') {
    systemInstruction = "You are a No-Code AI Bot Consultant. Help non-technical business owners, store managers, and creators build, train, and launch AI chatbots step-by-step without writing code. Use simple, friendly, jargon-free English with clear bullet points and action steps.";
  } else if (persona === 'business') {
    systemInstruction = "You are a Business & Sales Growth Advisor. Help store owners, founders, and entrepreneurs write high-converting sales copy, marketing plans, customer acquisition strategies, and pricing models in plain, clear language.";
  } else if (persona === 'support') {
    systemInstruction = "You are a Customer Service & FAQ Specialist. Help business owners write customer-friendly FAQs, welcome greetings, automated refund policy scripts, and polite support templates ready to add to their chatbot.";
  } else if (persona === 'creative') {
    systemInstruction = "You are a Creative Content & Copywriter. Help draft blog posts, email newsletters, social media captions, product descriptions, and engaging announcements.";
  } else if (persona === 'code') {
    systemInstruction = "You are an expert Senior Software Engineer and Systems Architect. Provide clean, efficient, bug-free code examples with helpful comments, explanations, and modern best practices.";
  }

  if (simpleMode) {
    systemInstruction += "\n\nCRITICAL INSTRUCTION FOR NON-DEVELOPER MODE: Explain everything using extremely plain English without technical jargon. Use simple analogies, short paragraphs, and bullet points so anyone can understand immediately.";
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!GEMINI_API_KEY || !aiClient) {
    const errorMsg = "Gemini API key is not configured on the server. Please check your environment variables.";
    res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    return res.end();
  }

  try {
    const formattedContents = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-10).forEach(h => {
        formattedContents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      });
    }
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const config = {
      systemInstruction,
      temperature: Number(temperature) || 0.7,
    };

    if (webSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const responseStream = await aiClient.models.generateContentStream({
      model: GEMINI_MODEL,
      contents: formattedContents,
      config,
    });

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ chunk: chunk.text })}\n\n`);
      }
      const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks && chunks.length > 0) {
        res.write(`data: ${JSON.stringify({ groundingChunks: chunks })}\n\n`);
      }
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error('Gemini stream error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'Stream generation failed' })}\n\n`);
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});

app.post('/api/ai/chat/query', async (req, res) => {
  const { message, history = [], persona = 'axxon', webSearch = false, temperature = 0.7 } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  let systemInstruction = "You are Axxon AI Assistant, an intelligent, helpful, and concise AI created for the Axxon OS platform. Provide accurate, clear, and well-structured responses.";
  if (persona === 'code') {
    systemInstruction = "You are an expert Senior Software Engineer and Systems Architect. Provide clean, efficient, bug-free code examples with helpful comments, explanations, and modern best practices.";
  } else if (persona === 'support') {
    systemInstruction = "You are a friendly, highly empathetic Customer Support Specialist for Axxon OS. Answer user queries concisely, resolve issues patiently, and provide step-by-step guidance.";
  } else if (persona === 'creative') {
    systemInstruction = "You are a Creative Business Strategist and Content Lead. Help users brainstorm innovative ideas, draft compelling copy, analyze market trends, and create growth workflows.";
  }

  if (!GEMINI_API_KEY || !aiClient) {
    return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
  }

  try {
    const formattedContents = [];
    if (Array.isArray(history) && history.length > 0) {
      history.slice(-10).forEach(h => {
        formattedContents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.text }]
        });
      });
    }
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    const config = {
      systemInstruction,
      temperature: Number(temperature) || 0.7,
    };

    if (webSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await aiClient.models.generateContent({
      model: GEMINI_MODEL,
      contents: formattedContents,
      config,
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    res.json({
      reply: response.text || '',
      groundingChunks
    });
  } catch (err) {
    console.error('Gemini query error:', err);
    res.status(500).json({ error: err.message || 'AI response failed' });
  }
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
    <div style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,.06);font-size:10px;letter-spacing:.2em;color:#6366f1;">TOP QUESTIONS THIS WEEK</div>
    <table style="width:100%;border-collapse:collapse;">${topQHtml}</table>
  </div>
  <div style="background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);border-radius:12px;padding:16px 20px;margin-bottom:32px;">
    <div style="font-size:10px;letter-spacing:.2em;color:#ef4444;margin-bottom:6px;">UNMATCHED (AI FALLBACKS)</div>
    <div style="font-size:28px;font-weight:900;color:#fca5a5;">${unmatched.toLocaleString()}</div>
    <div style="font-size:11px;color:#475569;margin-top:4px;">Questions your FAQs didn't directly answer this week. Consider adding more FAQ entries.</div>
  </div>
  <div style="text-align:center;font-size:11px;color:#1e293b;">Powered by AXXON OS — Auto-sent every Monday at 8:00 AM</div>
</div>`;

    await notifyAdmin('[Axxon] Weekly Analytics & Performance Report', html);
    console.log('Weekly analytics report sent');
  } catch (err) {
    console.error('Weekly report failed:', err.message);
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
    res.json({ message: 'Report sent to admin email' });
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

// ─── START & VITE MIDDLEWARE ──────────────────────────────────────────────────
async function startServer() {
  const distIndex = path.join(__dirname, 'dist', 'index.html');
  if (process.env.NODE_ENV !== 'production' || !fs.existsSync(distIndex)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(distIndex);
    });
  }

  // ─── 404 API CATCH-ALL ─────────────────────────────────────────────────────────
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API endpoint not found: ${req.method} ${req.path}` });
  });

  // ─── GLOBAL ERROR HANDLER ─────────────────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    if (req.path.startsWith('/api')) {
      return res.status(500).json({ error: err.message || 'Internal server error' });
    }
    next(err);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\nAxxon server running on port ${PORT}`);
    console.log(`Email service: Gmail SMTP (Nodemailer)`);
    console.log(`Database: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'In-Memory PostgreSQL'}`);
    console.log(`\n`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});

