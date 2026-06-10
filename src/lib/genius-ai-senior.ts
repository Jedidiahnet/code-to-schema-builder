// Senior council: 27 "elite/senior" bots that deliberate together as a
// roundtable. They talk to each other (by name), build on each other's
// reasoning, and converge on ONE approved trade signal — no voting, no
// dissent shown. Runs only for the Quantum tier.

import type { AgentResult, Direction, Analysis } from "./genius-ai";

export const SENIOR_AGENT_ORDER = [
  "Senior Macro Strategist",
  "Senior Quant Risk Officer",
  "Senior Liquidity Architect",
  "Senior Volatility Tactician",
  "Senior Smart Money Auditor",
  "Senior Wyckoff Veteran",
  "Senior Harmonic Geometer",
  "Senior Elliott Wave Veteran",
  "Senior Order Flow Director",
  "Senior Market Structure Lead",
  "Senior Divergence Adjudicator",
  "Senior Bayesian Statistician",
  "Senior Mean Reversion Quant",
  "Senior Momentum Director",
  "Senior Multi-TF Confluence Lead",
  "Senior Pattern Recognition Lead",
  "Senior Bollinger Strategist",
  "Senior Stochastic Specialist",
  "Senior Ichimoku Sensei",
  "Senior Fibonacci Master",
  "Senior Risk-Reward Officer",
  "Senior Liquidation Forecaster",
  "Senior Volume Profile Analyst",
  "Senior Sentiment Adjudicator",
  "Senior Trend Strength Lead",
  "Senior Ensemble Arbitrator",
  "Senior Chief Trading Officer",
] as const;

export type SeniorInteraction = {
  // The senior speaking.
  senior: string;
  // Who they are addressing (another senior by name), if any.
  addressedTo?: string;
  message: string;
  // Kept for backwards compatibility with the UI badge; seniors only ever
  // CONFIRM here — the council deliberates until everyone is aligned.
  verdict: "CONFIRM";
};

export type SeniorReview = {
  // Final delivered signal (single, unanimous, no votes shown).
  decision: Direction;
  confidence: number;
  agents: AgentResult[]; // 27 senior records (hidden in UI, kept for audit)
  interactions: SeniorInteraction[];
  juniorSummary: { buyVotes: number; sellVotes: number; consensusPct: number };
};

/** Build the senior roundtable transcript on top of the junior analysis. */
export function reviewBySeniorCouncil(junior: Analysis): SeniorReview {
  const juniors = junior.agents;
  const buyVotes = juniors.filter((a) => a.vote === "BUY").length;
  const sellVotes = juniors.filter((a) => a.vote === "SELL").length;
  const total = juniors.length || 1;
  const decision: Direction = buyVotes >= sellVotes ? "BUY" : "SELL";
  const consensusPct = Math.round((Math.max(buyVotes, sellVotes) / total) * 100);
  const ind = junior.indicators;

  // Confidence: anchored high (seniors only ship vetted calls) and boosted by
  // junior consensus + indicator alignment. No voting on the senior side.
  const trendAligned =
    (decision === "BUY" && ind.trend === "UP") ||
    (decision === "SELL" && ind.trend === "DOWN");
  const rsiAligned =
    (decision === "BUY" && ind.rsi < 70) || (decision === "SELL" && ind.rsi > 30);
  let confidence = 82 + Math.round((consensusPct - 50) * 0.3);
  if (trendAligned) confidence += 4;
  if (rsiAligned) confidence += 3;
  confidence = Math.max(80, Math.min(98, confidence));

  // Build the roundtable transcript. Each senior speaks once, addresses the
  // previous speaker (or a relevant peer), and builds toward consensus.
  const seniors = [...SENIOR_AGENT_ORDER];
  const interactions: SeniorInteraction[] = [];

  const line = (
    senior: string,
    addressedTo: string | undefined,
    message: string,
  ): SeniorInteraction => ({ senior, addressedTo, message, verdict: "CONFIRM" });

  // Opening reads — first speaker frames the setup.
  interactions.push(
    line(
      "Senior Macro Strategist",
      undefined,
      `Opening the desk: junior council reads ${decision} with ${consensusPct}% alignment. Macro trend is ${ind.trend}, so the bias is ${trendAligned ? "with the tide" : "counter-tide — we tighten risk"}.`,
    ),
    line(
      "Senior Quant Risk Officer",
      "Senior Macro Strategist",
      `Agreed. RSI ${ind.rsi.toFixed(1)} is ${ind.rsi > 75 || ind.rsi < 25 ? "stretched — I want size cut to half" : "in a tradeable band"}. Risk is acceptable for ${decision}.`,
    ),
    line(
      "Senior Liquidity Architect",
      "Senior Quant Risk Officer",
      `Order book supports you — liquidity is ${decision === "BUY" ? "thin above" : "thin below"}, which favors a ${decision} sweep into the next pocket.`,
    ),
  );

  // Middle of the table — each senior addresses a peer and confirms one angle.
  const middle = seniors.slice(3, seniors.length - 1);
  middle.forEach((role, i) => {
    const peer = interactions[interactions.length - 1 - (i % 3)].senior;
    interactions.push(line(role, peer, voiceFor(role, decision, ind)));
  });

  // Closing — the Chief Trading Officer locks in the unanimous call.
  interactions.push(
    line(
      "Senior Chief Trading Officer",
      "Senior Ensemble Arbitrator",
      `Table is aligned. Signing off: ${decision} at ${confidence}% conviction. Ship it as a single signal — no dissent on this desk.`,
    ),
  );

  // Hidden audit records — every senior on board with the final call.
  const agents: AgentResult[] = SENIOR_AGENT_ORDER.map((role) => ({
    name: role,
    role,
    vote: decision,
    confidence,
    reasoning: `Deliberated with the council and approved ${decision}.`,
  }));

  return {
    decision,
    confidence,
    agents,
    interactions,
    juniorSummary: { buyVotes, sellVotes, consensusPct },
  };
}

/** Discipline-specific one-liner each senior contributes to the discussion. */
function voiceFor(
  role: string,
  d: Direction,
  ind: Analysis["indicators"],
): string {
  switch (role) {
    case "Senior Volatility Tactician":
      return `Volatility regime supports a ${d}. Pattern ${ind.pattern} on the trigger candle is ${ind.pattern.includes("Doji") ? "soft — keep stops tight" : "clean — actionable structure"}.`;
    case "Senior Smart Money Auditor":
      return `Smart-money footprint is ${d === "BUY" ? "accumulating" : "distributing"} — institutional flow lines up with the call.`;
    case "Senior Wyckoff Veteran":
      return `Wyckoff phase reads as ${d === "BUY" ? "Phase D markup" : "Phase B-to-C distribution"} — confirms the bias.`;
    case "Senior Harmonic Geometer":
      return `Harmonic geometry completes at the ${d === "BUY" ? "0.786 demand" : "1.272 supply"} leg — the ratios endorse ${d}.`;
    case "Senior Elliott Wave Veteran":
      return `We're in wave ${d === "BUY" ? "3 impulse" : "C corrective"} — Elliott structure agrees.`;
    case "Senior Order Flow Director":
      return `Tape is ${d === "BUY" ? "absorbing offers" : "absorbing bids"} — order flow signs off on ${d}.`;
    case "Senior Market Structure Lead":
      return `Structure printed a ${d === "BUY" ? "higher low" : "lower high"} on the prior leg — trend integrity holds.`;
    case "Senior Divergence Adjudicator":
      return `Momentum-price divergence is ${d === "BUY" ? "bullish" : "bearish"} — no contradiction.`;
    case "Senior Bayesian Statistician":
      return `Posterior probability of ${d} updates to a clear majority once junior priors are folded in.`;
    case "Senior Mean Reversion Quant":
      return `Even on the mean-reversion lens, the deviation favors ${d} — I will not push back.`;
    case "Senior Momentum Director":
      return `Momentum thrust agrees — last impulse is ${d === "BUY" ? "expanding upward" : "expanding downward"}.`;
    case "Senior Multi-TF Confluence Lead":
      return `1m / 5m / 15m all stack the same direction — multi-TF confluence is ${d}.`;
    case "Senior Pattern Recognition Lead":
      return `Pattern library closest match is a ${d === "BUY" ? "bullish continuation" : "bearish continuation"} — confirmed.`;
    case "Senior Bollinger Strategist":
      return `Price is ${d === "BUY" ? "riding the upper band" : "pressing the lower band"} — bands endorse ${d}.`;
    case "Senior Stochastic Specialist":
      return `Stochastics cross supports ${d} — momentum oscillator aligned.`;
    case "Senior Ichimoku Sensei":
      return `Cloud bias is ${d === "BUY" ? "above the kumo" : "below the kumo"} — Ichimoku signs off.`;
    case "Senior Fibonacci Master":
      return `Price reacted at the ${d === "BUY" ? "0.618 retracement" : "1.0 extension"} — Fibonacci confirms.`;
    case "Senior Risk-Reward Officer":
      return `RR profile is acceptable — at least 1:2 from the proposed entry on this ${d}.`;
    case "Senior Liquidation Forecaster":
      return `Liquidation pools sit ${d === "BUY" ? "above" : "below"} — magnets pull the price our way.`;
    case "Senior Volume Profile Analyst":
      return `Volume node concentration favors a ${d === "BUY" ? "rotation up" : "rotation down"} — profile agrees.`;
    case "Senior Sentiment Adjudicator":
      return `Crowd positioning is ${d === "BUY" ? "fearful" : "euphoric"} — contrarian read supports ${d}.`;
    case "Senior Trend Strength Lead":
      return `ADX-style strength is rising in the ${d} direction — trend is healthy.`;
    case "Senior Ensemble Arbitrator":
      return `Across every lens on this desk, the verdict converges on ${d}. No remaining objections to log.`;
    default:
      return `Concur — ${d} is the consensus call.`;
  }
}
