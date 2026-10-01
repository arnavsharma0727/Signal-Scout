import { describe, expect, it } from "vitest";
import { buildDiscussionReportingOverlaps, OverlapInput } from "./discussion-reporting-overlaps";

const asOf = new Date("2026-10-01T12:00:00Z");
function row(overrides: Partial<OverlapInput> = {}): OverlapInput {
  return {
    id: "q1",
    source_type: "stack-exchange",
    source_name: "Economics Stack Exchange",
    source_domain: "api.stackexchange.com",
    language_code: "en",
    title_original: "Central bank interest rate outlook",
    source_url: "https://economics.stackexchange.com/questions/1",
    published_at: "2026-10-01T11:00:00Z",
    raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["central-bank"], query: "central bank" },
    ...overrides,
  };
}

describe("discussion-reporting literal overlaps", () => {
  it("links exact same-language Q&A tags to licensed reporting headlines with original sources", () => {
    const overlap = buildDiscussionReportingOverlaps([
      row(),
      row({ id: "r1", source_type: "licensed-reporting", source_name: "Global Voices", source_domain: "globalvoices.org", title_original: "Central bank weighs new measures", source_url: "https://globalvoices.org/story", raw_metadata_json: {} }),
    ], asOf);
    expect(overlap).toHaveLength(1);
    expect(overlap[0]).toMatchObject({
      tag: "central-bank",
      language: "en",
      questionCount: 1,
      questionCommunities: ["Economics Stack Exchange"],
      reportingSources: ["Global Voices"],
    });
    expect(overlap[0].questions[0].url).toContain("stackexchange.com/questions/1");
    expect(overlap[0].reporting[0].url).toBe("https://globalvoices.org/story");
  });

  it("does not bridge languages, partial words, unlicensed Q&A, excluded sources, or stale rows", () => {
    const reports = [
      row({ id: "r-en", source_type: "licensed-analysis", source_name: "The Conversation", source_domain: "theconversation.com", title_original: "Central bank decisions", source_url: "https://theconversation.com/story", raw_metadata_json: {} }),
      row({ id: "r-es", source_type: "licensed-reporting", source_name: "Spanish outlet", language_code: "es", title_original: "Banco central decide", source_url: "https://news.example/story", raw_metadata_json: {} }),
      row({ id: "r-partial", source_type: "licensed-reporting", source_name: "Partial match", title_original: "Central bankers debate policy", source_url: "https://news.example/partial", raw_metadata_json: {} }),
      row({ id: "r-old", source_type: "licensed-reporting", source_name: "Old report", title_original: "Central bank decision", published_at: "2026-09-20T00:00:00Z", source_url: "https://news.example/old", raw_metadata_json: {} }),
      row({ id: "r-hn", source_type: "hacker-news", source_name: "Hacker News", title_original: "Central bank discussion", source_domain: "news.ycombinator.com", source_url: "https://news.ycombinator.com/item?id=1", raw_metadata_json: {} }),
    ];
    const invalidQuestion = row({ id: "q-unlicensed", raw_metadata_json: { contentLicense: "CC BY-NC-SA 4.0", tags: ["central-bank"], query: "central bank" } });
    expect(buildDiscussionReportingOverlaps([invalidQuestion, ...reports], asOf)).toEqual([]);
    const literalOnly = row({ id: "q-literal" });
    const partialHeadline = row({ id: "r-only-partial", source_type: "licensed-reporting", source_name: "Partial outlet", title_original: "Central bankers debate policy", source_url: "https://news.example/partial-only", raw_metadata_json: {} });
    expect(buildDiscussionReportingOverlaps([literalOnly, partialHeadline], asOf)).toEqual([]);
  });

  it("deduplicates source items and exposes no generated thesis or sentiment", () => {
    const q1 = row();
    const q2 = row({ id: "q2", source_name: "Money Stack Exchange", source_url: "https://money.stackexchange.com/questions/2" });
    const report = row({ id: "r1", source_type: "licensed-reporting", source_name: "Global Voices", source_domain: "globalvoices.org", title_original: "Central bank weighs new measures", source_url: "https://globalvoices.org/story", raw_metadata_json: {} });
    const overlap = buildDiscussionReportingOverlaps([q1, q1, q2, report, report], asOf)[0];
    expect(overlap.questionCount).toBe(2);
    expect(overlap.questions).toHaveLength(2);
    expect(overlap.reporting).toHaveLength(1);
    expect(overlap).not.toHaveProperty("sentiment");
    expect(overlap).not.toHaveProperty("thesis");
  });
});
