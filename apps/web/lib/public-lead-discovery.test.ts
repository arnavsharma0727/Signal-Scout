import { describe, expect, it } from "vitest";
import { buildPublicLeadSeeds } from "./public-lead-discovery";

describe("bounded source-led public lead discovery seeds", () => {
  const now = Date.parse("2026-10-08T16:00:00.000Z");

  it("balances fresh provider trends with targeted searches seeded by reviewed headlines", () => {
    const seeds = buildPublicLeadSeeds([
      { topic: "Trend one", category: "news", postCount: 99, startedAt: null, feedUrl: null },
    ], [
      { title: "Can data centre company Firmus live up to listing value?", url: "https://theconversation.com/story", publishedAt: "2026-10-08T10:00:00.000Z" },
    ], now);

    expect(seeds).toEqual([
      { topic: "Trend one", source: "Bluesky provider trend", category: "news", providerPostCount: 99 },
      expect.objectContaining({
        topic: "data centre company Firmus live listing value",
        source: "reviewed publisher headline",
        sourceTitle: "Can data centre company Firmus live up to listing value?",
        sourceUrl: "https://theconversation.com/story",
      }),
    ]);
  });

  it("prioritizes explicit researcher queries and deduplicates them against other sources", () => {
    const seeds = buildPublicLeadSeeds([
      { topic: "Firmus", category: null, postCount: 1, startedAt: null, feedUrl: null },
    ], [], now, ["  Firmus  ", "AI infrastructure"]);

    expect(seeds.map(({ topic, source }) => [topic, source])).toEqual([
      ["Firmus", "researcher query"],
      ["AI infrastructure", "researcher query"],
    ]);
  });

  it("caps each seed lane, deduplicates normalized topics, and rejects stale or future headlines", () => {
    const trends = Array.from({ length: 8 }, (_, index) => ({
      topic: `Trend ${index}`, category: null, postCount: index, startedAt: null, feedUrl: null,
    }));
    const headlines = [
      { title: "Trend 0", url: "https://example.com/duplicate", publishedAt: "2026-10-08T12:00:00.000Z" },
      ...["energy", "housing", "currency", "shipping", "climate", "health", "labor"].map((topic) => ({
        title: `Headline ${topic} market update`, url: `https://example.com/${topic}`, publishedAt: "2026-10-08T12:00:00.000Z",
      })),
      { title: "Stale topic", url: "https://example.com/stale", publishedAt: "2026-10-01T12:00:00.000Z" },
      { title: "Future topic", url: "https://example.com/future", publishedAt: "2026-10-09T12:00:00.000Z" },
    ];
    const seeds = buildPublicLeadSeeds(trends, headlines, now);

    expect(seeds).toHaveLength(8);
    expect(seeds.filter(({ source }) => source === "Bluesky provider trend")).toHaveLength(4);
    expect(seeds.filter(({ source }) => source === "reviewed publisher headline")).toHaveLength(4);
    expect(seeds.some(({ topic }) => topic.includes("Stale"))).toBe(false);
    expect(seeds.some(({ topic }) => topic.includes("Future"))).toBe(false);
  });
});
