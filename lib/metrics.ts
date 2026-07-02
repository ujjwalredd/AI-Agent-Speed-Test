import type { RunMetrics, TaskAggregate, TaskType } from "./types";

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

// Coefficient-of-variation-based consistency in [0,1] (1 = perfectly consistent).
// Combines variance of quality scores and variance of latency across runs.
export function consistencyOf(runs: RunMetrics[]): number {
  const ok = runs.filter((r) => r.success);
  if (ok.length <= 1) return ok.length === 1 ? 1 : 0;

  const qualityStd = std(ok.map((r) => r.qualityScore));
  // Quality is already 0..1 so its std maps directly to inconsistency.
  const qualityConsistency = clamp01(1 - qualityStd * 2);

  const ttfts = ok.map((r) => r.ttftMs);
  const cv = coeffVar(ttfts); // relative latency spread
  const latencyConsistency = clamp01(1 - cv);

  return 0.6 * qualityConsistency + 0.4 * latencyConsistency;
}

export function aggregateTask(
  taskType: TaskType,
  runs: RunMetrics[],
): TaskAggregate {
  const ok = runs.filter((r) => r.success);
  const successRate = runs.length ? ok.length / runs.length : 0;
  return {
    taskType,
    runs,
    avgTtftMs: mean(ok.map((r) => r.ttftMs)),
    avgTotalMs: mean(ok.map((r) => r.totalMs)),
    avgTokensPerSec: mean(ok.map((r) => r.tokensPerSec)),
    avgInputTok: mean(ok.map((r) => r.inputTok)),
    avgOutputTok: mean(ok.map((r) => r.outputTok)),
    costUsd: runs.reduce((a, r) => a + r.costUsd, 0),
    qualityScore: mean(ok.map((r) => r.qualityScore)),
    successRate,
    consistency: consistencyOf(runs),
  };
}

// --- small stats helpers -------------------------------------------------

export function std(xs: number[]): number {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  const v = mean(xs.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

export function coeffVar(xs: number[]): number {
  const m = mean(xs);
  if (m === 0) return 0;
  return std(xs) / m;
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
