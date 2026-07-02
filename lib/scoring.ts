import { clamp01, mean } from "./metrics";
import type { SubScores, TaskAggregate } from "./types";

// Default weights for the overall Agent Performance Score. Shown in the UI so
// the score is fully explainable.
export const DEFAULT_WEIGHTS: SubScores = {
  speed: 0.2,
  accuracy: 0.25,
  quality: 0.2,
  reliability: 0.15,
  consistency: 0.1,
  cost: 0.1,
};

// Reference bands used to normalize raw metrics into 0..100 sub-scores.
// These are deliberately simple and documented so the scoring is transparent.
const TTFT_GOOD_MS = 400; // <= this scores ~full for TTFT
const TTFT_BAD_MS = 6000; // >= this scores ~0
const TPS_GOOD = 90; // tokens/sec at/above this scores full
const TPS_BAD = 5; // tokens/sec at/below this scores 0
const COST_GOOD_USD = 0.002; // total cost/run at/below this scores full
const COST_BAD_USD = 0.15; // total cost/run at/above this scores 0

// Map a value within [bad, good] to [0,1]. Handles good<bad (lower is better).
function band(value: number, good: number, bad: number): number {
  if (good === bad) return 0.5;
  const t = (value - bad) / (good - bad);
  return clamp01(t);
}

export function speedScore(avgTtftMs: number, avgTps: number): number {
  const ttft = band(avgTtftMs, TTFT_GOOD_MS, TTFT_BAD_MS); // lower TTFT better
  const tps = band(avgTps, TPS_GOOD, TPS_BAD); // higher tps better
  return 100 * (0.5 * ttft + 0.5 * tps);
}

export function costScore(avgCostPerRunUsd: number): number {
  return 100 * band(avgCostPerRunUsd, COST_GOOD_USD, COST_BAD_USD); // lower better
}

export interface ScoreBundle {
  overall: number;
  sub: SubScores;
  weights: SubScores;
  avgTtftMs: number;
  avgTokensPerSec: number;
  avgCostPerRunUsd: number;
}

export function scoreBenchmark(
  tasks: TaskAggregate[],
  runsPerTask: number,
  weights: SubScores = DEFAULT_WEIGHTS,
): ScoreBundle {
  const avgTtftMs = mean(tasks.map((t) => t.avgTtftMs).filter((x) => x > 0));
  const avgTps = mean(tasks.map((t) => t.avgTokensPerSec).filter((x) => x > 0));

  const totalCost = tasks.reduce((a, t) => a + t.costUsd, 0);
  const totalRuns = tasks.length * runsPerTask || 1;
  const avgCostPerRun = totalCost / totalRuns;

  // Accuracy = mean success * quality is captured separately; here accuracy
  // reflects task correctness (quality pass), reliability reflects error rate.
  const accuracy = 100 * mean(tasks.map((t) => t.qualityScore));
  const quality = accuracy; // heuristic quality doubles as the quality axis
  const reliability = 100 * mean(tasks.map((t) => t.successRate));
  const consistency = 100 * mean(tasks.map((t) => t.consistency));
  // No successful call produced timing data -> speed is undefined, score 0.
  const speed = avgTtftMs === 0 && avgTps === 0 ? 0 : speedScore(avgTtftMs, avgTps);
  const cost = costScore(avgCostPerRun);

  const sub: SubScores = {
    speed: round(speed),
    accuracy: round(accuracy),
    quality: round(quality),
    reliability: round(reliability),
    consistency: round(consistency),
    cost: round(cost),
  };

  const overall = round(
    sub.speed * weights.speed +
      sub.accuracy * weights.accuracy +
      sub.quality * weights.quality +
      sub.reliability * weights.reliability +
      sub.consistency * weights.consistency +
      sub.cost * weights.cost,
  );

  return {
    overall,
    sub,
    weights,
    avgTtftMs: round(avgTtftMs),
    avgTokensPerSec: round(avgTps),
    avgCostPerRunUsd: avgCostPerRun,
  };
}

function round(x: number): number {
  return Math.round(x * 10) / 10;
}
