import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Brain, ShieldAlert, Sparkles, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: Brain, title: "12-Agent AI Council", desc: "Twelve specialized AIs analyze the same chart and vote on a unified call." },
  { icon: TrendingUp, title: "Multi-Indicator Fusion", desc: "RSI, MACD, SMA, Bollinger, Ichimoku, Fibonacci and more — combined." },
  { icon: ShieldAlert, title: "Risk-Aware", desc: "A dedicated risk-management agent tempers signals during high volatility." },
  { icon: Zap, title: "Real-time Engine", desc: "Live forex candles refreshed every 30s across 1m, 5m and 15m." },
];

const TAGLINES = [
  "12 AI agents live · ready for your first signal",
  "Multi-timeframe analysis · 1m / 5m / 15m",
  "Risk-aware council · no fabricated trades",
  "Connect your broker · MT4 / MT5 / webhook",
];

export function HeroLanding() {
  const [tickerIdx, setTickerIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTickerIdx((i) => (i + 1) % TAGLINES.length), 2400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen gradient-radial">
      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-primary/15 neon-border">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="font-display text-lg tracking-widest text-glow">GENIUS AI</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#agents" className="hover:text-foreground">Agents</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link to="/support" className="hover:text-foreground">Support</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
          <Link to="/signup">
            <Button variant="default" className="neon-border bg-primary text-primary-foreground hover:bg-primary/90">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-bull pulse-ring" />
          Multi-AI engine online · {TAGLINES[tickerIdx]}
        </div>
        <h1 className="mx-auto mt-6 max-w-4xl font-display text-5xl leading-tight md:text-7xl">
          <span className="text-foreground">Predict the next move.</span>
          <br />
          <span className="text-glow text-primary">Powered by 12 trading AIs.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Genius AI fuses trend, momentum, volatility, sentiment and pattern-recognition agents
          into a single high-confidence BUY or SELL signal on real forex markets.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link to="/signup">
            <Button size="lg" className="h-12 px-8 text-base neon-border bg-primary text-primary-foreground hover:bg-primary/90">
              Start free trial →
            </Button>
          </Link>
          <Link to="/pricing">
            <Button size="lg" variant="outline" className="h-12 px-8 text-base">
              See pricing
            </Button>
          </Link>
        </div>

        {/* Floating mock dashboard preview */}
        <div className="relative mx-auto mt-16 max-w-5xl">
          <div className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur neon-border">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" />
                EUR/USD · 5m · Live
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-bull/15 px-2 py-1 text-xs font-semibold text-bull">BUY</span>
                <span className="rounded-md border border-border px-2 py-1 text-xs">87% confidence</span>
              </div>
            </div>
            <div className="grid grid-cols-12 gap-3 pt-4">
              <div className="col-span-12 h-44 rounded-lg grid-bg scanline relative overflow-hidden md:col-span-8">
                <svg viewBox="0 0 400 160" className="absolute inset-0 h-full w-full">
                  <polyline
                    fill="none"
                    stroke="oklch(0.78 0.18 180)"
                    strokeWidth="2"
                    points="0,110 30,98 60,106 90,82 120,90 150,72 180,80 210,60 240,68 270,52 300,58 330,40 360,46 400,30"
                  />
                  <polyline
                    fill="oklch(0.78 0.18 180 / 0.18)"
                    stroke="none"
                    points="0,110 30,98 60,106 90,82 120,90 150,72 180,80 210,60 240,68 270,52 300,58 330,40 360,46 400,30 400,160 0,160"
                  />
                </svg>
              </div>
              <div className="col-span-12 grid grid-cols-2 gap-2 md:col-span-4">
                {["Trend", "Pattern", "RSI/MACD", "Risk"].map((n) => (
                  <div key={n} className="rounded-lg border border-border bg-background/50 p-3 text-left">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{n}</div>
                    <div className="mt-1 text-sm font-semibold text-bull">BUY</div>
                    <div className="mt-2 h-1 overflow-hidden rounded bg-muted">
                      <div className="h-full w-4/5 shimmer bg-primary" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="agents" className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="font-display text-3xl md:text-4xl">A council of specialists.</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Each agent owns one slice of the market. Together they outvote noise.
        </p>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-xl border border-border bg-card/60 p-5 transition hover:bg-card hover:neon-border">
              <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            { n: "01", t: "Pick a market", d: "Choose a currency pair and timeframe (1m, 5m, 15m)." },
            { n: "02", t: "AIs analyze", d: "Five agents run trend, pattern, momentum, risk and sentiment passes." },
            { n: "03", t: "Vote & verdict", d: "A weighted vote produces a BUY/SELL with confidence between 75–99%." },
          ].map((s) => (
            <div key={s.n} className="rounded-xl border border-border bg-card/40 p-6">
              <div className="font-display text-3xl text-primary text-glow">{s.n}</div>
              <div className="mt-3 font-display text-xl">{s.t}</div>
              <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 text-center">
        <h2 className="font-display text-3xl md:text-4xl">Three tiers. Real signals.</h2>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          Start with 2 bots on Basic, scale up to all 12 on Elite. Cards & Mobile Money via Paystack.
        </p>
        <div className="mt-8">
          <Link to="/pricing">
            <Button size="lg" className="h-12 px-8 text-base neon-border bg-primary text-primary-foreground hover:bg-primary/90">
              View plans
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-6 py-8 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">Risk disclaimer</p>
          <p className="mt-2 max-w-3xl">
            Trading involves substantial risk of loss. Genius AI provides analytical and educational
            assistance only — predictions are probabilistic and not guaranteed. Past performance does
            not indicate future results. Trade responsibly and never risk capital you cannot afford to lose.
          </p>
          <p className="mt-4 opacity-60">© {new Date().getFullYear()} Genius AI · All rights reserved.</p>
          <div className="mt-4 flex flex-wrap gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/support" className="hover:text-foreground">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
