import { METHODOLOGY } from "./methodology-config";

export type DiscussionEvidence = {
  id: string;
  title: string;
  url: string;
  community: string;
  publishedAt: string | null;
};

export type DiscussionTopicObservation = {
  tag: string;
  recentQuestionCount: number;
  recentSampleSize: number;
  recentShare: number;
  communities: string[];
  latestAt: string | null;
  evidence: DiscussionEvidence[];
  priorObservedDays: number;
  baselineMedianDailyShare: number | null;
  baselineMadDailyShare: number | null;
  baselineStatus: "available" | "insufficient_observed_days";
  sampleReviewCandidate: boolean;
  sampleReviewReason: string | null;
};

type StoredDiscussion = {
  id: string;
  source_type: string | null;
  source_name: string | null;
  title_original: string | null;
  source_url: string | null;
  published_at: string | null;
  raw_metadata_json: unknown;
};
type RecentDiscussion = StoredDiscussion & { tags: string[]; timestamp: number };

const LICENSE = "CC BY-SA 4.0";
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const REVIEW_RULE = METHODOLOGY.discussionReview;

/** Exact tags on licensed Q&A; relative shares are descriptive, never lead scores. */
export function buildDiscussionObservations(
  rows: StoredDiscussion[],
  asOf = new Date(),
): DiscussionTopicObservation[] {
  const end = asOf.getTime();
  const currentStart = end - 3 * DAY_MS;
  const baselineStart = end - METHODOLOGY.dailyMetrics.baselineWindowDays * DAY_MS;
  const priorStart = new Date(currentStart).toISOString().slice(0, 10);
  const days = new Map<string, { ids: Set<string>; tagIds: Map<string, Set<string>> }>();
  const currentItems = new Map<string, RecentDiscussion>();

  for (const row of rows) {
    const timestamp = Date.parse(row.published_at ?? "");
    if (
      row.source_type !== "stack-exchange" || !row.title_original || !row.source_url ||
      !Number.isFinite(timestamp) || timestamp < baselineStart || timestamp > end
    ) continue;
    const metadata = asRecord(row.raw_metadata_json);
    if (metadata.contentLicense !== LICENSE || !Array.isArray(metadata.tags)) continue;

    const tags = [...new Set(
      metadata.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().normalize("NFC").toLocaleLowerCase())
        .filter((tag) => /^[\p{L}\p{N}][\p{L}\p{N}+.#-]{0,39}$/u.test(tag)),
    )];
    if (!tags.length) continue;

    const day = new Date(timestamp).toISOString().slice(0, 10);
    const dayBucket = days.get(day) ?? { ids: new Set<string>(), tagIds: new Map<string, Set<string>>() };
    dayBucket.ids.add(row.id);
    for (const tag of tags) {
      const ids = dayBucket.tagIds.get(tag) ?? new Set<string>();
      ids.add(row.id);
      dayBucket.tagIds.set(tag, ids);
    }
    days.set(day, dayBucket);

    if (timestamp >= currentStart) {
      const prior = currentItems.get(row.id);
      if (!prior || tags.length > prior.tags.length)
        currentItems.set(row.id, { ...row, tags, timestamp });
    }
  }

  const priorDays = [...days.entries()]
    .filter(([day]) => day < priorStart && Date.parse(`${day}T00:00:00.000Z`) >= baselineStart)
    .sort(([a], [b]) => a.localeCompare(b));
  const priorObservedDays = priorDays.length;
  const baselineReady = priorObservedDays >= METHODOLOGY.dailyMetrics.minimumPriorObservedDaysForBaseline;
  const currentQuestions = [...currentItems.values()];
  const recentSampleSize = currentQuestions.length;
  const recentTags = new Map<string, RecentDiscussion[]>();
  for (const item of currentQuestions) {
    for (const tag of item.tags) {
      const group = recentTags.get(tag) ?? [];
      group.push(item);
      recentTags.set(tag, group);
    }
  }

  return [...recentTags.entries()]
    .map(([tag, group]) => {
      const shareByDay = priorDays.map(([day, bucket]) => {
        const tagged = bucket.tagIds.get(tag)?.size ?? 0;
        return tagged / bucket.ids.size;
      });
      const median = baselineReady ? medianOf(shareByDay) : null;
      const mad = median === null ? null : medianOf(shareByDay.map((share) => Math.abs(share - median)));
      const ordered = group.sort((a, b) => b.timestamp - a.timestamp);
      const communities = [...new Set(group.map((row) => row.source_name).filter((name): name is string => Boolean(name)))].sort();
      const minimumReviewShare = median === null || mad === null
        ? null
        : median + Math.max(REVIEW_RULE.madMultiple * mad, REVIEW_RULE.minimumShareIncrease);
      const sampleReviewCandidate =
        baselineReady && recentSampleSize >= REVIEW_RULE.minimumRecentSampleSize &&
        group.length >= REVIEW_RULE.minimumRecentQuestions &&
        communities.length >= REVIEW_RULE.minimumCommunities &&
        minimumReviewShare !== null && group.length / recentSampleSize >= minimumReviewShare;
      return {
        tag,
        recentQuestionCount: group.length,
        recentSampleSize,
        recentShare: recentSampleSize ? group.length / recentSampleSize : 0,
        communities,
        latestAt: ordered[0]?.published_at ?? null,
        evidence: ordered.slice(0, 3).map((row) => ({
          id: row.id,
          title: row.title_original!,
          url: row.source_url!,
          community: row.source_name ?? "Stack Exchange",
          publishedAt: row.published_at,
        })),
        priorObservedDays,
        baselineMedianDailyShare: median,
        baselineMadDailyShare: mad,
        baselineStatus: baselineReady ? "available" as const : "insufficient_observed_days" as const,
        sampleReviewCandidate,
        sampleReviewReason: sampleReviewCandidate && median !== null && mad !== null
          ? `Exact-tag share is ${((group.length / recentSampleSize - median) * 100).toFixed(1)} percentage points above its prior median; it cleared the larger of ${REVIEW_RULE.madMultiple}×MAD or ${Math.round(REVIEW_RULE.minimumShareIncrease * 100)} percentage points, with ${group.length} recent questions across ${communities.length} Stack Exchange communities.`
          : null,
      };
    })
    .sort((a, b) => Number(b.sampleReviewCandidate) - Number(a.sampleReviewCandidate) ||
      b.recentQuestionCount - a.recentQuestionCount || (b.latestAt ?? "").localeCompare(a.latestAt ?? ""))
    .slice(0, 12);
}

function medianOf(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
