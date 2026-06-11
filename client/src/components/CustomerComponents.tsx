import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const TOTAL_STAMPS = 10;

interface StampCardProps {
  points: number;
}

export function StampCard({ points }: StampCardProps) {
  const filled = Math.min(points, TOTAL_STAMPS);
  const pct = (filled / TOTAL_STAMPS) * 100;

  return (
    <div>
      <div className="stamp-card-title">Your Stamp Card</div>
      <div className="stamps-grid">
        {Array.from({ length: TOTAL_STAMPS }).map((_, i) => (
          <div key={i} className={`stamp ${i < filled ? 'filled' : ''}`}>
            {i < filled ? '☕' : '○'}
          </div>
        ))}
      </div>
      <div className="stamp-progress-bar">
        <div className="stamp-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="stamp-progress-text">
        {filled} / {TOTAL_STAMPS} stamps
      </div>
    </div>
  );
}

interface QRModalProps {
  userId: string;
  onClose: () => void;
}

export function QRModal({ userId, onClose }: QRModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-title">Your QR Code</div>
        <p className="text-muted text-center mt-8">Show this to staff when buying coffee</p>
        <div className="qr-wrap">
          <QRCodeSVG value={userId} size={220} level="H" includeMargin />
        </div>
        <p className="qr-caption" style={{ fontFamily: 'monospace', fontSize: '1rem', color: 'var(--c600)' }}>
          {userId}
        </p>
        <button className="btn btn-outline mt-16" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

interface TransactionListProps {
  items: Array<{ id: string; type: string; points: number; note: string; created_at: string }>;
}

export function TransactionList({ items }: TransactionListProps) {
  if (items.length === 0) {
    return <p className="text-muted text-center mt-12">No transactions yet.</p>;
  }
  return (
    <div className="tx-list">
      {items.map((tx) => (
        <div key={tx.id} className="tx-item">
          <span className="tx-icon">{tx.type === 'add' ? '☕' : '🎁'}</span>
          <div className="tx-info">
            <div className="tx-note">{tx.note}</div>
            <div className="tx-date">
              {new Date(tx.created_at).toLocaleString(undefined, {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </div>
          </div>
          <div className={`tx-pts ${tx.type}`}>
            {tx.type === 'add' ? '+' : ''}{tx.points} pt{Math.abs(tx.points) !== 1 ? 's' : ''}
          </div>
        </div>
      ))}
    </div>
  );
}

export function useToggle(initial = false): [boolean, () => void] {
  const [val, setVal] = useState(initial);
  return [val, () => setVal((v) => !v)];
}
