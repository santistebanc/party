import React, { useEffect, useState } from 'react';

interface ToastProps {
  triggerKey: string | number;
  message: string;
  durationMs?: number;
}

export function Toast({ triggerKey, message, durationMs = 1600 }: ToastProps) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(true);
    const t = setTimeout(() => setVisible(false), durationMs);
    return () => clearTimeout(t);
  }, [triggerKey, durationMs]);
  if (!visible) return null;
  return (
    <div className="toast-overlay" role="status" aria-live="polite">
      <div className="toast">{message}</div>
    </div>
  );
}

