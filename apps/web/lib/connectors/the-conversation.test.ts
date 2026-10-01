import { afterEach, describe, expect, it, vi } from "vitest";
import { TheConversationConnector } from "./the-conversation";

afterEach(() => vi.unstubAllGlobals());

function atomEntry(input: {
  title?: string;
  link?: string;
  published?: string;
  rights?: string;
  content?: string;
}) {
  return `<entry>
    <id>tag:test,1</id>
    <title>${input.title ?? "An expert analysis headline"}</title>
    <link rel="alternate" type="text/html" href="${input.link ?? "https://theconversation.com/au/example-1"}"/>
    <published>${input.published ?? "2026-10-01T10:00:00Z"}</published>
    <rights>${input.rights ?? "Licensed as Creative Commons – attribution, no derivatives."}</rights>
    <author><name>Public Author</name></author>
    <content type="html">${input.content ?? "Full article body must never be retained"}</content>
    <summary type="html">Feed summary must never be retained</summary>
  </entry>`;
}

function atomFeed(entries: string) {
return `<?xml version="1.0" encoding="utf-8"?><feed xmlns="http://www.w3.org/2005/Atom"><id>tag:test,feed</id><title>The Conversation</title>${entries}</feed>`;
}

describe("The Conversation licensed analysis connector", () => {
  it("keeps only unmodified, attributable headline metadata covered by feed rights", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(atomFeed(atomEntry({})), { status: 200 }))
      .mockResolvedValueOnce(new Response(atomFeed(atomEntry({ link: "https://theconversation.com/us/example-2" })), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await new TheConversationConnector().fetchDocuments({
      query: "unrestricted query is not used",
      start: new Date("2026-09-28T00:00:00Z"),
      end: new Date("2026-10-02T00:00:00Z"),
    });

    expect(result.requestsUsed).toBe(2);
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0]).toMatchObject({
      marketCode: "INTL",
      sourceType: "licensed-analysis",
      sourceName: "The Conversation · Australia edition",
      titleOriginal: "An expert analysis headline",
      excerptOriginal: undefined,
      rawMetadata: {
        publisher: "The Conversation",
        edition: "au",
        authors: ["Public Author"],
        derivativesAllowed: false,
        summaryDiscarded: true,
        articleBodyDiscarded: true,
        geographicMarketInferred: false,
      },
    });
    expect(JSON.stringify(result.documents)).not.toContain("article body");
    expect(JSON.stringify(result.documents)).not.toContain("Feed summary");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects entries without the feed's attribution/no-derivatives rights or with an off-site link", async () => {
    const feed = atomFeed([
      atomEntry({ title: "No reuse notice", rights: "All rights reserved." }),
      atomEntry({ title: "Unsafe link", link: "https://example.org/not-the-publisher" }),
    ].join(""));
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(feed, { status: 200 }))
      .mockResolvedValueOnce(new Response(atomFeed(""), { status: 200 })));

    const result = await new TheConversationConnector().fetchDocuments({
      query: "",
      start: new Date("2026-09-28T00:00:00Z"),
      end: new Date("2026-10-02T00:00:00Z"),
    });
    expect(result.documents).toHaveLength(0);
  });

  it("keeps a successful edition when the other edition fails", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(atomFeed(atomEntry({})), { status: 200 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 })));
    const result = await new TheConversationConnector().fetchDocuments({
      query: "",
      start: new Date("2026-09-28T00:00:00Z"),
      end: new Date("2026-10-02T00:00:00Z"),
    });
    expect(result.documents).toHaveLength(1);
    expect(result.metadata).toMatchObject({
      successfulFeeds: 1,
      failedEditions: ["us"],
    });
  });
});
