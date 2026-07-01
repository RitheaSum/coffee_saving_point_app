import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const nav = useNavigate();
  return (
    <div className="home-page">
      <div className="home-overlay" />

      <div className="home-hero">
        <img src="/grid_logo.png" alt="GRID COFFEE" className="home-logo-img" />
        <h1 className="home-title">Grid Coffee</h1>
        <p className="home-sub">Collect 10 stamps · Get 1 free drink</p>
      </div>

      <div className="home-buttons">
        <button className="home-btn home-btn-customer" onClick={() => nav('/customer')}>
          My Rewards Card
          <span className="btn-sub">View stamps &amp; redeem</span>
        </button>

        <button className="home-btn home-btn-staff" onClick={() => nav('/staff')}>
          Staff — Add Stamp
          <span className="btn-sub">Scan customer QR code</span>
        </button>

        <button className="home-btn home-btn-admin" onClick={() => nav('/admin')}>
          Admin Dashboard
          <span className="btn-sub">Manage customers &amp; stats</span>
        </button>
      </div>
    </div>
  );
}
