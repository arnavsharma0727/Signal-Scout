import { describe, expect, it } from "vitest";
import { buildDiscussionObservations } from "./discussion-observations";

const row = (overrides: Record<string, unknown> = {}) => ({
  id: "q1",
  source_type: "stack-exchange",
  source_name: "Economics Stack Exchange",
  title_original: "Question title",
  source_url: "https://economics.stackexchange.com/questions/1",
  published_at: "2026-09-30T10:00:00Z",
  raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["inflation"] },
  ...overrides,
}) as Parameters<typeof buildDiscussionObservations>[0][number];
const AS_OF = new Date("2026-10-01T00:00:00Z");

describe("buildDiscussionObservations", () => {
  it("groups repeated exact tags and retains links to licensed evidence", () => {
    const result = buildDiscussionObservations([
      row(),
      row({
        id: "q2",
        source_name: "Personal Finance & Money Stack Exchange",
        source_url: "https://money.stackexchange.com/questions/2",
      }),
    ], AS_OF);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tag: "inflation",
      recentQuestionCount: 2,
      recentSampleSize: 2,
      baselineStatus: "insufficient_observed_days",
      communities: ["Economics Stack Exchange", "Personal Finance & Money Stack Exchange"],
    });
    expect(result[0].evidence).toHaveLength(2);
  });

  it("keeps singleton tags descriptive and excludes unlicensed content and other sources", () => {
    expect(buildDiscussionObservations([row()], AS_OF)[0]).toMatchObject({
      tag: "inflation",
      recentQuestionCount: 1,
    });
    expect(buildDiscussionObservations([
      row({ raw_metadata_json: { contentLicense: "CC BY-SA 3.0", tags: ["inflation"] } }),
      row({ id: "q2", source_type: "gdelt" }),
    ], AS_OF)).toEqual([]);
  });

  it("normalizes tags and ignores malformed values", () => {
    const result = buildDiscussionObservations([
      row({ raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["Inflation", "bad tag", "Inflation"] } }),
      row({ id: "q2", raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["inflation"] } }),
    ], AS_OF);
    expect(result.map(({ tag }) => tag)).toEqual(["inflation"]);
  });

  it("keeps valid non-Latin tags without merging them into English labels", () => {
    const result = buildDiscussionObservations([
      row({ raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["生成ai"] } }),
      row({ id: "q2", raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["生成ai"] } }),
    ], AS_OF);
    expect(result.map(({ tag }) => tag)).toEqual(["生成ai"]);
  });

  it("builds a 30-day exact-tag share baseline only after 14 observed prior publication days", () => {
    const history = [];
    for (let day = 14; day <= 27; day++) {
      const date = `2026-09-${day}T12:00:00Z`;
      history.push(
        row({ id: `tagged-${day}`, published_at: date }),
        row({ id: `other-${day}`, published_at: date, raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["economics"] } }),
      );
    }
    history.push(
      row({ id: "recent-inflation", published_at: "2026-09-30T12:00:00Z" }),
      row({ id: "recent-other", published_at: "2026-09-30T13:00:00Z", raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["economics"] } }),
    );

    const inflation = buildDiscussionObservations(history, AS_OF).find((item) => item.tag === "inflation");
    expect(inflation).toMatchObject({
      recentQuestionCount: 1,
      recentSampleSize: 2,
      recentShare: 0.5,
      priorObservedDays: 14,
      baselineMedianDailyShare: 0.5,
      baselineMadDailyShare: 0,
      baselineStatus: "available",
      sampleReviewCandidate: false,
    });
  });

  it("flags only a large exact-tag sample shift with enough questions, sites, and observed baseline", () => {
    const history = [];
    for (let day = 14; day <= 27; day++) {
      const date = `2026-09-${day}T12:00:00Z`;
      history.push(
        row({ id: `tagged-${day}`, published_at: date, source_name: "Economics Stack Exchange" }),
        ...Array.from({ length: 9 }, (_, index) => row({
          id: `other-${day}-${index}`,
          source_name: "Economics Stack Exchange",
          published_at: date,
          raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["economics"] },
        })),
      );
    }
    const recent = [
      ...Array.from({ length: 6 }, (_, index) => row({
        id: `recent-tag-${index}`,
        source_name: index % 2 ? "Personal Finance & Money Stack Exchange" : "Economics Stack Exchange",
        published_at: `2026-09-30T${String(index + 10).padStart(2, "0")}:00:00Z`,
      })),
      ...Array.from({ length: 14 }, (_, index) => row({
        id: `recent-other-${index}`,
        source_name: "Economics Stack Exchange",
        published_at: `2026-09-${String(28 + Math.floor(index / 5)).padStart(2, "0")}T${String(16 + (index % 5)).padStart(2, "0")}:00:00Z`,
        raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["economics"] },
      })),
    ];

    const result = buildDiscussionObservations([...history, ...recent], AS_OF);
    const inflation = result
      .find((item) => item.tag === "inflation");
    expect(inflation).toMatchObject({
      recentQuestionCount: 6,
      recentSampleSize: 20,
      priorObservedDays: 14,
      baselineMedianDailyShare: 0.1,
      baselineMadDailyShare: 0,
      sampleReviewCandidate: true,
    });
    expect(inflation?.sampleReviewReason).toContain("6 recent questions across 2 Stack Exchange communities");
    expect(result[0]?.tag).toBe("inflation");
  });

  it("does not fill missing publication dates with zero in the baseline", () => {
    const history = Array.from({ length: 13 }, (_, index) => {
      const day = String(index + 14).padStart(2, "0");
      return row({ id: `q-${day}`, published_at: `2026-09-${day}T12:00:00Z` });
    });
    const inflation = buildDiscussionObservations([
      ...history,
      row({ id: "recent", published_at: "2026-09-30T12:00:00Z" }),
    ], AS_OF)[0];
    expect(inflation).toMatchObject({
      priorObservedDays: 13,
      baselineMedianDailyShare: null,
      baselineMadDailyShare: null,
      baselineStatus: "insufficient_observed_days",
    });
  });
});
