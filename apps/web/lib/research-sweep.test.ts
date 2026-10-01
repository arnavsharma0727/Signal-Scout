import { describe, expect, it, vi } from "vitest";
import { runResearchSweep } from "./research-sweep";

const NOW = Date.parse("2026-09-30T12:00:00Z");

describe("runResearchSweep", () => {
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
            body: "This post body must not enter the brief model",
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
          content: "<p>Post body should not enter the research evidence record</p>",
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
      if (url.hostname === "en.wikinews.org") {
        return new Response(JSON.stringify({ query: {
          rightsinfo: { text: "Creative Commons Attribution 4.0", url: "https://creativecommons.org/licenses/by/4.0/" },
          search: [{ title: "International report", timestamp: new Date(NOW - 60_000).toISOString() }],
        } }));
      }
      throw new Error("Unexpected provider");
    });
    const results = await runResearchSweep("markets", {
      gdelt: true,
      stackExchangeSite: "economics",
      lemmy: true,
      lemmyTermsAccepted: true,
      mastodon: { hashtag: "markets", instance: "mastodon.social" },
      wikimediaLanguage: "en",
      wikinewsLanguage: "en",
    }, fetcher, NOW);

    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(results.map(({ key, evidence, error }) => [key, evidence.length, error])).toEqual([
      ["gdelt", 1, null],
      ["stack-exchange", 1, null],
      ["lemmy", 1, null],
      ["mastodon", 1, null],
      ["wikimedia", 1, null],
      ["wikinews", 1, null],
    ]);
    expect(results[1].evidence[0]).toMatchObject({
      evidenceClass: "expert Q&A",
      licenseName: "CC BY-SA 4.0",
    });
    expect(results[2].evidence[0].evidenceClass).toBe("social discussion");
    expect(JSON.stringify(results[2].evidence)).not.toContain("post body");
    expect(JSON.stringify(results[3].evidence)).not.toContain("Post body");
    expect(results[3].evidence[0]).toMatchObject({
      evidenceClass: "social discussion",
      context: expect.stringContaining("not a geographic market proxy"),
    });
    expect(results[4].evidence[0]).toMatchObject({
      evidenceClass: "editorial discussion",
      context: expect.stringContaining("not a general forum"),
    });
    expect(results[5].evidence[0]).toMatchObject({
      evidenceClass: "news coverage",
      context: expect.stringContaining("not a general forum"),
      licenseName: "Creative Commons Attribution 4.0",
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
      wikinewsLanguage: "en",
    }, fetcher, NOW);
    expect(results[0].error).toMatch(/rate-limiting/);
    expect(results[1]).toMatchObject({ key: "wikimedia", error: null, evidence: [] });
  });
});
