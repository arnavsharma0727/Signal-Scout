import { z } from "zod";
import type { ResearchEvidence } from "./research-brief";

export const LOCAL_RESEARCH_DRAFT_KEY = "signal-scout:research-draft:v1";
export const LOCAL_RESEARCH_NOTES_KEY = "signal-scout:research-notes:v1";

export type LocalResearchNotes = {
  topic: string;
  workingThesis: string;
  alternatives: string;
  disconfirmingEvidence: string;
};

const httpsUrlSchema = z.string().url().max(3000).refine((value) => new URL(value).protocol === "https:");

const notesSchema = z.object({
  version: z.literal(1),
  topic: z.string().max(160),
  workingThesis: z.string().max(2000),
  alternatives: z.string().max(2000),
  disconfirmingEvidence: z.string().max(2000),
}).strict();

export function parseLocalResearchNotes(raw: string): LocalResearchNotes | null {
  try {
    const parsed = notesSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return null;
    const { version: _version, ...notes } = parsed.data;
    return notes;
  } catch {
    return null;
  }
}

export function serializeLocalResearchNotes(notes: LocalResearchNotes): string {
  return JSON.stringify({ version: 1, ...notes });
}

const evidenceSchema = z.object({
  id: z.string().min(1).max(1000),
  title: z.string().max(1000),
  url: httpsUrlSchema,
  source: z.string().max(500),
  evidenceClass: z.enum(["expert Q&A", "social discussion", "news coverage", "editorial discussion", "expert analysis", "community forum"]),
  language: z.string().max(100),
  timeLabel: z.string().max(100),
  timeValue: z.string().max(100),
  context: z.string().max(1000).optional(),
  attribution: z.string().max(500).optional(),
  attributionUrl: httpsUrlSchema.optional(),
  licenseName: z.string().max(200).optional(),
  licenseUrl: httpsUrlSchema.optional(),
  researcherAssessment: z.enum(["supports", "contradicts", "context", "not relevant"]).optional(),
  sourceOperatorKey: z.string().max(200).optional(),
  sourceOperatorLabel: z.string().max(200).optional(),
}).strip();

const draftSchema = z.object({
  version: z.literal(1),
  evidence: z.array(evidenceSchema).max(100),
}).strict();

/** Validate local browser storage and strip any transient post text or unknown fields. */
export function parseLocalEvidenceDraft(raw: string): ResearchEvidence[] | null {
  try {
    const parsed = draftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.evidence : null;
  } catch {
    return null;
  }
}

export function serializeLocalEvidenceDraft(evidence: ResearchEvidence[]): string {
  return JSON.stringify({
    version: 1,
    evidence: evidence.slice(0, 100).map(({ transientPreview: _transientPreview, ...citation }) => citation),
  });
}
