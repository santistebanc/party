import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  roomId: string;
}

export function QRCodeDisplay({ roomId }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        const roomUrl = `${window.location.origin}/?roomId=${roomId}&view=player`;
        const dataUrl = await QRCode.toDataURL(roomUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrDataUrl(dataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateQR();
  }, [roomId]);

  const copyRoomUrl = () => {
    const roomUrl = `${window.location.origin}/?roomId=${roomId}&view=player`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch((err) => {
      console.error('Failed to copy room URL:', err);
    });
  };

  return (
    <div className="qr-section">
      <div className="qr-container">
        {isLoading ? (
          <div className="qr-loading">
            <div className="loading-spinner"></div>
            <p>Generating QR code...</p>
          </div>
        ) : (
          <div className="qr-wrapper">
            <img
              src={qrDataUrl}
              alt="QR Code for room"
              className="qr-code qr-clickable"
              onClick={copyRoomUrl}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyRoomUrl(); } }}
              role="button"
              tabIndex={0}
              title={copied ? 'Copied!' : 'Click QR to copy join link'}
            />
            {copied && (
              <div className="qr-overlay" aria-live="polite">
                Copied!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 