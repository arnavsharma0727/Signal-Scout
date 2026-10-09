import type { ResearchSweepSourceResult } from "./research-sweep";

export type PerspectiveSnapshotGroup = {
  source: string;
  language: string;
  evidenceClass: string;
  items: Array<{ id: string; resultKey: string; title: string; url: string; transientPreview?: string }>;
};

export function citationKey(resultKey: string, evidenceId: string) {
  return `${resultKey}\u0000${evidenceId}`;
}

/** Stable within one search response and shared by overview badges and source entries. */
export function buildCitationIds(results: ResearchSweepSourceResult[]) {
  const ids = new Map<string, string>();
  let next = 1;
  for (const result of results) {
    for (const item of result.evidence) ids.set(citationKey(result.key, item.id), `C${next++}`);
  }
  return ids;
}

/**
 * Build a small evidence preview without inferring author nationality,
 * sentiment, or a single pooled "global" opinion.
 */
export function buildPerspectiveSnapshot(results: ResearchSweepSourceResult[]) {
  const groups = new Map<string, PerspectiveSnapshotGroup>();

  for (const result of results) {
    for (const item of result.evidence) {
      const isEnglishForum = item.language.toLocaleLowerCase() === "english" &&
        (result.key === "hacker-news" || result.key.startsWith("stack-exchange:"));
      const isOtherPerspective = result.key === "global-voices" ||
        result.key.startsWith("lemmy:") ||
        item.language.toLocaleLowerCase() !== "english";
      const isIncludedSource = isEnglishForum || isOtherPerspective;
      if (!isIncludedSource) continue;

      const source = item.source || result.label;
      const language = item.language || "Language not provided";
      const evidenceClass = result.key.startsWith("stack-exchange:") ? "expert Q&A" : item.evidenceClass;
      const key = `${source}\u0000${language}\u0000${evidenceClass}`;
      const group = groups.get(key) ?? { source, language, evidenceClass, items: [] };
      if (!group.items.some(({ url }) => url === item.url)) {
        group.items.push({ id: item.id, resultKey: result.key, title: item.title, url: item.url, transientPreview: item.transientPreview });
      }
      groups.set(key, group);
    }
  }

  const all = [...groups.values()];
  return {
    englishPerspectives: all.filter(({ source }) =>
      source === "Hacker News" || source.toLocaleLowerCase().includes("stack exchange"),
    ),
    otherPerspectives: all.filter(({ source }) =>
      source !== "Hacker News" && !source.toLocaleLowerCase().includes("stack exchange"),
    ),
  };
}
