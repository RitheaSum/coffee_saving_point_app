import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export default function QRScanner({ onScan, active }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannedRef = useRef(false); // prevent firing onScan twice

  useEffect(() => {
    if (!active) return;

    scannedRef.current = false;
    const scanner = new Html5Qrcode('qr-reader', { verbose: false });
    scannerRef.current = scanner;

    const startScanner = (facingMode: string) =>
      scanner.start(
        { facingMode },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (scannedRef.current) return;
          scannedRef.current = true;
          onScan(decodedText.trim());
        },
        () => {}
      );

    startScanner('environment').catch(() => {
      // Back camera unavailable — fall back to any camera
      startScanner('user').catch(() => {});
    });

    return () => {
      scannerRef.current = null;
      scanner.stop().catch(() => {});
    };
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div className="scanner-container">
      <div id="qr-reader" />
    </div>
  );
}
