import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/keys/:id  (action=reveal) -> decrypt and return plaintext once,
// so the UI can show the key on explicit user request (eye toggle).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const record = await prisma.apiKey.findUnique({ where: { id } });
  if (!record) return json({ error: "Key not found." }, 404);

  try {
    const key = decryptSecret(record.ciphertext);
    return json({ id: record.id, key });
  } catch {
    return json({ error: "Could not decrypt this key (vault secret changed?)." }, 500);
  }
}

// DELETE /api/keys/:id -> remove the stored key.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await prisma.apiKey.delete({ where: { id } });
  } catch {
    return json({ error: "Key not found." }, 404);
  }
  return json({ ok: true });
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
