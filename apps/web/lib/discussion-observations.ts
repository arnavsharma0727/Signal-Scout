export type DiscussionEvidence = {
  id: string;
  title: string;
  url: string;
  community: string;
  publishedAt: string | null;
};

export type DiscussionTopicObservation = {
  tag: string;
  questionCount: number;
  communities: string[];
  latestAt: string | null;
  evidence: DiscussionEvidence[];
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

const LICENSE = "CC BY-SA 4.0";

/** Exact tag counts from licensed questions; not a trend or independent-source score. */
export function buildDiscussionObservations(
  rows: StoredDiscussion[],
): DiscussionTopicObservation[] {
  const questions = new Map<string, StoredDiscussion & { tags: string[] }>();

  for (const row of rows) {
    if (row.source_type !== "stack-exchange" || !row.title_original || !row.source_url) continue;
    const metadata = asRecord(row.raw_metadata_json);
    if (metadata.contentLicense !== LICENSE || !Array.isArray(metadata.tags)) continue;
    const tags = [...new Set(
      metadata.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim().normalize("NFC").toLocaleLowerCase())
        .filter((tag) => /^[\p{L}\p{N}][\p{L}\p{N}+.#-]{0,39}$/u.test(tag)),
    )];
    if (tags.length) questions.set(row.id, { ...row, tags });
  }

  const groups = new Map<string, StoredDiscussion[]>();
  for (const question of questions.values()) {
    for (const tag of question.tags) {
      const group = groups.get(tag) ?? [];
      group.push(question);
      groups.set(tag, group);
    }
  }

  return [...groups.entries()]
    .map(([tag, group]) => {
      const ordered = group.sort(
        (a, b) => Date.parse(b.published_at ?? "") - Date.parse(a.published_at ?? ""),
      );
      return {
        tag,
        questionCount: group.length,
        communities: [...new Set(group.map((row) => row.source_name).filter((name): name is string => Boolean(name)))].sort(),
        latestAt: ordered[0]?.published_at ?? null,
        evidence: ordered.slice(0, 3).map((row) => ({
          id: row.id,
          title: row.title_original!,
          url: row.source_url!,
          community: row.source_name ?? "Stack Exchange",
          publishedAt: row.published_at,
        })),
      };
    })
    .sort((a, b) => b.questionCount - a.questionCount || (b.latestAt ?? "").localeCompare(a.latestAt ?? ""))
    .slice(0, 12);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
