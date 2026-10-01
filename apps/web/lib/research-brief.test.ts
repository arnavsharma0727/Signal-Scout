import { describe, expect, it } from "vitest";
import { createResearchBriefMarkdown, ResearchEvidence } from "./research-brief";

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
    expect(markdown).toContain("[attribution link](https://economics.stackexchange.com/users/1/researcher)");
    expect(markdown).toContain("[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)");
    expect(markdown).toContain("not an investment recommendation");
    expect(markdown).not.toContain("recommendation: buy");
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
