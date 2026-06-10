// Server-only re-export of the analysis engine. Importing from here in
// component code is blocked by the .server.ts naming convention.
export { analyze, generateCandles } from "./genius-ai";
export type { Analysis, AgentResult, Candle, Direction } from "./genius-ai";
export { reviewBySeniorCouncil, SENIOR_AGENT_ORDER } from "./genius-ai-senior";
export type { SeniorReview, SeniorInteraction } from "./genius-ai-senior";
