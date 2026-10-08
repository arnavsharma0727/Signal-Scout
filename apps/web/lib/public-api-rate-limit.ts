import "server-only";
import { createHmac } from "node:crypto";
import type { NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Shared database limits; client IPs are HMACed and never persisted in clear text. */
export async function allowPublicGdeltRequest(
  request: NextRequest,
  db: SupabaseClient | null,
): Promise<"allowed" | "limited" | "unavailable"> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientIp = forwardedFor?.split(",", 1)[0]?.trim();
  if (!db || !secret || (!clientIp && process.env.NODE_ENV === "production")) return "unavailable";

  const clientHash = hmac(secret, `gdelt:client:${clientIp || "local-development"}`);
  const globalHash = hmac(secret, "gdelt:global");
  const { data, error } = await db.rpc("consume_public_endpoint_rate_limit", {
    p_route_name: "gdelt",
    p_client_hash: clientHash,
    p_global_hash: globalHash,
  });
  if (error) return "unavailable";
  return data === true ? "allowed" : "limited";
}

function hmac(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}
