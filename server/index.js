const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;
const POINTS_PER_DRINK = 10;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.use(cors());
app.use(express.json());

// ─── Users ───────────────────────────────────────────────────────────────────

// Register (or retrieve existing) user
app.post('/api/users/register', (req, res) => {
  try {
    const { phone, name } = req.body;

    if (phone) {
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length < 6) {
        return res.status(400).json({ error: 'Invalid phone number.' });
      }

      const existing = db.prepare('SELECT * FROM users WHERE phone = ? OR id = ?').get(cleaned, cleaned);
      if (existing) {
        return res.json({ user: existing, isNew: false });
      }

      const user = {
        id: cleaned,
        phone: cleaned,
        name: name?.trim() || null,
        points: 0,
        total_redeemed: 0,
        created_at: new Date().toISOString(),
      };
      db.prepare('INSERT INTO users (id, phone, name, points, total_redeemed, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(user.id, user.phone, user.name, user.points, user.total_redeemed, user.created_at);
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
    db.prepare('INSERT INTO users (id, phone, name, points, total_redeemed, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(user.id, user.phone, user.name, user.points, user.total_redeemed, user.created_at);
    return res.status(201).json({ user, isNew: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get user by ID or phone
app.get('/api/users/:id', (req, res) => {
  try {
    const id = req.params.id;
    const user = db.prepare('SELECT * FROM users WHERE id = ? OR phone = ?').get(id, id);
    if (!user) return res.status(404).json({ error: 'Customer not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Get user transactions
app.get('/api/users/:id/transactions', (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'Customer not found.' });
    const transactions = db.prepare(
      'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 30'
    ).all(req.params.id);
    res.json({ transactions });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Points ───────────────────────────────────────────────────────────────────

// Add 1 point (staff action)
app.post('/api/points/add', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const user = db.prepare('SELECT * FROM users WHERE id = ? OR phone = ?').get(userId, userId);
    if (!user) return res.status(404).json({ error: 'Customer not found.' });

    db.prepare('UPDATE users SET points = points + 1 WHERE id = ?').run(user.id);
    db.prepare('INSERT INTO transactions (id, user_id, type, points, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), user.id, 'add', 1, 'Coffee purchase', new Date().toISOString());

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    res.json({ user: updated, message: '1 point added!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Redeem free drink
app.post('/api/points/redeem', (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const user = db.prepare('SELECT * FROM users WHERE id = ? OR phone = ?').get(userId, userId);
    if (!user) return res.status(404).json({ error: 'Customer not found.' });
    if (user.points < POINTS_PER_DRINK) {
      return res.status(400).json({ error: `Need ${POINTS_PER_DRINK} points to redeem. Currently at ${user.points}.` });
    }

    db.prepare('UPDATE users SET points = points - ?, total_redeemed = total_redeemed + 1 WHERE id = ?')
      .run(POINTS_PER_DRINK, user.id);
    db.prepare('INSERT INTO transactions (id, user_id, type, points, note, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), user.id, 'redeem', -POINTS_PER_DRINK, 'Free drink redeemed', new Date().toISOString());

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    res.json({ user: updated, message: '🎉 Free drink redeemed! Enjoy your coffee!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Admin ────────────────────────────────────────────────────────────────────

// Simple password middleware for admin routes
function requireAdmin(req, res, next) {
  const pwd = req.headers['x-admin-password'];
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  next();
}

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    const totalPoints = db.prepare('SELECT COALESCE(SUM(points),0) as t FROM users').get().t;
    const totalRedeemed = db.prepare('SELECT COALESCE(SUM(total_redeemed),0) as t FROM users').get().t;
    const todayAdded = db.prepare(
      "SELECT COUNT(*) as c FROM transactions WHERE type='add' AND date(created_at)=date('now')"
    ).get().c;
    res.json({ totalUsers, totalPoints, totalRedeemed, todayAdded });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const users = db.prepare('SELECT * FROM users ORDER BY points DESC, created_at DESC').all();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// Verify admin password
app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Wrong password.' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`☕  Coffee Points server running on http://localhost:${PORT}`);
});
