import { describe, expect, it, vi } from "vitest";
import { searchBlueskyPosts } from "./bluesky-public";

const NOW = Date.parse("2026-10-02T12:00:00Z");

describe("searchBlueskyPosts", () => {
  it("uses public search and returns attributed citations without post text", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ posts: [{
      uri: "at://did:plc:abc/app.bsky.feed.post/xyz",
      record: { text: "private transient body", createdAt: new Date(NOW - 1000).toISOString(), langs: ["en"] },
      author: { handle: "reader.example" },
    }] })));
    const results = await searchBlueskyPosts("markets", fetcher, NOW);
    const url = new URL(String(fetcher.mock.calls[0][0]));
    expect(url.origin).toBe("https://api.bsky.app");
    expect(url.searchParams.get("q")).toBe("markets");
    expect(results).toEqual([{
      uri: "at://did:plc:abc/app.bsky.feed.post/xyz",
      url: "https://bsky.app/profile/reader.example/post/xyz",
      title: "Public Bluesky post by @reader.example",
      authorHandle: "reader.example",
      publishedAt: new Date(NOW - 1000).toISOString(),
      language: "en",
    }]);
    expect(JSON.stringify(results)).not.toContain("private transient body");
  });

  it("excludes stale and malformed records and rejects oversized queries", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ posts: [
      { uri: "at://did:plc:abc/app.bsky.feed.post/stale", record: { text: "old", createdAt: new Date(NOW - 8 * 86400000).toISOString() }, author: { handle: "a.example" } },
      { uri: "https://invalid", record: { text: "bad" }, author: { handle: "a.example" } },
    ] })));
    expect(await searchBlueskyPosts("markets", fetcher, NOW)).toEqual([]);
    await expect(searchBlueskyPosts("x".repeat(101), fetcher, NOW)).rejects.toThrow("2–100");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
