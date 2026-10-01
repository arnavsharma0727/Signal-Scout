import { afterEach, describe, expect, it, vi } from "vitest";
import { WikimediaTalkConnector } from "./wikimedia-talk";

afterEach(() => vi.unstubAllGlobals());

const start = new Date("2026-09-29T00:00:00.000Z");
const end = new Date("2026-10-02T00:00:00.000Z");
const input = { query: "ignored", start, end };

function response(items: unknown[], continued = false) {
  return new Response(JSON.stringify({
    query: { recentchanges: items },
    ...(continued ? { continue: { rccontinue: "token" } } : {}),
  }), { headers: { "content-type": "application/json" } });
}

function revision(overrides: Record<string, unknown> = {}) {
  return {
    title: "Talk:International finance",
    timestamp: "2026-10-01T08:00:00Z",
    revid: 987654,
    ns: 1,
    user: "must not be requested or retained",
    comment: "must not be requested or retained",
    ...overrides,
  };
}

describe("Wikimedia talk-page activity connector", () => {
  it("collects bounded attribution-linked metadata across ten language editions only", async () => {
    const fetchMock = vi.fn().mockImplementation(() => response([revision()], true));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new WikimediaTalkConnector().fetchDocuments(input);

    expect(result.requestsUsed).toBe(10);
    expect(fetchMock).toHaveBeenCalledTimes(10);
    expect(result.documents).toHaveLength(10);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "wikimedia-talk",
      sourceName: "Wikimedia · English Wikipedia talk pages",
      languageCode: "en",
      titleOriginal: "Talk:International finance",
      excerptOriginal: undefined,
      rawMetadata: {
        namespace: 1,
        revisionId: 987654,
        licenseName: "Creative Commons Attribution-ShareAlike 4.0 International",
        talkContentRetained: false,
        contributorNameOrIdRetained: false,
        editSummaryRetained: false,
        geographicAudienceInferred: false,
        notMarketSentiment: true,
      },
    });
    expect(result.documents[0].sourceUrl).toContain("oldid=987654");
    const serialized = JSON.stringify(result.documents);
    expect(serialized).not.toContain("must not be requested or retained");
    expect(result.metadata).toMatchObject({
      maxItemsPerEdition: 500,
      contributorIdentifiersRetained: false,
      talkTextRetained: false,
    });
    expect((result.metadata.editions as Array<Record<string, unknown>>)[0]).toMatchObject({
      language: "en",
      received: 1,
      retained: 1,
      capped: true,
    });
    for (const [url, init] of fetchMock.mock.calls) {
      const parsed = new URL(String(url));
      expect(parsed.searchParams.get("rcnamespace")).toBe("1");
      expect(parsed.searchParams.get("rclimit")).toBe("500");
      expect(parsed.searchParams.has("rccontinue")).toBe(false);
      expect(parsed.searchParams.get("rcprop")).not.toContain("user");
      expect(parsed.searchParams.get("rcprop")).not.toContain("comment");
      expect((init as RequestInit).headers).toMatchObject({
        "User-Agent": "SignalScout/1.0 (https://signal-scout-xi-ruby.vercel.app)",
      });
    }
  });

  it("drops minor, bot, non-talk, malformed, and out-of-window changes", async () => {
    const fetchMock = vi.fn().mockImplementation(() => response([
      revision({ title: "Talk:Old", timestamp: "2026-09-28T23:59:59Z" }),
      revision({ title: "Talk:Future", timestamp: "2026-10-02T00:00:01Z" }),
      revision({ title: "Talk:Bot", bot: true }),
      revision({ title: "Talk:Minor", minor: true }),
      revision({ title: "Article namespace", ns: 0 }),
      revision({ title: "No revision id", revid: undefined }),
      revision({ title: "Talk:Eligible" }),
    ]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new WikimediaTalkConnector().fetchDocuments(input);
    expect(result.documents).toHaveLength(10);
    expect(result.documents.every((doc) => doc.titleOriginal === "Talk:Eligible")).toBe(true);
  });

  it("continues across editions when one API request fails without exposing response details", async () => {
    let call = 0;
    const fetchMock = vi.fn().mockImplementation(() =>
      ++call === 1
        ? new Response("private upstream diagnostic", { status: 400 })
        : response([revision()]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await new WikimediaTalkConnector().fetchDocuments(input);
    expect(result.requestsUsed).toBe(10);
    expect(result.documents).toHaveLength(9);
    expect(result.metadata.failedFeeds).toEqual([{ language: "en", code: "HTTP_400" }]);
    expect(JSON.stringify(result.metadata)).not.toContain("private upstream diagnostic");
  });
});
