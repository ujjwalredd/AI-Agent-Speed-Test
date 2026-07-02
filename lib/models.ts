// Client-safe Claude model catalog + pricing. No SDK imports here so this can
// be bundled into client components (the config form) without pulling in the
// Anthropic SDK.

export interface ModelPrice {
  id: string;
  label: string;
  inputPerM: number; // USD per 1M input tokens
  outputPerM: number; // USD per 1M output tokens
}

// Prices per the Claude Platform models overview, checked on 2026-07-02.
export const CLAUDE_MODELS: ModelPrice[] = [
  { id: "claude-fable-5", label: "Claude Fable 5", inputPerM: 10, outputPerM: 50 },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8", inputPerM: 5, outputPerM: 25 },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5", inputPerM: 3, outputPerM: 15 },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5", inputPerM: 1, outputPerM: 5 },
];

const DEFAULT_PRICE: ModelPrice = CLAUDE_MODELS[0];

export function priceFor(modelId: string): ModelPrice {
  return CLAUDE_MODELS.find((m) => m.id === modelId) ?? DEFAULT_PRICE;
}

export function estimateCostUsd(
  modelId: string,
  inputTok: number,
  outputTok: number,
): number {
  const p = priceFor(modelId);
  return (inputTok / 1_000_000) * p.inputPerM + (outputTok / 1_000_000) * p.outputPerM;
}
