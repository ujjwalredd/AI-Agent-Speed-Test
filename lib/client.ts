import type { ProgressEvent } from "./types";

export interface BenchmarkConfig {
  model: string;
  apiKey?: string;
  keyId?: string; // id of a saved (encrypted-at-rest) key
  systemPrompt?: string;
  runsPerTask: number;
  thinking?: boolean;
  useMock?: boolean;
}

// Streams a benchmark run from the API, invoking onEvent for each SSE message.
// Resolves when the stream ends. Throws on network / non-OK response.
export async function streamBenchmark(
  config: BenchmarkConfig,
  onEvent: (ev: ProgressEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/benchmark", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
    signal,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  if (!res.body) throw new Error("No response stream.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const line = frame.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      const jsonStr = line.slice(5).trim();
      if (!jsonStr) continue;
      try {
        onEvent(JSON.parse(jsonStr) as ProgressEvent);
      } catch {
        /* ignore malformed frame */
      }
    }
  }
}
