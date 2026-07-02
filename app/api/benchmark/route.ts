import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { runBenchmark, type RunConfig } from "@/lib/runner";
import { CLAUDE_MODELS } from "@/lib/providers";
import type { BenchmarkResult, ProgressEvent, ProviderName } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  model?: string;
  apiKey?: string;
  keyId?: string; // saved key id — decrypted server-side, never echoed back
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
  let apiKey = body.apiKey?.trim() || undefined;

  // Saved-key path: decrypt the stored ciphertext server-side. The plaintext
  // exists only in memory for this request.
  if (!useMock && !apiKey && body.keyId) {
    const record = await prisma.apiKey.findUnique({ where: { id: body.keyId } });
    if (!record) return json({ error: "Saved key not found." }, 404);
    try {
      apiKey = decryptSecret(record.ciphertext);
    } catch {
      return json({ error: "Could not decrypt the saved key." }, 500);
    }
  }

  // Decide the provider. If not mock and there is no key (neither in the body
  // nor the server env), reject clearly rather than failing every task.
  const provider: ProviderName = useMock ? "mock" : "anthropic";
  if (provider === "anthropic" && !apiKey && !process.env.ANTHROPIC_API_KEY) {
    return json(
      { error: "No API key. Paste a key, pick a saved key, or use the demo provider." },
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
          if (ev.type === "done") {
            finalResult = ev.result;
            // Persistence is best-effort: a missing/unreachable database must not
            // fail the run. The result still streams back; it just isn't saved.
            let runId: string | undefined;
            try {
              runId = await persist(ev.result, provider);
            } catch (dbErr) {
              console.warn(
                "Benchmark result not persisted:",
                dbErr instanceof Error ? dbErr.message : dbErr,
              );
            }
            send({ ...ev, result: { ...ev.result, runId } });
          } else {
            send(ev);
          }
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

// Writes the run + per-task results. No API key is ever stored.
async function persist(
  result: BenchmarkResult,
  provider: ProviderName,
): Promise<string> {
  const run = await prisma.benchmarkRun.create({
    data: {
      modelName: result.modelName,
      provider,
      runsPerTask: result.runsPerTask,
      overallScore: result.overall,
      speedScore: result.sub.speed,
      accuracyScore: result.sub.accuracy,
      qualityScore: result.sub.quality,
      reliabilityScore: result.sub.reliability,
      consistencyScore: result.sub.consistency,
      costScore: result.sub.cost,
      totalCostUsd: result.totalCostUsd,
      totalInputTok: result.totalInputTok,
      totalOutputTok: result.totalOutputTok,
      avgTtftMs: result.avgTtftMs,
      avgTokensPerSec: result.avgTokensPerSec,
      tasks: {
        create: result.tasks.map((t) => {
          const firstErr = t.runs.find((r) => !r.success)?.errorMsg;
          return {
            taskType: t.taskType,
            ttftMs: t.avgTtftMs,
            totalMs: t.avgTotalMs,
            tokensPerSec: t.avgTokensPerSec,
            inputTok: Math.round(t.avgInputTok),
            outputTok: Math.round(t.avgOutputTok),
            costUsd: t.costUsd,
            qualityScore: t.qualityScore,
            success: t.successRate > 0,
            errorMsg: firstErr ?? null,
          };
        }),
      },
    },
  });
  return run.id;
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
