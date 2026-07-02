import type { TaskType } from "./types";

export const TASK_LABELS: Record<TaskType, string> = {
  factual: "Factual recall",
  reasoning: "Reasoning",
  code: "Code generation",
  summarization: "Summarization",
  planning: "Multi-step planning",
  tool_use: "Tool use",
};

export const TASK_ORDER: TaskType[] = [
  "factual",
  "reasoning",
  "code",
  "summarization",
  "planning",
  "tool_use",
];

export function fmtMs(ms: number): string {
  if (!ms) return "-";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function fmtCost(usd: number): string {
  if (usd === 0) return "$0.0000";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

export function fmtNum(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

// Big Type Editorial semantic set: strong scores read as ink (neutral, printed),
// excellence as ok-green, weakness as bad-orange. Never color-only — callers pair
// these with the grade word or a percentage label.
export function scoreColor(score: number): string {
  if (score >= 80) return "#15803D"; // ok
  if (score >= 50) return "#0E0E0C"; // ink (solid, neutral)
  return "#C2410C"; // bad
}

export function scoreGrade(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Great";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Poor";
}
