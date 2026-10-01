import { describe, expect, it, vi } from "vitest";
import { searchGdeltNews } from "./gdelt-public";

describe("searchGdeltNews", () => {
  it("makes one bounded seven-day request and returns only recent HTTPS-linked articles", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ articles: [
      { title: "Recent policy update", url: "https://publisher.example/story", seendate: "20260930120000", domain: "publisher.example", language: "English", sourcecountry: "United States" },
      { title: "Unsafe", url: "javascript:alert(1)", seendate: "20260930120000" },
      { title: "Too old", url: "https://publisher.example/old", seendate: "20260101120000" },
    ] }), { status: 200 }));
    const results = await searchGdeltNews("semiconductor export controls", fetchMock, Date.parse("2026-10-01T12:00:00Z"));
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(url.searchParams.get("maxrecords")).toBe("25");
    expect(url.searchParams.get("timespan")).toBe("7d");
    expect(results).toMatchObject([{ title: "Recent policy update", domain: "publisher.example", language: "English" }]);
  });

  it("validates the query before any request", async () => {
    const fetchMock = vi.fn();
    await expect(searchGdeltNews("x", fetchMock)).rejects.toThrow("3 and 100 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces upstream rate limiting without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("", { status: 429 }));
    await expect(searchGdeltNews("tariffs", fetchMock)).rejects.toThrow("rate-limiting");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
