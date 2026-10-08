import { describe, expect, it } from "vitest";
import { buildPerspectiveSnapshot } from "./perspective-snapshot";
import type { ResearchSweepSourceResult } from "./research-sweep";

const result = (key: string, label: string, evidence: ResearchSweepSourceResult["evidence"]): ResearchSweepSourceResult => ({
  key, label, window: "recent", evidence, error: null,
});

const item = (id: string, source: string, language: string) => ({
  id, title: `Evidence ${id}`, url: `https://example.com/${id}`, source,
  evidenceClass: "social discussion" as const, language, timeLabel: "Published",
  timeValue: "2026-10-01T00:00:00.000Z", transientPreview: `Excerpt ${id}`,
});

describe("buildPerspectiveSnapshot", () => {
  it("keeps the English/U.S.-market-facing sample separate from language and edition perspectives", () => {
    const snapshot = buildPerspectiveSnapshot([
      result("hacker-news", "Hacker News", [item("hn", "Hacker News", "English")]),
      result("stack-exchange:economics", "Economics", [item("en-se", "Economics Stack Exchange", "English")]),
      result("stack-exchange:es.stackoverflow", "Spanish Stack Overflow", [item("es-se", "Stack Overflow en español", "Spanish")]),
      result("global-voices", "Global Voices", [item("gv-es", "Global Voices · Spanish edition", "Spanish"), item("gv-ar", "Global Voices · Arabic edition", "Arabic")]),
    ]);

    expect(snapshot.englishMarketAngle.map(({ title }) => title)).toEqual(["Evidence hn", "Evidence en-se"]);
    expect(snapshot.otherPerspectives.map(({ source, language }) => [source, language])).toEqual([
      ["Stack Overflow en español", "Spanish"],
      ["Global Voices · Spanish edition", "Spanish"],
      ["Global Voices · Arabic edition", "Arabic"],
    ]);
    expect(snapshot.otherPerspectives.flatMap(({ items }) => items).map(({ title }) => title)).not.toContain("Evidence hn");
  });

  it("does not infer country from English language or duplicate repeated links", () => {
    const snapshot = buildPerspectiveSnapshot([
      result("hacker-news", "Hacker News", [
        item("same", "Hacker News", "English"),
        { ...item("same-copy", "Hacker News", "English"), url: "https://example.com/same" },
      ]),
      result("lemmy:lemmy.world", "Lemmy", [item("lemmy", "Lemmy · lemmy.world / c/economy", "English")]),
    ]);
    expect(snapshot.englishMarketAngle).toHaveLength(1);
    expect(snapshot.otherPerspectives).toEqual([
      expect.objectContaining({ source: "Lemmy · lemmy.world / c/economy", language: "English" }),
    ]);
  });
});
