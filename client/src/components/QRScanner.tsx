import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
  active: boolean;
}

export default function QRScanner({ onScan, active }: QRScannerProps) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!active) return;
    // Prevent double-mount in dev mode
    if (mountedRef.current) return;
    mountedRef.current = true;

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 240, height: 240 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [],
      },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear().catch(() => {});
        onScan(decodedText.trim());
      },
      () => { /* ignore scan errors */ }
    );

    return () => {
      mountedRef.current = false;
      scanner.clear().catch(() => {});
    };
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div className="scanner-container">
      <div id="qr-reader" />
    </div>
  );
}
