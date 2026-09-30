import { createHash, timingSafeEqual } from "node:crypto";
import type { NormalizedDocument } from "./connectors/types";

export const TAKEDOWN_REASONS = [
  "rights_request",
  "privacy_request",
  "operator_review",
] as const;

export type TakedownReason = (typeof TAKEDOWN_REASONS)[number];

export function isAuthorizedTakedownRequest(
  provided: string | null,
  expected: string | undefined,
) {
  if (!provided || !expected) return false;
  const providedBytes = Buffer.from(provided);
  const expectedBytes = Buffer.from(expected);
  if (providedBytes.length !== expectedBytes.length) return false;
  return timingSafeEqual(providedBytes, expectedBytes);
}

export function parseTakedownRequest(value: unknown): {
  documentId: string;
  reason: TakedownReason;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (
    typeof body.documentId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.documentId,
    ) ||
    typeof body.reason !== "string" ||
    !TAKEDOWN_REASONS.includes(body.reason as TakedownReason)
  ) {
    return null;
  }
  return { documentId: body.documentId, reason: body.reason as TakedownReason };
}

export function sourceUrlFingerprint(url: string) {
  return createHash("sha256").update(url).digest("hex");
}

export async function excludeTakedownBlockedDocuments(
  db: any,
  documents: NormalizedDocument[],
) {
  if (!documents.length) return { documents, excluded: 0 };
  const fingerprintByDocument = documents.map((document) => ({
    document,
    fingerprints: [
      document.contentHash,
      sourceUrlFingerprint(document.canonicalUrl || document.sourceUrl),
    ],
  }));
  const fingerprints = [
    ...new Set(fingerprintByDocument.flatMap((x) => x.fingerprints)),
  ];
  const { data, error } = await db
    .from("source_takedown_blocks")
    .select("fingerprint")
    .in("fingerprint", fingerprints);
  if (error) throw new Error("Takedown blocklist check failed");
  const blocked = new Set(
    (data ?? []).map((row: { fingerprint: string }) => row.fingerprint),
  );
  const allowed = fingerprintByDocument
    .filter(
      (entry) =>
        !entry.fingerprints.some((fingerprint) => blocked.has(fingerprint)),
    )
    .map((entry) => entry.document);
  return { documents: allowed, excluded: documents.length - allowed.length };
}
