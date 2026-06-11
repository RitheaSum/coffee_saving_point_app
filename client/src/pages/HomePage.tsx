import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const nav = useNavigate();
  return (
    <div className="home-page">
      <div className="home-logo">☕</div>
      <h1 className="home-title">Coffee Rewards</h1>
      <p className="home-sub">Collect 10 stamps · Get 1 free drink</p>

      <div className="home-buttons">
        <button className="home-btn home-btn-customer" onClick={() => nav('/customer')}>
          <span className="btn-icon">🎫</span>
          My Rewards Card
          <span className="btn-sub">View points & stamp card</span>
        </button>

        <button className="home-btn home-btn-staff" onClick={() => nav('/staff')}>
          <span className="btn-icon">📷</span>
          Staff — Add Points
          <span className="btn-sub">Scan customer QR code</span>
        </button>

        <button className="home-btn home-btn-admin" onClick={() => nav('/admin')}>
          <span className="btn-icon">📊</span>
          Admin Dashboard
          <span className="btn-sub">Manage customers & stats</span>
        </button>
      </div>
    </div>
  );
}
