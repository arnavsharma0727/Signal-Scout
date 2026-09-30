export const HACKER_NEWS_SOURCE_TYPE = 'hacker-news';

export function isHackerNewsIngestionEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.HACKER_NEWS_ENABLED === 'true' && env.HACKER_NEWS_RIGHTS_APPROVED === 'true';
}

export function hasUnclearedHackerNewsEvidence(
  sourceTypes: Array<string | null | undefined>,
): boolean {
  return sourceTypes.includes(HACKER_NEWS_SOURCE_TYPE);
}
