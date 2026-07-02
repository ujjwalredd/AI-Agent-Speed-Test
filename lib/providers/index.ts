import type { ModelCallRequest, ModelCallResult, ProviderName } from "../types";
import { callAnthropic } from "./anthropic";
import { callMock } from "./mock";

// Re-export the client-safe model catalog + pricing helpers.
export {
  CLAUDE_MODELS,
  estimateCostUsd,
  priceFor,
  type ModelPrice,
} from "../models";

// Dispatch a single model call to the selected provider.
export function callModel(
  provider: ProviderName,
  req: ModelCallRequest,
): Promise<ModelCallResult> {
  if (provider === "mock") return callMock(req);
  return callAnthropic(req);
}
