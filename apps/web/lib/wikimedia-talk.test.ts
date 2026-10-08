import { describe, expect, it, vi } from "vitest";
import { searchWikimediaTalk } from "./wikimedia-talk";

describe("searchWikimediaTalk", () => {
  it("searches only talk pages on the selected wiki and returns recent linked results", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      query: { search: [
        {
          pageid: 123,
          title: "Talk:Inflation",
          timestamp: "2026-09-26T18:49:16Z",
          snippet: "Discussion of <span class=\"searchmatch\">inflation</span>.",
        },
        {
          pageid: 124,
          title: "Talk:Old page",
          timestamp: "2025-01-01T00:00:00Z",
          snippet: "Old discussion",
        },
        {
          pageid: 125,
          title: "Talk:Inflation/Archive 3",
          timestamp: "2026-09-30T23:59:00Z",
          snippet: "Archived discussion resurfaced by a page edit",
        },
      ] },
    }), { status: 200 }));

    const result = await searchWikimediaTalk(
      " inflation ", "en", fetchMock, Date.parse("2026-10-01T00:00:00Z"),
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    const request = new URL(url);
    expect(request.hostname).toBe("en.wikipedia.org");
    expect(request.searchParams.get("srnamespace")).toBe("1");
    expect(request.searchParams.get("srsearch")).toBe("inflation");
    expect(request.searchParams.get("srsort")).toBe("relevance");
    expect(init.headers).toMatchObject({
      "Api-User-Agent": "Atlas/0.1 (https://signal-scout-xi-ruby.vercel.app/)",
    });
    expect(result).toEqual([{
      pageId: 123,
      title: "Talk:Inflation",
      url: "https://en.wikipedia.org/wiki/Talk%3AInflation",
      historyUrl: "https://en.wikipedia.org/wiki/Talk%3AInflation?action=history",
      snippetHtml: "Discussion of <span class=\"searchmatch\">inflation</span>.",
      lastEditedAt: "2026-09-26T18:49:16.000Z",
      language: "English",
      wiki: "English Wikipedia",
    }]);
  });

  it("rejects invalid queries and unsupported wikis without a request", async () => {
    const fetchMock = vi.fn();
    await expect(searchWikimediaTalk("x", "en", fetchMock)).rejects.toThrow("2–100 characters");
    await expect(searchWikimediaTalk("inflation", "xx", fetchMock)).rejects.toThrow("listed wiki");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("explains rate limits and returns no pages older than 90 days", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      query: { search: [{
        pageid: 456,
        title: "Talk:Stale page",
        timestamp: "2025-01-01T00:00:00Z",
        snippet: "Old result",
      }] },
    }), { status: 200 }));
    await expect(searchWikimediaTalk("inflation", "en", fetchMock, Date.parse("2026-10-01T00:00:00Z")))
      .resolves.toEqual([]);

    fetchMock.mockResolvedValueOnce(new Response("", { status: 429 }));
    await expect(searchWikimediaTalk("inflation", "en", fetchMock)).rejects.toThrow("rate-limiting");
  });
});
