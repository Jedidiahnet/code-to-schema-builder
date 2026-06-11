/* Empty-data helpers. Replaces previous random "mock" generator so charts no
 * longer display fabricated values. Returns empty datasets; consumer charts
 * should render an empty-state when no real data is wired yet. */
export function series(_n: number, _base: number, _vol: number, _seed = 1) {
  return [] as { t: string; v: number }[];
}

export function multiSeries(_n: number, fields: { key: string; base: number; vol: number }[], _seed = 1) {
  void fields;
  return [] as Record<string, unknown>[];
}

export const BOT_AGENTS = [
  "Trend", "Momentum", "Volatility", "Sentiment", "Macro", "Order Block",
  "Liquidity", "Pattern", "Risk", "News NLP", "Smart Money", "Vector Memory",
];
