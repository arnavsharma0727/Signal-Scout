import { METHODOLOGY } from "./methodology-config";

export type MarketCode = "KR" | "US";

export type TopicWindowObservation = {
  hypothesisId: string;
  marketCode: MarketCode;
  entityId: string;
  topicKey: string;
  classifierVersion: string;
  sourceClass: string;
  windowStartUtc: string;
  windowEndUtc: string;
  totalUniqueItems: number;
  topicUniqueItems: number;
  independentDomains: number;
  firstTopicObservedAtUtc: string | null;
};

export type MatchedComparison = {
  hypothesisId: string;
  entityId: string;
  topicKey: string;
  sourceClass: string;
  windowStartUtc: string;
  windowEndUtc: string;
  krShare: number;
  usShare: number;
  shareDifference: number;
  pValue: number;
  sampleEligible: boolean;
  eligibilityReasons: string[];
  firstObservedOrder: "KR-earlier" | "US-earlier" | "same-time" | "unknown";
  chronologyLagHours: number | null;
};

type Evaluation =
  | { matched: false; reason: string }
  | { matched: true; comparison: MatchedComparison };

export type PredeclaredHypothesis = {
  hypothesisId: string;
  kr: TopicWindowObservation | null;
  us: TopicWindowObservation | null;
};

type FamilyHypothesisResult = {
  hypothesisId: string;
  comparison: MatchedComparison | null;
  pValue: number;
  sampleEligible: boolean;
  eligibilityReasons: string[];
};

/** Build a matched descriptive comparison; this function does not create or publish a lead. */
export function compareMatchedWindows(
  kr: TopicWindowObservation,
  us: TopicWindowObservation,
): Evaluation {
  const mismatch = validatePair(kr, us);
  if (mismatch) return { matched: false, reason: mismatch };

  const krShare = kr.topicUniqueItems / kr.totalUniqueItems;
  const usShare = us.topicUniqueItems / us.totalUniqueItems;
  const reasons: string[] = [];
  const thresholds = METHODOLOGY.divergence;
  if (
    kr.totalUniqueItems < thresholds.minimumUniqueItemsPerMarket ||
    us.totalUniqueItems < thresholds.minimumUniqueItemsPerMarket
  )
    reasons.push("minimum_items_per_market_not_met");
  if (
    kr.independentDomains < thresholds.minimumIndependentDomainsPerMarket ||
    us.independentDomains < thresholds.minimumIndependentDomainsPerMarket
  )
    reasons.push("minimum_independent_domains_per_market_not_met");
  const pooledTopicShare =
    (kr.topicUniqueItems + us.topicUniqueItems) /
    (kr.totalUniqueItems + us.totalUniqueItems);
  const minimumCellCount = thresholds.minimumExpectedCellCount;
  if (
    kr.totalUniqueItems * pooledTopicShare < minimumCellCount ||
    us.totalUniqueItems * pooledTopicShare < minimumCellCount ||
    kr.totalUniqueItems * (1 - pooledTopicShare) < minimumCellCount ||
    us.totalUniqueItems * (1 - pooledTopicShare) < minimumCellCount
  )
    reasons.push("normal_approximation_cell_count_not_met");

  const approximationEligible = !reasons.includes(
    "normal_approximation_cell_count_not_met",
  );
  const firstObserved = compareFirstObserved(kr, us);
  return {
    matched: true,
    comparison: {
      hypothesisId: kr.hypothesisId,
      entityId: kr.entityId,
      topicKey: kr.topicKey,
      sourceClass: kr.sourceClass,
      windowStartUtc: kr.windowStartUtc,
      windowEndUtc: kr.windowEndUtc,
      krShare,
      usShare,
      shareDifference: krShare - usShare,
      pValue: approximationEligible
        ? twoProportionPValue(
            kr.topicUniqueItems,
            kr.totalUniqueItems,
            us.topicUniqueItems,
            us.totalUniqueItems,
          )
        : 1,
      sampleEligible: reasons.length === 0,
      eligibilityReasons: reasons,
      ...firstObserved,
    },
  };
}

/** Apply BH correction over every supplied, pre-specified hypothesis. */
export function applyBenjaminiHochberg<
  T extends {
    hypothesisId: string;
    pValue: number;
    sampleEligible: boolean;
  },
>(comparisons: T[], q = METHODOLOGY.divergence.falseDiscoveryRateQ) {
  if (!Number.isFinite(q) || q <= 0 || q > 1)
    throw new RangeError("q must be in (0, 1]");
  if (
    new Set(comparisons.map((item) => item.hypothesisId)).size !==
    comparisons.length
  )
    throw new Error(
      "hypothesisId values must be unique within a correction family",
    );

  const ranked = comparisons
    .map((item) => ({ ...item, pValue: clampProbability(item.pValue) }))
    .sort(
      (a, b) =>
        a.pValue - b.pValue || a.hypothesisId.localeCompare(b.hypothesisId),
    );
  const adjusted = new Map<string, number>();
  let runningMinimum = 1;
  for (let index = ranked.length - 1; index >= 0; index--) {
    const rank = index + 1;
    runningMinimum = Math.min(
      runningMinimum,
      (ranked[index].pValue * ranked.length) / rank,
    );
    adjusted.set(ranked[index].hypothesisId, Math.min(1, runningMinimum));
  }

  return comparisons.map((comparison) => {
    const qValue = adjusted.get(comparison.hypothesisId)!;
    return {
      ...comparison,
      qValue,
      passesFalseDiscoveryRate: comparison.sampleEligible && qValue <= q,
    };
  });
}

/**
 * Evaluate a complete predeclared family. Missing or structurally unmatched
 * market pairs remain in the family with p=1 rather than disappearing from
 * multiple-testing correction.
 */
export function evaluateComparisonFamily(
  family: PredeclaredHypothesis[],
  q = METHODOLOGY.divergence.falseDiscoveryRateQ,
) {
  const results: FamilyHypothesisResult[] = family.map((hypothesis) => {
    if (!hypothesis.kr || !hypothesis.us) {
      return {
        hypothesisId: hypothesis.hypothesisId,
        comparison: null,
        pValue: 1,
        sampleEligible: false,
        eligibilityReasons: ["market_observation_missing"],
      };
    }
    if (
      hypothesis.kr.hypothesisId !== hypothesis.hypothesisId ||
      hypothesis.us.hypothesisId !== hypothesis.hypothesisId
    ) {
      return {
        hypothesisId: hypothesis.hypothesisId,
        comparison: null,
        pValue: 1,
        sampleEligible: false,
        eligibilityReasons: ["hypothesis_id_mismatch"],
      };
    }
    const evaluated = compareMatchedWindows(hypothesis.kr, hypothesis.us);
    if (!evaluated.matched) {
      return {
        hypothesisId: hypothesis.hypothesisId,
        comparison: null,
        pValue: 1,
        sampleEligible: false,
        eligibilityReasons: [evaluated.reason],
      };
    }
    return {
      hypothesisId: hypothesis.hypothesisId,
      comparison: evaluated.comparison,
      pValue: evaluated.comparison.pValue,
      sampleEligible: evaluated.comparison.sampleEligible,
      eligibilityReasons: evaluated.comparison.eligibilityReasons,
    };
  });
  return applyBenjaminiHochberg(results, q);
}

function validatePair(
  kr: TopicWindowObservation,
  us: TopicWindowObservation,
): string | null {
  if (kr.marketCode !== "KR" || us.marketCode !== "US")
    return "expected_kr_and_us_observations";
  if (kr.hypothesisId !== us.hypothesisId) return "hypothesis_mismatch";
  if (kr.entityId !== us.entityId) return "entity_mismatch";
  if (kr.topicKey !== us.topicKey) return "topic_mismatch";
  if (!kr.classifierVersion || kr.classifierVersion !== us.classifierVersion)
    return "classifier_version_mismatch";
  if (!kr.sourceClass || kr.sourceClass !== us.sourceClass)
    return "source_class_mismatch";

  const krStart = parseInstant(kr.windowStartUtc);
  const usStart = parseInstant(us.windowStartUtc);
  const krEnd = parseInstant(kr.windowEndUtc);
  const usEnd = parseInstant(us.windowEndUtc);
  if (![krStart, usStart, krEnd, usEnd].every(Number.isFinite))
    return "invalid_window";
  if (krStart !== usStart || krEnd !== usEnd || krEnd <= krStart)
    return "window_mismatch";

  for (const observation of [kr, us]) {
    if (
      !Number.isSafeInteger(observation.totalUniqueItems) ||
      observation.totalUniqueItems <= 0 ||
      !Number.isSafeInteger(observation.topicUniqueItems) ||
      observation.topicUniqueItems < 0 ||
      observation.topicUniqueItems > observation.totalUniqueItems ||
      !Number.isSafeInteger(observation.independentDomains) ||
      observation.independentDomains < 0 ||
      observation.independentDomains > observation.totalUniqueItems
    )
      return "invalid_counts";
  }
  return null;
}

function compareFirstObserved(
  kr: TopicWindowObservation,
  us: TopicWindowObservation,
) {
  const krTime = validTimeInWindow(kr.firstTopicObservedAtUtc, kr);
  const usTime = validTimeInWindow(us.firstTopicObservedAtUtc, us);
  if (krTime === null || usTime === null)
    return { firstObservedOrder: "unknown" as const, chronologyLagHours: null };
  if (krTime === usTime)
    return { firstObservedOrder: "same-time" as const, chronologyLagHours: 0 };
  return {
    firstObservedOrder:
      krTime < usTime ? ("KR-earlier" as const) : ("US-earlier" as const),
    chronologyLagHours: Math.abs(krTime - usTime) / 3_600_000,
  };
}

function validTimeInWindow(
  value: string | null,
  observation: TopicWindowObservation,
) {
  if (!value) return null;
  const time = parseInstant(value);
  const start = parseInstant(observation.windowStartUtc);
  const end = parseInstant(observation.windowEndUtc);
  return Number.isFinite(time) && time >= start && time < end ? time : null;
}

function parseInstant(value: string) {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return Number.NaN;
  return Date.parse(value);
}

function twoProportionPValue(
  krTopic: number,
  krTotal: number,
  usTopic: number,
  usTotal: number,
) {
  const pooled = (krTopic + usTopic) / (krTotal + usTotal);
  if (pooled === 0 || pooled === 1)
    return krTopic / krTotal === usTopic / usTotal ? 1 : 0;
  const standardError = Math.sqrt(
    pooled * (1 - pooled) * (1 / krTotal + 1 / usTotal),
  );
  if (standardError === 0) return 1;
  const z = Math.abs(krTopic / krTotal - usTopic / usTotal) / standardError;
  return Math.min(1, Math.max(0, erfc(z / Math.SQRT2)));
}

// Abramowitz-Stegun approximation for the normal two-sided tail probability.
function erfc(value: number) {
  const x = Math.abs(value);
  const t = 1 / (1 + 0.5 * x);
  let polynomial = 0.17087277;
  polynomial = -0.82215223 + t * polynomial;
  polynomial = 1.48851587 + t * polynomial;
  polynomial = -1.13520398 + t * polynomial;
  polynomial = 0.27886807 + t * polynomial;
  polynomial = -0.18628806 + t * polynomial;
  polynomial = 0.09678418 + t * polynomial;
  polynomial = 0.37409196 + t * polynomial;
  polynomial = 1.00002368 + t * polynomial;
  polynomial = t * Math.exp(-x * x - 1.26551223 + t * polynomial);
  return value >= 0 ? polynomial : 2 - polynomial;
}

function clampProbability(value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new RangeError("p-values must be within [0, 1]");
  return value;
}
