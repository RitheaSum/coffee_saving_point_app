import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, PointSaver, Stats, User } from '../api';
import { Footer } from '../components/Footer';

const SESSION_KEY = 'coffee_admin_pwd';

export default function AdminPage() {
  const nav = useNavigate();
  const [password, setPassword] = useState(sessionStorage.getItem(SESSION_KEY) || '');
  const [authed, setAuthed] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [pointSavers, setPointSavers] = useState<PointSaver[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adjustDialogUser, setAdjustDialogUser] = useState<User | null>(null);
  const [adjustPointsInput, setAdjustPointsInput] = useState('');
  const [deleteDialogUser, setDeleteDialogUser] = useState<User | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
  };

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

  const refreshData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [s, u, p] = await Promise.all([
        api.adminStats(password),
        api.adminUsers(password),
        api.adminRecentPointSavers(password),
      ]);
      setStats(s);
      setUsers(u.users);
      setPointSavers(p.users);
    } catch (error) {
      console.error(error);
      showNotice('error', 'Unable to refresh dashboard data.');
    } finally {
      if (!silent) setLoading(false);
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
    refreshData();
  }, [authed, password]);

  const handleAdjustPoints = (user: User) => {
    setAdjustDialogUser(user);
    setAdjustPointsInput(String(user.points));
  };

  const submitAdjustPoints = async () => {
    if (!adjustDialogUser) return;

    const nextPoints = Number(adjustPointsInput.replace(/[^0-9-]/g, ''));
    if (Number.isNaN(nextPoints) || nextPoints < 0) {
      showNotice('error', 'Please enter a valid non-negative points value.');
      return;
    }

    const user = adjustDialogUser;
    setActionLoading(true);
    setActionNotice(null);
    try {
      const { user: updated } = await api.adminUpdateUserPoints(user.id, password, nextPoints);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              totalPoints: prev.totalPoints - user.points + updated.points,
            }
          : prev
      );
      await refreshData(true);
      setAdjustDialogUser(null);
      showNotice('success', `Updated ${updated.name || updated.id} to ${updated.points} points.`);
    } catch (err) {
      console.error(err);
      showNotice('error', 'Unable to update points.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeleteDialogUser(user);
  };

  const confirmDeleteUser = async () => {
    if (!deleteDialogUser) return;

    const user = deleteDialogUser;
    setActionLoading(true);
    setActionNotice(null);

    try {
      await api.adminDeleteUser(user.id, password);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setStats((prev) =>
        prev
          ? {
              ...prev,
              totalUsers: prev.totalUsers - 1,
              totalPoints: prev.totalPoints - user.points,
            }
          : prev
      );
      await refreshData(true);
      setDeleteDialogUser(null);
      showNotice('success', `Deleted ${user.name || user.id}.`);
    } catch (err) {
      console.error(err);
      showNotice('error', 'Unable to delete user.');
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.id.toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  });

  // Today's counts in Phnom Penh timezone
  const todayKey = new Date().toLocaleDateString(undefined, { timeZone: 'Asia/Phnom_Penh' });
  const newRegsToday = users.filter(
    (u) => new Date(u.created_at).toLocaleDateString(undefined, { timeZone: 'Asia/Phnom_Penh' }) === todayKey
  ).length;

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
      {actionNotice && (
        <div className="admin-modal-backdrop" onClick={() => setActionNotice(null)}>
          <div
            className={`admin-modal admin-notice-modal admin-notice-${actionNotice.type}`}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-live="assertive"
          >
            <div className="admin-notice-head">
              <div className="admin-notice-icon" aria-hidden="true">
                {actionNotice.type === 'success' ? '✓' : '!'}
              </div>
              <div>
                <h3 className="admin-notice-title">
                  {actionNotice.type === 'success' ? 'Update Complete' : 'Action Failed'}
                </h3>
                <div className="admin-notice-subtitle">
                  {actionNotice.type === 'success' ? 'Your changes were saved.' : 'Please try again.'}
                </div>
              </div>
            </div>
            <p className="admin-modal-text">{actionNotice.message}</p>
            <div className="admin-modal-actions">
              <button
                className={`btn btn-sm ${actionNotice.type === 'success' ? 'btn-green' : 'btn-danger'}`}
                type="button"
                onClick={() => setActionNotice(null)}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustDialogUser && (
        <div className="admin-modal-backdrop" onClick={() => !actionLoading && setAdjustDialogUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Adjust Points</h3>
            <p className="admin-modal-text">Set points for {adjustDialogUser.name || adjustDialogUser.id}</p>
            <input
              className="admin-modal-input"
              type="number"
              min={0}
              value={adjustPointsInput}
              onChange={(e) => setAdjustPointsInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitAdjustPoints()}
              autoFocus
            />
            <div className="admin-modal-actions">
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setAdjustDialogUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={submitAdjustPoints}
                disabled={actionLoading}
              >
                {actionLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDialogUser && (
        <div className="admin-modal-backdrop" onClick={() => !actionLoading && setDeleteDialogUser(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete User</h3>
            <p className="admin-modal-text">
              Delete {deleteDialogUser.name || deleteDialogUser.id} and all their records?
            </p>
            <div className="admin-modal-actions">
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setDeleteDialogUser(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                type="button"
                onClick={confirmDeleteUser}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="topbar">
        <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
        <button className="back-btn" onClick={() => nav('/')}>←</button>
        <h1>Admin Dashboard</h1>
      </div>

      <div className="container admin-container">
          {loading ? (
          <div className="spinner" />
        ) : (
          <>
            <div className="admin-layout">
              {/* Left column: latest registrations / today totals */}
              <div className="admin-left">
                <div className="card" style={{ marginTop: 20 }}>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Today</div>
                    <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
                      <div style={{ display: 'flex', gap: 20, alignItems: 'baseline', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{newRegsToday}</div>
                          <div className="text-muted">New registers</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{stats?.todayAdded ?? '—'}</div>
                          <div className="text-muted">Stamps today</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{stats?.totalPoints ?? '—'}</div>
                        <div className="text-muted">Total points</div>
                      </div>
                    </div>

                    <hr style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,.04)' }} />

                    <div style={{ fontWeight: 800, marginBottom: 8 }}>Latest point savers</div>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {pointSavers.map((u, idx) => (
                        <li
                          key={u.id}
                          style={{
                            padding: '8px 0',
                            borderBottom: idx === pointSavers.length - 1 ? 'none' : '1px solid var(--c100)',
                          }}
                        >
                          <div style={{ fontWeight: 700 }}>{u.name || '—'}</div>
                          <div style={{ fontFamily: 'monospace', color: 'var(--c400)', fontSize: '.8rem' }}>{u.id}</div>
                          <div style={{ fontSize: '.78rem', color: 'var(--c400)', marginTop: 2 }}>
                            Total points: {u.points}
                          </div>
                          <div style={{ fontSize: '.74rem', color: 'var(--c400)', marginTop: 2 }}>
                            Time:{' '}
                            {new Date(u.last_stamp_at).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: 'Asia/Phnom_Penh',
                            })}
                          </div>
                        </li>
                      ))}
                      {pointSavers.length === 0 && (
                        <li style={{ color: 'var(--c400)', padding: 8 }}>No point savers yet.</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right column: stats + customers list */}
              <div className="admin-right">
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

                  <div className="admin-table-wrap">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th>Name / ID</th>
                          <th>Points</th>
                          <th>Redeemed</th>
                          <th>Joined</th>
                          <th>Actions</th>
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
                                timeZone: 'Asia/Phnom_Penh',
                              })}
                            </td>
                            <td>
                              <div className="admin-actions">
                                <button
                                  className="btn btn-sm btn-outline"
                                  onClick={() => handleAdjustPoints(u)}
                                  disabled={actionLoading}
                                >
                                  Adjust Point
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={actionLoading}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filtered.length === 0 && (
                          <tr>
                            <td colSpan={10} style={{ textAlign: 'center', color: 'var(--c400)', padding: 24 }}>
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
              </div>
            </div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
