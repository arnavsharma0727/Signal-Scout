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

  it("filters comments that match only part of a multiword market query", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ hits: [
      { objectID: "1", author: "relevant", comment_text: "Semiconductor capacity is constrained across the supply chain.", story_title: "Chip manufacturing", created_at: new Date(NOW - 60_000).toISOString() },
      { objectID: "2", author: "noise", comment_text: "Technology is changing quickly.", story_title: "Don't be an out of touch kung fu master", created_at: new Date(NOW - 60_000).toISOString() },
    ] })));

    const results = await searchHackerNewsComments("semiconductor supply chain", fetcher, NOW);
    expect(results.map(({ id }) => id)).toEqual(["1"]);
  });

  it("requires adjacency when a researcher explicitly quotes an exact phrase", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ hits: [
      { objectID: "1", author: "phrase", comment_text: "The market may slow.", story_title: "Electric vehicle supply chain", created_at: new Date(NOW - 60_000).toISOString() },
      { objectID: "2", author: "separate", comment_text: "The electric grid changes.", story_title: "Vehicle supply chain outlook", created_at: new Date(NOW - 60_000).toISOString() },
    ] })));
    expect((await searchHackerNewsComments('"electric vehicle"', fetcher, NOW)).map(({ id }) => id)).toEqual(["1"]);
  });

  it("keeps short acronym queries usable", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ hits: [{
      objectID: "3", author: "reader", comment_text: "EV adoption is growing.", story_title: "EV market", created_at: new Date(NOW - 60_000).toISOString(),
    }] })));
    expect((await searchHackerNewsComments("EV", fetcher, NOW)).map(({ id }) => id)).toEqual(["3"]);
  });

  it("does not turn stop-word-only searches into broad result lists", async () => {
    const fetcher = vi.fn();
    expect(await searchHackerNewsComments("of the", fetcher, NOW)).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces rate limits and rejects invalid queries before fetching", async () => {
    const fetcher = vi.fn(async () => new Response("limited", { status: 429 }));
    await expect(searchHackerNewsComments("x", fetcher, NOW)).rejects.toThrow("2–100");
    expect(fetcher).not.toHaveBeenCalled();
    await expect(searchHackerNewsComments("inflation", fetcher, NOW)).rejects.toThrow("rate-limiting");
  });
});
