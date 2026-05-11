import { useEffect, useRef } from "react";

type Sample = {
  avg: number;
  min: number;
  max: number;
  count: number;
};

type Props = {
  history: Sample[];
  windowLen: number;
};

export function CurveCanvas({ history, windowLen }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // background grid
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let pct = 25; pct < 100; pct += 25) {
      const y = h - (pct / 100) * h;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // threshold guide at 40
    ctx.strokeStyle = "rgba(255, 90, 90, 0.18)";
    ctx.setLineDash([4, 4]);
    const yT = h - (40 / 100) * h;
    ctx.beginPath();
    ctx.moveTo(0, yT);
    ctx.lineTo(w, yT);
    ctx.stroke();
    ctx.setLineDash([]);

    if (history.length === 0) return;

    const x = (i: number) => (i / Math.max(1, windowLen - 1)) * w;
    const y = (v: number) => h - (v / 100) * h;
    // Right-align the data: latest sample at the right edge
    const offset = windowLen - history.length;

    // shaded min/max band
    ctx.fillStyle = "rgba(255, 210, 74, 0.18)";
    ctx.beginPath();
    history.forEach((s, i) => {
      const px = x(i + offset);
      const py = y(s.max);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    for (let i = history.length - 1; i >= 0; i--) {
      const s = history[i];
      if (!s) continue;
      ctx.lineTo(x(i + offset), y(s.min));
    }
    ctx.closePath();
    ctx.fill();

    // average line
    ctx.strokeStyle = "hsl(48, 90%, 65%)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    history.forEach((s, i) => {
      const px = x(i + offset);
      const py = y(s.avg);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }, [history, windowLen]);

  return <canvas ref={ref} className="energy-curve-canvas" />;
}
