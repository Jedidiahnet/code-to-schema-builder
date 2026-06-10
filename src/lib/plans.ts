// Shared plan configuration - used on both client (UI hints) and server (enforcement).
// Server is the source of truth; client UI mirrors it for display only.

export type PlanTier = "basic" | "pro" | "elite" | "quantum";

export type PlanConfig = {
  tier: PlanTier;
  name: string;
  priceMonthly: number;        // USD-equivalent shown on UI
  priceGhsMonthly: number;     // GHS amount actually charged via Paystack
  botCount: number;            // first N agents from AGENT_ORDER
  dailyAnalyses: number | "unlimited";
  perks: string[];
  highlight?: boolean;
};

// The 27 agents in priority order. Plan tier gets the first N.
// Names MUST match the `role` strings produced by analyze() in genius-ai.ts.
export const AGENT_ORDER = [
  "Trend Analysis AI",
  "RSI & MACD AI",
  "Candlestick Pattern AI",
  "Risk Management AI",
  "Market Sentiment AI",
  "Bollinger Bands AI",
  "Support / Resistance AI",
  "Stochastic Oscillator AI",
  "Volume / Momentum AI",
  "Fibonacci Retracement AI",
  "Ichimoku Cloud AI",
  "Multi-Timeframe AI",
  "Smart Money Flow AI",
  "Order Flow Imbalance AI",
  "Elliott Wave AI",
  "Volatility Regime AI",
  "Liquidity Sweep AI",
  "Market Structure AI",
  "Divergence Detection AI",
  "Neural Confluence AI",
  "Quantum Probability AI",
  "Harmonic Pattern AI",
  "Wyckoff Phase AI",
  "Order Block AI",
  "Mean Reversion AI",
  "Momentum Burst AI",
  "AI Ensemble Predictor",
] as const;

export const PLANS: Record<PlanTier, PlanConfig> = {
  basic: {
    tier: "basic",
    name: "Basic",
    priceMonthly: 20,
    priceGhsMonthly: 250,
    botCount: 2,
    dailyAnalyses: 10,
    perks: ["2 AI analysis bots", "10 analyses / day", "Live forex data", "Email support"],
  },
  pro: {
    tier: "pro",
    name: "Pro",
    priceMonthly: 30,
    priceGhsMonthly: 380,
    botCount: 5,
    dailyAnalyses: 50,
    perks: ["5 AI analysis bots", "50 analyses / day", "Detailed market analysis", "Telegram signals", "Priority support"],
    highlight: true,
  },
  elite: {
    tier: "elite",
    name: "Elite",
    priceMonthly: 50,
    priceGhsMonthly: 650,
    botCount: 20,
    dailyAnalyses: "unlimited",
    perks: ["All 20 AI bots", "Unlimited analyses", "Full agent council", "Smart money + liquidity AI", "Telegram signals", "Priority support"],
  },
  quantum: {
    tier: "quantum",
    name: "Quantum",
    priceMonthly: 100,
    priceGhsMonthly: 1300,
    botCount: 54,
    dailyAnalyses: "unlimited",
    perks: [
      "All 27 junior elite AI bots",
      "+27 senior bots that audit every signal",
      "Two-stage consensus — delivered as one verdict",
      "View full backend agent interactions",
      "Quantum + Wyckoff + Harmonic AI",
      "Telegram signals",
      "VIP priority support",
    ],
  },
};

export function allowedAgents(plan: PlanTier | null): Set<string> {
  if (!plan) return new Set();
  const n = Math.min(PLANS[plan].botCount, AGENT_ORDER.length);
  return new Set(AGENT_ORDER.slice(0, n));
}

export function planLabel(plan: PlanTier | null): string {
  return plan ? PLANS[plan].name : "Free";
}
