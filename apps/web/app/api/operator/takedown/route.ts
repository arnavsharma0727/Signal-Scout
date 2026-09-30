import { NextRequest, NextResponse } from "next/server";
import { serverSupabase } from "../../../../lib/server-supabase";
import {
  isAuthorizedTakedownRequest,
  parseTakedownRequest,
} from "../../../../lib/source-takedown";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.TAKEDOWN_SECRET;
  if (!secret)
    return response({ error: "Takedown operator is not configured" }, 503);
  const authorization = request.headers.get("authorization");
  const bearer = authorization?.match(/^Bearer\s+([^\s]+)$/i)?.[1] ?? null;
  if (!isAuthorizedTakedownRequest(bearer, secret)) {
    return response({ error: "Unauthorized" }, 401);
  }

  if (
    !/^application\/json(?:\s*;|$)/i.test(
      request.headers.get("content-type") ?? "",
    )
  ) {
    return response({ error: "JSON required" }, 415);
  }
  let rawBody: string | null;
  try {
    rawBody = await readBoundedBody(request, 1024);
  } catch {
    return response({ error: "Invalid request" }, 400);
  }
  if (rawBody === null) return response({ error: "Request too large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return response({ error: "Invalid request" }, 400);
  }
  const input = parseTakedownRequest(body);
  if (!input) return response({ error: "Invalid request" }, 400);

  const db = serverSupabase();
  if (!db)
    return response({ error: "Takedown operator is not configured" }, 503);
  const { data, error } = await db.rpc("process_source_takedown", {
    p_document_id: input.documentId,
    p_reason_code: input.reason,
  });
  if (error) return response({ error: "Takedown could not be completed" }, 500);
  return response(
    { outcome: data === "deleted" ? "deleted" : "not_found" },
    200,
  );
}

async function readBoundedBody(request: NextRequest, maxBytes: number) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(body);
}

function response(body: Record<string, string>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
