import { describe, expect, it } from "vitest";
import { METHODOLOGY } from "./methodology-config";
import { aggregateDailyMetrics } from "./daily-metrics";

describe("shared methodology configuration", () => {
  it("keeps priority weights normalized", () => {
    expect(
      Object.values(METHODOLOGY.divergence.priorityWeights).reduce(
        (sum, weight) => sum + weight,
        0,
      ),
    ).toBe(1);
  });

  it("does not label metrics descriptive before shared evidence thresholds", () => {
    const rows = Array.from(
      {
        length: METHODOLOGY.dailyMetrics.minimumUniqueHashesForDescriptiveOnly,
      },
      (_, index) => ({
        company_id: "company",
        source_documents: {
          market_code: "US",
          source_type: "rss",
          published_at: "2026-09-29T12:00:00.000Z",
          content_hash: `hash-${index}`,
          source_domain: `publisher-${index % METHODOLOGY.dailyMetrics.minimumIndependentDomainsForDescriptiveOnly}.example`,
        },
      }),
    );

    expect(aggregateDailyMetrics(rows, "2026-09-29")[0].evidence_status).toBe(
      "descriptive_only",
    );
    expect(
      aggregateDailyMetrics(rows.slice(0, -1), "2026-09-29")[0].evidence_status,
    ).toBe("insufficient");
  });
});
