import type { BlueskyTrend } from "./bluesky-trends";

export type PublicLeadSeed = {
  topic: string;
  source: "researcher query" | "Bluesky provider trend" | "reviewed publisher headline";
  category: string | null;
  providerPostCount: number | null;
  sourceTitle?: string;
  sourceUrl?: string;
};

export type ReviewedHeadlineSeed = {
  title: string;
  url: string;
  publishedAt: string;
};

const MAX_TREND_SEEDS = 4;
const MAX_HEADLINE_SEEDS = 4;
const STOP_WORDS = new Set([
  "about", "after", "against", "amid", "among", "are", "been", "being", "before", "between", "could",
  "does", "from", "have", "into", "more", "most", "over", "says", "said", "than", "that", "their",
  "them", "there", "these", "they", "this", "those", "through", "under", "using", "what", "when",
  "where", "which", "while", "with", "would", "your", "and", "for", "the", "you", "its", "was",
  "were", "will", "why", "how", "can", "could", "has", "had", "not", "but", "who", "new", "say",
  "all", "any", "out", "now", "one", "two", "per", "via", "may", "also", "just", "will",
]);

/**
 * Build a small source-led queue: a few live provider trends plus a few recent
 * items from already-reviewed publisher feeds. Headlines seed targeted API
 * searches; headline metadata itself remains an ordinary candidate citation.
 */
export function buildPublicLeadSeeds(
  trends: BlueskyTrend[],
  headlines: ReviewedHeadlineSeed[],
  now = Date.now(),
  researcherQueries: string[] = [],
): PublicLeadSeed[] {
  const seeds: PublicLeadSeed[] = [];
  const seen = new Set<string>();
  const add = (seed: PublicLeadSeed) => {
    const key = normalize(seed.topic);
    if (!key || key.length < 3 || seen.has(key)) return false;
    seen.add(key);
    seeds.push(seed);
    return true;
  };

  for (const query of researcherQueries.slice(0, 4)) {
    add({
      topic: query.trim().slice(0, 100),
      source: "researcher query",
      category: null,
      providerPostCount: null,
    });
  }

  let trendCount = 0;
  for (const trend of dedupeTrends(trends)) {
    const started = trend.startedAt ? Date.parse(trend.startedAt) : NaN;
    if (Number.isFinite(started) && (started > now || now - started > 7 * 86400000)) continue;
    if (add({
      topic: trend.topic.trim().slice(0, 100),
      source: "Bluesky provider trend",
      category: trend.category,
      providerPostCount: trend.postCount,
    }) && ++trendCount >= MAX_TREND_SEEDS) break;
  }

  let headlineCount = 0;
  const recentHeadlines = [...headlines]
    .filter((item) => {
      const published = Date.parse(item.publishedAt);
      return item.title.trim() && item.url.trim() && Number.isFinite(published) && published <= now && now - published <= 7 * 86400000;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  for (const item of recentHeadlines) {
    const topic = headlineQuery(item.title);
    if (topic && add({
      topic,
      source: "reviewed publisher headline",
      category: null,
      providerPostCount: null,
      sourceTitle: item.title,
      sourceUrl: item.url,
    }) && ++headlineCount >= MAX_HEADLINE_SEEDS) break;
  }
  return seeds;
}

function headlineQuery(title: string): string {
  const words = title.normalize("NFKC").match(/[\p{L}\p{N}][\p{L}\p{N}'’.-]*/gu) ?? [];
  const selected = words.filter((word) => {
    const normalized = word.toLocaleLowerCase().replace(/[.'’\-]/g, "");
    return normalized.length >= 3 && !STOP_WORDS.has(normalized);
  }).slice(0, 7);
  return selected.join(" ").slice(0, 100).trim();
}

function dedupeTrends(trends: BlueskyTrend[]) {
  const seen = new Set<string>();
  return trends.filter((trend) => {
    const key = normalize(trend.topic);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
