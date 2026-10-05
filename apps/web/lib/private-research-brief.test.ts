import { describe, expect, it } from "vitest";
import { preparePrivateEvidenceLinks, privateCitationPolicy } from "./private-research-brief";

describe("private research brief citation retention", () => {
  it("keeps only links from sources with a reviewed reuse basis and strips tracking", () => {
    const result = preparePrivateEvidenceLinks([
      { url: "https://economics.stackexchange.com/questions/12/example?utm_source=feed#answer-34", language: "en", publishedAt: "2026-10-01T12:00:00Z", assessment: "supports", title: "Must not persist", attribution: "Private contributor field" },
      { url: "https://globalvoices.org/2026/10/01/story/?utm_campaign=x", language: "en", assessment: "not relevant" },
      { url: "https://es.globalvoices.org/2026/10/01/historia/?utm_campaign=x", language: "es" },
      { url: "https://forum.typst.app/t/topic/1234?utm_source=x", language: "unassigned" },
      { url: "https://en.wikipedia.org/w/index.php?title=Talk%3AMoney&oldid=12345&utm_source=x", language: "en" },
      { url: "https://theconversation.com/article-123?utm_source=x", language: "en" },
    ]);

    expect(result).toHaveLength(6);
    expect(result[0]).toMatchObject({
      url: "https://economics.stackexchange.com/questions/12/example#answer-34",
      host: "economics.stackexchange.com",
      sourceClass: "expert Q&A",
      assessment: "supports",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    });
    expect(result[2]).toMatchObject({ host: "es.globalvoices.org", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" });
    expect(result[1].assessment).toBe("not relevant");
    expect(result[3]).toMatchObject({ sourceClass: "community forum", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" });
    expect(result[4].url).toBe("https://en.wikipedia.org/w/index.php?title=Talk%3AMoney&oldid=12345");
    expect(JSON.stringify(result)).not.toContain("Must not persist");
    expect(JSON.stringify(result)).not.toContain("Private contributor field");
    expect(JSON.stringify(result)).not.toContain("utm_");
  });

  it("does not retain transient social, index-only, unknown, or unsafe URLs", () => {
    expect(privateCitationPolicy("https://mastodon.social/@person/123")).toBeNull();
    expect(privateCitationPolicy("https://lemmy.world/post/123")).toBeNull();
    expect(privateCitationPolicy("https://www.reuters.com/world/story")).toBeNull();
    expect(privateCitationPolicy("javascript:alert(1)")).toBeNull();
    expect(privateCitationPolicy("https://user:pass@globalvoices.org/story")).toBeNull();
    expect(privateCitationPolicy("https://evilglobalvoices.org/story")).toBeNull();
    expect(preparePrivateEvidenceLinks([{ url: "https://news.google.com/rss/articles/1" }])).toEqual([]);
  });

  it("deduplicates references and bounds the retained list", () => {
    const entries = Array.from({ length: 45 }, (_, i) => ({
      url: `https://economics.stackexchange.com/questions/${i + 1}/topic`,
    }));
    entries.push(entries[0]);
    const result = preparePrivateEvidenceLinks(entries);
    expect(result).toHaveLength(40);
    expect(new Set(result.map(row => row.url)).size).toBe(40);
  });
});
