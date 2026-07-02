import { NextRequest } from "next/server";
import { runBenchmark, type RunConfig } from "@/lib/runner";
import { CLAUDE_MODELS } from "@/lib/providers";
import type { BenchmarkResult, ProgressEvent, ProviderName } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  model?: string;
  apiKey?: string; // used in memory for this run only; never stored or logged
  systemPrompt?: string;
  runsPerTask?: number;
  thinking?: boolean;
  useMock?: boolean;
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const useMock = !!body.useMock;
  const model = body.model || CLAUDE_MODELS[0].id;
  const apiKey = body.apiKey?.trim() || undefined;

  // Decide the provider. If not mock and there is no key (neither in the body
  // nor the server env), reject clearly rather than failing every task.
  const provider: ProviderName = useMock ? "mock" : "anthropic";
  if (provider === "anthropic" && !apiKey && !process.env.ANTHROPIC_API_KEY) {
    return json(
      { error: "No API key. Paste a key or use the demo provider." },
      400,
    );
  }

  const runsPerTask = clampInt(body.runsPerTask ?? 3, 1, 5);
  const timeoutMs = Number(process.env.DEFAULT_TIMEOUT_MS) || 60000;

  const cfg: RunConfig = {
    model: useMock ? "mock-model" : model,
    provider,
    apiKey,
    systemPrompt: body.systemPrompt?.trim() || undefined,
    runsPerTask,
    thinking: !!body.thinking,
    timeoutMs,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ProgressEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        let finalResult: BenchmarkResult | null = null;
        for await (const ev of runBenchmark(cfg)) {
          send(ev);
          if (ev.type === "done") finalResult = ev.result;
        }
        if (!finalResult) send({ type: "error", message: "No result produced." });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Benchmark failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function clampInt(x: number, lo: number, hi: number): number {
  const n = Math.round(Number(x));
  if (Number.isNaN(n)) return lo;
  return Math.max(lo, Math.min(hi, n));
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
