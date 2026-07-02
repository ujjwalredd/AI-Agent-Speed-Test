import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { encryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/keys -> masked list. Never returns plaintext or ciphertext.
export async function GET() {
  const keys = await prisma.apiKey.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, provider: true, last4: true, createdAt: true },
  });
  return json(keys);
}

// POST /api/keys {label, key} -> encrypt with AES-256-GCM and store.
// Response contains only {id, label, last4}.
export async function POST(request: NextRequest) {
  let body: { label?: string; key?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const key = body.key?.trim();
  const label = body.label?.trim() || "My key";

  if (!key) return json({ error: "Missing API key." }, 400);
  if (!key.startsWith("sk-ant-")) {
    return json({ error: "That doesn't look like an Anthropic key (expected sk-ant-…)." }, 400);
  }
  if (key.length < 20 || key.length > 300) {
    return json({ error: "Key length looks invalid." }, 400);
  }
  if (label.length > 60) return json({ error: "Label too long (max 60 chars)." }, 400);

  const saved = await prisma.apiKey.create({
    data: {
      label,
      provider: "anthropic",
      ciphertext: encryptSecret(key),
      last4: key.slice(-4),
    },
    select: { id: true, label: true, last4: true, createdAt: true },
  });

  return json(saved, 201);
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
