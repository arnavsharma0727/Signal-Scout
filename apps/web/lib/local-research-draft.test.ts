import { describe, expect, it } from "vitest";
import { parseLocalEvidenceDraft, parseLocalResearchNotes, serializeLocalEvidenceDraft, serializeLocalResearchNotes } from "./local-research-draft";
import type { ResearchEvidence } from "./research-brief";

const citation: ResearchEvidence = {
  id: "bsky:post-1", title: "A public post", url: "https://bsky.app/profile/example/post/1",
  source: "Bluesky", evidenceClass: "social discussion", language: "en",
  timeLabel: "Published", timeValue: "2026-10-05T12:00:00.000Z",
  researcherNote: "The post describes a claimed local cost increase.",
  researcherVerifiedOriginal: true,
  sourceOperatorKey: "bluesky", sourceOperatorLabel: "Bluesky",
  transientPreview: "This text must never be persisted",
};

describe("local browser research evidence draft", () => {
  it("round-trips citations while excluding transient post text", () => {
    const serialized = serializeLocalEvidenceDraft([citation]);
    expect(serialized).not.toContain("This text must never be persisted");
    expect(parseLocalEvidenceDraft(serialized)).toEqual([{ ...citation, transientPreview: undefined }].map(({ transientPreview: _removed, ...saved }) => saved));
  });

  it("persists the researcher's original-source review attestation locally", () => {
    expect(parseLocalEvidenceDraft(serializeLocalEvidenceDraft([citation]))?.[0].researcherVerifiedOriginal).toBe(true);
  });

  it("rejects malformed, oversized, and non-HTTPS browser data", () => {
    expect(parseLocalEvidenceDraft("not json")).toBeNull();
    expect(parseLocalEvidenceDraft(JSON.stringify({ version: 1, evidence: Array(101).fill(citation) }))).toBeNull();
    expect(parseLocalEvidenceDraft(JSON.stringify({ version: 1, evidence: [{ ...citation, url: "http://example.com" }] }))).toBeNull();
  });

  it("discards unexpected transient fields while accepting valid citations", () => {
    const raw = JSON.stringify({ version: 1, evidence: [{ ...citation, transientPreview: "secret" }] });
    expect(parseLocalEvidenceDraft(raw)?.[0]).not.toHaveProperty("transientPreview");
  });

  it("round-trips bounded private notebook notes and rejects invalid versions", () => {
    const notes = { topic: "Semiconductors", workingThesis: "Possible demand shift", alternatives: "A temporary inventory cycle", disconfirmingEvidence: "Orders reverse for two quarters" };
    expect(parseLocalResearchNotes(serializeLocalResearchNotes(notes))).toEqual(notes);
    expect(parseLocalResearchNotes(JSON.stringify({ version: 2, ...notes }))).toBeNull();
    expect(parseLocalResearchNotes(JSON.stringify({ version: 1, ...notes, topic: "x".repeat(161) }))).toBeNull();
  });
});
