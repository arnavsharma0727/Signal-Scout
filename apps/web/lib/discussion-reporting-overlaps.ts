import { isPublicEvidenceEligible, matchesStackExchangeTitleQuery } from "./source-policy";

export type OverlapInput = {
  id: string;
  source_type: string | null;
  source_name: string | null;
  source_domain: string | null;
  language_code: string | null;
  title_original: string | null;
  source_url: string | null;
  published_at: string | null;
  raw_metadata_json: unknown;
};

export type DiscussionReportingOverlap = {
  phrase: string;
  matchBasis: "community tag" | "scheduled search phrase" | "literal topic-title phrase";
  language: string;
  discussionItemCount: number;
  discussionSources: string[];
  reportingSources: string[];
  reportingPublishers: string[];
  latestDiscussionAt: string | null;
  latestReportingAt: string | null;
  discussions: Array<{ id: string; title: string; url: string; source: string; publishedAt: string }>;
  reporting: Array<{ id: string; title: string; url: string; source: string; publishedAt: string }>;
};

const QUESTION_LICENSE = "CC BY-SA 4.0";
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Literal same-language discussion-tag or collector-query matches; never infers sentiment or causality. */
export function buildDiscussionReportingOverlaps(
  rows: OverlapInput[],
  asOf = new Date(),
): DiscussionReportingOverlap[] {
  const cutoff = asOf.getTime() - WINDOW_MS;
  const discussionItems = new Map<string, { row: OverlapInput; phrases: Array<{ phrase: string; basis: DiscussionReportingOverlap["matchBasis"] }>; time: number; language: string }>();
  const reports: Array<{ row: OverlapInput; time: number; language: string }> = [];

  for (const row of rows) {
    const time = Date.parse(row.published_at ?? "");
    if (!Number.isFinite(time) || time < cutoff || time > asOf.getTime() || !row.title_original || !row.source_url ||
      !isPublicEvidenceEligible(row.source_type, row.source_domain))
      continue;
    const language = normalizeLanguage(row.language_code);
    if (row.source_type === "stack-exchange") {
      const metadata = asRecord(row.raw_metadata_json);
      if (metadata.contentLicense !== QUESTION_LICENSE || !Array.isArray(metadata.tags) ||
        !matchesStackExchangeTitleQuery(row.title_original, metadata.query)) continue;
      const tags = [...new Set(metadata.tags.filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().normalize("NFC").toLocaleLowerCase())
        .filter((tag) => tag.length >= 3 && tag.length <= 50))];
      const phrases: Array<{ phrase: string; basis: DiscussionReportingOverlap["matchBasis"] }> =
        tags.map((phrase) => ({ phrase, basis: "community tag" }));
      const query = typeof metadata.query === "string" ? metadata.query.trim().normalize("NFC") : "";
      if (query.length >= 2 && query.length <= 80 &&
        containsPhrase(normalizeText(row.title_original), normalizeText(query)))
        phrases.push({ phrase: query.toLocaleLowerCase(), basis: "scheduled search phrase" });
      if (phrases.length) keepLatestDiscussionSnapshot(discussionItems, row, phrases, time, language);
    } else if (row.source_type === "licensed-forum") {
      const metadata = asRecord(row.raw_metadata_json);
      if (row.source_domain !== "discussion.fedoraproject.org" ||
        metadata.publisher !== "Fedora Discussion" ||
        metadata.licenseUrl !== "https://creativecommons.org/licenses/by-sa/4.0/" ||
        metadata.titleUnmodified !== true || metadata.topicBodyAndRepliesDiscarded !== true ||
        metadata.profileDetailsDiscarded !== true) continue;
      const phrases = literalTitlePhrases(row.title_original).map((phrase) => ({
        phrase,
        basis: "literal topic-title phrase" as const,
      }));
      if (phrases.length) keepLatestDiscussionSnapshot(discussionItems, row, phrases, time, language);
    } else if (
      row.source_type === "licensed-analysis" || row.source_type === "licensed-reporting"
    ) {
      reports.push({ row, time, language });
    }
  }

  const groups = new Map<string, {
    phrase: string;
    matchBasis: DiscussionReportingOverlap["matchBasis"];
    language: string;
    discussions: Map<string, { row: OverlapInput; time: number }>;
    reports: Map<string, { row: OverlapInput; time: number }>;
  }>();
  const reportsByLanguage = new Map<string, typeof reports>();
  for (const report of reports) {
    const languageReports = reportsByLanguage.get(report.language) ?? [];
    languageReports.push(report);
    reportsByLanguage.set(report.language, languageReports);
  }
  const matchingReports = new Map<string, typeof reports>();
  for (const discussion of discussionItems.values()) {
    for (const candidate of discussion.phrases) {
      // Very short Latin acronyms (AI, GPU, LLM, etc.) collide across unrelated
      // contexts even on exact token boundaries. Keep these searchable in Explore,
      // but do not present them as discussion/reporting cues.
      if (isBroadShortLatinAcronym(candidate.phrase)) continue;
      const phrase = normalizeText(candidate.phrase.replace(/[_-]+/g, " "));
      if (candidate.basis === "community tag" && phrase.length < 3) continue;
      const key = `${discussion.language}\u0000${candidate.basis}\u0000${phrase}`;
      const group = groups.get(key) ?? {
        phrase: candidate.phrase,
        matchBasis: candidate.basis,
        language: discussion.language,
        discussions: new Map(),
        reports: new Map(),
      };
      group.discussions.set(discussion.row.id, { row: discussion.row, time: discussion.time });
      let matches = matchingReports.get(key);
      if (!matches) {
        matches = (reportsByLanguage.get(discussion.language) ?? [])
          .filter((report) => containsPhrase(normalizeText(report.row.title_original!), phrase));
        matchingReports.set(key, matches);
      }
      for (const report of matches)
        group.reports.set(report.row.id, { row: report.row, time: report.time });
      if (group.reports.size) groups.set(key, group);
    }
  }

  return [...groups.values()]
    .map((group) => {
      const discussionRows = [...group.discussions.values()].sort((a, b) => b.time - a.time);
      const reportRows = [...group.reports.values()].sort((a, b) => b.time - a.time);
      return {
        phrase: group.phrase,
        matchBasis: group.matchBasis,
        language: group.language,
        discussionItemCount: discussionRows.length,
        discussionSources: [...new Set(discussionRows.map(({ row }) => row.source_name).filter(isString))].sort(),
        reportingSources: [...new Set(reportRows.map(({ row }) => row.source_name).filter(isString))].sort(),
        reportingPublishers: [...new Set(reportRows.map(({ row }) => publisherLabel(row)).filter(isString))].sort(),
        latestDiscussionAt: discussionRows[0] ? new Date(discussionRows[0].time).toISOString() : null,
        latestReportingAt: reportRows[0] ? new Date(reportRows[0].time).toISOString() : null,
        discussions: discussionRows.slice(0, 3).flatMap(({ row }) => evidence(row)),
        reporting: reportRows.slice(0, 3).flatMap(({ row }) => evidence(row)),
      };
    })
    .sort((a, b) => b.discussionItemCount - a.discussionItemCount || (b.latestReportingAt ?? "").localeCompare(a.latestReportingAt ?? ""))
    .slice(0, 20);
}

function isBroadShortLatinAcronym(value: string) {
  const compact = normalizeText(value).replace(/\s+/g, "");
  return /^[a-z]{2,3}$/.test(compact);
}

const TITLE_PHRASE_STOPWORDS = new Set([
  "about", "after", "also", "and", "are", "but", "can", "does", "for", "from",
  "have", "how", "into", "its", "just", "more", "not", "our", "out", "should",
  "than", "that", "the", "their", "them", "there", "these", "they", "this", "those",
  "through", "under", "using", "was", "were", "what", "when", "where", "which", "with",
  "would", "your",
]);

/** Candidate terms are excerpts of the original title, not tags or inferred topics. */
function literalTitlePhrases(title: string) {
  const tokens = normalizeText(title).split(" ").filter(Boolean);
  const phrases = new Set<string>();
  for (let length = 2; length <= Math.min(4, tokens.length); length++) {
    for (let start = 0; start + length <= tokens.length; start++) {
      const terms = tokens.slice(start, start + length);
      const phrase = terms.join(" ");
      if (phrase.length < 10 || phrase.length > 48 ||
          terms.some((term) => TITLE_PHRASE_STOPWORDS.has(term)) ||
          isBroadShortLatinAcronym(phrase)) continue;
      phrases.add(phrase);
    }
  }
  return [...phrases];
}

function keepLatestDiscussionSnapshot(
  target: Map<string, { row: OverlapInput; phrases: Array<{ phrase: string; basis: DiscussionReportingOverlap["matchBasis"] }>; time: number; language: string }>,
  row: OverlapInput,
  phrases: Array<{ phrase: string; basis: DiscussionReportingOverlap["matchBasis"] }>,
  time: number,
  language: string,
) {
  const key = discussionIdentity(row);
  const existing = target.get(key);
  if (!existing || time > existing.time) target.set(key, { row, phrases, time, language });
}

function discussionIdentity(row: OverlapInput) {
  try {
    const url = new URL(row.source_url!);
    const host = url.hostname.toLowerCase();
    if (row.source_type === "licensed-forum" && host === "discussion.fedoraproject.org") {
      const topicId = url.pathname.match(/^\/t\/[^/]+\/(\d+)(?:\/\d+)?\/?$/)?.[1];
      if (topicId) return `fedora-topic:${topicId}`;
    }
    if (row.source_type === "stack-exchange") {
      const questionId = url.pathname.match(/\/questions\/(\d+)(?:\/|$)/)?.[1];
      if (questionId) return `stack-exchange:${host}:${questionId}`;
    }
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/$/, "");
    return `${row.source_type}:${host}${url.pathname}`;
  } catch {
    return `${row.source_type}:${row.id}`;
  }
}

function normalizeLanguage(value: string | null) {
  return value?.trim().toLocaleLowerCase() || "und";
}

function normalizeText(value: string) {
  return value.normalize("NFC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
}

function containsPhrase(text: string, phrase: string) {
  if (!phrase) return false;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped}(?:$|[^\\p{L}\\p{N}])`, "u").test(text);
}

function evidence(row: OverlapInput) {
  return row.title_original && row.source_url && row.source_name && row.published_at
    ? [{ id: row.id, title: row.title_original, url: row.source_url, source: row.source_name, publishedAt: row.published_at }]
    : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isString(value: string | null): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function publisherLabel(row: OverlapInput) {
  const metadata = asRecord(row.raw_metadata_json);
  return typeof metadata.publisher === "string" && metadata.publisher.trim()
    ? metadata.publisher.trim()
    : row.source_name;
}
