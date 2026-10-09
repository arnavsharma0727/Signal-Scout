import type { ResearchSweepSourceResult } from "./research-sweep";

export type PerspectiveSnapshotGroup = {
  source: string;
  language: string;
  evidenceClass: string;
  items: Array<{ id: string; resultKey: string; query: string; title: string; url: string; transientPreview?: string }>;
};

export type RepeatedPhrase = {
  phrase: string;
  items: PerspectiveSnapshotGroup["items"];
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
        group.items.push({ id: item.id, resultKey: result.key, query: result.query, title: item.title, url: item.url, transientPreview: item.transientPreview });
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

/** State the limit of an empty international-language overview without treating failure as zero evidence. */
export function emptyInternationalOverviewMessage(results: ResearchSweepSourceResult[]) {
  const reporting = results.filter(({ key }) => key === "global-voices" || key.startsWith("global-voices:alternate:"));
  const completed = reporting.filter(({ status }) => status === "complete" || status === "partial");
  const unavailable = reporting.filter(({ status }) => status === "unavailable" || status === "not-searched");
  const caveat = "An empty search is not evidence that a view is absent.";

  if (reporting.length && !completed.length) {
    return `International reporting could not be checked because the selected reporting source was unavailable. See its status below. ${caveat}`;
  }
  if (unavailable.length) {
    return `No non-English or language-labeled reporting appeared in sources that completed; ${unavailable.length} selected reporting search${unavailable.length === 1 ? " was" : "es were"} unavailable or not searched. See source status below. ${caveat}`;
  }
  if (completed.some(({ status }) => status === "partial")) {
    return `No non-English or language-labeled reporting matched in the available editions; coverage was partial. See source status below. ${caveat}`;
  }
  if (completed.length) {
    return `No non-English or language-labeled reporting matched in the selected editions. Try an alternate phrase; this is not evidence that a view is absent.`;
  }
  return `No non-English results appeared in the sources selected for this search. Try an alternate phrase or select another source; this is not evidence that a view is absent.`;
}

const COMMON_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for", "from", "has", "have", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "were", "with",
  "de", "del", "la", "las", "los", "el", "en", "por", "para", "con", "que", "y", "un", "una", "le", "les", "des", "du", "et", "un", "une", "der", "die", "das", "und", "von", "zu",
]);

/** Exact repeated n-grams across distinct items in one source/language group; never a sentiment or stance inference. */
export function findRepeatedPhrases(items: PerspectiveSnapshotGroup["items"]): RepeatedPhrase[] {
  const occurrences = new Map<string, Map<string, PerspectiveSnapshotGroup["items"][number]>>();
  for (const item of items) {
    const text = `${item.title} ${item.transientPreview ?? ""}`.normalize("NFKC").toLocaleLowerCase();
    const tokens = text.match(/[\p{L}\p{N}]+/gu) ?? [];
    const queryTokens = new Set(item.query.normalize("NFKC").toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []);
    const seenInItem = new Set<string>();
    for (let size = 2; size <= 4; size += 1) {
      for (let start = 0; start + size <= tokens.length; start += 1) {
        const window = tokens.slice(start, start + size);
        if (window.some((token) => token.length < 3 || COMMON_WORDS.has(token) || queryTokens.has(token))) continue;
        const phrase = window.join(" ");
        if (seenInItem.has(phrase)) continue;
        seenInItem.add(phrase);
        const matches = occurrences.get(phrase) ?? new Map();
        matches.set(item.url, item);
        occurrences.set(phrase, matches);
      }
    }
  }
  return [...occurrences.entries()]
    .filter(([, matches]) => matches.size > 1)
    .map(([phrase, matches]) => ({ phrase, items: [...matches.values()] }))
    .sort((a, b) => b.items.length - a.items.length || b.phrase.split(" ").length - a.phrase.split(" ").length || a.phrase.localeCompare(b.phrase))
    .slice(0, 2);
}
