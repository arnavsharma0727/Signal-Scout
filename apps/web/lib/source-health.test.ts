import { describe, expect, it } from "vitest";
import { summarizeConnectorRuns } from "./source-health";

describe("summarizeConnectorRuns", () => {
  it("summarizes all supplied recent run rows", () => {
    expect(
      summarizeConnectorRuns([
        { status: "completed", items_stored: 4 },
        { status: "partial", items_stored: 2 },
        { status: "failed", items_stored: 0 },
      ]),
    ).toEqual({
      recordsStored: 6,
      unsuccessfulRuns: 2,
      runCount: 3,
      errorRatePercent: 67,
    });
  });

  it("does not invent a rate when no runs are available", () => {
    expect(summarizeConnectorRuns([])).toEqual({
      recordsStored: 0,
      unsuccessfulRuns: 0,
      runCount: 0,
      errorRatePercent: null,
    });
  });

  it("treats a null stored count as zero", () => {
    expect(summarizeConnectorRuns([{ status: "completed", items_stored: null }]))
      .toMatchObject({ recordsStored: 0, runCount: 1, errorRatePercent: 0 });
  });
});
