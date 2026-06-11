import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, User } from '../api';
import QRScanner from '../components/QRScanner';
import { StampCard } from '../components/CustomerComponents';

const POINTS_TO_REDEEM = 10;

export default function StaffPage() {
  const nav = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [manualId, setManualId] = useState('');
  const [customer, setCustomer] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleScan = useCallback((data: string) => {
    lookupUser(data);
  }, [lookupUser]);

  const handleAddPoint = async () => {
    if (!customer) return;
    setLoading(true);
    clearMessages();
    try {
      const { user, message } = await api.addPoint(customer.id);
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
      const { user, message } = await api.redeem(customer.id);
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

  return (
    <div className="page">
      <div className="topbar">
        <button className="back-btn" onClick={() => nav('/')}>←</button>
        <h1>☕ Staff — Add Points</h1>
      </div>

      <div className="container">
        {/* ── No customer selected yet ── */}
        {!customer && (
          <>
            <div className="card">
              <h2 style={{ fontWeight: 800, marginBottom: 8 }}>Scan Customer QR</h2>
              <p className="text-muted" style={{ marginBottom: 16 }}>
                Ask the customer to show their QR code on screen.
              </p>

              {!scanning ? (
                <button className="btn btn-primary" onClick={() => setScanning(true)}>
                  📷 Open Camera Scanner
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
              <h3 style={{ fontWeight: 800, marginBottom: 12 }}>Or Enter ID Manually</h3>
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
                {loading ? 'Looking up…' : '🔍 Look Up Customer'}
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
                  <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>
                    {customer.name || 'Coffee Lover'}
                  </div>
                  <div style={{ fontSize: '.8rem', opacity: .7, fontFamily: 'monospace' }}>
                    {customer.id}
                  </div>
                  <div style={{ fontSize: '.85rem', opacity: .85, marginTop: 2 }}>
                    🏆 {customer.total_redeemed} free drink{customer.total_redeemed !== 1 ? 's' : ''} redeemed
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
                  {loading ? 'Adding…' : '☕ Add 1 Stamp (+1 point)'}
                </button>

                {canRedeem && (
                  <button
                    className="btn btn-gold"
                    onClick={handleRedeem}
                    disabled={loading}
                  >
                    🎁 Redeem Free Drink (−10 pts)
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
    </div>
  );
}
