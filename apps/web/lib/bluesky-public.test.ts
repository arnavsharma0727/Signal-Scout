import { describe, expect, it, vi } from "vitest";
import { searchBlueskyPosts } from "./bluesky-public";

const NOW = Date.parse("2026-10-02T12:00:00Z");

describe("searchBlueskyPosts", () => {
  it("uses public search and returns an ephemeral preview with an attributed citation", async () => {
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
      transientPreview: "private transient body",
      duplicateCount: 1,
    }]);
    expect(JSON.stringify(results)).toContain("private transient body");
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

  it("withholds post text when Bluesky returns content labels", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ posts: [{
      uri: "at://did:plc:abc/app.bsky.feed.post/labeled",
      record: { text: "sensitive transient body", createdAt: new Date(NOW - 1000).toISOString() },
      author: { handle: "reader.example" },
      labels: [{ val: "sexual" }],
    }] })));
    const [result] = await searchBlueskyPosts("markets", fetcher, NOW);
    expect(result.transientPreview).toBeUndefined();
    expect(result.contentWarning).toContain("Preview withheld");
    expect(JSON.stringify(result)).not.toContain("sensitive transient body");
  });

  it("collapses exact repeated post text and discloses the duplicate count", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ posts: [
      { uri: "at://did:plc:abc/app.bsky.feed.post/first", record: { text: "Same copied post", createdAt: new Date(NOW - 1000).toISOString() }, author: { handle: "one.example" } },
      { uri: "at://did:plc:abc/app.bsky.feed.post/copy", record: { text: " same   copied POST ", createdAt: new Date(NOW - 2000).toISOString() }, author: { handle: "two.example" } },
      { uri: "at://did:plc:abc/app.bsky.feed.post/different", record: { text: "Different evidence", createdAt: new Date(NOW - 3000).toISOString() }, author: { handle: "three.example" } },
    ] })));
    const results = await searchBlueskyPosts("markets", fetcher, NOW);
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ authorHandle: "one.example", duplicateCount: 2 });
  });
});
