export type ConnectorRunSummary = {
  recordsStored: number;
  unsuccessfulRuns: number;
  runCount: number;
  errorRatePercent: number | null;
};

export function summarizeConnectorRuns(
  runs: Array<{ status: string; items_stored: number | null }>,
): ConnectorRunSummary {
  const unsuccessfulRuns = runs.filter(
    (run) => run.status === "failed" || run.status === "partial",
  ).length;
  return {
    recordsStored: runs.reduce((sum, run) => sum + (run.items_stored ?? 0), 0),
    unsuccessfulRuns,
    runCount: runs.length,
    errorRatePercent: runs.length
      ? Math.round((unsuccessfulRuns / runs.length) * 100)
      : null,
  };
}
