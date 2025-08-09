import React, { useMemo } from 'react';

interface AwardOverlayProps {
  triggerKey: string | number;
  amount: number; // positive or negative
}

export function AwardOverlay({ triggerKey, amount }: AwardOverlayProps) {
  const particles = useMemo(() => Array.from({ length: 14 }, (_, i) => i), [triggerKey]);
  const positive = amount >= 0;
  const text = `${positive ? '+' : ''}${amount}`;
  return (
    <div key={String(triggerKey)} className="award-overlay">
      <div className={`award-text ${positive ? 'award' : 'deduct'}`}>{text}</div>
      <div className="award-particles">
        {particles.map(i => (
          <span key={i} className={`particle ${positive ? 'p-award' : 'p-deduct'}`} style={{ ['--i' as any]: i }} />
        ))}
      </div>
    </div>
  );
}

