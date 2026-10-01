import { describe, expect, it } from "vitest";
import {
  knownSourceOperator,
  passesIndependentEvidenceGate,
  sourceOperatorsByLead,
} from "./research-lead-qualification";

describe("research lead source-operator gate", () => {
  it("collapses Stack Exchange communities and publisher editions to their shared operators", () => {
    const operators = sourceOperatorsByLead([
      { research_lead_id: "lead", document_id: "1", source_documents: { source_type: "stack-exchange", source_domain: "economics.stackexchange.com", raw_metadata_json: { site: "economics" } } },
      { research_lead_id: "lead", document_id: "2", source_documents: { source_type: "stack-exchange", source_domain: "stackoverflow.com", raw_metadata_json: { site: "es.stackoverflow" } } },
      { research_lead_id: "lead", document_id: "3", source_documents: { source_type: "licensed-reporting", source_domain: "es.globalvoices.org", raw_metadata_json: { publisher: "Global Voices", editionCode: "es" } } },
      { research_lead_id: "lead", document_id: "4", source_documents: { source_type: "licensed-reporting", source_domain: "fr.globalvoices.org", raw_metadata_json: { publisher: "Global Voices", editionCode: "fr" } } },
    ]);
    expect([...operators.get("lead") ?? []].sort()).toEqual(["global-voices", "stack-exchange"]);
  });

  it("counts Typst and Stack Exchange as distinct operators only when their reviewed domains and publisher metadata agree", () => {
    expect(knownSourceOperator({ source_type: "licensed-forum", source_domain: "forum.typst.app", raw_metadata_json: { publisher: "Typst Forum" } })).toBe("typst-forum");
    expect(knownSourceOperator({ source_type: "licensed-forum", source_domain: "forum.typst.app", raw_metadata_json: { publisher: "Other forum" } })).toBeNull();
    expect(knownSourceOperator({ source_type: "licensed-forum", source_domain: "evil.example", raw_metadata_json: { publisher: "Typst Forum" } })).toBeNull();
  });

  it("requires recorded evidence, alternatives, a database count, and two verified operators", () => {
    const lead = {
      independent_source_count: 2,
      verified_evidence_json: [{ documentId: "doc-a" }],
      alternative_explanations_json: [{ explanation: "alternative" }],
    };
    expect(passesIndependentEvidenceGate(lead, new Set(["stack-exchange", "global-voices"]))).toBe(true);
    expect(passesIndependentEvidenceGate(lead, new Set(["stack-exchange"]))).toBe(false);
    expect(passesIndependentEvidenceGate({ ...lead, independent_source_count: 1 }, new Set(["stack-exchange", "global-voices"]))).toBe(false);
    expect(passesIndependentEvidenceGate({ ...lead, alternative_explanations_json: [] }, new Set(["stack-exchange", "global-voices"]))).toBe(false);
    expect(passesIndependentEvidenceGate({ ...lead, verified_evidence_json: {} }, new Set(["stack-exchange", "global-voices"]))).toBe(false);
  });

  it("does not count unreviewed RSS, GDELT, or uncleared Hacker News as independent operators", () => {
    for (const source_type of ["rss", "gdelt", "hacker-news"]) {
      expect(knownSourceOperator({ source_type, source_domain: "publisher.example", raw_metadata_json: { publisher: "Publisher" } })).toBeNull();
    }
  });
});
