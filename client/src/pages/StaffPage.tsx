import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, User } from '../api';
import QRScanner from '../components/QRScanner';
import { StampCard } from '../components/CustomerComponents';
import { Footer } from '../components/Footer';

const POINTS_TO_REDEEM = 10;
const STAFF_SESSION_KEY = 'coffee_staff_token';

export default function StaffPage() {
  const nav = useNavigate();
  const { token: urlToken } = useParams<{ token?: string }>();

  // ── Auth state ───────────────────────────────────────────────
  const [staffToken, setStaffToken] = useState(urlToken ?? '');
  const [authed, setAuthed] = useState(!!urlToken);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // ── Staff page state ─────────────────────────────────────────
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [customer, setCustomer] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (urlToken) return; // URL token bypasses session-storage auth
    const saved = sessionStorage.getItem(STAFF_SESSION_KEY);
    if (saved) {
      api.staffAuth(saved)
        .then(() => { setStaffToken(saved); setAuthed(true); })
        .catch(() => sessionStorage.removeItem(STAFF_SESSION_KEY));
    }
  }, [urlToken]);

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.staffAuth(staffToken);
      sessionStorage.setItem(STAFF_SESSION_KEY, staffToken);
      setAuthed(true);
    } catch {
      setAuthError('Incorrect staff token.');
    } finally {
      setAuthLoading(false);
    }
  };

  const clearMessages = () => { setError(''); setSuccess(''); };

  const lookupUser = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    clearMessages();
    setCustomer(null);
    try {
      const { user } = await api.getUser(id.trim());
      setCustomer(user);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Customer not found.');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }, []);

  const handleScan = useCallback((data: string) => { lookupUser(data); }, [lookupUser]);

  const handleAddPoint = async () => {
    if (!customer) return;
    setLoading(true);
    clearMessages();
    try {
      const { user, message } = await api.addPoint(customer.id, staffToken);
      setCustomer(user);
      setSuccess(message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to add point.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!customer) return;
    if (!window.confirm(`Redeem 1 free drink for ${customer.name || customer.id}?`)) return;
    setLoading(true);
    clearMessages();
    try {
      const { user, message } = await api.redeem(customer.id, staffToken);
      setCustomer(user);
      setSuccess(message);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Redemption failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleNextCustomer = () => {
    setCustomer(null);
    setManualId('');
    clearMessages();
  };

  const canRedeem = (customer?.points ?? 0) >= POINTS_TO_REDEEM;

  // ── Auth gate ────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="page">
        <div className="topbar">
          <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
          <button className="back-btn" onClick={() => nav('/')}>←</button>
          <h1>Staff Access</h1>
        </div>
        <div className="container">
          <div className="card" style={{ marginTop: 40 }}>
            <div style={{ fontSize: '2rem', textAlign: 'center', marginBottom: 8 }}>🔑</div>
            <h2 style={{ fontWeight: 700, textAlign: 'center', marginBottom: 4 }}>Staff Login</h2>
            <p className="text-muted text-center mt-8" style={{ marginBottom: 20 }}>
              Enter the staff access token to continue.
            </p>
            <div className="form-group">
              <label>Staff Token</label>
              <input
                type="password"
                placeholder="Enter staff token"
                value={staffToken}
                onChange={(e) => setStaffToken(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>
            {authError && <div className="alert alert-error">{authError}</div>}
            <button
              className="btn btn-primary mt-12"
              onClick={handleAuth}
              disabled={authLoading || !staffToken}
            >
              {authLoading ? 'Checking…' : 'Log In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main staff page ──────────────────────────────────────────
  return (
    <div className="page">
      <div className="topbar">
        <img src="/grid_logo.png" className="topbar-logo" alt="Grid Coffee" />
        <button className="back-btn" onClick={() => nav('/')}>←</button>
        <h1>Staff — Add Stamp</h1>
      </div>

      <div className="container">
        {/* ── No customer selected yet ── */}
        {!customer && (
          <>
            <div className="card">
              <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Scan Customer QR</h2>
              <p className="text-muted" style={{ marginBottom: 16 }}>
                Ask the customer to show their QR code on screen.
              </p>

              {!scanning ? (
                <button className="btn btn-primary" onClick={() => setScanning(true)}>
                  Open Camera Scanner
                </button>
              ) : (
                <>
                  <QRScanner onScan={handleScan} active={scanning} />
                  <button
                    className="btn btn-outline mt-12"
                    onClick={() => { setScanning(false); clearMessages(); }}
                  >
                    Cancel Scan
                  </button>
                </>
              )}
            </div>

            <div className="card" style={{ marginTop: 12 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Or Enter ID Manually</h3>
              <div className="form-group" style={{ marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Customer ID or phone number"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookupUser(manualId)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={() => lookupUser(manualId)}
                disabled={loading || !manualId.trim()}
              >
                {loading ? 'Looking up…' : 'Look Up Customer'}
              </button>
            </div>

            {error && <div className="alert alert-error mt-12">{error}</div>}
          </>
        )}

        {/* ── Customer found ── */}
        {customer && (
          <>
            <div className="customer-result-card">
              <div className="customer-result-header">
                <div className="customer-result-avatar">
                  {customer.name ? customer.name[0].toUpperCase() : '☕'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>
                    {customer.name || 'Coffee Lover'}
                  </div>
                  <div style={{ fontSize: '.75rem', opacity: .6, fontFamily: 'monospace' }}>
                    {customer.id}
                  </div>
                  <div style={{ fontSize: '.82rem', opacity: .75, marginTop: 2 }}>
                    {customer.total_redeemed} free drink{customer.total_redeemed !== 1 ? 's' : ''} redeemed
                  </div>
                </div>
              </div>

              <div className="customer-result-body">
                <StampCard points={customer.points} />

                {success && <div className="alert alert-success">{success}</div>}
                {error   && <div className="alert alert-error">{error}</div>}

                <button
                  className="btn btn-primary"
                  onClick={handleAddPoint}
                  disabled={loading}
                >
                  {loading ? 'Adding…' : 'Add 1 Stamp'}
                </button>

                {canRedeem && (
                  <button
                    className="btn btn-gold"
                    onClick={handleRedeem}
                    disabled={loading}
                  >
                    Redeem Free Drink (−10 stamps)
                  </button>
                )}

                <button className="btn btn-outline" onClick={handleNextCustomer}>
                  ← Next Customer
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
