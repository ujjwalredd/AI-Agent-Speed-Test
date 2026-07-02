import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/results         -> latest runs (list)
// GET /api/results?id=xxx  -> one run with its task results
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const run = await prisma.benchmarkRun.findUnique({
      where: { id },
      include: { tasks: true },
    });
    if (!run) return json({ error: "Not found" }, 404);
    return json(run);
  }

  const runs = await prisma.benchmarkRun.findMany({
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      createdAt: true,
      modelName: true,
      provider: true,
      overallScore: true,
      totalCostUsd: true,
      avgTtftMs: true,
      avgTokensPerSec: true,
    },
  });
  return json(runs);
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
