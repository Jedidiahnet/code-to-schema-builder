import { useEffect, useMemo, useRef } from "react";
import type { Candle } from "@/lib/genius-ai";

interface Props {
  candles: Candle[];
  decision?: "BUY" | "SELL";
}

export function PriceChart({ candles, decision }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { min, max } = useMemo(() => {
    let lo = Infinity, hi = -Infinity;
    for (const c of candles) {
      if (c.low < lo) lo = c.low;
      if (c.high > hi) hi = c.high;
    }
    return { min: lo, max: hi };
  }, [candles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const pad = 16;
    const chartW = w - pad * 2;
    const chartH = h - pad * 2;
    const range = max - min || 1;
    const cw = chartW / candles.length;

    // grid
    ctx.strokeStyle = "rgba(120,200,255,0.08)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = pad + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();
    }

    candles.forEach((c, i) => {
      const x = pad + i * cw + cw / 2;
      const yHigh = pad + (1 - (c.high - min) / range) * chartH;
      const yLow = pad + (1 - (c.low - min) / range) * chartH;
      const yOpen = pad + (1 - (c.open - min) / range) * chartH;
      const yClose = pad + (1 - (c.close - min) / range) * chartH;
      const bull = c.close >= c.open;
      const color = bull ? "rgb(80, 220, 160)" : "rgb(240, 100, 110)";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();
      const bw = Math.max(2, cw * 0.6);
      ctx.fillRect(x - bw / 2, Math.min(yOpen, yClose), bw, Math.max(2, Math.abs(yClose - yOpen)));
    });

    // last price line
    const last = candles[candles.length - 1].close;
    const yLast = pad + (1 - (last - min) / range) * chartH;
    ctx.strokeStyle = decision === "SELL" ? "rgba(240,100,110,0.7)" : "rgba(80,220,255,0.7)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad, yLast);
    ctx.lineTo(w - pad, yLast);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(10,18,30,0.85)";
    ctx.fillRect(w - pad - 70, yLast - 10, 70, 20);
    ctx.fillStyle = "#9fefff";
    ctx.font = "11px ui-monospace, monospace";
    ctx.textAlign = "right";
    ctx.fillText(last.toFixed(last < 10 ? 4 : 2), w - pad - 6, yLast + 4);
  }, [candles, min, max, decision]);

  return (
    <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-border bg-card/40 grid-bg scanline">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
