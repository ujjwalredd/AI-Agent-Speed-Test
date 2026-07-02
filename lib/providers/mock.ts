import type { ModelCallRequest, ModelCallResult } from "../types";

// A demo provider that fakes a streaming Claude response so the app is fully
// usable with no API key. Numbers are synthetic but plausible, and per-task
// output is tailored so the heuristic checkers still exercise real logic.

function pickResponse(req: ModelCallRequest): {
  text: string;
  toolCall?: { name: string; input: Record<string, unknown> } | null;
} {
  const p = req.userPrompt.toLowerCase();

  if (req.tools && req.tools.length > 0) {
    return {
      text: "I'll look that up.",
      toolCall: { name: "get_weather", input: { location: "Paris, France" } },
    };
  }
  if (p.includes("capital of australia")) return { text: "Canberra" };
  if (p.includes("bat and a ball")) {
    return { text: "Let x be the ball. x + (x + 1) = 1.10 → x = 0.05. The ball costs $0.05." };
  }
  if (p.includes("ispalindrome")) {
    return {
      text:
        "```js\nfunction isPalindrome(str) {\n  const s = str.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return s === s.split('').reverse().join('');\n}\n```",
    };
  }
  if (p.includes("photosynthesis")) {
    return {
      text:
        "Photosynthesis is how plants use sunlight to convert carbon dioxide and water into glucose and oxygen. The glucose stores energy for the plant while the oxygen is released into the air.",
    };
  }
  if (p.includes("handmade candles")) {
    return {
      text:
        "1. Research your market and pick a candle niche.\n2. Source wax, wicks, and fragrance suppliers.\n3. Make sample products and photograph them.\n4. Set up an online store (Shopify/Etsy).\n5. List products with pricing and descriptions.\n6. Launch marketing on social media.",
    };
  }
  return { text: "This is a demo response from the mock provider." };
}

export async function callMock(req: ModelCallRequest): Promise<ModelCallResult> {
  const start = Date.now();
  const { text, toolCall } = pickResponse(req);

  // Simulate time-to-first-token.
  const ttft = 120 + Math.random() * 260;
  await sleep(ttft, req.signal);

  // Simulate streaming the rest at a plausible rate.
  const outputTok = Math.max(4, Math.round(text.length / 4));
  const tps = 60 + Math.random() * 60; // tokens/sec
  const streamMs = (outputTok / tps) * 1000;
  await sleep(streamMs, req.signal);

  const totalMs = Date.now() - start;
  const inputTok = Math.max(8, Math.round(req.userPrompt.length / 4) + 12);

  return {
    text,
    toolCall: toolCall ?? null,
    stopReason: toolCall ? "tool_use" : "end_turn",
    ttftMs: Math.round(ttft),
    totalMs,
    inputTok,
    outputTok,
    tokensPerSec: totalMs > ttft ? (outputTok / (totalMs - ttft)) * 1000 : tps,
    success: true,
  };
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error("aborted"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("aborted"));
    });
  });
}
