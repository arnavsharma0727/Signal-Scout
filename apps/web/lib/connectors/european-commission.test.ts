import { afterEach, describe, expect, it, vi } from "vitest";
import { EuropeanCommissionConnector } from "./european-commission";

afterEach(() => vi.unstubAllGlobals());

const window = {
  query: "inflation OR trade",
  start: new Date("2026-09-27T00:00:00Z"),
  end: new Date("2026-10-01T00:00:00Z"),
};

describe("European Commission Presscorner connector", () => {
  it("keeps only official metadata and discards RSS descriptions", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      `<rss><channel><item><title>New trade framework</title><link>https://ec.europa.eu/commission/presscorner/detail/en/ip_26_42</link><description>Full speech text that must not be stored</description><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item></channel></rss>`,
      { status: 200, headers: { "content-type": "application/rss+xml" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new EuropeanCommissionConnector().fetchDocuments(window);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "official-policy",
      sourceName: "European Commission Presscorner",
      sourceUrl: "https://ec.europa.eu/commission/presscorner/detail/en/ip_26_42",
      titleOriginal: "New trade framework",
      languageCode: "en",
      excerptOriginal: undefined,
      rawMetadata: {
        license: "CC-BY-4.0",
        attributionRequired: true,
        contentPolicy: "title-link-date-only",
      },
    });
    expect(JSON.stringify(result.documents)).not.toContain("Full speech text");
    expect(result.requestsUsed).toBe(1);
  });

  it("rejects items older than 24 hours, non-Presscorner links, and foreign hosts", async () => {
    const xml = `<rss><channel>
      <item><title>Old item</title><link>https://ec.europa.eu/commission/presscorner/detail/en/old</link><pubDate>Mon, 28 Sep 2026 00:00:00 GMT</pubDate></item>
      <item><title>Offsite</title><link>https://example.com/story</link><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item>
      <item><title>Other Commission page</title><link>https://ec.europa.eu/other/page</link><pubDate>Wed, 30 Sep 2026 12:00:00 GMT</pubDate></item>
    </channel></rss>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(xml, { status: 200 })));
    const result = await new EuropeanCommissionConnector().fetchDocuments(window);
    expect(result.documents).toHaveLength(0);
  });
});
