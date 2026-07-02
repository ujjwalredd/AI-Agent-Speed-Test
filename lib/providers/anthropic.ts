import Anthropic from "@anthropic-ai/sdk";
import type { ModelCallRequest, ModelCallResult } from "../types";

// Calls a Claude model via the official Anthropic SDK, streaming the response so
// we can measure time-to-first-token accurately. The API key is used only here,
// server-side, and is never persisted or returned to the client.
export async function callAnthropic(
  req: ModelCallRequest,
): Promise<ModelCallResult> {
  const apiKey = req.apiKey || process.env.ANTHROPIC_API_KEY;
  const start = Date.now();

  if (!apiKey) {
    return failure(start, "No Anthropic API key provided.");
  }

  const client = new Anthropic({ apiKey });

  const params: Anthropic.MessageStreamParams = {
    model: req.model,
    max_tokens: req.maxTokens,
    messages: [{ role: "user", content: req.userPrompt }],
  };
  if (req.systemPrompt) params.system = req.systemPrompt;
  // Adaptive thinking is supported by current high-capability Claude models. The
  // installed SDK's types predate it, so cast; the wire API accepts it.
  if (req.thinking) {
    params.thinking = { type: "adaptive" } as unknown as Anthropic.MessageStreamParams["thinking"];
  }
  if (req.tools && req.tools.length > 0) {
    params.tools = req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));
  }

  let ttftMs = 0;
  let firstTokenAt = 0;

  try {
    const stream = client.messages.stream(params, {
      signal: req.signal,
    });

    stream.on("streamEvent", (event) => {
      if (
        firstTokenAt === 0 &&
        event.type === "content_block_delta" &&
        (event.delta.type === "text_delta" ||
          event.delta.type === "input_json_delta" ||
          event.delta.type === "thinking_delta")
      ) {
        firstTokenAt = Date.now();
        ttftMs = firstTokenAt - start;
      }
    });

    const message = await stream.finalMessage();
    const totalMs = Date.now() - start;

    // Extract the answer text and any tool call from the final content blocks.
    let text = "";
    let toolCall: ModelCallResult["toolCall"] = null;
    for (const block of message.content) {
      if (block.type === "text") text += block.text;
      else if (block.type === "tool_use") {
        toolCall = {
          name: block.name,
          input: (block.input ?? {}) as Record<string, unknown>,
        };
      }
    }

    const inputTok =
      message.usage.input_tokens +
      (message.usage.cache_read_input_tokens ?? 0) +
      (message.usage.cache_creation_input_tokens ?? 0);
    const outputTok = message.usage.output_tokens;

    // tokens/sec measured over the generation window (after first token).
    const genMs = firstTokenAt > 0 ? totalMs - ttftMs : totalMs;
    const tokensPerSec = genMs > 0 ? (outputTok / genMs) * 1000 : 0;

    return {
      text,
      toolCall,
      stopReason: message.stop_reason ?? null,
      ttftMs: ttftMs || totalMs,
      totalMs,
      inputTok,
      outputTok,
      tokensPerSec,
      success: true,
    };
  } catch (err) {
    return failure(start, describeError(err));
  }
}

function failure(start: number, message: string): ModelCallResult {
  return {
    text: "",
    toolCall: null,
    stopReason: null,
    ttftMs: 0,
    totalMs: Date.now() - start,
    inputTok: 0,
    outputTok: 0,
    tokensPerSec: 0,
    success: false,
    errorMsg: message,
  };
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return "Authentication failed - check the API key.";
  if (err instanceof Anthropic.RateLimitError) return "Rate limited by the Anthropic API.";
  if (err instanceof Anthropic.NotFoundError) return "Model not found - check the model ID.";
  if (err instanceof Anthropic.APIConnectionTimeoutError) return "Request timed out.";
  if (err instanceof Anthropic.APIError) {
    const msg = err.message ?? "";
    // Billing: valid key, but the account has no credits (returned as a 400).
    if (/credit balance is too low/i.test(msg)) {
      return "Insufficient credits - add funds in the Anthropic Console (Plans & Billing).";
    }
    return `API error (${err.status ?? "?"}): ${msg}`;
  }
  if (err instanceof Error) {
    if (err.name === "AbortError" || /abort/i.test(err.message)) return "Request timed out or was aborted.";
    return err.message;
  }
  return "Unknown error.";
}
