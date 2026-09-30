import { describe, expect, it } from "vitest";
import {
  applyBenjaminiHochberg,
  compareMatchedWindows,
  evaluateComparisonFamily,
  type MatchedComparison,
  type TopicWindowObservation,
} from "./cross-market-comparison";

const base = {
  hypothesisId: "entity-a|topic-a|discussion|2026-09-01",
  entityId: "entity-a",
  topicKey: "topic-a",
  classifierVersion: "taxonomy-v1",
  sourceClass: "discussion",
  windowStartUtc: "2026-09-01T00:00:00.000Z",
  windowEndUtc: "2026-09-02T00:00:00.000Z",
  totalUniqueItems: 100,
  topicUniqueItems: 20,
  independentDomains: 6,
  firstTopicObservedAtUtc: "2026-09-01T03:00:00.000Z",
} as const;

function pair(
  krOverrides: Partial<TopicWindowObservation> = {},
  usOverrides: Partial<TopicWindowObservation> = {},
) {
  return compareMatchedWindows(
    { ...base, marketCode: "KR", ...krOverrides },
    { ...base, marketCode: "US", ...usOverrides },
  );
}

function comparison(id: string, pValue: number): MatchedComparison {
  const result = pair({ hypothesisId: id }, { hypothesisId: id });
  if (!result.matched) throw new Error("test fixture must be matched");
  return { ...result.comparison, pValue };
}

describe("matched cross-market comparison", () => {
  it("requires equal topic, taxonomy, source class, entity, and exact window", () => {
    expect(
      pair({}, { windowEndUtc: "2026-09-03T00:00:00.000Z" }),
    ).toMatchObject({
      matched: false,
      reason: "window_mismatch",
    });
    expect(pair({}, { sourceClass: "news" })).toMatchObject({
      matched: false,
      reason: "source_class_mismatch",
    });
    expect(pair({}, { classifierVersion: "taxonomy-v2" })).toMatchObject({
      matched: false,
      reason: "classifier_version_mismatch",
    });
    expect(pair({}, { topicKey: "topic-b" })).toMatchObject({
      matched: false,
      reason: "topic_mismatch",
    });
    expect(pair({ windowStartUtc: "2026-09-01T00:00:00" }, {})).toMatchObject({
      matched: false,
      reason: "invalid_window",
    });
  });

  it("reports a directional descriptive gap and chronology without causality", () => {
    const result = pair(
      {
        topicUniqueItems: 40,
        firstTopicObservedAtUtc: "2026-09-01T02:00:00.000Z",
      },
      {
        topicUniqueItems: 10,
        firstTopicObservedAtUtc: "2026-09-01T08:00:00.000Z",
      },
    );
    expect(result.matched).toBe(true);
    if (result.matched) {
      expect(result.comparison.shareDifference).toBeCloseTo(0.3);
      expect(result.comparison.pValue).toBeLessThan(0.05);
      expect(result.comparison.firstObservedOrder).toBe("KR-earlier");
      expect(result.comparison.chronologyLagHours).toBe(6);
    }
  });

  it("keeps a pair ineligible when either market fails sample or expected-cell floors", () => {
    const small = pair({ totalUniqueItems: 19, topicUniqueItems: 10 }, {});
    expect(small.matched && small.comparison.sampleEligible).toBe(false);
    expect(small.matched && small.comparison.eligibilityReasons).toContain(
      "minimum_items_per_market_not_met",
    );

    const sparse = pair(
      { topicUniqueItems: 1, totalUniqueItems: 100 },
      { topicUniqueItems: 1, totalUniqueItems: 100 },
    );
    expect(sparse.matched && sparse.comparison.sampleEligible).toBe(false);
    expect(sparse.matched && sparse.comparison.eligibilityReasons).toContain(
      "normal_approximation_cell_count_not_met",
    );
    expect(sparse.matched && sparse.comparison.pValue).toBe(1);
  });

  it("applies monotone Benjamini–Hochberg q-values over the full family", () => {
    const results = applyBenjaminiHochberg([
      comparison("h1", 0.01),
      comparison("h2", 0.04),
      comparison("h3", 0.03),
    ]);
    const byId = new Map(results.map((item) => [item.hypothesisId, item]));
    expect(byId.get("h1")?.qValue).toBeCloseTo(0.03);
    expect(byId.get("h2")?.qValue).toBeCloseTo(0.04);
    expect(byId.get("h3")?.qValue).toBeCloseTo(0.04);
    expect(results.every((item) => item.passesFalseDiscoveryRate)).toBe(true);
    expect(() =>
      applyBenjaminiHochberg([
        comparison("same", 0.1),
        comparison("same", 0.2),
      ]),
    ).toThrow("hypothesisId values must be unique");
  });

  it("retains predeclared hypotheses with a missing market as p=1 in correction", () => {
    const kr = {
      ...base,
      marketCode: "KR" as const,
      hypothesisId: "h1",
      topicUniqueItems: 40,
    };
    const us = {
      ...base,
      marketCode: "US" as const,
      hypothesisId: "h1",
      topicUniqueItems: 10,
    };
    const missing = { ...kr, hypothesisId: "h2" };
    const results = evaluateComparisonFamily([
      { hypothesisId: "h1", kr, us },
      { hypothesisId: "h2", kr: missing, us: null },
    ]);
    const byId = new Map(results.map((item) => [item.hypothesisId, item]));
    expect(byId.get("h2")).toMatchObject({
      pValue: 1,
      sampleEligible: false,
      qValue: 1,
      eligibilityReasons: ["market_observation_missing"],
    });
    expect(byId.get("h1")?.qValue).toBeCloseTo(2 * byId.get("h1")!.pValue);
  });

  it("does not treat the chronology marker as an inferential lead", () => {
    const result = pair(
      { firstTopicObservedAtUtc: "2026-08-31T23:00:00.000Z" },
      { firstTopicObservedAtUtc: "2026-09-01T05:00:00.000Z" },
    );
    expect(result.matched && result.comparison.firstObservedOrder).toBe(
      "unknown",
    );
  });
});
