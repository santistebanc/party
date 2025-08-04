import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  roomId: string;
}

export function QRCodeDisplay({ roomId }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        const roomUrl = `${window.location.origin}?room=${roomId}`;
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
    const roomUrl = `${window.location.origin}?room=${roomId}`;
    navigator.clipboard.writeText(roomUrl).then(() => {
      // You could add a toast notification here
      console.log('Room URL copied to clipboard');
    }).catch((err) => {
      console.error('Failed to copy room URL:', err);
    });
  };

  return (
    <div className="qr-section">
      <h4>📱 Share Room</h4>
      <div className="qr-container">
        {isLoading ? (
          <div className="qr-loading">
            <div className="loading-spinner"></div>
            <p>Generating QR code...</p>
          </div>
        ) : (
          <>
            <img 
              src={qrDataUrl} 
              alt="QR Code for room" 
              className="qr-code"
            />
            <button 
              onClick={copyRoomUrl} 
              className="btn btn-secondary"
            >
              Copy Room URL
            </button>
          </>
        )}
      </div>
    </div>
  );
} 