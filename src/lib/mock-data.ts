/* Deterministic mock data so charts look alive without real backend. */
export function series(n: number, base: number, vol: number, seed = 1) {
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out: { t: string; v: number }[] = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v = Math.max(0, v + (rand() - 0.5) * vol);
    out.push({ t: `D${i + 1}`, v: Math.round(v * 100) / 100 });
  }
  return out;
}

export function multiSeries(n: number, fields: { key: string; base: number; vol: number }[], seed = 1) {
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const vals = Object.fromEntries(fields.map((f) => [f.key, f.base])) as Record<string, number>;
  const out: Record<string, unknown>[] = [];
  for (let i = 0; i < n; i++) {
    const row: Record<string, unknown> = { t: `D${i + 1}` };
    for (const f of fields) {
      vals[f.key] = Math.max(0, vals[f.key] + (rand() - 0.5) * f.vol);
      row[f.key] = Math.round(vals[f.key]);
    }
    out.push(row);
  }
  return out;
}

export const BOT_AGENTS = [
  "Trend", "Momentum", "Volatility", "Sentiment", "Macro", "Order Block",
  "Liquidity", "Pattern", "Risk", "News NLP", "Smart Money", "Vector Memory",
];
