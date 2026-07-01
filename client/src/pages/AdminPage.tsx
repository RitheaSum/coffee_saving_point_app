import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, User, Stats } from '../api';
import { Footer } from '../components/Footer';

const SESSION_KEY = 'coffee_admin_pwd';

export default function AdminPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState(sessionStorage.getItem(SESSION_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.adminAuth(password);
      sessionStorage.setItem(SESSION_KEY, password);
      setAuthed(true);
    } catch {
      setAuthError('Incorrect password.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) {
      setPassword(saved);
      api.adminAuth(saved)
        .then(() => setAuthed(true))
        .catch(() => sessionStorage.removeItem(SESSION_KEY));
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    setLoading(true);
    Promise.all([api.adminStats(password), api.adminUsers(password)])
      .then(([s, u]) => {
        setStats(s);
        setUsers(u.users);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authed, password]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.id.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  // ── Auth gate ──────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="page">
        <div className="topbar">
          <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
          <button className="back-btn" onClick={() => nav('/')}>←</button>
          <h1>Admin Login</h1>
        </div>
        <div className="container">
          <div className="card" style={{ marginTop: 40 }}>
            <div style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: 8 }}>🔒</div>
            <h2 style={{ fontWeight: 800, textAlign: 'center', marginBottom: 4 }}>Admin Access</h2>
            <p className="text-muted text-center mt-8" style={{ marginBottom: 20 }}>
              Enter the admin password to continue.
            </p>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>
            {authError && <div className="alert alert-error">{authError}</div>}
            <button
              className="btn btn-primary mt-12"
              onClick={handleAuth}
              disabled={authLoading || !password}
            >
              {authLoading ? 'Checking…' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Dashboard ──────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="topbar">
        <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
        <button className="back-btn" onClick={() => nav('/')}>←</button>
        <h1>Admin Dashboard</h1>
      </div>

      <div className="container">
        {loading ? (
          <div className="spinner" />
        ) : (
          <>
            {/* Stats */}
            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-number">{stats.totalUsers}</div>
                  <div className="stat-label">Customers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.todayAdded}</div>
                  <div className="stat-label">Stamps Today</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.totalPoints}</div>
                  <div className="stat-label">Active Points</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.totalRedeemed}</div>
                  <div className="stat-label">Drinks Redeemed</div>
                </div>
              </div>
            )}

            {/* Customer list */}
            <div className="card" style={{ marginTop: 20, padding: '20px 0', overflow: 'hidden' }}>
              <div style={{ padding: '0 20px 14px' }}>
                <div style={{ fontWeight: 800, marginBottom: 10 }}>
                  All Customers ({users.length})
                </div>
                <input
                  type="text"
                  placeholder="Search by name, ID or phone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 12px',
                    border: '2px solid var(--c100)', borderRadius: 8,
                    fontFamily: 'var(--font)', fontSize: '.9rem', outline: 'none',
                  }}
                />
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>Name / ID</th>
                      <th>Points</th>
                      <th>Redeemed</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{u.name || '—'}</div>
                          <div style={{ fontSize: '.75rem', fontFamily: 'monospace', color: 'var(--c400)' }}>
                            {u.id}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${u.points >= 10 ? 'badge-gold' : 'badge-green'}`}>
                            {u.points} pts
                          </span>
                        </td>
                        <td>{u.total_redeemed}</td>
                        <td style={{ fontSize: '.8rem', color: 'var(--c400)' }}>
                          {new Date(u.created_at).toLocaleDateString(undefined, {
                            month: 'short', day: 'numeric', year: '2-digit',
                          })}
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', color: 'var(--c400)', padding: 24 }}>
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <button
              className="btn btn-outline mt-16"
              onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false); setPassword(''); }}
              style={{ color: 'rgba(255,255,255,.6)', borderColor: 'rgba(255,255,255,.2)' }}
            >
              Log Out
            </button>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
