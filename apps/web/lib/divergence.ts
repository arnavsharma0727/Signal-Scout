import { METHODOLOGY } from "./methodology-config";
export type SourceTier = 1 | 2 | 3 | 4 | 5;
export const SOURCE_TIER_WEIGHTS: Record<SourceTier, number> = {
  ...METHODOLOGY.divergence.sourceTierWeights,
};
export const DEFAULT_ALPHA = METHODOLOGY.divergence.betaPriorAlpha;
export const DEFAULT_BETA = METHODOLOGY.divergence.betaPriorBeta;
export const DEFAULT_HALF_LIFE_HOURS =
  METHODOLOGY.divergence.recencyHalfLifeHours;
export interface ObservationInput {
  topicWeight: number;
  totalWeight: number;
  independentSources: number;
  documents: number;
  averageEntityConfidence: number;
}
export function documentWeight(
  tier: SourceTier,
  entityConfidence: number,
  isDuplicate = false,
  duplicateDiscount = METHODOLOGY.divergence.duplicateDiscount,
) {
  const confidence = Math.max(0, Math.min(1, entityConfidence));
  const base = SOURCE_TIER_WEIGHTS[tier] * confidence;
  return isDuplicate ? base * duplicateDiscount : base;
}
export function weightedTopicShare(topicWeight: number, totalWeight: number) {
  return totalWeight > 0 ? topicWeight / totalWeight : null;
}
export function smoothedTopicShare(
  topicWeight: number,
  totalWeight: number,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA,
) {
  if (totalWeight < 0 || alpha < 0 || beta < 0) return null;
  return (topicWeight + alpha) / (totalWeight + alpha + beta);
}
export function narrativeTopicGap(
  localTopicWeight: number,
  localTotalWeight: number,
  englishTopicWeight: number,
  englishTotalWeight: number,
  alpha = DEFAULT_ALPHA,
  beta = DEFAULT_BETA,
) {
  const local = smoothedTopicShare(
    localTopicWeight,
    localTotalWeight,
    alpha,
    beta,
  );
  const english = smoothedTopicShare(
    englishTopicWeight,
    englishTotalWeight,
    alpha,
    beta,
  );
  return local === null || english === null ? null : local - english;
}
export function logOddsRatio(localShare: number, englishShare: number) {
  const odds = (p: number) => (p <= 0 || p >= 1 ? null : p / (1 - p));
  const local = odds(localShare),
    english = odds(englishShare);
  return local === null || english === null ? null : Math.log(local / english);
}
export function recencyScore(
  ageHours: number,
  halfLifeHours = DEFAULT_HALF_LIFE_HOURS,
) {
  if (ageHours < 0 || halfLifeHours <= 0) return 0;
  return Math.exp((-Math.log(2) * ageHours) / halfLifeHours);
}
export function concentrationScore(
  independentSources: number,
  target = METHODOLOGY.divergence.concentrationTargetSources,
) {
  if (independentSources < 0 || target <= 0) return 0;
  return Math.min(1, Math.log(1 + independentSources) / Math.log(1 + target));
}
export function divergenceStrength(
  gap: number | null,
  target = METHODOLOGY.divergence.divergenceTargetGap,
) {
  return gap === null || target <= 0 ? 0 : Math.min(1, Math.abs(gap) / target);
}
export function researchPriority(input: {
  recency: number;
  sourceQuality: number;
  concentration: number;
  divergence: number;
  evidenceQuality: number;
  penalty: number;
}) {
  const weights = METHODOLOGY.divergence.priorityWeights;
  const raw =
    weights.recency * input.recency +
    weights.sourceQuality * input.sourceQuality +
    weights.concentration * input.concentration +
    weights.divergence * input.divergence +
    weights.evidenceQuality * input.evidenceQuality -
    input.penalty;
  return Math.round(Math.max(0, Math.min(1, raw)) * 100);
}
export function evidenceThresholds(
  i: ObservationInput & {
    hasTierOneOrTwo: boolean;
    hasThreeIndependentTierThreePlus: boolean;
    fresh: boolean;
    englishAvailable: boolean;
  },
) {
  const threshold = METHODOLOGY.divergence;
  const checks = {
    localWeightedTotal: i.totalWeight >= threshold.localMinimumWeightedTotal,
    localTopicEvidence: i.topicWeight >= threshold.localMinimumTopicEvidence,
    independentLocalSources:
      i.independentSources >= threshold.localMinimumIndependentSources,
    entityConfidence:
      i.averageEntityConfidence >= threshold.minimumAverageEntityConfidence,
    quality: i.hasTierOneOrTwo || i.hasThreeIndependentTierThreePlus,
    freshness: i.fresh,
  };
  return {
    eligible: Object.values(checks).every(Boolean),
    checks,
    comparisonStatus: i.englishAvailable ? "available" : "unavailable",
  } as const;
}
