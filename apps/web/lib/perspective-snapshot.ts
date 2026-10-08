import type { ResearchSweepSourceResult } from "./research-sweep";

export type PerspectiveSnapshotGroup = {
  source: string;
  language: string;
  items: Array<{ title: string; url: string; transientPreview?: string }>;
};

/**
 * Build a small, citation-linked preview without inferring author nationality,
 * sentiment, or a single pooled "global" opinion.
 */
export function buildPerspectiveSnapshot(results: ResearchSweepSourceResult[]) {
  const englishMarketAngle: PerspectiveSnapshotGroup["items"] = [];
  const others = new Map<string, PerspectiveSnapshotGroup>();

  for (const result of results) {
    for (const item of result.evidence) {
      const isEnglishDiscussion = item.language.toLocaleLowerCase() === "english" &&
        (result.key === "hacker-news" || result.key.startsWith("stack-exchange:"));
      if (isEnglishDiscussion) {
        englishMarketAngle.push({ title: item.title, url: item.url, transientPreview: item.transientPreview });
        continue;
      }

      const isSeparateInternationalView = result.key === "global-voices" ||
        result.key.startsWith("lemmy:") ||
        item.language.toLocaleLowerCase() !== "english";
      if (!isSeparateInternationalView) continue;

      const source = item.source || result.label;
      const language = item.language || "Language not provided";
      const key = `${source}\u0000${language}`;
      const group = others.get(key) ?? { source, language, items: [] };
      if (!group.items.some(({ url }) => url === item.url)) {
        group.items.push({ title: item.title, url: item.url, transientPreview: item.transientPreview });
      }
      others.set(key, group);
    }
  }

  return {
    englishMarketAngle: uniqueByUrl(englishMarketAngle),
    otherPerspectives: [...others.values()],
  };
}

function uniqueByUrl<T extends { url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}
