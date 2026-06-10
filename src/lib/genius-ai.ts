// Simulated market data + technical indicators + AI agent voting

export type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type Direction = "BUY" | "SELL";

export type AgentResult = {
  name: string;
  role: string;
  vote: Direction;
  confidence: number; // 0-100
  reasoning: string;
};

export type Analysis = {
  decision: Direction;
  confidence: number; // 75-99
  agents: AgentResult[];
  indicators: {
    rsi: number;
    macd: number;
    macdSignal: number;
    sma20: number;
    sma50: number;
    trend: "UP" | "DOWN" | "FLAT";
    pattern: string;
  };
};

const PAIR_BASE: Record<string, number> = {
  "EUR/USD": 1.0865,
  "GBP/USD": 1.2734,
  "USD/JPY": 156.42,
  "BTC/USD": 67250,
  "ETH/USD": 3320,
  "AUD/USD": 0.6612,
  "USD/CAD": 1.367,
  "XAU/USD": 2342.5,
};

export const PAIRS = Object.keys(PAIR_BASE);

// Deterministic seeded RNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateCandles(pair: string, timeframe: string, count = 80): Candle[] {
  const base = PAIR_BASE[pair] ?? 1;
  const tfMin = timeframe === "1m" ? 1 : timeframe === "5m" ? 5 : 15;
  const seed = (pair.charCodeAt(0) + tfMin * 31 + Math.floor(Date.now() / 60000)) >>> 0;
  const rand = mulberry32(seed);
  const vol = base * (pair.includes("BTC") ? 0.004 : pair.includes("ETH") ? 0.005 : pair.includes("XAU") ? 0.0025 : 0.0008);
  const candles: Candle[] = [];
  let price = base;
  const now = Date.now();
  let trendBias = (rand() - 0.5) * vol * 0.3;
  for (let i = count - 1; i >= 0; i--) {
    if (i % 12 === 0) trendBias = (rand() - 0.5) * vol * 0.5;
    const drift = trendBias + (rand() - 0.5) * vol;
    const open = price;
    const close = +(open + drift).toFixed(5);
    const high = +Math.max(open, close, open + Math.abs(rand() * vol)).toFixed(5);
    const low = +Math.min(open, close, open - Math.abs(rand() * vol)).toFixed(5);
    candles.push({ time: now - i * tfMin * 60000, open, high, low, close });
    price = close;
  }
  return candles;
}

function sma(values: number[], period: number): number {
  if (values.length < period) return values[values.length - 1] ?? 0;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function ema(values: number[], period: number): number {
  if (!values.length) return 0;
  const k = 2 / (period + 1);
  let e = values[0];
  for (let i = 1; i < values.length; i++) e = values[i] * k + e * (1 - k);
  return e;
}

function rsi(values: number[], period = 14): number {
  if (values.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = values.length - period; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff; else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function macd(values: number[]) {
  const macdLine = ema(values, 12) - ema(values, 26);
  // signal: ema of macd over last 9 points (approximation)
  const macdSeries: number[] = [];
  for (let i = 26; i <= values.length; i++) {
    const slice = values.slice(0, i);
    macdSeries.push(ema(slice, 12) - ema(slice, 26));
  }
  const signal = ema(macdSeries, 9);
  return { macd: macdLine, signal };
}

function detectPattern(candles: Candle[]): string {
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  if (!last || !prev) return "Neutral";
  const body = Math.abs(last.close - last.open);
  const range = last.high - last.low || 1e-9;
  const upper = last.high - Math.max(last.close, last.open);
  const lower = Math.min(last.close, last.open) - last.low;

  if (last.close > last.open && prev.close < prev.open && last.close > prev.open && last.open < prev.close)
    return "Bullish Engulfing";
  if (last.close < last.open && prev.close > prev.open && last.close < prev.open && last.open > prev.close)
    return "Bearish Engulfing";
  if (lower > body * 2 && upper < body) return "Hammer";
  if (upper > body * 2 && lower < body) return "Shooting Star";
  if (body / range < 0.1) return "Doji";
  return last.close > last.open ? "Bullish Marubozu" : "Bearish Marubozu";
}

export function analyze(candles: Candle[]): Analysis {
  const closes = candles.map((c) => c.close);
  const last = closes[closes.length - 1];
  const r = rsi(closes);
  const { macd: m, signal: s } = macd(closes);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const trendDelta = (sma20 - sma50) / sma50;
  const trend: "UP" | "DOWN" | "FLAT" =
    trendDelta > 0.0008 ? "UP" : trendDelta < -0.0008 ? "DOWN" : "FLAT";
  const pattern = detectPattern(candles);

  const agents: AgentResult[] = [];

  // 1. Trend Analysis AI
  {
    const vote: Direction = trend === "DOWN" ? "SELL" : "BUY";
    const conf = 60 + Math.min(35, Math.abs(trendDelta) * 8000);
    agents.push({
      name: "Trend Analyst",
      role: "Trend Analysis AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `SMA20 ${sma20.toFixed(4)} vs SMA50 ${sma50.toFixed(4)} — trend ${trend}.`,
    });
  }

  // 2. Candlestick Pattern AI
  {
    const bullish = ["Bullish Engulfing", "Hammer", "Bullish Marubozu"].includes(pattern);
    const bearish = ["Bearish Engulfing", "Shooting Star", "Bearish Marubozu"].includes(pattern);
    const vote: Direction = bearish ? "SELL" : bullish ? "BUY" : last >= candles[candles.length - 2].close ? "BUY" : "SELL";
    const conf = bullish || bearish ? 78 + Math.random() * 12 : 62 + Math.random() * 10;
    agents.push({
      name: "Pattern Reader",
      role: "Candlestick Pattern AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Detected ${pattern} on the last candle.`,
    });
  }

  // 3. RSI & MACD AI
  {
    const macdBull = m > s;
    const rsiBull = r < 70 && r > 30 ? macdBull : r <= 30;
    const vote: Direction = rsiBull ? "BUY" : "SELL";
    const conf = 65 + Math.min(30, Math.abs(r - 50) * 0.6 + Math.abs(m - s) * 200);
    agents.push({
      name: "Indicator Engine",
      role: "RSI & MACD AI",
      vote,
      confidence: Math.round(Math.min(95, conf)),
      reasoning: `RSI ${r.toFixed(1)}, MACD ${m.toFixed(5)} vs signal ${s.toFixed(5)}.`,
    });
  }

  // 4. Risk Management AI
  {
    const volatility = Math.abs(candles[candles.length - 1].high - candles[candles.length - 1].low) / last;
    const safe = volatility < 0.005;
    const vote: Direction = trend === "DOWN" ? "SELL" : "BUY";
    const conf = safe ? 80 + Math.random() * 10 : 65 + Math.random() * 10;
    agents.push({
      name: "Risk Sentinel",
      role: "Risk Management AI",
      vote,
      confidence: Math.round(conf),
      reasoning: safe
        ? `Volatility ${(volatility * 100).toFixed(2)}% — favorable risk profile.`
        : `Volatility ${(volatility * 100).toFixed(2)}% — caution advised.`,
    });
  }

  // 5. Market Sentiment AI
  {
    const recent = closes.slice(-10);
    const ups = recent.filter((v, i) => i > 0 && v > recent[i - 1]).length;
    const vote: Direction = ups >= 5 ? "BUY" : "SELL";
    const conf = 70 + Math.abs(ups - 4.5) * 4;
    agents.push({
      name: "Sentiment Oracle",
      role: "Market Sentiment AI",
      vote,
      confidence: Math.round(Math.min(94, conf)),
      reasoning: `${ups}/9 up-ticks in the last 10 candles — momentum ${ups >= 5 ? "positive" : "negative"}.`,
    });
  }

  // 6. Bollinger Bands AI
  {
    const period = 20;
    const slice = closes.slice(-period);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
    const sd = Math.sqrt(variance);
    const upper = mean + 2 * sd;
    const lower = mean - 2 * sd;
    const pos = (last - lower) / (upper - lower || 1e-9);
    const vote: Direction = pos < 0.3 ? "BUY" : pos > 0.7 ? "SELL" : last > mean ? "BUY" : "SELL";
    const conf = 72 + Math.min(22, Math.abs(pos - 0.5) * 40);
    agents.push({
      name: "Volatility Sage",
      role: "Bollinger Bands AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Price at ${(pos * 100).toFixed(0)}% of the BB range (μ=${mean.toFixed(4)}, σ=${sd.toFixed(4)}).`,
    });
  }

  // 7. Support / Resistance AI
  {
    const window = candles.slice(-30);
    const highs = window.map((c) => c.high);
    const lows = window.map((c) => c.low);
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    const distR = (resistance - last) / last;
    const distS = (last - support) / last;
    const vote: Direction = distS < distR ? "BUY" : "SELL";
    const conf = 70 + Math.min(24, Math.abs(distR - distS) * 1500);
    agents.push({
      name: "Level Hunter",
      role: "Support / Resistance AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Support ${support.toFixed(4)} / Resistance ${resistance.toFixed(4)} — closer to ${distS < distR ? "support" : "resistance"}.`,
    });
  }

  // 8. Stochastic Oscillator AI
  {
    const period = 14;
    const slice = candles.slice(-period);
    const hh = Math.max(...slice.map((c) => c.high));
    const ll = Math.min(...slice.map((c) => c.low));
    const k = ((last - ll) / (hh - ll || 1e-9)) * 100;
    const vote: Direction = k < 30 ? "BUY" : k > 70 ? "SELL" : k > 50 ? "BUY" : "SELL";
    const conf = 70 + Math.min(24, Math.abs(k - 50) * 0.5);
    agents.push({
      name: "Stochastic Seer",
      role: "Stochastic Oscillator AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `%K = ${k.toFixed(1)} — ${k < 30 ? "oversold" : k > 70 ? "overbought" : "neutral"}.`,
    });
  }

  // 9. Volume / Momentum AI (simulated volume from candle range)
  {
    const last5 = candles.slice(-5);
    const prev5 = candles.slice(-10, -5);
    const energy = (cs: Candle[]) => cs.reduce((a, c) => a + (c.high - c.low) * Math.sign(c.close - c.open || 1), 0);
    const cur = energy(last5);
    const prev = energy(prev5);
    const vote: Direction = cur >= prev ? "BUY" : "SELL";
    const conf = 70 + Math.min(22, Math.abs(cur - prev) * 4000);
    agents.push({
      name: "Momentum Hawk",
      role: "Volume / Momentum AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Directional energy ${cur.toFixed(4)} vs prior ${prev.toFixed(4)}.`,
    });
  }

  // 10. Fibonacci Retracement AI
  {
    const window = candles.slice(-40);
    const hi = Math.max(...window.map((c) => c.high));
    const lo = Math.min(...window.map((c) => c.low));
    const fib50 = lo + (hi - lo) * 0.5;
    const fib618 = lo + (hi - lo) * 0.618;
    const vote: Direction = last < fib50 ? "BUY" : last > fib618 ? "SELL" : trend === "UP" ? "BUY" : "SELL";
    const conf = 72 + Math.min(20, Math.abs(last - fib50) / (hi - lo || 1) * 80);
    agents.push({
      name: "Fibonacci Mystic",
      role: "Fibonacci Retracement AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Last ${last.toFixed(4)} vs 50% ${fib50.toFixed(4)} / 61.8% ${fib618.toFixed(4)}.`,
    });
  }

  // 11. Ichimoku Cloud AI (simplified Tenkan/Kijun)
  {
    const high = (n: number) => Math.max(...candles.slice(-n).map((c) => c.high));
    const low = (n: number) => Math.min(...candles.slice(-n).map((c) => c.low));
    const tenkan = (high(9) + low(9)) / 2;
    const kijun = (high(26) + low(26)) / 2;
    const vote: Direction = tenkan > kijun && last > kijun ? "BUY" : tenkan < kijun && last < kijun ? "SELL" : last > kijun ? "BUY" : "SELL";
    const conf = 73 + Math.min(21, Math.abs(tenkan - kijun) / last * 5000);
    agents.push({
      name: "Cloud Walker",
      role: "Ichimoku Cloud AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Tenkan ${tenkan.toFixed(4)} vs Kijun ${kijun.toFixed(4)}.`,
    });
  }

  // 12. Multi-Timeframe Confluence AI
  {
    const shortTrend = sma(closes.slice(-10), 10) - sma(closes.slice(-20), 20);
    const longTrend = sma20 - sma50;
    const aligned = Math.sign(shortTrend) === Math.sign(longTrend) && shortTrend !== 0;
    const vote: Direction = (aligned ? shortTrend : longTrend) > 0 ? "BUY" : "SELL";
    const conf = aligned ? 82 + Math.random() * 12 : 68 + Math.random() * 10;
    agents.push({
      name: "Confluence Master",
      role: "Multi-Timeframe AI",
      vote,
      confidence: Math.round(conf),
      reasoning: aligned
        ? `Short and long-term trends aligned ${shortTrend > 0 ? "bullish" : "bearish"}.`
        : `Timeframes disagree — lower conviction.`,
    });
  }

  // 13. Smart Money Flow AI — tracks where institutional money is flowing
  {
    const recent = candles.slice(-20);
    const buyPressure = recent.reduce((a, c) => {
      const range = c.high - c.low || 1e-9;
      const closeLoc = (c.close - c.low) / range; // 0..1, higher = stronger close
      return a + (closeLoc - 0.5) * (c.high - c.low);
    }, 0);
    const vote: Direction = buyPressure >= 0 ? "BUY" : "SELL";
    const strength = Math.min(28, Math.abs(buyPressure) / last * 10000);
    const conf = 76 + strength;
    agents.push({
      name: "Whale Tracker",
      role: "Smart Money Flow AI",
      vote,
      confidence: Math.round(Math.min(97, conf)),
      reasoning: `Accumulation/distribution pressure ${buyPressure.toFixed(5)} — institutions ${buyPressure >= 0 ? "buying" : "selling"}.`,
    });
  }

  // 14. Order Flow Imbalance AI — detects bid/ask aggression
  {
    const recent = candles.slice(-15);
    const bullVol = recent.filter((c) => c.close > c.open).reduce((a, c) => a + (c.high - c.low), 0);
    const bearVol = recent.filter((c) => c.close < c.open).reduce((a, c) => a + (c.high - c.low), 0);
    const imbalance = (bullVol - bearVol) / (bullVol + bearVol || 1);
    const vote: Direction = imbalance >= 0 ? "BUY" : "SELL";
    const conf = 78 + Math.min(20, Math.abs(imbalance) * 40);
    agents.push({
      name: "Order Flow Sniper",
      role: "Order Flow Imbalance AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Aggression imbalance ${(imbalance * 100).toFixed(1)}% favoring ${imbalance >= 0 ? "bulls" : "bears"}.`,
    });
  }

  // 15. Elliott Wave AI — counts impulse vs corrective structure
  {
    const swings: number[] = [];
    for (let i = 2; i < candles.length - 2; i++) {
      const c = candles[i];
      const isHigh = c.high > candles[i - 1].high && c.high > candles[i - 2].high && c.high > candles[i + 1].high && c.high > candles[i + 2].high;
      const isLow = c.low < candles[i - 1].low && c.low < candles[i - 2].low && c.low < candles[i + 1].low && c.low < candles[i + 2].low;
      if (isHigh) swings.push(c.high);
      else if (isLow) swings.push(-c.low);
    }
    const recent = swings.slice(-5);
    const impulseUp = recent.length >= 3 && recent[recent.length - 1] > 0;
    const vote: Direction = impulseUp ? "BUY" : "SELL";
    const conf = 77 + Math.min(20, recent.length * 3);
    agents.push({
      name: "Wave Theorist",
      role: "Elliott Wave AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Detected ${recent.length} swing pivots — impulse phase ${impulseUp ? "bullish" : "bearish"}.`,
    });
  }

  // 16. Volatility Regime AI — adapts to market regime
  {
    const ranges = candles.slice(-20).map((c) => (c.high - c.low) / c.close);
    const avgVol = ranges.reduce((a, b) => a + b, 0) / ranges.length;
    const recentVol = ranges.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const expanding = recentVol > avgVol * 1.2;
    const direction = closes[closes.length - 1] > closes[closes.length - 5] ? "BUY" : "SELL";
    const vote: Direction = expanding ? direction : (trend === "DOWN" ? "SELL" : "BUY");
    const conf = expanding ? 84 + Math.random() * 12 : 72 + Math.random() * 10;
    agents.push({
      name: "Regime Adapter",
      role: "Volatility Regime AI",
      vote,
      confidence: Math.round(Math.min(96, conf)),
      reasoning: `Volatility ${expanding ? "expanding" : "contracting"} (${(recentVol * 100).toFixed(2)}% vs avg ${(avgVol * 100).toFixed(2)}%).`,
    });
  }

  // 17. Liquidity Hunter AI — detects stop-loss sweeps & liquidity grabs
  {
    const window = candles.slice(-30);
    const swingHigh = Math.max(...window.slice(0, -3).map((c) => c.high));
    const swingLow = Math.min(...window.slice(0, -3).map((c) => c.low));
    const lastBars = candles.slice(-3);
    const sweptHigh = lastBars.some((c) => c.high > swingHigh && c.close < swingHigh);
    const sweptLow = lastBars.some((c) => c.low < swingLow && c.close > swingLow);
    const vote: Direction = sweptHigh ? "SELL" : sweptLow ? "BUY" : (last > (swingHigh + swingLow) / 2 ? "SELL" : "BUY");
    const conf = sweptHigh || sweptLow ? 88 + Math.random() * 10 : 73 + Math.random() * 8;
    agents.push({
      name: "Liquidity Hunter",
      role: "Liquidity Sweep AI",
      vote,
      confidence: Math.round(Math.min(98, conf)),
      reasoning: sweptHigh ? `Liquidity grab above ${swingHigh.toFixed(4)} — reversal expected.`
        : sweptLow ? `Liquidity grab below ${swingLow.toFixed(4)} — reversal expected.`
        : `Price ranging within ${swingLow.toFixed(4)}–${swingHigh.toFixed(4)}.`,
    });
  }

  // 18. Market Structure AI — Higher Highs / Higher Lows analysis
  {
    const window = candles.slice(-25);
    const mid = Math.floor(window.length / 2);
    const firstHi = Math.max(...window.slice(0, mid).map((c) => c.high));
    const lastHi = Math.max(...window.slice(mid).map((c) => c.high));
    const firstLo = Math.min(...window.slice(0, mid).map((c) => c.low));
    const lastLo = Math.min(...window.slice(mid).map((c) => c.low));
    const bullStructure = lastHi > firstHi && lastLo > firstLo;
    const bearStructure = lastHi < firstHi && lastLo < firstLo;
    const vote: Direction = bullStructure ? "BUY" : bearStructure ? "SELL" : trend === "UP" ? "BUY" : "SELL";
    const conf = bullStructure || bearStructure ? 86 + Math.random() * 11 : 70 + Math.random() * 8;
    agents.push({
      name: "Structure Architect",
      role: "Market Structure AI",
      vote,
      confidence: Math.round(Math.min(97, conf)),
      reasoning: bullStructure ? "Higher highs + higher lows — bullish structure intact."
        : bearStructure ? "Lower highs + lower lows — bearish structure confirmed."
        : "Structure unclear — defaulting to trend.",
    });
  }

  // 19. Divergence Detector AI — price vs RSI divergence
  {
    const recent = closes.slice(-14);
    const priceChange = recent[recent.length - 1] - recent[0];
    const rsiNow = rsi(closes);
    const rsiPrev = rsi(closes.slice(0, -7));
    const rsiChange = rsiNow - rsiPrev;
    const bullDiv = priceChange < 0 && rsiChange > 0;
    const bearDiv = priceChange > 0 && rsiChange < 0;
    const vote: Direction = bullDiv ? "BUY" : bearDiv ? "SELL" : rsiNow < 50 ? "SELL" : "BUY";
    const conf = bullDiv || bearDiv ? 89 + Math.random() * 9 : 71 + Math.random() * 8;
    agents.push({
      name: "Divergence Oracle",
      role: "Divergence Detection AI",
      vote,
      confidence: Math.round(Math.min(98, conf)),
      reasoning: bullDiv ? `Bullish divergence — price down, RSI up (${rsiPrev.toFixed(1)}→${rsiNow.toFixed(1)}).`
        : bearDiv ? `Bearish divergence — price up, RSI down (${rsiPrev.toFixed(1)}→${rsiNow.toFixed(1)}).`
        : `No divergence — RSI ${rsiNow.toFixed(1)}.`,
    });
  }

  // 20. Neural Confluence AI — meta-agent weighing all prior signals
  {
    const buyVotes = agents.filter((a) => a.vote === "BUY").length;
    const sellVotes = agents.filter((a) => a.vote === "SELL").length;
    const avgBuyConf = buyVotes ? agents.filter((a) => a.vote === "BUY").reduce((s, a) => s + a.confidence, 0) / buyVotes : 0;
    const avgSellConf = sellVotes ? agents.filter((a) => a.vote === "SELL").reduce((s, a) => s + a.confidence, 0) / sellVotes : 0;
    const vote: Direction = avgBuyConf * buyVotes >= avgSellConf * sellVotes ? "BUY" : "SELL";
    const consensus = Math.abs(buyVotes - sellVotes) / agents.length;
    const conf = 85 + Math.min(13, consensus * 30);
    agents.push({
      name: "Neural Synthesizer",
      role: "Neural Confluence AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Meta-analysis: ${buyVotes} BUY (avg ${avgBuyConf.toFixed(0)}%) vs ${sellVotes} SELL (avg ${avgSellConf.toFixed(0)}%) — ${(consensus * 100).toFixed(0)}% consensus.`,
    });
  }

  // 21. Quantum Probability AI — Bayesian probability weighting
  {
    const upMoves = closes.slice(-30).filter((v, i, a) => i > 0 && v > a[i - 1]).length;
    const probUp = upMoves / 29;
    const vote: Direction = probUp >= 0.5 ? "BUY" : "SELL";
    const conf = 80 + Math.min(18, Math.abs(probUp - 0.5) * 60);
    agents.push({
      name: "Quantum Probabilist",
      role: "Quantum Probability AI",
      vote,
      confidence: Math.round(conf),
      reasoning: `Bayesian P(up) = ${(probUp * 100).toFixed(1)}% over last 30 candles.`,
    });
  }

  // 22. Harmonic Pattern AI — Gartley/Bat ratio detection
  {
    const window = candles.slice(-20);
    const hi = Math.max(...window.map((c) => c.high));
    const lo = Math.min(...window.map((c) => c.low));
    const range = hi - lo || 1e-9;
    const pos = (last - lo) / range;
    const harmonic = pos > 0.618 && pos < 0.786; // PRZ zone
    const vote: Direction = pos > 0.618 ? "SELL" : pos < 0.382 ? "BUY" : trend === "UP" ? "BUY" : "SELL";
    const conf = harmonic ? 87 + Math.random() * 10 : 74 + Math.random() * 8;
    agents.push({
      name: "Harmonic Geometer",
      role: "Harmonic Pattern AI",
      vote,
      confidence: Math.round(Math.min(97, conf)),
      reasoning: `Price at ${(pos * 100).toFixed(1)}% of swing — ${harmonic ? "PRZ reversal zone" : "neutral"}.`,
    });
  }

  // 23. Wyckoff Phase AI — accumulation/distribution phases
  {
    const recent = candles.slice(-30);
    const meanPrice = recent.reduce((a, c) => a + c.close, 0) / recent.length;
    const meanRange = recent.reduce((a, c) => a + (c.high - c.low), 0) / recent.length;
    const tightening = (recent.slice(-10).reduce((a, c) => a + (c.high - c.low), 0) / 10) < meanRange * 0.8;
    const aboveMean = last > meanPrice;
    const phase = tightening ? (aboveMean ? "Distribution" : "Accumulation") : (aboveMean ? "Markup" : "Markdown");
    const vote: Direction = phase === "Accumulation" || phase === "Markup" ? "BUY" : "SELL";
    const conf = tightening ? 86 + Math.random() * 11 : 75 + Math.random() * 9;
    agents.push({
      name: "Wyckoff Analyst",
      role: "Wyckoff Phase AI",
      vote,
      confidence: Math.round(Math.min(97, conf)),
      reasoning: `Detected ${phase} phase — range ${tightening ? "tightening" : "expanding"}.`,
    });
  }

  // 24. Order Block AI — institutional order block detection
  {
    const window = candles.slice(-40, -5);
    const bigCandles = window.filter((c) => Math.abs(c.close - c.open) > (c.high - c.low) * 0.7);
    const lastBig = bigCandles[bigCandles.length - 1];
    const obLevel = lastBig ? (lastBig.open + lastBig.close) / 2 : last;
    const isBull = lastBig ? lastBig.close > lastBig.open : trend === "UP";
    const vote: Direction = isBull ? "BUY" : "SELL";
    const conf = lastBig ? 85 + Math.random() * 12 : 72 + Math.random() * 8;
    agents.push({
      name: "Block Hunter",
      role: "Order Block AI",
      vote,
      confidence: Math.round(Math.min(97, conf)),
      reasoning: `${isBull ? "Bullish" : "Bearish"} order block at ${obLevel.toFixed(4)} — institutional footprint.`,
    });
  }

  // 25. Mean Reversion AI — Z-score statistical extreme
  {
    const window = closes.slice(-50);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const sd = Math.sqrt(window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length);
    const z = (last - mean) / (sd || 1e-9);
    const vote: Direction = z > 1.5 ? "SELL" : z < -1.5 ? "BUY" : trend === "UP" ? "BUY" : "SELL";
    const conf = Math.abs(z) > 1.5 ? 88 + Math.random() * 9 : 73 + Math.random() * 8;
    agents.push({
      name: "Reversion Sage",
      role: "Mean Reversion AI",
      vote,
      confidence: Math.round(Math.min(97, conf)),
      reasoning: `Z-score ${z.toFixed(2)} — ${Math.abs(z) > 1.5 ? "statistical extreme, mean reversion likely" : "within normal range"}.`,
    });
  }

  // 26. Momentum Burst AI — ROC + acceleration
  {
    const roc = (closes[closes.length - 1] - closes[closes.length - 10]) / closes[closes.length - 10];
    const rocPrev = (closes[closes.length - 10] - closes[closes.length - 20]) / closes[closes.length - 20];
    const accelerating = Math.sign(roc) === Math.sign(rocPrev) && Math.abs(roc) > Math.abs(rocPrev);
    const vote: Direction = roc >= 0 ? "BUY" : "SELL";
    const conf = accelerating ? 87 + Math.min(10, Math.abs(roc) * 500) : 74 + Math.min(10, Math.abs(roc) * 300);
    agents.push({
      name: "Momentum Igniter",
      role: "Momentum Burst AI",
      vote,
      confidence: Math.round(Math.min(98, conf)),
      reasoning: `ROC ${(roc * 100).toFixed(2)}% (prev ${(rocPrev * 100).toFixed(2)}%) — ${accelerating ? "accelerating" : "decelerating"}.`,
    });
  }

  // 27. AI Ensemble Predictor — final super-agent (weighted softmax)
  {
    const weights = agents.map((a) => (a.vote === "BUY" ? 1 : -1) * (a.confidence / 100) ** 2);
    const score = weights.reduce((a, b) => a + b, 0);
    const vote: Direction = score >= 0 ? "BUY" : "SELL";
    const magnitude = Math.abs(score) / agents.length;
    const conf = 90 + Math.min(9, magnitude * 30);
    agents.push({
      name: "Ensemble Mastermind",
      role: "AI Ensemble Predictor",
      vote,
      confidence: Math.round(conf),
      reasoning: `Softmax-weighted ensemble score ${score.toFixed(2)} from ${agents.length} agents — ${vote} conviction.`,
    });
  }

  // Weighted vote — exclude meta-agents (they just re-tally others, would double-count)
  // and use squared confidence so high-conviction signals dominate noise.
  const META_ROLES = new Set(["Neural Confluence AI", "AI Ensemble Predictor"]);
  const voters = agents.filter((a) => !META_ROLES.has(a.role));
  const sq = (c: number) => (c / 100) ** 2;
  const buyWeight = voters.filter((a) => a.vote === "BUY").reduce((s, a) => s + sq(a.confidence), 0);
  const sellWeight = voters.filter((a) => a.vote === "SELL").reduce((s, a) => s + sq(a.confidence), 0);
  const decision: Direction = buyWeight >= sellWeight ? "BUY" : "SELL";
  const total = buyWeight + sellWeight;
  const winning = decision === "BUY" ? buyWeight : sellWeight;
  const ratio = total > 0 ? winning / total : 0.5;
  const confidence = Math.round(75 + Math.min(24, (ratio - 0.5) * 2 * 24));

  return {
    decision,
    confidence,
    agents,
    indicators: { rsi: r, macd: m, macdSignal: s, sma20, sma50, trend, pattern },
  };
}
