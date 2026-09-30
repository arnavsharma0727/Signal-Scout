import { describe, expect, it } from 'vitest';
import { aggregateDailyMetrics, type EvidenceRow } from './daily-metrics';

describe('aggregateDailyMetrics', () => {
  it('separates entity, market, source class, and UTC day', () => {
    const rows: EvidenceRow[] = [
      { company_id: 'c1', source_documents: { market_code: 'KR', source_type: 'news', published_at: '2026-09-30T12:00:00Z', content_hash: 'h1', source_domain: 'a.kr' } },
      { company_id: 'c1', source_documents: { market_code: 'US', source_type: 'news', published_at: '2026-09-30T12:00:00Z', content_hash: 'h2', source_domain: 'a.com' } },
      { company_id: 'c1', source_documents: { market_code: 'KR', source_type: 'forum', published_at: '2026-09-29T23:59:00Z', content_hash: 'h3', source_domain: 'b.kr' } },
    ];
    const metrics = aggregateDailyMetrics(rows, '2026-09-30');
    expect(metrics).toHaveLength(2);
    expect(metrics.map(x => `${x.market_code}/${x.source_type}`).sort()).toEqual(['KR/news', 'US/news']);
  });

  it('does not aggregate records withheld from public evidence', () => {
    const rows: EvidenceRow[] = [
      { company_id: 'c1', source_documents: { market_code: 'US', source_type: 'hacker-news', published_at: '2026-09-30T12:00:00Z', content_hash: 'hn', source_domain: 'news.ycombinator.com' } },
      { company_id: 'c1', source_documents: { market_code: 'KR', source_type: 'rss', published_at: '2026-09-30T12:00:00Z', content_hash: 'google', source_domain: 'news.google.com' } },
      { company_id: 'c1', source_documents: { market_code: 'US', source_type: 'rss', published_at: '2026-09-30T12:00:00Z', content_hash: 'allowed', source_domain: 'publisher.example' } },
    ];
    const metrics = aggregateDailyMetrics(rows, '2026-09-30');
    expect(metrics).toHaveLength(1);
    expect(metrics[0].market_code).toBe('US');
    expect(metrics[0].document_count).toBe(1);
  });

  it('uses distinct content hashes and reports domain effective sample size', () => {
    const rows: EvidenceRow[] = Array.from({ length: 20 }, (_, index) => ({
      company_id: 'c1',
      source_documents: { market_code: 'KR', source_type: 'news', published_at: '2026-09-30T12:00:00Z', content_hash: `h${index % 10}`, source_domain: `d${index % 5}.kr` },
    }));
    const [metric] = aggregateDailyMetrics(rows, '2026-09-30');
    expect(metric.document_count).toBe(20);
    expect(metric.unique_content_hash_count).toBe(10);
    expect(metric.independent_domain_count).toBe(5);
    expect(metric.effective_domain_sample_size).toBe(5);
    expect(metric.evidence_status).toBe('insufficient');
  });

  it('does not claim inferential strength even at descriptive thresholds', () => {
    const rows: EvidenceRow[] = Array.from({ length: 30 }, (_, index) => ({
      company_id: 'c1',
      source_documents: { market_code: 'US', source_type: 'news', published_at: '2026-09-30T12:00:00Z', content_hash: `hash${index}`, source_domain: `domain${index % 5}.com` },
    }));
    expect(aggregateDailyMetrics(rows, '2026-09-30')[0].evidence_status).toBe('descriptive_only');
  });

  it('uses only observed prior days for a trailing median/MAD and reports first observation in window', () => {
    const rows: EvidenceRow[] = Array.from({ length: 16 }, (_, index) => {
      const day = new Date(Date.UTC(2026, 8, 15 + index)).toISOString();
      return { company_id: 'c1', source_documents: { market_code: 'KR', source_type: 'forum', published_at: day, content_hash: `h${index}`, source_domain: 'forum.kr' } };
    });
    const metric = aggregateDailyMetrics(rows, '2026-09-30')[0];
    expect(metric.baseline_observed_days).toBe(15);
    expect(metric.trailing_30d_document_median).toBe(1);
    expect(metric.trailing_30d_document_mad).toBe(0);
    expect(metric.first_seen_in_window_utc).toBe('2026-09-15T00:00:00.000Z');
    expect(metric.topic_stance_mix_json).toBeNull();
  });

  it('leaves the baseline null until fourteen prior observation-days exist', () => {
    const rows: EvidenceRow[] = Array.from({ length: 14 }, (_, index) => ({
      company_id: 'c1',
      source_documents: { market_code: 'US', source_type: 'news', published_at: new Date(Date.UTC(2026, 8, 17 + index)).toISOString(), content_hash: `h${index}`, source_domain: 'news.com' },
    }));
    const metric = aggregateDailyMetrics(rows, '2026-09-30')[0];
    expect(metric.baseline_observed_days).toBe(13);
    expect(metric.trailing_30d_document_median).toBeNull();
    expect(metric.trailing_30d_document_mad).toBeNull();
  });
});
