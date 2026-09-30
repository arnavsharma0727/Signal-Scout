import { isPublicEvidenceEligible } from "./source-policy";
import { METHODOLOGY } from "./methodology-config";

export type EvidenceRow = {
  company_id: string;
  source_documents: {
    market_code: string | null;
    source_type: string | null;
    published_at: string | null;
    content_hash: string | null;
    source_domain: string | null;
    title_original?: string | null;
  } | null;
};

export type DailyMetric = {
  metric_date: string;
  company_id: string;
  market_code: string;
  source_type: string;
  document_count: number;
  unique_content_hash_count: number;
  independent_domain_count: number;
  effective_domain_sample_size: number;
  first_seen_in_window_utc: string;
  topic_stance_mix_json: null;
  baseline_observed_days: number;
  trailing_30d_document_median: number | null;
  trailing_30d_document_mad: number | null;
  evidence_status: "insufficient" | "descriptive_only";
};

const {
  minimumUniqueHashesForDescriptiveOnly: MIN_DOCUMENTS_FOR_DESCRIPTION,
  minimumIndependentDomainsForDescriptiveOnly: MIN_DOMAINS_FOR_DESCRIPTION,
  minimumPriorObservedDaysForBaseline: MIN_BASELINE_DAYS,
  baselineWindowDays: BASELINE_WINDOW_DAYS,
} = METHODOLOGY.dailyMetrics;

export function aggregateDailyMetrics(
  rows: EvidenceRow[],
  date: string,
): DailyMetric[] {
  const groups = new Map<
    string,
    {
      company_id: string;
      market_code: string;
      source_type: string;
      date: string;
      hashes: Set<string>;
      domains: Map<string, number>;
      documents: number;
      firstSeen: string;
    }
  >();
  const currentDate = new Date(`${date}T00:00:00.000Z`);
  const windowStart = new Date(
    currentDate.getTime() - BASELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );
  for (const row of rows) {
    const doc = row.source_documents;
    if (!doc?.market_code || !doc.source_type || !doc.published_at) continue;
    if (!isPublicEvidenceEligible(doc.source_type, doc.source_domain)) continue;
    const published = new Date(doc.published_at);
    if (
      !Number.isFinite(published.getTime()) ||
      published < windowStart ||
      published >= new Date(currentDate.getTime() + 24 * 60 * 60 * 1000)
    )
      continue;
    const day = published.toISOString().slice(0, 10);
    const key = [row.company_id, doc.market_code, doc.source_type, day].join(
      "|",
    );
    let group = groups.get(key);
    if (!group) {
      group = {
        company_id: row.company_id,
        market_code: doc.market_code,
        source_type: doc.source_type,
        date: day,
        hashes: new Set(),
        domains: new Map(),
        documents: 0,
        firstSeen: doc.published_at,
      };
      groups.set(key, group);
    }
    group.documents++;
    if (published.getTime() < Date.parse(group.firstSeen))
      group.firstSeen = doc.published_at;
    if (doc.content_hash) group.hashes.add(doc.content_hash);
    if (doc.source_domain)
      group.domains.set(
        doc.source_domain,
        (group.domains.get(doc.source_domain) ?? 0) + 1,
      );
  }
  const matching = (
    company_id: string,
    market_code: string,
    source_type: string,
  ) =>
    [...groups.values()].filter(
      (g) =>
        g.company_id === company_id &&
        g.market_code === market_code &&
        g.source_type === source_type,
    );
  const median = (values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2
      ? sorted[middle]
      : (sorted[middle - 1] + sorted[middle]) / 2;
  };
  return [...groups.values()]
    .filter((group) => group.date === date)
    .map((group) => {
      const domainCounts = [...group.domains.values()];
      const total = domainCounts.reduce((sum, n) => sum + n, 0);
      const concentration = total
        ? domainCounts.reduce((sum, n) => sum + (n / total) ** 2, 0)
        : 0;
      const effective = concentration
        ? Math.round((1 / concentration) * 100) / 100
        : 0;
      const priorCounts = matching(
        group.company_id,
        group.market_code,
        group.source_type,
      )
        .filter((g) => g.date < date)
        .map((g) => g.documents);
      const baselineMedian =
        priorCounts.length >= MIN_BASELINE_DAYS ? median(priorCounts) : null;
      const baselineMad =
        baselineMedian === null
          ? null
          : median(priorCounts.map((n) => Math.abs(n - baselineMedian)));
      const firstSeen = matching(
        group.company_id,
        group.market_code,
        group.source_type,
      ).reduce(
        (earliest, g) =>
          Date.parse(g.firstSeen) < Date.parse(earliest)
            ? g.firstSeen
            : earliest,
        group.firstSeen,
      );
      return {
        metric_date: date,
        company_id: group.company_id,
        market_code: group.market_code,
        source_type: group.source_type,
        document_count: group.documents,
        unique_content_hash_count: group.hashes.size,
        independent_domain_count: group.domains.size,
        effective_domain_sample_size: effective,
        first_seen_in_window_utc: firstSeen,
        topic_stance_mix_json: null,
        baseline_observed_days: priorCounts.length,
        trailing_30d_document_median: baselineMedian,
        trailing_30d_document_mad: baselineMad,
        evidence_status:
          group.hashes.size >= MIN_DOCUMENTS_FOR_DESCRIPTION &&
          group.domains.size >= MIN_DOMAINS_FOR_DESCRIPTION
            ? ("descriptive_only" as const)
            : ("insufficient" as const),
      };
    });
}
