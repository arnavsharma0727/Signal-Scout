import { describe, expect, it } from "vitest";
import { summarizeConversationCoverage } from "./research-conversation-coverage";

describe("summarizeConversationCoverage", () => {
  it("counts only reviewed operators and keeps source rows and displayed bylines descriptive", () => {
    const result = summarizeConversationCoverage([
      { source_type: "licensed-forum", source_domain: "discussion.fedoraproject.org", raw_metadata_json: { publisher: "Fedora Discussion", author: "Member One", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
      { source_type: "licensed-forum", source_domain: "discussion.fedoraproject.org", raw_metadata_json: { publisher: "Fedora Discussion", author: "Member Two", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/" } },
      { source_type: "licensed-forum", source_domain: "forum.typst.app", raw_metadata_json: { publisher: "Typst Forum", author: "Member One" } },
      { source_type: "wikimedia-talk", source_domain: "en.wikipedia.org", raw_metadata_json: {} },
      { source_type: "licensed-forum", source_domain: "unknown.example", raw_metadata_json: { publisher: "Unknown forum", author: "Member Three" } },
    ]);

    expect(result).toEqual({
      itemCount: 5,
      unresolvedOperatorCount: 2,
      operators: [
        { key: "fedora-discussion", label: "Fedora Discussion", itemCount: 2 },
        { key: "typst-forum", label: "Typst Forum", itemCount: 1 },
      ],
      attributedItemCount: 3,
      distinctBylineLabels: 3,
      largestBylineShare: 1 / 3,
    });
  });

  it("does not invent operators or authors for an empty or unresolved sample", () => {
    expect(summarizeConversationCoverage([])).toMatchObject({
      itemCount: 0,
      unresolvedOperatorCount: 0,
      operators: [],
      attributedItemCount: 0,
      distinctBylineLabels: 0,
      largestBylineShare: 0,
    });
    expect(summarizeConversationCoverage([
      { source_type: "licensed-forum", source_domain: "example.org", raw_metadata_json: { publisher: "Unknown" } },
    ])).toMatchObject({ itemCount: 1, unresolvedOperatorCount: 1, operators: [], attributedItemCount: 0 });
  });
});
