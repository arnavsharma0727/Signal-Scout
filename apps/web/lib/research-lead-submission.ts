import { toPublisherEvidence } from "./publisher-evidence";
import type { ResearchEvidence } from "./research-brief";

export type ReviewedLeadCitation = {
  documentId: string;
  assessment: "supports" | "contradicts" | "context";
  sourceObservation: string;
  researcherVerifiedOriginal: true;
};

export type LeadSourceDocument = {
  id: string;
  source_type: string;
  source_name: string;
  source_domain: string;
  language_code: string | null;
  title_original: string;
  source_url: string;
  published_at: string;
  raw_metadata_json: Record<string, unknown> | null;
};

export type PublicLeadSubmission = {
  lead: Record<string, unknown>;
  evidence: Array<{
    documentId: string;
    relationshipType: string;
  }>;
};

/** Server-side gate for promoting only researcher-reviewed, allowlisted DB citations. */
export function preparePublicLeadSubmission(input: {
  topic: string;
  workingThesis: string;
  alternatives: string;
  disconfirmingEvidence: string;
  citations: ReviewedLeadCitation[];
  documents: LeadSourceDocument[];
  asOf?: number;
}): PublicLeadSubmission | null {
  const now = input.asOf ?? Date.now();
  const topic = clean(input.topic);
  const thesis = clean(input.workingThesis);
  const alternatives = clean(input.alternatives);
  const disconfirmingEvidence = clean(input.disconfirmingEvidence);
  if (topic.length < 3 || topic.length > 160 || thesis.length < 20 || thesis.length > 2000 ||
      alternatives.length < 20 || alternatives.length > 2000 ||
      disconfirmingEvidence.length < 20 || disconfirmingEvidence.length > 2000 ||
      input.citations.length < 3 || input.citations.length > 40 ||
      input.documents.length !== input.citations.length) return null;

  const documentsById = new Map(input.documents.map((document) => [document.id, document]));
  const seenIds = new Set<string>();
  const reviewed: Array<{
    document: LeadSourceDocument;
    evidence: ResearchEvidence;
    citation: ReviewedLeadCitation;
  }> = [];
  for (const citation of input.citations) {
    if (!isUuid(citation.documentId) || seenIds.has(citation.documentId) ||
        !["supports", "contradicts", "context"].includes(citation.assessment) ||
        citation.researcherVerifiedOriginal !== true || clean(citation.sourceObservation).length < 20 ||
        clean(citation.sourceObservation).length > 1000) return null;
    const document = documentsById.get(citation.documentId);
    if (!document || document.id !== citation.documentId) return null;
    const evidence = toPublisherEvidence(document, now);
    if (!evidence) return null;
    const publishedAt = Date.parse(document.published_at);
    if (!Number.isFinite(publishedAt) || publishedAt > now || now - publishedAt > 30 * 86400000) return null;
    seenIds.add(citation.documentId);
    reviewed.push({ document, evidence, citation });
  }

  const assessments = new Set(reviewed.map(({ citation }) => citation.assessment));
  const operators = new Set(reviewed.map(({ evidence }) => evidence.sourceOperatorKey).filter(Boolean));
  const classes = new Set(reviewed.map(({ evidence }) => evidence.evidenceClass));
  const conversation = reviewed.filter(({ evidence }) =>
    evidence.evidenceClass === "expert Q&A" || evidence.evidenceClass === "community forum");
  const bylines = new Map<string, number>();
  for (const { evidence } of conversation) {
    const label = displayedByline(evidence);
    if (!label || !evidence.sourceOperatorKey) return null;
    const key = label.normalize("NFKC").toLocaleLowerCase();
    bylines.set(key, (bylines.get(key) ?? 0) + 1);
  }
  const largestBylineShare = conversation.length
    ? Math.max(...bylines.values()) / conversation.length
    : 1;
  if (!assessments.has("supports") || !assessments.has("contradicts") || operators.size < 2 ||
      !(classes.has("expert Q&A") || classes.has("community forum")) ||
      !(classes.has("news coverage") || classes.has("expert analysis")) ||
      conversation.length < 2 || bylines.size < 2 || largestBylineShare > 0.6) return null;

  return {
    lead: {
      created_by: null,
      market_code: "INTL",
      event_category: "human-reviewed-conversation-theme",
      topic,
      status: "draft",
      time_window: "rolling-30d",
      first_detected_at: new Date(now).toISOString(),
      last_updated_at: new Date(now).toISOString(),
      independent_source_count: operators.size,
      evidence_level: "researcher-reviewed-citations",
      research_observation: thesis,
      research_starting_question: topic,
      alternative_explanations_json: [alternatives],
      validation_steps_json: [disconfirmingEvidence],
      verified_evidence_json: reviewed.map(({ citation }) => ({
        documentId: citation.documentId,
        assessment: citation.assessment,
        sourceObservation: clean(citation.sourceObservation),
        researcherVerifiedOriginal: true,
      })),
      methodology_version: "human-reviewed-v1",
      research_priority_score: null,
    },
    evidence: reviewed.map(({ citation }) => ({
      documentId: citation.documentId,
      relationshipType: citation.assessment === "supports"
        ? "supporting"
        : citation.assessment === "contradicts"
          ? "counter-evidence"
          : "context",
    })),
  };
}

function displayedByline(evidence: ResearchEvidence) {
  const match = evidence.attribution?.match(/^Author:\s*(.+)$/i)?.[1] ??
    (evidence.evidenceClass === "community forum" ? evidence.attribution : undefined);
  return match?.trim().replace(/\s+/g, " ") || null;
}

function clean(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
