// Shared types for the benchmarking platform.

export type TaskType =
  | "factual"
  | "reasoning"
  | "code"
  | "summarization"
  | "planning"
  | "tool_use";

export type ProviderName = "anthropic" | "mock";

// A tool definition passed to the model for the tool-use task.
export interface ToolSpec {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Request for a single model call.
export interface ModelCallRequest {
  model: string;
  apiKey?: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens: number;
  thinking?: boolean; // adaptive thinking on/off
  tools?: ToolSpec[];
  signal?: AbortSignal;
}

// Result of a single streamed model call.
export interface ModelCallResult {
  text: string;
  // For the tool-use task: the tool call the model made, if any.
  toolCall?: { name: string; input: Record<string, unknown> } | null;
  stopReason: string | null;
  ttftMs: number; // time to first token
  totalMs: number; // total response time
  inputTok: number;
  outputTok: number;
  tokensPerSec: number;
  success: boolean;
  errorMsg?: string;
}

// One task run's captured metrics + quality.
export interface RunMetrics extends ModelCallResult {
  taskType: TaskType;
  runIndex: number;
  costUsd: number;
  qualityScore: number; // 0..1
}

// Aggregated result for a single task type (across repeated runs).
export interface TaskAggregate {
  taskType: TaskType;
  runs: RunMetrics[];
  avgTtftMs: number;
  avgTotalMs: number;
  avgTokensPerSec: number;
  avgInputTok: number;
  avgOutputTok: number;
  costUsd: number;
  qualityScore: number; // mean quality 0..1
  successRate: number; // 0..1
  consistency: number; // 0..1 (1 = perfectly consistent)
}

export interface SubScores {
  speed: number;
  accuracy: number;
  quality: number;
  reliability: number;
  consistency: number;
  cost: number;
}

export interface BenchmarkResult {
  modelName: string;
  provider: ProviderName;
  runsPerTask: number;
  overall: number;
  sub: SubScores;
  weights: SubScores;
  totalCostUsd: number;
  totalInputTok: number;
  totalOutputTok: number;
  avgTtftMs: number;
  avgTokensPerSec: number;
  tasks: TaskAggregate[];
}

// Server-Sent Events emitted during a run.
export type ProgressEvent =
  | { type: "run-start"; model: string; provider: ProviderName; totalTasks: number; runsPerTask: number }
  | { type: "task-start"; taskType: TaskType; index: number }
  | { type: "run-complete"; taskType: TaskType; runIndex: number; ttftMs: number; tokensPerSec: number; success: boolean }
  | { type: "task-done"; task: TaskAggregate }
  | { type: "done"; result: BenchmarkResult }
  | { type: "error"; message: string };
