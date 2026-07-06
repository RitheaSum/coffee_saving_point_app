const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const POINTS_PER_DRINK = 10;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const STAFF_TOKEN    = process.env.STAFF_TOKEN;

if (!ADMIN_PASSWORD || !STAFF_TOKEN) {
  console.error('FATAL: ADMIN_PASSWORD and STAFF_TOKEN environment variables are required');
  process.exit(1);
}

// CORS — restrict to explicit origin or block cross-origin by default
const CORS_ORIGIN = process.env.CORS_ORIGIN;
app.use(cors(CORS_ORIGIN ? { origin: CORS_ORIGIN } : { origin: false }));

// Trust first proxy (needed for ngrok / reverse proxies so rate-limit works correctly)
app.set('trust proxy', 1);

app.use(express.json({ limit: '16kb' }));

// Rate limiter for auth endpoints (20 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// ─── Auth middleware ───────────────────────────────────────────────────────────

function requireStaff(req, res, next) {
  if (req.headers['x-staff-token'] !== STAFF_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

// ─── Users ───────────────────────────────────────────────────────────────────

// Register (or retrieve existing) user
app.post('/api/users/register', async (req, res) => {
  try {
    const { phone, name } = req.body;

    if (phone) {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length < 6) {
        return res.status(400).json({ error: 'Invalid phone number.' });
      }

      const { rows } = await pool.query('SELECT * FROM users WHERE phone = $1 OR id = $2', [cleaned, cleaned]);
      if (rows[0]) {
        return res.json({ user: rows[0], isNew: false });
      }

      const user = {
        id: cleaned,
        phone: cleaned,
        name: name?.trim() || null,
        points: 0,
        total_redeemed: 0,
        created_at: new Date().toISOString(),
      };
      await pool.query(
        'INSERT INTO users (id, phone, name, points, total_redeemed, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [user.id, user.phone, user.name, user.points, user.total_redeemed, user.created_at]
      );
      return res.status(201).json({ user, isNew: true });
    }

    // Auto-generate ID
    const id = 'CF-' + randomUUID().slice(0, 8).toUpperCase();
    const user = {
      id,
      phone: null,
      name: name?.trim() || null,
      points: 0,
      total_redeemed: 0,
      created_at: new Date().toISOString(),
    };
    await pool.query(
      'INSERT INTO users (id, phone, name, points, total_redeemed, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [user.id, user.phone, user.name, user.points, user.total_redeemed, user.created_at]
    );
    return res.status(201).json({ user, isNew: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Health check (used by Docker healthcheck)
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// Get user by ID or phone
app.get('/api/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 OR phone = $2', [id, id]);
    if (!rows[0]) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ user: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get user transactions
app.get('/api/users/:id/transactions', async (req, res) => {
  try {
    const { rows: userRows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (!userRows[0]) return res.status(404).json({ error: 'Customer not found.' });
    const { rows: transactions } = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30',
      [req.params.id]
    );
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Points ───────────────────────────────────────────────────────────────────

// Add 1 point (staff action — requires staff token)
app.post('/api/points/add', requireStaff, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 OR phone = $2', [userId, userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Customer not found.' });

    await pool.query('UPDATE users SET points = points + 1 WHERE id = $1', [user.id]);
    await pool.query(
      'INSERT INTO transactions (id, user_id, type, points, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [randomUUID(), user.id, 'add', 1, 'Coffee purchase', new Date().toISOString()]
    );

    const { rows: updatedRows } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    res.json({ user: updatedRows[0], message: '1 point added!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Redeem free drink (staff action — requires staff token)
app.post('/api/points/redeem', requireStaff, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1 OR phone = $2', [userId, userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Customer not found.' });
    if (user.points < POINTS_PER_DRINK) {
      return res.status(400).json({ error: `Need ${POINTS_PER_DRINK} points to redeem. Currently at ${user.points}.` });
    }

    await pool.query(
      'UPDATE users SET points = points - $1, total_redeemed = total_redeemed + 1 WHERE id = $2',
      [POINTS_PER_DRINK, user.id]
    );
    await pool.query(
      'INSERT INTO transactions (id, user_id, type, points, note, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
      [randomUUID(), user.id, 'redeem', -POINTS_PER_DRINK, 'Free drink redeemed', new Date().toISOString()]
    );

    const { rows: updatedRows } = await pool.query('SELECT * FROM users WHERE id = $1', [user.id]);
    res.json({ user: updatedRows[0], message: '🎉 Free drink redeemed! Enjoy your coffee!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// Verify admin password
app.post('/api/admin/auth', authLimiter, (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Wrong password.' });
  }
});

// Verify staff token
app.post('/api/staff/auth', authLimiter, (req, res) => {
  const { token } = req.body;
  if (token === STAFF_TOKEN) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Wrong token.' });
  }
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const { rows: [r1] } = await pool.query('SELECT COUNT(*) as c FROM users');
    const { rows: [r2] } = await pool.query('SELECT COALESCE(SUM(points),0) as t FROM users');
    const { rows: [r3] } = await pool.query('SELECT COALESCE(SUM(total_redeemed),0) as t FROM users');
    const { rows: [r4] } = await pool.query(
      "SELECT COUNT(*) as c FROM transactions WHERE type='add' AND created_at::date = CURRENT_DATE"
    );
    res.json({
      totalUsers:    Number(r1.c),
      totalPoints:   Number(r2.t),
      totalRedeemed: Number(r3.t),
      todayAdded:    Number(r4.c),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { rows: users } = await pool.query('SELECT * FROM users ORDER BY points DESC, created_at DESC');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`☕  Coffee Points server running on http://localhost:${PORT}`);
});
