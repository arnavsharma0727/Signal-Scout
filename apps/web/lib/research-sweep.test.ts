import { describe, expect, it, vi } from "vitest";
import { runResearchSweep } from "./research-sweep";

const NOW = Date.parse("2026-09-30T12:00:00Z");

describe("runResearchSweep", () => {
  it("exposes Bluesky text only as a transient result preview", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ posts: [{
      uri: "at://did:plc:reader/app.bsky.feed.post/xyz",
      record: { text: "A current public conversation", createdAt: new Date(NOW - 60_000).toISOString(), langs: ["en"] },
      author: { handle: "reader.example" },
    }] })));
    const results = await runResearchSweep("markets", {
      gdelt: false,
      lemmy: false,
      lemmyTermsAccepted: false,
      bluesky: true,
    }, fetcher, NOW);

    expect(results[0].evidence[0]).toMatchObject({
      id: "bluesky:at://did:plc:reader/app.bsky.feed.post/xyz",
      transientPreview: "A current public conversation",
    });
  });

  it("searches selected providers in parallel and preserves provider-specific labels and classes", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === "api.gdeltproject.org") {
        return new Response(JSON.stringify({ articles: [{
          title: "Global report",
          url: "https://publisher.example/story",
          seendate: "20260930110000",
          domain: "publisher.example",
          language: "English",
          sourcecountry: "United States",
        }] }));
      }
      if (url.hostname === "api.stackexchange.com") {
        return new Response(JSON.stringify({ items: [{
          question_id: 12,
          title: "Question about markets",
          link: "https://economics.stackexchange.com/questions/12/example",
          creation_date: Math.floor((NOW - 60_000) / 1000),
          content_license: "CC BY-SA 4.0",
          owner: { display_name: "Reader", link: "https://economics.stackexchange.com/users/4/reader" },
        }] }));
      }
      if (url.hostname === "lemmy.world") {
        return new Response(JSON.stringify({ posts: [{
          post: {
            id: 13,
            ap_id: "https://lemmy.world/post/13",
            name: "A community discussion",
            body: "This post body is transiently previewed, never saved",
            published: new Date(NOW - 60_000).toISOString(),
            language_id: 37,
          },
          creator: { name: "Member", actor_id: "https://lemmy.world/u/member" },
          community: { name: "economy" },
        }] }));
      }
      if (url.hostname === "mastodon.social") {
        return new Response(JSON.stringify([{
          id: "15",
          url: "https://mastodon.social/@reader/15",
          created_at: new Date(NOW - 60_000).toISOString(),
          visibility: "public",
          content: "<p>Post &amp; body can be inspected without HTML</p>",
          account: {
            display_name: "Reader",
            acct: "reader",
            url: "https://mastodon.social/@reader",
            bot: false,
          },
        }]));
      }
      if (url.hostname === "en.wikipedia.org") {
        return new Response(JSON.stringify({ query: { search: [{
          pageid: 14,
          title: "Talk:Markets",
          timestamp: new Date(NOW - 60_000).toISOString(),
          snippet: "Transient snippet is not retained",
        }] } }));
      }
      throw new Error("Unexpected provider");
    });
    const results = await runResearchSweep("markets", {
      gdelt: true,
      stackExchangeSite: "economics",
      lemmy: true,
      lemmyTermsAccepted: true,
      mastodon: { hashtag: "markets", instance: "mastodon.social" },
      mastodonTermsAccepted: true,
      wikimediaLanguage: "en",
    }, fetcher, NOW);

    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(results.map(({ key, evidence, error }) => [key, evidence.length, error])).toEqual([
      ["gdelt", 1, null],
      ["stack-exchange:economics", 1, null],
      ["lemmy:lemmy.world", 1, null],
      ["mastodon", 1, null],
      ["wikimedia", 1, null],
    ]);
    expect(results[1].evidence[0]).toMatchObject({
      evidenceClass: "expert Q&A",
      licenseName: "CC BY-SA 4.0",
    });
    expect(results[2].evidence[0].evidenceClass).toBe("social discussion");
    expect(results[2].evidence[0].transientPreview).toBe("This post body is transiently previewed, never saved");
    expect(results[3].evidence[0].transientPreview).toBe("Post & body can be inspected without HTML");
    expect(results[3].evidence[0]).toMatchObject({
      evidenceClass: "social discussion",
      context: expect.stringContaining("not a geographic market proxy"),
    });
    expect(results[4].evidence[0]).toMatchObject({
      evidenceClass: "editorial discussion",
      context: expect.stringContaining("not a general forum"),
    });
  });

  it("does not query Lemmy until its explicit terms and age affirmation is supplied", async () => {
    const fetcher = vi.fn();
    await expect(runResearchSweep("markets", {
      gdelt: false,
      lemmy: true,
      lemmyTermsAccepted: false,
    }, fetcher, NOW)).rejects.toThrow("Review and affirm");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps selected Lemmy instance results separate", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      return new Response(JSON.stringify({ posts: [{
        post: { id: 2, ap_id: `https://${url.hostname}/post/2`, name: "A recent topic", published: new Date(NOW - 60_000).toISOString(), language_id: 37 },
        creator: { name: "member", actor_id: `https://${url.hostname}/u/member` },
        community: { name: "world" },
      }] }));
    });
    const results = await runResearchSweep("markets", {
      gdelt: false,
      lemmy: true,
      lemmyInstances: ["lemmy.world", "discuss.tchncs.de"],
      lemmyTermsAccepted: true,
    }, fetcher, NOW);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(results.map(({ key, evidence }) => [key, evidence[0]?.source])).toEqual([
      ["lemmy:lemmy.world", "Lemmy · lemmy.world / c/world"],
      ["lemmy:discuss.tchncs.de", "Lemmy · discuss.tchncs.de / c/world"],
    ]);
  });

  it("sends researcher-supplied localized phrases to separate Stack Exchange communities", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const site = url.searchParams.get("site");
      return new Response(JSON.stringify({ items: [{
        question_id: site === "es.stackoverflow" ? 101 : 202,
        title: site === "es.stackoverflow" ? "Inflación y tipos de interés" : "金利とインフレ",
        link: `https://${site}.com/questions/${site === "es.stackoverflow" ? 101 : 202}/example`,
        creation_date: Math.floor((NOW - 60_000) / 1000),
        content_license: "CC BY-SA 4.0",
        owner: { display_name: "Contributor", link: `https://${site}.com/users/1/contributor` },
      }] }));
    });
    const results = await runResearchSweep("inflation", {
      gdelt: false,
      lemmy: false,
      lemmyTermsAccepted: false,
      stackExchangeQueries: [
        { site: "es.stackoverflow", query: "inflación tipos de interés" },
        { site: "ja.stackoverflow", query: "インフレ 金利" },
      ],
    }, fetcher, NOW);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls.map(([url]) => new URL(String(url)).searchParams.get("title"))).toEqual([
      "inflación tipos de interés",
      "インフレ 金利",
    ]);
    expect(results.map(({ key, evidence }) => [key, evidence[0]?.language, evidence[0]?.context])).toEqual([
      ["stack-exchange:es.stackoverflow", "Spanish", expect.stringContaining("inflación tipos de interés")],
      ["stack-exchange:ja.stackoverflow", "Japanese", expect.stringContaining("インフレ 金利")],
    ]);
  });

  it("caps Stack Exchange cross-community requests at four", async () => {
    const fetcher = vi.fn();
    await expect(runResearchSweep("inflation", {
      gdelt: false,
      lemmy: false,
      lemmyTermsAccepted: false,
      stackExchangeQueries: ["economics", "money", "ai", "security", "law"].map((site) => ({ site, query: "inflation" })),
    }, fetcher, NOW)).rejects.toThrow("no more than four");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects duplicate Stack Exchange communities before making a request", async () => {
    const fetcher = vi.fn();
    await expect(runResearchSweep("inflation", {
      gdelt: false,
      lemmy: false,
      lemmyTermsAccepted: false,
      stackExchangeQueries: [
        { site: "economics", query: "inflation" },
        { site: "economics", query: "price increases" },
      ],
    }, fetcher, NOW)).rejects.toThrow("only once");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps source failures separate so one rate-limited API does not erase other results", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === "api.gdeltproject.org") return new Response("rate limited", { status: 429 });
      return new Response(JSON.stringify({ query: { search: [] } }));
    });
    const results = await runResearchSweep("markets", {
      gdelt: true,
      lemmy: false,
      lemmyTermsAccepted: false,
      wikimediaLanguage: "en",
    }, fetcher, NOW);
    expect(results[0].error).toMatch(/rate-limiting/);
    expect(results[1]).toMatchObject({ key: "wikimedia", error: null, evidence: [] });
  });
});
