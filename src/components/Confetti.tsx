import React, { useEffect, useRef, useState } from 'react';

interface ConfettiProps {
  triggerKey: string | number;
  durationMs?: number;
}

export function Confetti({ triggerKey, durationMs = 1200 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // reset visibility for a fresh run each trigger
    setDone(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId = 0;
    let start = performance.now();
    const DPR = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.clientWidth * DPR;
      canvas.height = canvas.clientHeight * DPR;
      ctx.scale(DPR, DPR);
    };
    resize();

    const colors = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#f97316'];
    const pieces = Array.from({ length: 120 }).map(() => ({
      x: Math.random() * canvas.clientWidth,
      y: -10 - Math.random() * 80,
      r: 2 + Math.random() * 4,
      vx: -1 + Math.random() * 2,
      vy: 2 + Math.random() * 3,
      a: Math.random() * Math.PI * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    const render = (t: number) => {
      const elapsed = t - start;
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.a += 0.05;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      });
      if (elapsed < durationMs) {
        animationId = requestAnimationFrame(render);
      } else {
        // final clear to avoid lingering pixels then mark done
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        setDone(true);
      }
    };
    animationId = requestAnimationFrame(render);

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [triggerKey, durationMs]);

  if (done) return null;
  return <canvas ref={canvasRef} className="confetti-canvas" />;
}

