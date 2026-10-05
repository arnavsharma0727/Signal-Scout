import { NextRequest, NextResponse } from "next/server";
import {
  GDELT_OUTLET_COUNTRIES,
  GDELT_OUTLET_LANGUAGES,
  type GdeltOutletCountry,
  type GdeltOutletLanguage,
  searchGdeltNews,
} from "../../../../lib/gdelt-public";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** First-party, no-store bridge for GDELT's API, which blocks browser CORS requests. */
export async function POST(request: NextRequest) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? ""))
    return reply({ error: "JSON required" }, 415);
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return reply({ error: "Invalid request" }, 400);
  }
  if (raw.length > 2048) return reply({ error: "Request too large" }, 413);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ error: "Invalid request" }, 400);
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return reply({ error: "Invalid request" }, 400);
  const input = body as Record<string, unknown>;
  const query = typeof input.query === "string" ? input.query.trim() : "";
  const outletCountry = typeof input.outletCountry === "string" ? input.outletCountry : "";
  const outletLanguage = typeof input.outletLanguage === "string" ? input.outletLanguage : "";
  if (query.length < 3 || query.length > 100 ||
      !GDELT_OUTLET_COUNTRIES.some(({ value }) => value === outletCountry) ||
      !GDELT_OUTLET_LANGUAGES.some(({ value }) => value === outletLanguage))
    return reply({ error: "Choose a 3–100 character query and supported filters." }, 400);

  try {
    const boundedFetch: typeof fetch = (input, init) => fetch(input, {
      ...init,
      signal: AbortSignal.timeout(10_000),
    });
    const articles = await searchGdeltNews(query, boundedFetch, Date.now(), outletCountry as GdeltOutletCountry, outletLanguage as GdeltOutletLanguage);
    return reply({ articles }, 200);
  } catch (cause) {
    const message = cause instanceof Error && /429|rate-limit/i.test(cause.message)
      ? "GDELT is rate-limiting searches. Try again later."
      : cause instanceof Error && /abort|timeout/i.test(cause.message)
        ? "GDELT did not respond in time. Try again later."
        : "GDELT search is temporarily unavailable.";
    return reply({ error: message }, message.includes("rate-limiting") ? 429 : 503);
  }
}

function reply(payload: Record<string, unknown>, status: number) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
