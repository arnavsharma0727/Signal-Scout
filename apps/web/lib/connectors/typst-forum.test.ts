import { afterEach, describe, expect, it, vi } from "vitest";
import { TypstForumConnector, TYPST_FORUM_LICENSE_START } from "./typst-forum";

afterEach(() => vi.unstubAllGlobals());

function item(input: { title?: string; link?: string; author?: string; date?: string; summary?: string }) {
  return `<item><title>${input.title ?? "Users discuss a new Typst workflow"}</title><dc:creator>${input.author ?? "Forum Member"}</dc:creator><link>${input.link ?? "https://forum.typst.app/t/new-workflow/123"}</link><pubDate>${input.date ?? "Wed, 30 Sep 2026 23:41:34 +0000"}</pubDate><description><![CDATA[${input.summary ?? "Do not retain this post summary."}]]></description></item>`;
}

function feed(items: string, title = "Typst Forum - Latest topics") {
  return `<?xml version="1.0"?><rss xmlns:dc="http://purl.org/dc/elements/1.1/"><channel><title>${title}</title>${items}</channel></rss>`;
}

const input = {
  query: "not used for the public latest RSS feed",
  start: new Date("2026-09-29T00:00:00Z"),
  end: new Date("2026-10-02T00:00:00Z"),
};

describe("Typst Forum CC BY 4.0 RSS connector", () => {
  it("stores only attributed, post-cutoff titles and original links", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(feed(item({})), { headers: { "content-type": "application/rss+xml" } })));
    const result = await new TypstForumConnector().fetchDocuments(input);
    expect(result.requestsUsed).toBe(1);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "licensed-forum",
      sourceName: "Typst Forum · community discussion",
      titleOriginal: "Users discuss a new Typst workflow",
      excerptOriginal: undefined,
      rawMetadata: {
        author: "Forum Member",
        licenseName: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
        licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
        licenseEffectiveAt: TYPST_FORUM_LICENSE_START.toISOString(),
        postBodyAndSummaryDiscarded: true,
        languageInferred: false,
        geographicMarketInferred: false,
      },
    });
    expect(JSON.stringify(result.documents)).not.toContain("Do not retain this post summary");
  });

  it("rejects items outside the license date, window, or publisher URL allowlist", async () => {
    const preLicense = item({ date: "Sun, 15 Sep 2024 13:32:59 GMT" });
    const outOfWindow = item({ link: "https://forum.typst.app/t/old-topic/124", date: "Mon, 28 Sep 2026 23:41:34 +0000" });
    const foreignLink = item({ link: "https://example.com/t/new-workflow/125" });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(feed(`${preLicense}${outOfWindow}${foreignLink}`))));
    const result = await new TypstForumConnector().fetchDocuments(input);
    expect(result.documents).toHaveLength(0);
    expect(result.metadata).toMatchObject({ feedItemsReceived: 3, documentsAccepted: 0, itemsRejected: 3 });
  });

  it("rejects wrong channel identity and redirected hosts", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(feed(item({}), "Different Forum"))));
    await expect(new TypstForumConnector().fetchDocuments(input)).rejects.toThrow("Unexpected Typst forum RSS channel");

    vi.stubGlobal("fetch", vi.fn(async () => {
      const response = new Response(feed(item({})));
      Object.defineProperty(response, "url", { value: "https://example.com/latest.rss" });
      return response;
    }));
    await expect(new TypstForumConnector().fetchDocuments(input)).rejects.toThrow("redirected outside the allowlist");
  });
});
