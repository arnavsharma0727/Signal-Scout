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

describe("buildDiscussionObservations", () => {
  it("groups repeated exact tags and retains links to licensed evidence", () => {
    const result = buildDiscussionObservations([
      row(),
      row({
        id: "q2",
        source_name: "Personal Finance & Money Stack Exchange",
        source_url: "https://money.stackexchange.com/questions/2",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tag: "inflation",
      questionCount: 2,
      communities: ["Economics Stack Exchange", "Personal Finance & Money Stack Exchange"],
    });
    expect(result[0].evidence).toHaveLength(2);
  });

  it("keeps singleton tags descriptive and excludes unlicensed content and other sources", () => {
    expect(buildDiscussionObservations([row()])[0]).toMatchObject({
      tag: "inflation",
      questionCount: 1,
    });
    expect(buildDiscussionObservations([
      row({ raw_metadata_json: { contentLicense: "CC BY-SA 3.0", tags: ["inflation"] } }),
      row({ id: "q2", source_type: "gdelt" }),
    ])).toEqual([]);
  });

  it("normalizes tags and ignores malformed values", () => {
    const result = buildDiscussionObservations([
      row({ raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["Inflation", "bad tag", "Inflation"] } }),
      row({ id: "q2", raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["inflation"] } }),
    ]);
    expect(result.map(({ tag }) => tag)).toEqual(["inflation"]);
  });

  it("keeps valid non-Latin tags without merging them into English labels", () => {
    const result = buildDiscussionObservations([
      row({ raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["生成ai"] } }),
      row({ id: "q2", raw_metadata_json: { contentLicense: "CC BY-SA 4.0", tags: ["生成ai"] } }),
    ]);
    expect(result.map(({ tag }) => tag)).toEqual(["生成ai"]);
  });
});
