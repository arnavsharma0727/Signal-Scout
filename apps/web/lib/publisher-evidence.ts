import type { ResearchEvidence } from "./research-brief";

type StoredPublisherRow = {
  id: string;
  source_type: string;
  source_name: string;
  source_domain: string;
  language_code: string | null;
  title_original: string;
  source_url: string;
  published_at: string;
  raw_metadata_json: Record<string, unknown> | null;
};

const GV_LICENSE = "https://creativecommons.org/licenses/by/3.0/";
const CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/";
const CC_BY_SA_4 = "https://creativecommons.org/licenses/by-sa/4.0/";
const OPERATOR_LABELS: Record<string, string> = {
  "global-voices": "Global Voices",
  "the-conversation": "The Conversation",
  "typst-forum": "Typst Forum",
  "fedora-discussion": "Fedora Discussion",
};

/** Convert only reviewed, recent, title-and-attribution-only publisher records to public brief evidence. */
export function toPublisherEvidence(
  row: StoredPublisherRow,
  now = Date.now(),
): ResearchEvidence | null {
  const url = safeHttpsUrl(row.source_url);
  const host = url?.hostname.toLowerCase();
  const published = Date.parse(row.published_at);
  if (!url || !host || !row.id || !row.title_original?.trim() ||
      !Number.isFinite(published) || published > now + 5 * 60_000 || now - published > 72 * 60 * 60_000) return null;

  const meta = row.raw_metadata_json;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  let evidenceClass: ResearchEvidence["evidenceClass"];
  let attribution: string;
  let licenseName: string | undefined;
  let licenseUrl: string | undefined;
  let sourceOperatorKey: string;
  let context: string;

  if (row.source_type === "licensed-reporting" && row.source_domain === host &&
      isGlobalVoicesHost(host) && meta.publisher === "Global Voices" &&
      meta.licenseUrl === GV_LICENSE && meta.titleUnmodified === true &&
      meta.articleBodyDiscarded === true && meta.mediaDiscarded === true &&
      typeof meta.author === "string" && meta.author.trim()) {
    evidenceClass = "news coverage";
    attribution = meta.author.trim().slice(0, 200);
    licenseName = "CC BY 3.0";
    licenseUrl = GV_LICENSE;
    sourceOperatorKey = "global-voices";
    context = typeof meta.editionLabel === "string" ? `${meta.editionLabel} edition` : "International edition";
  } else if (row.source_type === "licensed-analysis" && host === "theconversation.com" &&
      meta.publisher === "The Conversation" && meta.attributionRequired === true &&
      meta.derivativesAllowed === false && meta.contentPolicy === "unmodified-title-author-link-date-only" &&
      meta.summaryDiscarded === true && meta.articleBodyDiscarded === true &&
      typeof meta.rightsStatement === "string" && hasAttributionNoDerivativesRights(meta.rightsStatement) &&
      Array.isArray(meta.authors) && meta.authors.length > 0 && meta.authors.every(author => typeof author === "string")) {
    evidenceClass = "expert analysis";
    attribution = (meta.authors as string[]).slice(0, 8).map(author => author.slice(0, 120)).join(", ");
    sourceOperatorKey = "the-conversation";
    context = typeof meta.edition === "string" ? `${meta.edition} edition` : "Edition not recorded";
  } else if (row.source_type === "licensed-forum" && host === "forum.typst.app" &&
      row.source_domain === host && meta.publisher === "Typst Forum" &&
      meta.licenseUrl === CC_BY_4 && meta.titleUnmodified === true &&
      meta.postBodyAndSummaryDiscarded === true && typeof meta.author === "string" && meta.author.trim()) {
    evidenceClass = "community forum";
    attribution = meta.author.trim().slice(0, 120);
    licenseName = "CC BY 4.0";
    licenseUrl = CC_BY_4;
    sourceOperatorKey = "typst-forum";
    context = "Narrow software community; not market sentiment";
  } else if (row.source_type === "licensed-forum" && host === "discussion.fedoraproject.org" &&
      row.source_domain === host && meta.publisher === "Fedora Discussion" &&
      meta.licenseUrl === CC_BY_SA_4 && meta.titleUnmodified === true &&
      meta.topicBodyAndRepliesDiscarded === true && meta.profileDetailsDiscarded === true &&
      typeof meta.author === "string" && meta.author.trim()) {
    evidenceClass = "community forum";
    attribution = meta.author.trim().slice(0, 120);
    licenseName = "CC BY-SA 4.0";
    licenseUrl = CC_BY_SA_4;
    sourceOperatorKey = "fedora-discussion";
    context = "Selected Fedora/Linux community; not a population or investor sample";
  } else {
    return null;
  }

  return {
    id: `publisher:${row.id}`,
    title: row.title_original.trim().slice(0, 500),
    url: url.toString(),
    source: row.source_name,
    evidenceClass,
    language: row.language_code || "unassigned",
    timeLabel: "Published",
    timeValue: new Date(published).toISOString(),
    context,
    attribution,
    attributionUrl: sourceOperatorKey === "global-voices"
      ? "https://globalvoices.org/about/global-voices-attribution-policy/"
      : undefined,
    licenseName,
    licenseUrl,
    sourceOperatorKey,
    sourceOperatorLabel: OPERATOR_LABELS[sourceOperatorKey],
  };
}

/** Exact phrase filter for original headlines only; intentionally does not translate or infer related topics. */
export function matchesOriginalTitlePhrase(title: string, rawPhrase: string) {
  const phrase = rawPhrase.trim().normalize("NFC").toLowerCase().replace(/\s+/g, " ");
  const normalizedTitle = title.normalize("NFC").toLowerCase();
  if (!phrase) return true;
  // CJK text usually has no whitespace between words, so use a literal substring there.
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(phrase))
    return normalizedTitle.includes(phrase);
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u").test(normalizedTitle);
}

/** Parse researcher-supplied phrase variants without translation or semantic expansion. */
export function parseOriginalTitlePhrases(rawPhrases: string): string[] {
  return [...new Set(rawPhrases
    .split(/[\n;]+/)
    .map(phrase => phrase.trim().normalize("NFC").replace(/\s+/g, " "))
    .filter(Boolean))];
}

export function matchingOriginalTitlePhrases(title: string, rawPhrases: string): string[] {
  return parseOriginalTitlePhrases(rawPhrases)
    .filter(phrase => matchesOriginalTitlePhrase(title, phrase));
}

/** Recent items are only surfaced when the visitor has supplied a concrete query. */
export function matchingPublisherEvidence<T extends { title: string }>(items: T[], phrase: string): T[] {
  if (!parseOriginalTitlePhrases(phrase).length) return [];
  return items.filter(item => matchingOriginalTitlePhrases(item.title, phrase).length > 0);
}

function safeHttpsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    return url;
  } catch {
    return null;
  }
}

function isGlobalVoicesHost(host: string) {
  return host === "globalvoices.org" || host.endsWith(".globalvoices.org");
}

function hasAttributionNoDerivativesRights(value: string) {
  const normalized = value.toLowerCase();
  return normalized.includes("creative commons") && normalized.includes("attribution") && normalized.includes("no derivatives");
}
