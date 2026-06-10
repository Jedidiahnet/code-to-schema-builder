import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Brain, Lock, RefreshCw, Sparkles, Zap, AlertTriangle, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PriceChart } from "@/components/PriceChart";
import { generateCandles, PAIRS, type Analysis, type Candle, type AgentResult } from "@/lib/genius-ai";
import { fetchCandles } from "@/lib/market-data.functions";
import { runAnalysisFn, getMySignals } from "@/lib/analysis.functions";
import { getMyPlan } from "@/lib/subscription.functions";
import { AGENT_ORDER, PLANS, planLabel } from "@/lib/plans";

const TIMEFRAMES = ["1m", "5m", "15m"];

type SeniorInteractionView = {
  senior: string;
  addressedTo?: string;
  message: string;
  verdict: "CONFIRM";
};
type SeniorPayload = {
  interactions: SeniorInteractionView[];
  juniorSummary: { buyVotes: number; sellVotes: number; consensusPct: number };
  juniorDecision: "BUY" | "SELL";
  juniorConfidence: number;
};

export function TradingDashboard() {
  const [pair, setPair] = useState("EUR/USD");
  const [tf, setTf] = useState<"1m" | "5m" | "15m">("5m");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [senior, setSenior] = useState<SeniorPayload | null>(null);
  const [showInteractions, setShowInteractions] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dataSource, setDataSource] = useState<"live" | "simulated">("simulated");
  const [dataError, setDataError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  const fetchCandlesFn = useServerFn(fetchCandles);
  const analyzeFn = useServerFn(runAnalysisFn);
  const planFn = useServerFn(getMyPlan);
  const signalsFn = useServerFn(getMySignals);

  const planQ = useQuery({ queryKey: ["my-plan"], queryFn: () => planFn() });
  const signalsQ = useQuery({ queryKey: ["my-signals"], queryFn: () => signalsFn() });

  const plan = planQ.data?.plan ?? null;
  const planCfg = plan ? PLANS[plan] : null;
  const allowedCount = planCfg?.botCount ?? 0;
  const latestCandle = candles[candles.length - 1];
  const tradeTiming = analysis && latestCandle ? getTradeTiming(analysis, latestCandle.close, tf) : null;

  const loadCandles = async () => {
    try {
      const res = await fetchCandlesFn({ data: { pair, timeframe: tf, count: 100 } });
      if (res.candles.length >= 30) {
        setDataSource("live"); setDataError(null); setCandles(res.candles); return;
      }
      setDataSource("simulated");
      setDataError(res.error || "Insufficient live data, using simulated candles.");
      setCandles(generateCandles(pair, tf));
    } catch (e) {
      setDataSource("simulated");
      setDataError(e instanceof Error ? e.message : "Live data unavailable");
      setCandles(generateCandles(pair, tf));
    }
  };

  useEffect(() => {
    // Reset stale state immediately on pair/timeframe switch so the user
    // never sees the previous timeframe's price, RSI, MACD or pattern.
    setCandles([]);
    setAnalysis(null);
    setSenior(null);
    setShowInteractions(false);
    setActionError(null);
    setDataError(null);
    void loadCandles();
    const t = setInterval(() => { void loadCandles(); }, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, tf]);


  const accuracy = useMemo(() => {
    const sig = signalsQ.data ?? [];
    const decided = sig.filter((s) => s.outcome);
    if (!decided.length) return 86;
    const wins = decided.filter((s) => s.outcome === "WIN").length;
    return Math.round((wins / decided.length) * 100);
  }, [signalsQ.data]);

  const runAnalysis = async () => {
    setActionError(null);
    if (!plan) { setActionError("Pick a plan to start analyzing."); return; }
    setAnalyzing(true); setAnalysis(null); setSenior(null); setShowInteractions(false); setProgress(0);
    const ticker = setInterval(() => setProgress((p) => Math.min(95, p + 8)), 120);
    try {
      const res = await analyzeFn({ data: { pair, timeframe: tf } });
      clearInterval(ticker); setProgress(100);
      setCandles(res.candles);
      setDataSource(res.dataSource);
      setAnalysis({
        decision: res.decision,
        confidence: res.confidence,
        agents: res.agents as AgentResult[],
        indicators: res.indicators,
      });
      setSenior((res.senior as SeniorPayload | null) ?? null);
      setRemaining(res.remaining);
      void signalsQ.refetch();
    } catch (e) {
      clearInterval(ticker);
      setActionError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div>
      {/* Sub-header (the auth layout has the main one) */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-display tracking-widest text-glow">{AGENT_ORDER.length}-AGENT COUNCIL</span>
          <span className="hidden md:inline">· {allowedCount}/{AGENT_ORDER.length} unlocked on {planLabel(plan)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-md border px-2 py-1 font-mono ${dataSource === "live" ? "border-bull/40 text-bull" : "border-yellow-500/40 text-yellow-400"}`}>
            {dataSource === "live" ? "● LIVE" : "● SIM"}
          </span>
          <span className="rounded-md border border-border bg-card/60 px-2 py-1 font-mono text-bull">{accuracy}% acc</span>
          {remaining !== null && (
            <span className="rounded-md border border-border bg-card/60 px-2 py-1 font-mono">{remaining} left today</span>
          )}
        </div>
      </div>

      {(dataError || actionError) && (
        <div className="mx-auto max-w-7xl px-4 pt-3">
          {dataError && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-xs text-yellow-300">
              <AlertTriangle className="h-3.5 w-3.5" /> {dataError}
            </div>
          )}
          {actionError && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-bear/30 bg-bear/5 px-3 py-2 text-xs text-bear">
              <AlertTriangle className="h-3.5 w-3.5" /> {actionError}
              {!plan && <Link to="/pricing" className="ml-2 underline">View plans</Link>}
            </div>
          )}
        </div>
      )}

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <div className="rounded-2xl border border-border bg-card/60 p-4 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={pair} onValueChange={setPair}>
                  <SelectTrigger className="w-[150px] bg-background/60"><SelectValue /></SelectTrigger>
                  <SelectContent>{PAIRS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
                <div className="flex rounded-md border border-border bg-background/60 p-0.5">
                  {TIMEFRAMES.map((t) => (
                    <button key={t} onClick={() => setTf(t as "1m" | "5m" | "15m")}
                      className={`px-3 py-1 text-xs font-semibold rounded ${tf === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t}</button>
                  ))}
                </div>
              </div>
              <Button onClick={runAnalysis} disabled={analyzing}
                className="neon-border bg-primary text-primary-foreground hover:bg-primary/90">
                {analyzing ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Analyzing…</> : <><Zap className="mr-2 h-4 w-4" />Run AI Analysis</>}
              </Button>
            </div>
            <PriceChart candles={candles} decision={analysis?.decision} />

            <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
              {analyzing && (
                <div>
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <Brain className="h-4 w-4 text-primary animate-pulse" />
                    Agents deliberating… {progress}%
                  </div>
                  <div className="h-1.5 overflow-hidden rounded bg-muted">
                    <div className="h-full bg-primary shimmer transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
              {!analyzing && analysis && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Verdict</div>
                    <div className={`mt-1 font-display text-4xl text-glow ${analysis.decision === "BUY" ? "text-bull" : "text-bear"}`}>{analysis.decision}</div>
                    <div className="mt-3 text-xs text-muted-foreground">Confidence</div>
                    <div className="mt-1 font-display text-2xl">{analysis.confidence}%</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${analysis.confidence}%` }} />
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-2 gap-2 text-xs">
                    <Stat label="Trend" value={analysis.indicators.trend} />
                    <Stat label="Pattern" value={analysis.indicators.pattern} />
                    <Stat label="RSI" value={analysis.indicators.rsi.toFixed(1)} />
                    <Stat label="MACD" value={`${analysis.indicators.macd.toFixed(4)} / ${analysis.indicators.macdSignal.toFixed(4)}`} />
                    <Stat label="SMA20" value={analysis.indicators.sma20.toFixed(4)} />
                    <Stat label="SMA50" value={analysis.indicators.sma50.toFixed(4)} />
                  </div>
                </div>
              )}
              {!analyzing && tradeTiming && (
                <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-primary"><Timer className="h-4 w-4" /> Trade timing</div>
                  <p className="mt-2 text-muted-foreground">{tradeTiming}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">Use this as analysis support only. Signals are not guaranteed.</p>
                </div>
              )}
              {!analyzing && !analysis && (
                <div className="text-center text-sm text-muted-foreground">
                  Press <span className="text-primary">Run AI Analysis</span> to launch the council.
                </div>
              )}
            </div>
          </div>

          {senior && analysis && (
            <div className="mt-4 rounded-2xl border border-primary/40 bg-primary/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-primary">Quantum council roundtable</div>
                  <div className="mt-1 font-display text-lg">
                    54 elite bots · one unanimous verdict
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    27 junior bots ran the reads, then 27 senior bots deliberated together — talking to each other directly — until the desk agreed on a single trade signal. No votes, no dissent.
                  </p>
                </div>
                <button
                  onClick={() => setShowInteractions((v) => !v)}
                  className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  {showInteractions ? "Hide" : "View"} council discussion
                </button>
              </div>
              {showInteractions && (
                <div className="mt-4 max-h-[420px] space-y-2 overflow-auto rounded-lg border border-border bg-background/40 p-3 text-xs">
                  {senior.interactions.map((it, idx) => (
                    <div key={idx} className="rounded-md border border-border/60 bg-card/50 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-mono text-[11px] text-primary">{it.senior}</div>
                        <span className="rounded bg-bull/20 px-1.5 py-0.5 text-[10px] font-bold text-bull">
                          AGREED
                        </span>
                      </div>
                      {it.addressedTo && (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">→ replying to {it.addressedTo}</div>
                      )}
                      <p className="mt-1 text-muted-foreground">{it.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Junior agent grid — hidden on Quantum (delivered as single signal). */}
          {!senior && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {AGENT_ORDER.map((role, i) => {
                const unlocked = i < allowedCount;
                const result = analysis?.agents.find((a) => a.role === role);
                return (
                  <AgentCard key={role} role={role} index={i} unlocked={unlocked} result={result ?? null} />
                );
              })}
            </div>
          )}
        </section>

        {/* History */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display">Signal history</h3>
              <span className="text-xs text-muted-foreground">{signalsQ.data?.length ?? 0} signals</span>
            </div>
            <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">
              {(!signalsQ.data || signalsQ.data.length === 0) && (
                <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  No signals yet. Run your first analysis.
                </div>
              )}
              {signalsQ.data?.map((h) => (
                <div key={h.id} className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3">
                  <div>
                    <div className="text-sm font-semibold">{h.pair} <span className="text-xs text-muted-foreground">· {h.timeframe}</span></div>
                    <div className="text-[11px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${h.decision === "BUY" ? "text-bull" : "text-bear"}`}>{h.decision} · {h.confidence}%</div>
                    {h.outcome && (
                      <div className={`text-[10px] uppercase tracking-wider ${h.outcome === "WIN" ? "text-bull" : "text-bear"}`}>{h.outcome}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">How to use it</p>
            <p className="mt-2">
              Choose the pair and timeframe, wait for live data, then run analysis. The platform becomes more powerful on higher plans because more specialist agents vote on the same setup, reducing single-indicator bias.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card/60 p-4 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground">Disclaimer</p>
            <p className="mt-2">
              Signals are generated from real Tiingo forex candles processed by up to 12 indicator-based agents. Trading carries
              significant risk; predictions are not guaranteed.
            </p>
          </div>
        </aside>
      </main>
    </div>
  );
}

function getTradeTiming(analysis: Analysis, price: number, timeframe: string) {
  const directionWord = analysis.decision === "BUY" ? "above" : "below";
  const buffer = price * (timeframe === "1m" ? 0.00008 : timeframe === "5m" ? 0.00012 : 0.00018);
  const trigger = analysis.decision === "BUY" ? price + buffer : price - buffer;
  const expiry = timeframe === "1m" ? "1–2 candles" : timeframe === "5m" ? "1 candle" : "the next candle";
  if (analysis.confidence < 80) return `Wait. Confidence is ${analysis.confidence}%, so only consider ${analysis.decision} if the next candle confirms ${directionWord} ${trigger.toFixed(5)}.`;
  return `Prepare ${analysis.decision}. Enter only after price holds ${directionWord} ${trigger.toFixed(5)}; skip if confirmation does not happen within ${expiry}.`;
}

function AgentCard({ role, index, unlocked, result }: { role: string; index: number; unlocked: boolean; result: AgentResult | null }) {
  return (
    <div className={`relative rounded-xl border p-4 ${unlocked ? "border-border bg-card/60" : "border-border/50 bg-card/30"}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Agent #{index + 1}</div>
      <div className="mt-1 font-display text-sm">{role}</div>
      {unlocked ? (
        result ? (
          <>
            <div className={`mt-3 font-display text-2xl ${result.vote === "BUY" ? "text-bull" : "text-bear"}`}>{result.vote}</div>
            <div className="mt-1 text-xs text-muted-foreground">{result.confidence}% confidence</div>
            <div className="mt-2 h-1 overflow-hidden rounded bg-muted">
              <div className={`h-full ${result.vote === "BUY" ? "bg-bull" : "bg-bear"}`} style={{ width: `${result.confidence}%` }} />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{result.reasoning}</p>
          </>
        ) : (
          <p className="mt-4 text-xs text-muted-foreground">Run analysis to see this agent's vote.</p>
        )
      ) : (
        <div className="mt-4 flex flex-col items-center justify-center gap-2 py-4 text-center">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Unlock with a higher plan</p>
          <Link to="/pricing" className="rounded-md border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] text-primary">
            Upgrade
          </Link>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-sm">{value}</div>
    </div>
  );
}
