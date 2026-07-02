import { useState, useEffect, useCallback } from 'react';
import { api, User, Transaction } from '../api';
import { StampCard, QRModal, TransactionList } from '../components/CustomerComponents';
import { Footer } from '../components/Footer';

const STORAGE_KEY = 'coffee_user_id';
const POINTS_TO_REDEEM = 10;

type View = 'register' | 'dashboard';

export default function CustomerPage() {
  const [view, setView] = useState<View>('register');
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Form fields
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');

  const loadUser = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    try {
      const { user } = await api.getUser(id);
      setUser(user);
      const { transactions } = await api.getTransactions(id);
      setTransactions(transactions);
      setView('dashboard');
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      setView('register');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedId = localStorage.getItem(STORAGE_KEY);
    if (savedId) loadUser(savedId);
  }, [loadUser]);

  useEffect(() => {
    // Auto-refresh every 10 seconds when on dashboard
    if (view !== 'dashboard' || !user) return;
    const interval = setInterval(() => {
      loadUser(user.id);
    }, 10000);
    return () => clearInterval(interval);
  }, [view, user, loadUser]);

  const handleRegister = async (usePhone: boolean) => {
    setLoading(true);
    setError('');
    try {
      const body = usePhone ? { phone, name } : { name };
      const { user: newUser, isNew } = await api.register(body);
      localStorage.setItem(STORAGE_KEY, newUser.id);
      setUser(newUser);
      const { transactions: txs } = await api.getTransactions(newUser.id);
      setTransactions(txs);
      setView('dashboard');
      setInfo(isNew ? '🎉 Welcome! Your loyalty card is ready.' : '👋 Welcome back!');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setView('register');
    setPhone('');
    setName('');
    setInfo('');
    setError('');
  };

  const handleRefresh = async () => {
    if (!user) return;
    await loadUser(user.id);
  };

  if (loading && !user) {
    return (
      <div className="page">
        <div className="topbar">
          <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
          <h1>My Rewards Card</h1>
        </div>
        <div className="container"><div className="spinner" /></div>
      </div>
    );
  }

  // ── Register / Login view ────────────────────────────────────
  if (view === 'register') {
    return (
      <div className="page">
        <div className="topbar">
          <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
          <h1>Join Rewards</h1>
        </div>
        <div className="container">
          <div className="card">
            <h2 style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 4 }}>
              ☕ Start collecting stamps
            </h2>
            <p className="text-muted mt-8" style={{ marginBottom: 20 }}>
              Buy <strong>10 coffees</strong>, get <strong>1 free</strong>!
            </p>

            <div className="form-group">
              <label>Your Name (optional)</label>
              <input
                type="text"
                placeholder="e.g. Romdoul"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="012xxxxxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegister(true)}
              />
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {info  && <div className="alert alert-success">{info}</div>}

            <button
              className="btn btn-primary mt-12"
              onClick={() => handleRegister(true)}
              disabled={loading || !phone.trim()}
            >
              {loading ? 'Loading…' : '🔍 Register / Log in with Phone'}
            </button>

            <div className="divider mt-16">or</div>

            <button
              className="btn btn-outline"
              onClick={() => handleRegister(false)}
              disabled={loading}
            >
              {loading ? 'Loading…' : '✨ Get an Auto-Generated Card'}
            </button>
          </div>

          <p className="text-muted text-center mt-16" style={{ fontSize: '.8rem' }}>
            No app download needed · Works in your browser
          </p>
        </div>
        <Footer />
      </div>
    );
  }

  // ── Dashboard view ───────────────────────────────────────────
  const canRedeem = (user?.points ?? 0) >= POINTS_TO_REDEEM;

  return (
    <div className="page">
      <div className="topbar">
        <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
        <h1>My Rewards Card</h1>
      </div>

      {user && (
        <div className="user-bar">
          <div className="user-avatar">
            {user.name ? user.name[0].toUpperCase() : '☕'}
          </div>
          <div className="user-info">
            <div className="user-name">{user.name || 'Coffee Lover'}</div>
            <div className="user-id">{user.id}</div>
          </div>
          <button className="btn btn-sm btn-outline" style={{ color: 'white', borderColor: 'rgba(255,255,255,.4)', width: 'auto' }} onClick={handleRefresh}>
            ↻
          </button>
        </div>
      )}

      <div className="container">
        {info && <div className="alert alert-success mt-12">{info}</div>}

        {/* Points hero */}
        <div className="card">
          <div className="points-hero">
            <div className="points-number">{user?.points ?? 0}</div>
            <div className="points-label">stamps collected</div>
          </div>
          <StampCard points={user?.points ?? 0} />
        </div>

        {/* Redeem banner */}
        {canRedeem && (
          <div className="redeem-banner mt-12" style={{ marginTop: 12 }}>
            <div className="redeem-banner-icon">🎁</div>
            <div className="redeem-banner-text">
              <div className="redeem-banner-title">Free drink ready!</div>
              <div className="redeem-banner-sub">Show this card to staff to redeem</div>
            </div>
          </div>
        )}

        {/* QR code button */}
        <button className="btn btn-primary mt-16" onClick={() => setShowQR(true)}>
          📲 Show My QR Code
        </button>

        {/* Stats */}
        {(user?.total_redeemed ?? 0) > 0 && (
          <p className="text-center mt-12" style={{ color: 'rgba(255,255,255,.75)', fontSize: '.85rem' }}>
            🧋 You've redeemed <strong>{user?.total_redeemed}</strong> free drink{user?.total_redeemed !== 1 ? 's' : ''} so far!
          </p>
        )}

        {/* Transaction history */}
        <div className="card" style={{ marginTop: 20 }}>
          <div className="stamp-card-title">Stamp History</div>
          <TransactionList items={transactions} />
        </div>

        <button className="btn btn-outline mt-16" onClick={handleLogout} style={{ color: 'rgba(255,255,255,.6)', borderColor: 'rgba(255,255,255,.2)' }}>
          Log Out / Switch Account
        </button>
      </div>

      <Footer />

      {showQR && user && (
        <QRModal userId={user.id} onClose={() => setShowQR(false)} />
      )}
    </div>
  );
}
