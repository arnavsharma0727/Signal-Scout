import { describe, expect, it, vi } from "vitest";
import { searchWikinews } from "./wikinews-search";

const NOW = Date.parse("2026-10-01T12:00:00Z");

describe("searchWikinews", () => {
  it("returns recent title-only results with the edition's live license", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.hostname).toBe("es.wikinews.org");
      expect(url.searchParams.get("srnamespace")).toBe("0");
      expect(url.searchParams.get("srprop")).toBe("timestamp");
      expect(url.searchParams.has("origin")).toBe(true);
      return new Response(JSON.stringify({ query: {
        rightsinfo: { text: "Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
        search: [
          { title: "Economía mundial", timestamp: "2026-09-30T10:00:00Z", snippet: "Must not enter the result model." },
          { title: "Old report", timestamp: "2026-08-01T10:00:00Z" },
          { title: "Category:Economy", timestamp: "2026-09-30T10:00:00Z" },
        ],
      } }));
    });
    const result = await searchWikinews("economía", "es", fetcher, NOW);
    expect(result).toEqual([{
      title: "Economía mundial",
      url: "https://es.wikinews.org/wiki/Econom%C3%ADa_mundial",
      updatedAt: "2026-09-30T10:00:00.000Z",
      language: "Spanish",
      edition: "Wikinews (Spanish)",
      license: "Creative Commons Attribution 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    }]);
  });

  it("fails closed when an edition does not publish a supported license", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ query: {
      rightsinfo: { text: "Unknown", url: "https://example.org/license" },
      search: [{ title: "News", timestamp: "2026-09-30T10:00:00Z" }],
    } })));
    await expect(searchWikinews("news", "en", fetcher, NOW)).rejects.toThrow("supported Creative Commons license");
  });

  it("rejects unlisted editions and malformed queries before making a request", async () => {
    const fetcher = vi.fn();
    await expect(searchWikinews("x", "en", fetcher, NOW)).rejects.toThrow("2–100 characters");
    await expect(searchWikinews("news", "xx", fetcher, NOW)).rejects.toThrow("2–100 characters");
    expect(fetcher).not.toHaveBeenCalled();
  });
});
