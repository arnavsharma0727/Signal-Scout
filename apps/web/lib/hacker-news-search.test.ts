import { describe, expect, it, vi } from "vitest";
import { searchHackerNewsComments } from "./hacker-news-search";

const NOW = Date.parse("2026-10-08T12:00:00Z");

describe("searchHackerNewsComments", () => {
  it("searches recent comments and returns transient plain-text previews", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL) => new Response(JSON.stringify({ hits: [{
      objectID: "12345",
      author: "reader",
      comment_text: "<p>Prices &amp; wages</p>",
      story_title: "Inflation discussion",
      created_at: new Date(NOW - 60_000).toISOString(),
    }] })));
    const results = await searchHackerNewsComments("inflation", fetcher, NOW);
    expect(results).toEqual([{
      id: "12345",
      url: "https://news.ycombinator.com/item?id=12345",
      title: "Comment on: Inflation discussion",
      author: "reader",
      createdAt: new Date(NOW - 60_000).toISOString(),
      transientPreview: "Prices & wages",
    }]);
    const request = new URL(String(fetcher.mock.calls[0][0]));
    expect(request.hostname).toBe("hn.algolia.com");
    expect(request.searchParams.get("tags")).toBe("comment");
    expect(request.pathname).toBe("/api/v1/search");
    expect(request.searchParams.get("query")).toBe("inflation");
    expect(request.searchParams.get("numericFilters")).toContain("created_at_i>");
  });

  it("drops stale, future, malformed, and empty comments", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ hits: [
      { objectID: "1", author: "old", comment_text: "old", created_at: new Date(NOW - 31 * 86400000).toISOString() },
      { objectID: "2", author: "future", comment_text: "future", created_at: new Date(NOW + 60_000).toISOString() },
      { objectID: "x", author: "bad", comment_text: "bad", created_at: new Date(NOW).toISOString() },
      { objectID: "3", author: "empty", comment_text: "<p></p>", created_at: new Date(NOW).toISOString() },
    ] })));
    expect(await searchHackerNewsComments("inflation", fetcher, NOW)).toEqual([]);
  });

  it("surfaces rate limits and rejects invalid queries before fetching", async () => {
    const fetcher = vi.fn(async () => new Response("limited", { status: 429 }));
    await expect(searchHackerNewsComments("x", fetcher, NOW)).rejects.toThrow("2–100");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(searchHackerNewsComments("inflation", fetcher, NOW)).rejects.toThrow("rate-limiting");
  });
});
