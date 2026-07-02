import type { ModelCallResult, TaskType, ToolSpec } from "./types";

// A benchmark task: a prompt sent to the model plus a heuristic checker that
// scores the response quality on a 0..1 scale. Tasks are defined as an array so
// new ones can be added without touching the runner.
export interface BenchmarkTask {
  type: TaskType;
  label: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens: number;
  tools?: ToolSpec[];
  // Returns a quality score in [0, 1]. Only called on successful calls.
  check: (result: ModelCallResult) => number;
}

// --- helpers -------------------------------------------------------------

function includesAny(text: string, needles: string[]): boolean {
  const t = text.toLowerCase();
  return needles.some((n) => t.includes(n.toLowerCase()));
}

function fractionPresent(text: string, needles: string[]): number {
  if (needles.length === 0) return 1;
  const t = text.toLowerCase();
  const hit = needles.filter((n) => t.includes(n.toLowerCase())).length;
  return hit / needles.length;
}

function hasCodeBlock(text: string): boolean {
  return /```[\s\S]*```/.test(text) || /function\s+\w+|=>|def\s+\w+/.test(text);
}

// Count numbered/bulleted list items.
function countSteps(text: string): number {
  const lines = text.split(/\r?\n/);
  return lines.filter((l) => /^\s*(\d+[.)]|[-*•])\s+\S/.test(l)).length;
}

// --- task definitions ----------------------------------------------------

export const TASKS: BenchmarkTask[] = [
  {
    type: "factual",
    label: "Factual recall",
    systemPrompt: "Answer concisely.",
    userPrompt:
      "What is the capital of Australia? Reply with just the city name.",
    maxTokens: 64,
    check: (r) => (includesAny(r.text, ["canberra"]) ? 1 : 0),
  },
  {
    type: "reasoning",
    label: "Reasoning",
    userPrompt:
      "A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. " +
      "How much does the ball cost? Give the final numeric answer.",
    maxTokens: 512,
    // Correct answer is $0.05. Reward the right answer, partial for showing 0.05.
    check: (r) => {
      const t = r.text.toLowerCase();
      if (/\b0?\.05\b|\b5\s*cents?\b|\bfive\s*cents?\b/.test(t)) return 1;
      if (t.includes("0.10") || t.includes("10 cents")) return 0.1; // common wrong answer
      return 0;
    },
  },
  {
    type: "code",
    label: "Code generation",
    systemPrompt: "You are an expert programmer.",
    userPrompt:
      "Write a JavaScript function named `isPalindrome(str)` that returns true if " +
      "the string is a palindrome (ignoring case and non-alphanumeric characters), " +
      "false otherwise. Return only the function in a code block.",
    maxTokens: 512,
    check: (r) => {
      let score = 0;
      if (hasCodeBlock(r.text)) score += 0.4;
      if (/isPalindrome/.test(r.text)) score += 0.3;
      if (/reverse|split|charAt|\[.*len|for\s*\(/.test(r.text)) score += 0.3;
      return Math.min(1, score);
    },
  },
  {
    type: "summarization",
    label: "Summarization",
    userPrompt:
      "Summarize the following passage in 2 sentences, mentioning photosynthesis, " +
      "sunlight, and glucose:\n\n" +
      "Photosynthesis is the process by which green plants, algae, and some bacteria " +
      "convert light energy, usually from the sun, into chemical energy stored in " +
      "glucose. During this process, carbon dioxide and water are transformed into " +
      "glucose and oxygen. The glucose provides energy for the organism, while the " +
      "oxygen is released into the atmosphere. Photosynthesis is fundamental to life " +
      "on Earth because it produces the oxygen we breathe and forms the base of most " +
      "food chains. It occurs primarily in the chloroplasts of plant cells, where the " +
      "pigment chlorophyll absorbs light.",
    maxTokens: 300,
    check: (r) => {
      const kw = fractionPresent(r.text, ["photosynthesis", "sunlight", "glucose"]);
      // Reward being reasonably short (a real summary, not a copy).
      const len = r.text.length;
      const brevity = len > 0 && len < 700 ? 1 : 0.4;
      return 0.7 * kw + 0.3 * brevity;
    },
  },
  {
    type: "planning",
    label: "Multi-step planning",
    userPrompt:
      "Create a numbered, step-by-step plan (at least 5 steps) for launching a small " +
      "online store selling handmade candles. Number each step.",
    maxTokens: 600,
    check: (r) => {
      const steps = countSteps(r.text);
      if (steps >= 5) return 1;
      if (steps >= 3) return 0.6;
      if (steps >= 1) return 0.3;
      return 0;
    },
  },
  {
    type: "tool_use",
    label: "Tool use / function calling",
    userPrompt:
      "What's the weather in Paris, France? Use the get_weather tool to look it up.",
    maxTokens: 400,
    tools: [
      {
        name: "get_weather",
        description: "Get the current weather for a location.",
        input_schema: {
          type: "object",
          properties: {
            location: {
              type: "string",
              description: "City and country, e.g. Paris, France",
            },
          },
          required: ["location"],
        },
      },
    ],
    check: (r) => {
      if (!r.toolCall) return 0;
      let score = 0.5; // called a tool at all
      if (r.toolCall.name === "get_weather") score += 0.25;
      const loc = String(r.toolCall.input?.location ?? "").toLowerCase();
      if (loc.includes("paris")) score += 0.25;
      return Math.min(1, score);
    },
  },
];
