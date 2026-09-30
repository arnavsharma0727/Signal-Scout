/** Parameters currently used by descriptive aggregation and the dormant divergence helpers. */
export const METHODOLOGY = {
  version: "v1.0",
  dailyMetrics: {
    minimumUniqueHashesForDescriptiveOnly: 20,
    minimumIndependentDomainsForDescriptiveOnly: 5,
    minimumPriorObservedDaysForBaseline: 14,
    baselineWindowDays: 30,
  },
  divergence: {
    sourceTierWeights: { 1: 1, 2: 0.75, 3: 0.5, 4: 0.25, 5: 0.1 },
    duplicateDiscount: 0.1,
    betaPriorAlpha: 1,
    betaPriorBeta: 1,
    recencyHalfLifeHours: 72,
    concentrationTargetSources: 5,
    divergenceTargetGap: 0.3,
    priorityWeights: {
      recency: 0.3,
      sourceQuality: 0.25,
      concentration: 0.2,
      divergence: 0.15,
      evidenceQuality: 0.1,
    },
    localMinimumWeightedTotal: 1.5,
    localMinimumTopicEvidence: 0.75,
    localMinimumIndependentSources: 2,
    minimumAverageEntityConfidence: 0.75,
  },
} as const;
