import { describe, expect, it, vi } from "vitest";
import { makeDocument } from "./connectors/normalize";
import {
  excludeTakedownBlockedDocuments,
  isAuthorizedTakedownRequest,
  parseTakedownRequest,
  sourceUrlFingerprint,
} from "./source-takedown";

const document = makeDocument({
  sourceType: "rss",
  sourceName: "Publisher",
  sourceUrl: "https://publisher.example/story?utm_source=feed",
  title: "A research headline",
  publishedAt: "2026-09-30T12:00:00.000Z",
  tier: 2,
  entityConfidence: 1,
});

describe("source takedown safeguards", () => {
  it("compares operator secrets without throwing on mismatched lengths", () => {
    expect(
      isAuthorizedTakedownRequest("operator-secret", "operator-secret"),
    ).toBe(true);
    expect(isAuthorizedTakedownRequest("short", "operator-secret")).toBe(false);
    expect(isAuthorizedTakedownRequest("éé", "aa")).toBe(false);
    expect(isAuthorizedTakedownRequest(null, "operator-secret")).toBe(false);
  });

  it("accepts only a UUID and a fixed reason code", () => {
    expect(
      parseTakedownRequest({
        documentId: "123e4567-e89b-42d3-a456-426614174000",
        reason: "privacy_request",
      }),
    ).toEqual({
      documentId: "123e4567-e89b-42d3-a456-426614174000",
      reason: "privacy_request",
    });
    expect(
      parseTakedownRequest({ documentId: "not-a-uuid", reason: "other" }),
    ).toBeNull();
    expect(
      parseTakedownRequest(["123e4567-e89b-42d3-a456-426614174000"]),
    ).toBeNull();
  });

  it("checks content and canonical URL blocks before ingest and fails closed", async () => {
    const query = vi.fn().mockResolvedValue({
      data: [{ fingerprint: sourceUrlFingerprint(document.canonicalUrl) }],
      error: null,
    });
    const db = {
      from: vi.fn(() => ({ select: vi.fn(() => ({ in: query })) })),
    };
    const result = await excludeTakedownBlockedDocuments(db, [document]);
    expect(result).toEqual({ documents: [], excluded: 1 });
    expect(query).toHaveBeenCalledWith(
      "fingerprint",
      expect.arrayContaining([
        document.contentHash,
        sourceUrlFingerprint(document.canonicalUrl),
      ]),
    );

    query.mockResolvedValue({
      data: null,
      error: new Error("database unavailable"),
    });
    await expect(
      excludeTakedownBlockedDocuments(db, [document]),
    ).rejects.toThrow("Takedown blocklist check failed");
  });
});
