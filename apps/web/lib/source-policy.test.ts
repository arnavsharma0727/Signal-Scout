import { describe, expect, it } from 'vitest';
import { hasUnclearedHackerNewsEvidence, isHackerNewsIngestionEnabled, isPublicEvidenceEligible, matchesStackExchangeTitleQuery } from './source-policy';

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

  it('excludes uncleared HN and Google News redirects from public evidence', () => {
    expect(isPublicEvidenceEligible('hacker-news', 'news.ycombinator.com')).toBe(false);
    expect(isPublicEvidenceEligible('rss', 'news.google.com')).toBe(false);
    expect(isPublicEvidenceEligible('rss', 'WWW.NEWS.GOOGLE.COM')).toBe(false);
    expect(isPublicEvidenceEligible('rss', 'publisher.example')).toBe(true);
  });

  it('requires every recorded Stack Exchange query term to appear as a title token', () => {
    expect(matchesStackExchangeTitleQuery('How does AI affect inflation?', 'AI')).toBe(true);
    expect(matchesStackExchangeTitleQuery('AI and interest rates', 'interest rates')).toBe(true);
    expect(matchesStackExchangeTitleQuery('Artificial intelligence', 'AI')).toBe(false);
    expect(matchesStackExchangeTitleQuery('Question title', undefined)).toBe(false);
  });
});
