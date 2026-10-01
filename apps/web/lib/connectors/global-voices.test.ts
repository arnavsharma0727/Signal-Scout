import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalVoicesConnector } from "./global-voices";

afterEach(() => vi.unstubAllGlobals());

function item(input: {
  title?: string;
  url?: string;
  author?: string;
  date?: string;
  rights?: string;
  body?: string;
}) {
  return `<item>
    <title>${input.title ?? "An international reporting headline"}</title>
    <link>${input.url ?? "https://globalvoices.org/2026/10/01/example/"}</link>
    <dc:creator>${input.author ?? "Public Byline"}</dc:creator>
    <pubDate>${input.date ?? "Thu, 01 Oct 2026 01:00:00 GMT"}</pubDate>
    <category>Digital activism</category>
    ${input.rights ? `<rights>${input.rights}</rights>` : ""}
    <description><![CDATA[Description must not be retained]]></description>
    <content:encoded><![CDATA[Full reporting text must not be retained: ${input.body ?? "private body fixture"}]]></content:encoded>
    <media:content url="https://globalvoices.org/example-image.jpg" />
  </item>`;
}

function feed(entries: string, language = "en-US") {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>Global Voices</title><language>${language}</language>${entries}</channel></rss>`;
}

const input = {
  query: "not used for full-site RSS",
  start: new Date("2026-09-30T00:00:00Z"),
  end: new Date("2026-10-02T00:00:00Z"),
};

describe("Global Voices CC BY RSS connector", () => {
  it("retains attributed metadata only under the site's default CC BY notice", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(feed(item({})))));

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.requestsUsed).toBe(1);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "licensed-reporting",
      sourceName: "Global Voices · community reporting",
      titleOriginal: "An international reporting headline",
      excerptOriginal: undefined,
      rawMetadata: {
        publisher: "Global Voices",
        author: "Public Byline",
        licenseName: "Creative Commons Attribution 3.0 Unported (CC BY 3.0)",
        licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
        categories: ["Digital activism"],
        titleUnmodified: true,
        articleBodyDiscarded: true,
        mediaDiscarded: true,
        geographicMarketInferred: false,
      },
    });
    const serialized = JSON.stringify(result.documents);
    expect(serialized).not.toContain("Description must not be retained");
    expect(serialized).not.toContain("Full reporting text");
    expect(serialized).not.toContain("private body fixture");
    expect(serialized).not.toContain("example-image.jpg");
  });

  it("rejects item-specific conflicting rights, non-publisher links, and out-of-window items", async () => {
    const rows = [
      item({ title: "Rights exception", rights: "All rights reserved" }),
      item({ title: "Off-site link", url: "https://example.org/story/" }),
      item({ title: "Too old", date: "Tue, 29 Sep 2026 23:59:59 GMT" }),
      item({ title: "Future item", date: "Sat, 03 Oct 2026 00:00:00 GMT" }),
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(feed(rows.join("")))),
    );

    const result = await new GlobalVoicesConnector().fetchDocuments(input);
    expect(result.documents).toHaveLength(0);
    expect(result.metadata).toMatchObject({
      feedItemsReceived: 4,
      itemRightsExceptionsRejected: true,
      bodyAndMediaRetained: false,
    });
  });

  it("refuses a feed without an English language declaration", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(feed(item({}), "es"))),
    );

    await expect(new GlobalVoicesConnector().fetchDocuments(input)).rejects.toThrow(
      "Global Voices feed language is missing or unsupported",
    );
  });
});
