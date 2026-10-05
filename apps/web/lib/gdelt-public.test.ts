import { afterEach, describe, expect, it, vi } from "vitest";
import { searchGdeltNews } from "./gdelt-public";

afterEach(() => vi.unstubAllGlobals());

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

  it("adds only supported publisher-country and source-language filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ articles: [] }), { status: 200 }));
    await searchGdeltNews("semiconductor exports", fetchMock, Date.now(), "southkorea", "korean");
    const params = new URL(fetchMock.mock.calls[0][0]).searchParams;
    expect(params.get("query")).toBe("semiconductor exports sourcecountry:southkorea sourcelang:korean");
  });

  it("rejects unsupported filters before making a request", async () => {
    const fetchMock = vi.fn();
    await expect(searchGdeltNews("semiconductor exports", fetchMock, Date.now(), "attacker:query" as never))
      .rejects.toThrow("listed publisher-country");
    expect(fetchMock).not.toHaveBeenCalled();
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

  it("uses a bounded first-party request in the browser instead of a blocked cross-origin call", async () => {
    vi.stubGlobal("window", {});
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ articles: [{
      title: "Recent policy update",
      url: "https://publisher.example/story",
      seenAt: "2026-09-30T12:00:00.000Z",
      domain: "publisher.example",
      language: "English",
      sourceCountry: "United States",
    }] }), { status: 200 }));
    await searchGdeltNews("semiconductor export controls", fetchMock, Date.parse("2026-10-01T12:00:00Z"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/research/gdelt");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      query: "semiconductor export controls", outletCountry: "", outletLanguage: "",
    });
  });
});
