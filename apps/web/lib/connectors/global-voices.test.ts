import { afterEach, describe, expect, it, vi } from "vitest";
import { GLOBAL_VOICES_FEEDS, GlobalVoicesConnector } from "./global-voices";

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

function feed(entries: string, title = "Global Voices", language = "en-US") {
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>${title}</title><language>${language}</language>${entries}</channel></rss>`;
}

function editionFeeds(entriesByLanguage: Record<string, string> = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const host = new URL(String(input)).hostname;
    const edition = GLOBAL_VOICES_FEEDS.find(({ host: candidate }) => candidate === host)!;
    return new Response(feed(entriesByLanguage[edition.language] ?? "", edition.feedTitle));
  });
}

const input = {
  query: "not used for full-site RSS",
  start: new Date("2026-09-30T00:00:00Z"),
  end: new Date("2026-10-02T00:00:00Z"),
};

describe("Global Voices CC BY RSS connector", () => {
  it("retains attributed metadata only under the site's default CC BY notice", async () => {
    const fetcher = editionFeeds({ en: item({}) });
    vi.stubGlobal("fetch", fetcher);

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.requestsUsed).toBe(GLOBAL_VOICES_FEEDS.length);
    expect(fetcher).toHaveBeenCalledTimes(GLOBAL_VOICES_FEEDS.length);
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "licensed-reporting",
      sourceName: "Global Voices · English edition",
      titleOriginal: "An international reporting headline",
      excerptOriginal: undefined,
      rawMetadata: {
        publisher: "Global Voices",
        editionCode: "en",
        editionLabel: "English",
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

  it("ingests active localized editions using the configured edition language, not the unreliable RSS language field", async () => {
    const fetcher = editionFeeds({
      es: item({ title: "Conversación y tecnología", url: "https://es.globalvoices.org/2026/10/01/story/" }),
      fr: item({ title: "Débat sur l’intelligence artificielle", url: "https://fr.globalvoices.org/2026/10/01/story/" }),
    });
    vi.stubGlobal("fetch", fetcher);

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.documents).toHaveLength(2);
    expect(result.documents.map(({ languageCode, sourceName }) => [languageCode, sourceName])).toEqual([
      ["es", "Global Voices · Spanish edition"],
      ["fr", "Global Voices · French edition"],
    ]);
    expect(result.documents[0].rawMetadata).toMatchObject({
      publisher: "Global Voices",
      editionCode: "es",
      crossEditionDuplicateRisk: true,
      publisherIndependenceInferred: false,
    });
    expect(result.metadata).toMatchObject({
      editionsQueried: ["en", "es", "fr", "pt", "ar", "ru", "it", "nl", "yo", "uk", "el", "ca"],
      lookbackDays: 7,
      failedFeeds: [],
      bodyAndMediaRetained: false,
    });
    expect(result.metadata.editionResults).toEqual([
      { language: "en", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "es", feedItemsReceived: 1, documentsAccepted: 1, status: "completed" },
      { language: "fr", feedItemsReceived: 1, documentsAccepted: 1, status: "completed" },
      { language: "pt", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "ar", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "ru", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "it", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "nl", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "yo", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "uk", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "el", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
      { language: "ca", feedItemsReceived: 0, documentsAccepted: 0, status: "completed" },
    ]);
  });

  it("accepts the verified Italian, Dutch, and Yoruba editions as one publisher", async () => {
    vi.stubGlobal("fetch", editionFeeds({
      it: item({ url: "https://it.globalvoices.org/2026/10/01/story/" }),
      nl: item({ url: "https://nl.globalvoices.org/2026/10/01/story/" }),
      yo: item({ url: "https://yo.globalvoices.org/2026/10/01/story/" }),
    }));

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.documents.map(({ languageCode, sourceName }) => [languageCode, sourceName])).toEqual([
      ["it", "Global Voices · Italian edition"],
      ["nl", "Global Voices · Dutch edition"],
      ["yo", "Global Voices · Yoruba edition"],
    ]);
    expect(result.documents.every(({ rawMetadata }) => rawMetadata.publisher === "Global Voices")).toBe(true);
    expect(result.requestsUsed).toBe(12);
  });

  it("accepts verified Ukrainian, Greek, and Catalan editions inside the rolling seven-day window", async () => {
    vi.stubGlobal("fetch", editionFeeds({
      uk: item({ date: "Mon, 28 Sep 2026 11:57:12 GMT", url: "https://uk.globalvoices.org/2026/09/28/story/" }),
      el: item({ date: "Fri, 25 Sep 2026 09:35:11 GMT", url: "https://el.globalvoices.org/2026/09/25/story/" }),
      ca: item({ date: "Fri, 25 Sep 2026 08:00:52 GMT", url: "https://ca.globalvoices.org/2026/09/25/story/" }),
    }));

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.documents.map(({ languageCode, sourceName }) => [languageCode, sourceName])).toEqual([
      ["uk", "Global Voices · Ukrainian edition"],
      ["el", "Global Voices · Greek edition"],
      ["ca", "Global Voices · Catalan edition"],
    ]);
    expect(result.metadata.lookbackDays).toBe(7);
  });

  it("rejects item-specific conflicting rights, non-publisher links, and out-of-window items", async () => {
    const rows = [
      item({ title: "Rights exception", rights: "All rights reserved" }),
      item({ title: "Off-site link", url: "https://example.org/story/" }),
      item({ title: "Too old", date: "Thu, 24 Sep 2026 23:59:59 GMT" }),
      item({ title: "Future item", date: "Sat, 03 Oct 2026 00:00:00 GMT" }),
    ];
    vi.stubGlobal("fetch", editionFeeds({ en: rows.join("") }));

    const result = await new GlobalVoicesConnector().fetchDocuments(input);
    expect(result.documents).toHaveLength(0);
    expect(result.metadata).toMatchObject({
      feedItemsReceived: 4,
      itemRightsExceptionsRejected: true,
      bodyAndMediaRetained: false,
    });
  });

  it("fails only the edition whose publisher identity does not match and reports a partial feed run", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const host = new URL(String(input)).hostname;
      const edition = GLOBAL_VOICES_FEEDS.find(({ host: candidate }) => candidate === host)!;
      const title = edition.language === "es" ? "Unverified feed" : edition.feedTitle;
      return new Response(feed("", title));
    });
    vi.stubGlobal("fetch", fetcher);

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.requestsUsed).toBe(GLOBAL_VOICES_FEEDS.length);
    expect(result.metadata).toMatchObject({
      failedFeeds: ["es"],
      editionsSucceeded: ["en", "fr", "pt", "ar", "ru", "it", "nl", "yo", "uk", "el", "ca"],
    });
    expect(result.metadata.editionResults).toContainEqual({
      language: "es",
      feedItemsReceived: 0,
      documentsAccepted: 0,
      status: "failed",
    });
  });

  it("accepts the Greek publisher's same-host canonical redirect from /feed/ to /feed", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const edition = GLOBAL_VOICES_FEEDS.find(({ host }) => host === url.hostname)!;
      const response = new Response(feed(
        edition.language === "el" ? item({ url: "https://el.globalvoices.org/2026/10/01/story/" }) : "",
        edition.feedTitle,
      ));
      if (edition.language === "el") {
        Object.defineProperty(response, "url", { value: "https://el.globalvoices.org/feed" });
      }
      return response;
    });
    vi.stubGlobal("fetch", fetcher);

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.documents.map(({ languageCode }) => languageCode)).toEqual(["el"]);
    expect(result.metadata.failedFeeds).toEqual([]);
    expect(result.metadata.editionResults).toContainEqual({
      language: "el",
      feedItemsReceived: 1,
      documentsAccepted: 1,
      status: "completed",
    });
  });

  it("still rejects feed redirects with an off-site host or unapproved path", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const edition = GLOBAL_VOICES_FEEDS.find(({ host }) => host === url.hostname)!;
      const response = new Response(feed("", edition.feedTitle));
      if (edition.language === "es") Object.defineProperty(response, "url", { value: "https://example.org/feed" });
      if (edition.language === "fr") Object.defineProperty(response, "url", { value: "https://fr.globalvoices.org/feed/private" });
      return response;
    });
    vi.stubGlobal("fetch", fetcher);

    const result = await new GlobalVoicesConnector().fetchDocuments(input);

    expect(result.metadata.failedFeeds).toEqual(["es", "fr"]);
    expect(result.documents).toHaveLength(0);
  });
});
