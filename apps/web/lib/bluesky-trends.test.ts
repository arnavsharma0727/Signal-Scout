import { describe, expect, it, vi } from "vitest";
import { fetchBlueskyTrends } from "./bluesky-trends";

describe("fetchBlueskyTrends", () => {
  it("requests a bounded, keyless public trend sample and normalizes safe feed links", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ trends: [
      {
        displayName: "Current policy discussion",
        category: "politics",
        postCount: 185,
        startedAt: "2026-10-06T10:00:00Z",
        link: "/profile/did:plc:example/feed/topic-id",
      },
      { displayName: "unsafe link", link: "//attacker.example/" },
      { displayName: "  " },
    ] }), { status: 200 }));

    const result = await fetchBlueskyTrends(fetcher);

    expect(fetcher).toHaveBeenCalledWith(
      new URL("https://public.api.bsky.app/xrpc/app.bsky.unspecced.getTrends?limit=25"),
      { headers: { accept: "application/json" } },
    );
    expect(result).toEqual([
      {
        topic: "Current policy discussion",
        category: "politics",
        postCount: 185,
        startedAt: "2026-10-06T10:00:00.000Z",
        feedUrl: "https://bsky.app/profile/did:plc:example/feed/topic-id",
      },
      { topic: "unsafe link", category: null, postCount: null, startedAt: null, feedUrl: null },
    ]);
  });

  it("handles empty or malformed trend arrays without inventing topics", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ trends: [null, {}, { displayName: "x".repeat(241) }] }), { status: 200 }));
    await expect(fetchBlueskyTrends(fetcher)).resolves.toEqual([]);
  });

  it("surfaces rate limits and provider failures", async () => {
    await expect(fetchBlueskyTrends(async () => new Response(null, { status: 429 })))
      .rejects.toThrow("rate-limiting");
    await expect(fetchBlueskyTrends(async () => new Response(null, { status: 503 })))
      .rejects.toThrow("temporarily unavailable");
  });
});
