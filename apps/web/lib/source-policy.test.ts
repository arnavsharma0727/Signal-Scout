import { describe, expect, it } from 'vitest';
import { hasUnclearedHackerNewsEvidence, isHackerNewsIngestionEnabled } from './source-policy';

describe('source rights gate', () => {
  it('keeps Hacker News ingestion off unless both collection and rights are explicitly enabled', () => {
    expect(isHackerNewsIngestionEnabled({ HACKER_NEWS_ENABLED: 'true' })).toBe(false);
    expect(isHackerNewsIngestionEnabled({ HACKER_NEWS_RIGHTS_APPROVED: 'true' })).toBe(false);
    expect(isHackerNewsIngestionEnabled({ HACKER_NEWS_ENABLED: 'true', HACKER_NEWS_RIGHTS_APPROVED: 'false' })).toBe(false);
    expect(isHackerNewsIngestionEnabled({ HACKER_NEWS_ENABLED: 'true', HACKER_NEWS_RIGHTS_APPROVED: 'true' })).toBe(true);
  });

  it('detects evidence that should prevent a public lead from being shown', () => {
    expect(hasUnclearedHackerNewsEvidence(['news', 'forum'])).toBe(false);
    expect(hasUnclearedHackerNewsEvidence(['news', 'hacker-news'])).toBe(true);
    expect(hasUnclearedHackerNewsEvidence([null, undefined])).toBe(false);
  });
});
