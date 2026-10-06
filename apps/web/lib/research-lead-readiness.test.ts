import { describe, expect, it } from "vitest";
import { assessResearchLeadReadiness, type ResearchEvidence } from "./research-brief";

const now = Date.parse("2026-10-05T12:00:00Z");
const evidence: ResearchEvidence[] = [
  { id: "social", title: "Discussion source", url: "https://bsky.app/profile/a.example/post/1", source: "Bluesky", evidenceClass: "social discussion", language: "en", timeLabel: "Published", timeValue: new Date(now - 3600000).toISOString(), attribution: "Author: @reader-one", researcherAssessment: "supports", researcherNote: "The post describes a local increase in household electricity bills.", researcherVerifiedOriginal: true, sourceOperatorKey: "bluesky", sourceOperatorLabel: "Bluesky" },
  { id: "social-2", title: "Another discussion source", url: "https://bsky.app/profile/b.example/post/2", source: "Bluesky", evidenceClass: "social discussion", language: "en", timeLabel: "Published", timeValue: new Date(now - 1800000).toISOString(), attribution: "Author: @reader-two", researcherAssessment: "supports", researcherNote: "This separate account describes the same local bill increase.", researcherVerifiedOriginal: true, sourceOperatorKey: "bluesky", sourceOperatorLabel: "Bluesky" },
  { id: "news", title: "Reporting source", url: "https://globalvoices.org/story/1", source: "Global Voices", evidenceClass: "news coverage", language: "en", timeLabel: "Published", timeValue: new Date(now - 7200000).toISOString(), researcherAssessment: "contradicts", researcherNote: "The report attributes the price change to a separate utility tariff revision.", researcherVerifiedOriginal: true, sourceOperatorKey: "global-voices", sourceOperatorLabel: "Global Voices" },
  { id: "analysis", title: "Analysis source", url: "https://theconversation.com/story/1", source: "The Conversation", evidenceClass: "expert analysis", language: "en", timeLabel: "Published", timeValue: new Date(now - 10800000).toISOString(), researcherAssessment: "context", researcherNote: "The analysis distinguishes wholesale energy prices from local retail rates.", researcherVerifiedOriginal: true, sourceOperatorKey: "the-conversation", sourceOperatorLabel: "The Conversation" },
];

describe("research lead readiness", () => {
  const complete = {
    topic: "A concrete international policy change",
    workingThesis: "A testable explanation based on selected evidence.",
    alternatives: "The discussion may reflect a scheduled announcement rather than a lasting shift.",
    disconfirmingEvidence: "A broader independent sample returning to baseline would change my view.",
    evidence,
    asOf: now,
  };

  it("requires the full human-review checklist and at least two reviewed operators", () => {
    const result = assessResearchLeadReadiness(complete);
    expect(result.readyForHumanReview).toBe(true);
    expect(result.reviewedOperators).toEqual(["Bluesky", "Global Voices", "The Conversation"]);
  });

  it("does not accept multiple items from one operator as independent evidence", () => {
    const oneOperator = evidence.map((item) => ({ ...item, sourceOperatorKey: "bluesky", sourceOperatorLabel: "Bluesky" }));
    const result = assessResearchLeadReadiness({ ...complete, evidence: oneOperator });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "At least two reviewed source operators")?.passed).toBe(false);
  });

  it("does not count display-label variations as separate operators", () => {
    const sameOperatorDifferentLabels = evidence.map((item, index) => ({
      ...item,
      sourceOperatorKey: "same-publisher",
      sourceOperatorLabel: `Edition ${index + 1}`,
    }));
    const result = assessResearchLeadReadiness({ ...complete, evidence: sameOperatorDifferentLabels });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "At least two reviewed source operators")?.passed).toBe(false);
  });

  it("requires explicit relevance assessments for every recent citation", () => {
    const unreviewed = evidence.map((item) => ({ ...item, researcherAssessment: undefined }));
    const result = assessResearchLeadReadiness({ ...complete, evidence: unreviewed });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "Relevance reviewed for every recent citation")?.passed).toBe(false);
  });

  it("requires a source-specific paraphrase for every relevant citation", () => {
    const missingNote = evidence.map((item) => item.id === "news" ? { ...item, researcherNote: "" } : item);
    const result = assessResearchLeadReadiness({ ...complete, evidence: missingNote });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "Source-specific evidence documented")?.passed).toBe(false);
  });

  it("requires the researcher to attest that every relevant original source was checked", () => {
    const unchecked = evidence.map((item) => item.id === "news"
      ? { ...item, researcherVerifiedOriginal: false }
      : item);
    const result = assessResearchLeadReadiness({ ...complete, evidence: unchecked });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "Original sources checked")?.passed).toBe(false);
  });

  it("requires substantive alternative and disconfirmation text rather than nonempty placeholders", () => {
    const result = assessResearchLeadReadiness({ ...complete, alternatives: "Other possibility", disconfirmingEvidence: "No change" });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "Alternative explanation and disconfirmation test")?.passed).toBe(false);
  });

  it("withholds a dossier when one conversation byline dominates the reviewed sample", () => {
    const concentrated = evidence.map((item) => item.evidenceClass === "social discussion"
      ? { ...item, attribution: "Author: @same-account" }
      : item);
    const result = assessResearchLeadReadiness({ ...complete, evidence: concentrated });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label.startsWith("Multiple conversation bylines"))?.passed).toBe(false);
  });

  it("requires identifiable bylines on all relevant discussion citations", () => {
    const withoutAttribution = evidence.map((item) => item.id === "social-2"
      ? { ...item, attribution: undefined }
      : item);
    const result = assessResearchLeadReadiness({ ...complete, evidence: withoutAttribution });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label.startsWith("Multiple conversation bylines"))?.passed).toBe(false);
  });

  it("excludes unrelated conversation from the minimum sample and source-class checks", () => {
    const result = assessResearchLeadReadiness({
      ...complete,
      evidence: evidence.map((item) => item.evidenceClass === "social discussion"
        ? { ...item, researcherAssessment: "not relevant" }
        : item),
    });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "At least three recent, relevant, dated citations")?.passed).toBe(false);
    expect(result.checks.find((check) => check.label === "Discussion plus reporting or expert analysis")?.passed).toBe(false);
    expect(result.reviewedOperators).not.toContain("Bluesky");
  });

  it("rejects stale, future-dated, undated, and one-sided evidence", () => {
    const incomplete = [
      { ...evidence[0], timeValue: new Date(now - 31 * 86400000).toISOString() },
      { ...evidence[1], timeValue: new Date(now + 3600000).toISOString() },
      { ...evidence[2], timeValue: "not-a-date" },
    ];
    const result = assessResearchLeadReadiness({ ...complete, evidence: incomplete });
    expect(result.readyForHumanReview).toBe(false);
    expect(result.checks.find((check) => check.label === "At least three recent, relevant, dated citations")?.passed).toBe(false);
  });
});
