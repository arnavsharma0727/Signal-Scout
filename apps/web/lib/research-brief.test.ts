import { describe, expect, it } from "vitest";
import { citationWithoutTransientContent, createResearchBriefMarkdown, ResearchEvidence, summarizeConversationBylines, summarizeEvidenceCoverage, summarizeRepeatedPostText, topicFromFragment } from "./research-brief";

const selected: ResearchEvidence = {
  id: "se-1",
  title: "A licensed question",
  url: "https://economics.stackexchange.com/questions/1/example",
  source: "Economics Stack Exchange",
  evidenceClass: "expert Q&A",
  language: "English",
  timeLabel: "Published",
  timeValue: "2026-10-01T12:00:00Z",
  context: "Sample context",
  attribution: "By Researcher; CC BY-SA 4.0",
  attributionUrl: "https://economics.stackexchange.com/users/1/researcher",
  licenseName: "CC BY-SA 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
};

describe("createResearchBriefMarkdown", () => {
  it("summarizes visible discussion bylines without merging labels across operators", () => {
    const summary = summarizeConversationBylines([
      { ...selected, id: "a", attribution: "Author: @same", sourceOperatorKey: "bluesky" },
      { ...selected, id: "b", attribution: "Author: @same", sourceOperatorKey: "bluesky" },
      { ...selected, id: "c", attribution: "Lemmy author: @same", sourceOperatorKey: "lemmy" },
      { ...selected, id: "d", attribution: "Headline belongs to publisher; indexed by GDELT", evidenceClass: "news coverage" },
    ]);
    expect(summary).toEqual({ itemCount: 3, attributedItemCount: 3, distinctBylineLabels: 2, largestBylineGroup: 2 });
  });

  it("surfaces normalized duplicate transient text without retaining post content", () => {
    const summary = summarizeRepeatedPostText([
      { ...selected, id: "post-a", evidenceClass: "social discussion", transientPreview: "AI prices & power app.example/link-one" },
      { ...selected, id: "post-b", evidenceClass: "social discussion", transientPreview: " AI prices ＆ power https://example.net/link-two " },
      { ...selected, id: "post-c", evidenceClass: "social discussion", transientPreview: "A separate comment" },
      { ...selected, id: "news", evidenceClass: "news coverage", transientPreview: "AI prices & power" },
    ]);
    expect(summary).toEqual({ previewItemCount: 3, repeatedItemCount: 2, largestRepeatedGroup: 2 });
  });

  it("strips transient post text when a live result is selected as a citation", () => {
    const selectedPost = {
      ...selected,
      transientPreview: "A transient public post excerpt",
    };
    const citation = citationWithoutTransientContent(selectedPost);
    expect(citation).not.toHaveProperty("transientPreview");
    expect(createResearchBriefMarkdown({
      topic: "Trade",
      workingThesis: "",
      alternatives: "",
      disconfirmingEvidence: "",
      evidence: [citation],
      exportedAt: "2026-10-01T12:00:00Z",
    })).not.toContain("A transient public post excerpt");
  });

  it("exports only the supplied hand-written draft and selected source citations", () => {
    const markdown = createResearchBriefMarkdown({
      topic: "Trade",
      workingThesis: "A test hypothesis",
      alternatives: "Policy change rather than demand",
      disconfirmingEvidence: "Compare over next month",
      evidence: [selected],
      exportedAt: "2026-10-01T12:00:00Z",
    });
    expect(markdown).toContain("A test hypothesis");
    expect(markdown).toContain("Policy change rather than demand");
    expect(markdown).toContain("What would change my mind?");
    expect(markdown).toContain("[A licensed question](https://economics.stackexchange.com/questions/1/example)");
    expect(markdown).toContain("By Researcher; CC BY-SA 4.0");
    expect(markdown).toContain("Sample context");
    expect(markdown).not.toContain("Researcher observation:");
    expect(markdown).toContain("[attribution link](https://economics.stackexchange.com/users/1/researcher)");
    expect(markdown).toContain("[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)");
    expect(markdown).toContain("not an investment recommendation");
    expect(markdown).toContain("## Selected-sample coverage audit");
    expect(markdown).toContain("Source labels: Economics Stack Exchange");
    expect(markdown).toContain("not necessarily an independent publisher");
    expect(markdown).toContain("Researcher-assigned assessment: None; unassessed: 1");
    expect(markdown).not.toContain("recommendation: buy");
  });

  it("exports explicitly researcher-assigned supporting and contradictory evidence separately", () => {
    const markdown = createResearchBriefMarkdown({
      topic: "Trade",
      workingThesis: "A tentative thesis",
      alternatives: "",
      disconfirmingEvidence: "",
      evidence: [
        { ...selected, researcherAssessment: "supports" },
        { ...selected, id: "se-2", researcherAssessment: "contradicts" },
        { ...selected, id: "se-3", researcherAssessment: "context" },
      ],
      exportedAt: "2026-10-01T12:00:00Z",
    });
    expect(markdown).toContain("supports (1), contradicts (1), context (1); unassessed: 0");
    expect(markdown).toContain("researcher assessment: supports");
    expect(markdown).toContain("researcher assessment: contradicts");
    expect(markdown).not.toContain("automated sentiment");
  });

  it("includes the researcher's source-specific paraphrase in the exported evidence record", () => {
    const markdown = createResearchBriefMarkdown({
      topic: "Electricity prices",
      workingThesis: "A tentative thesis",
      alternatives: "Separate tariff changes may explain the price move.",
      disconfirmingEvidence: "A broader matched sample would change my view.",
      evidence: [{ ...selected, researcherAssessment: "supports", researcherNote: "This source describes a household electricity bill increase." }],
      exportedAt: "2026-10-01T12:00:00Z",
    });
    expect(markdown).toContain("researcher observation: This source describes a household electricity bill increase.");
    expect(markdown).toContain("Source-specific evidence documented");
  });

  it("summarizes language, source labels, evidence classes, and valid date span without calling them independent", () => {
    const coverage = summarizeEvidenceCoverage([
      selected,
      { ...selected, id: "se-2", sourceOperatorKey: "stack-exchange", sourceOperatorLabel: "Stack Exchange" },
      { ...selected, id: "se-3", source: "Stack Overflow", sourceOperatorKey: "stack-exchange", sourceOperatorLabel: "Stack Exchange" },
      {
        ...selected,
        id: "mastodon-1",
        title: "A public discussion",
        url: "https://mstdn.jp/@reader/1",
        source: "Mastodon · mstdn.jp",
        evidenceClass: "social discussion",
        language: "Japanese",
        timeValue: "2026-10-02T12:00:00Z",
      },
      { ...selected, id: "bad-date", timeValue: "not-a-date" },
    ]);
    expect(coverage.itemCount).toBe(5);
    expect(coverage.sourceLabels).toEqual(["Economics Stack Exchange", "Mastodon · mstdn.jp", "Stack Overflow"]);
    expect(coverage.knownOperatorLabels).toEqual(["Stack Exchange"]);
    expect(coverage.unresolvedOperatorItemCount).toBe(3);
    expect(coverage.languages).toEqual(["English", "Japanese"]);
    expect(coverage.evidenceClasses).toEqual([
      { evidenceClass: "expert Q&A", count: 4 },
      { evidenceClass: "social discussion", count: 1 },
    ]);
    expect(coverage.earliest).toBe("2026-10-01T12:00:00.000Z");
    expect(coverage.latest).toBe("2026-10-02T12:00:00.000Z");
  });

  it("does not invent evidence when the researcher selected none", () => {
    const markdown = createResearchBriefMarkdown({
      topic: "",
      workingThesis: "",
      alternatives: "",
      disconfirmingEvidence: "",
      evidence: [],
      exportedAt: "now",
    });
    expect(markdown).toContain("No evidence selected.");
    expect(markdown).toContain("Not written.");
  });

  it("refuses non-HTTPS source links in exported citations", () => {
    const markdown = createResearchBriefMarkdown({
      topic: "",
      workingThesis: "",
      alternatives: "",
      disconfirmingEvidence: "",
      evidence: [{ ...selected, url: "javascript:alert(1)" }],
      exportedAt: "now",
    });
    expect(markdown).toContain("(#invalid-link)");
    expect(markdown).not.toContain("javascript:");
  });

  it("escapes source-controlled markdown link labels", () => {
    const markdown = createResearchBriefMarkdown({
      topic: "",
      workingThesis: "",
      alternatives: "",
      disconfirmingEvidence: "",
      evidence: [{ ...selected, title: "](javascript:alert(1))" }],
      exportedAt: "now",
    });
    const destinations = [...markdown.matchAll(/(?<!\\)\]\(([^)]+)\)/g)].map((match) => match[1]);
    expect(destinations.length).toBeGreaterThan(0);
    expect(destinations.every((url) => url.startsWith("https://"))).toBe(true);
    expect(markdown).toContain("\\]");
  });
});

describe("topicFromFragment", () => {
  it("decodes a topic handoff from the URL fragment", () => {
    expect(topicFromFragment(`#topic=${encodeURIComponent("inflation · housing")}`)).toBe("inflation · housing");
  });

  it("does not accept query-string content and bounds the value", () => {
    expect(topicFromFragment("")).toBe("");
    expect(topicFromFragment(`?topic=${encodeURIComponent("not-a-fragment")}`)).toBe("");
    expect(topicFromFragment(`#topic=${"x".repeat(150)}`)).toHaveLength(100);
  });
});
