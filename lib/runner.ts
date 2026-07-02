import { aggregateTask } from "./metrics";
import { callModel, estimateCostUsd } from "./providers";
import { scoreBenchmark } from "./scoring";
import { TASKS } from "./tasks";
import type {
  BenchmarkResult,
  ProgressEvent,
  ProviderName,
  RunMetrics,
  TaskAggregate,
} from "./types";

export interface RunConfig {
  model: string;
  provider: ProviderName;
  apiKey?: string;
  systemPrompt?: string;
  runsPerTask: number;
  thinking?: boolean;
  timeoutMs: number;
}

// Runs the full benchmark suite, yielding progress events as it goes.
// Never throws for a single failed model call; failures are captured as
// unsuccessful runs so error rate feeds the reliability score.
export async function* runBenchmark(
  cfg: RunConfig,
): AsyncGenerator<ProgressEvent, void, unknown> {
  yield {
    type: "run-start",
    model: cfg.model,
    provider: cfg.provider,
    totalTasks: TASKS.length,
    runsPerTask: cfg.runsPerTask,
  };

  const aggregates: TaskAggregate[] = [];

  for (let i = 0; i < TASKS.length; i++) {
    const task = TASKS[i];
    yield { type: "task-start", taskType: task.type, index: i };

    const runs: RunMetrics[] = [];
    for (let r = 0; r < cfg.runsPerTask; r++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);

      const call = await callModel(cfg.provider, {
        model: cfg.model,
        apiKey: cfg.apiKey,
        systemPrompt: cfg.systemPrompt ?? task.systemPrompt,
        userPrompt: task.userPrompt,
        maxTokens: task.maxTokens,
        thinking: cfg.thinking,
        tools: task.tools,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const quality = call.success ? clamp01(task.check(call)) : 0;
      const costUsd = estimateCostUsd(cfg.model, call.inputTok, call.outputTok);

      const metrics: RunMetrics = {
        ...call,
        taskType: task.type,
        runIndex: r,
        costUsd,
        qualityScore: quality,
      };
      runs.push(metrics);

      yield {
        type: "run-complete",
        taskType: task.type,
        runIndex: r,
        ttftMs: metrics.ttftMs,
        tokensPerSec: metrics.tokensPerSec,
        success: metrics.success,
      };
    }

    const agg = aggregateTask(task.type, runs);
    aggregates.push(agg);
    yield { type: "task-done", task: agg };
  }

  const scored = scoreBenchmark(aggregates, cfg.runsPerTask);
  const result: BenchmarkResult = {
    modelName: cfg.model,
    provider: cfg.provider,
    runsPerTask: cfg.runsPerTask,
    overall: scored.overall,
    sub: scored.sub,
    weights: scored.weights,
    totalCostUsd: aggregates.reduce((a, t) => a + t.costUsd, 0),
    totalInputTok: Math.round(
      aggregates.reduce((a, t) => a + t.avgInputTok * cfg.runsPerTask, 0),
    ),
    totalOutputTok: Math.round(
      aggregates.reduce((a, t) => a + t.avgOutputTok * cfg.runsPerTask, 0),
    ),
    avgTtftMs: scored.avgTtftMs,
    avgTokensPerSec: scored.avgTokensPerSec,
    tasks: aggregates,
  };

  yield { type: "done", result };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
