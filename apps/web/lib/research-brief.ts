export type ResearchEvidenceClass = "expert Q&A" | "social discussion" | "news coverage" | "editorial discussion" | "expert analysis" | "community forum";

export type ResearchEvidence = {
  id: string;
  title: string;
  url: string;
  source: string;
  evidenceClass: ResearchEvidenceClass;
  language: string;
  timeLabel: string;
  timeValue: string;
  context?: string;
  attribution?: string;
  attributionUrl?: string;
  licenseName?: string;
  licenseUrl?: string;
  researcherAssessment?: "supports" | "contradicts" | "context";
  /** Assigned only by reviewed source constructors; never infer independence from labels. */
  sourceOperatorKey?: string;
  sourceOperatorLabel?: string;
  /** Ephemeral source preview for in-browser review; strip before adding a citation to a brief. */
  transientPreview?: string;
};

export function citationWithoutTransientContent(item: ResearchEvidence): ResearchEvidence {
  const citation = { ...item };
  delete citation.transientPreview;
  return citation;
}

export type ResearchBriefDraft = {
  topic: string;
  workingThesis: string;
  alternatives: string;
  disconfirmingEvidence: string;
  evidence: ResearchEvidence[];
  exportedAt: string;
};

export type ResearchLeadReadiness = {
  readyForHumanReview: boolean;
  checks: Array<{ label: string; passed: boolean; detail: string }>;
  reviewedOperators: string[];
};

/** A strict local checklist for a researcher-authored dossier, never an automated finding. */
export function assessResearchLeadReadiness(input: {
  topic: string;
  workingThesis: string;
  alternatives: string;
  disconfirmingEvidence: string;
  evidence: ResearchEvidence[];
  asOf?: number;
}): ResearchLeadReadiness {
  const now = input.asOf ?? Date.now();
  const recentEvidence = input.evidence.filter((item) => {
    const published = Date.parse(item.timeValue);
    return Number.isFinite(published) && published <= now && now - published <= 30 * 86400000;
  });
  const operators = [...new Set(recentEvidence.flatMap((item) =>
    item.sourceOperatorKey && item.sourceOperatorLabel ? [item.sourceOperatorLabel] : []))].sort();
  const classes = new Set(recentEvidence.map((item) => item.evidenceClass));
  const assessments = new Set(recentEvidence.map((item) => item.researcherAssessment));
  const checks = [
    { label: "Specific topic and working thesis", passed: Boolean(input.topic.trim() && input.workingThesis.trim()), detail: "Write the question being investigated and a tentative explanation." },
    { label: "At least three recent, dated citations", passed: recentEvidence.length >= 3, detail: `${recentEvidence.length} selected citations are dated within the last 30 days.` },
    { label: "At least two reviewed source operators", passed: operators.length >= 2, detail: operators.length ? operators.join(" · ") : "No reviewed source operator is represented yet." },
    { label: "Discussion plus reporting or expert analysis", passed: (classes.has("social discussion") || classes.has("community forum")) && (classes.has("news coverage") || classes.has("expert analysis")), detail: "Requires at least one community/social citation and one news or expert-analysis citation." },
    { label: "Supporting and contradicting evidence reviewed", passed: assessments.has("supports") && assessments.has("contradicts"), detail: "Mark at least one citation as supporting and another as contradicting the thesis." },
    { label: "Alternative explanation and disconfirmation test", passed: Boolean(input.alternatives.trim() && input.disconfirmingEvidence.trim()), detail: "Record another plausible explanation and what observation would change your mind." },
  ];
  return { readyForHumanReview: checks.every((check) => check.passed), checks, reviewedOperators: operators };
}

export type EvidenceCoverage = {
  itemCount: number;
  sourceLabels: string[];
  languages: string[];
  researcherAssessments: { assessment: NonNullable<ResearchEvidence["researcherAssessment"]>; count: number }[];
  unassessedCount: number;
  evidenceClasses: { evidenceClass: ResearchEvidenceClass; count: number }[];
  earliest: string | null;
  latest: string | null;
  knownOperatorLabels: string[];
  unresolvedOperatorItemCount: number;
};

/** Descriptive inventory only: labels and items are not counts of independent owners. */
export function summarizeEvidenceCoverage(evidence: ResearchEvidence[]): EvidenceCoverage {
  const timestamps = evidence
    .map(({ timeValue }) => Date.parse(timeValue))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  const evidenceClasses: ResearchEvidenceClass[] = [
    "expert Q&A",
    "social discussion",
    "news coverage",
    "editorial discussion",
    "expert analysis",
    "community forum",
  ];
  const assessments: NonNullable<ResearchEvidence["researcherAssessment"]>[] = [
    "supports",
    "contradicts",
    "context",
  ];
  return {
    itemCount: evidence.length,
    sourceLabels: [...new Set(evidence.map(({ source }) => cleanText(source)).filter(Boolean))].sort(),
    languages: [...new Set(evidence.map(({ language }) => cleanText(language)).filter(Boolean))].sort(),
    researcherAssessments: assessments
      .map((assessment) => ({
        assessment,
        count: evidence.filter((item) => item.researcherAssessment === assessment).length,
      }))
      .filter(({ count }) => count > 0),
    unassessedCount: evidence.filter((item) => !item.researcherAssessment).length,
    evidenceClasses: evidenceClasses
      .map((evidenceClass) => ({
        evidenceClass,
        count: evidence.filter((item) => item.evidenceClass === evidenceClass).length,
      }))
      .filter(({ count }) => count > 0),
    earliest: timestamps.length ? new Date(timestamps[0]).toISOString() : null,
    latest: timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString() : null,
    knownOperatorLabels: [...new Set(evidence.flatMap(({ sourceOperatorKey, sourceOperatorLabel }) =>
      sourceOperatorKey && sourceOperatorLabel ? [sourceOperatorLabel] : []))].sort(),
    unresolvedOperatorItemCount: evidence.filter(({ sourceOperatorKey, sourceOperatorLabel }) =>
      !sourceOperatorKey || !sourceOperatorLabel).length,
  };
}

/** Read a topic handoff from the URL fragment so it is not sent in the HTTP request path. */
export function topicFromFragment(hash: string): string {
  if (!hash.startsWith("#")) return "";
  return (new URLSearchParams(hash.slice(1)).get("topic") ?? "").trim().slice(0, 100);
}

/** Build a citation-first handoff; never scores evidence or invents a conclusion. */
export function createResearchBriefMarkdown(draft: ResearchBriefDraft): string {
  const coverage = summarizeEvidenceCoverage(draft.evidence);
  const readiness = assessResearchLeadReadiness({
    topic: draft.topic,
    workingThesis: draft.workingThesis,
    alternatives: draft.alternatives,
    disconfirmingEvidence: draft.disconfirmingEvidence,
    evidence: draft.evidence,
    asOf: Date.parse(draft.exportedAt),
  });
  const lines = [
    "# Signal Scout research brief",
    "",
    `Exported: ${cleanText(draft.exportedAt)}`,
    `Topic: ${cleanText(draft.topic) || "Not specified"}`,
    "",
    "> Exploratory working notes only. Sources are query-selected, incomplete, and not representative by default. This brief is not an investment recommendation or evidence of causality.",
    "",
    "## Working thesis",
    "",
    cleanText(draft.workingThesis) || "Not written.",
    "",
    "## Alternative explanations / counter-evidence",
    "",
    cleanText(draft.alternatives) || "Not written.",
    "",
    "## What would change my mind?",
    "",
    cleanText(draft.disconfirmingEvidence) || "Not written.",
    "",
    "## Selected-sample coverage audit",
    "",
    `- Selected items: ${coverage.itemCount}`,
    `- Source labels: ${coverage.sourceLabels.map(escapeMarkdownLabel).join(", ") || "None"}`,
    `- Reviewed source operators represented: ${coverage.knownOperatorLabels.map(escapeMarkdownLabel).join(", ") || "None"}; unresolved operator items: ${coverage.unresolvedOperatorItemCount}`,
    `- Languages: ${coverage.languages.map(escapeMarkdownLabel).join(", ") || "None"}`,
    `- Evidence classes: ${coverage.evidenceClasses.map(({ evidenceClass, count }) => `${escapeMarkdownLabel(evidenceClass)} (${count})`).join(", ") || "None"}`,
    `- Researcher-assigned assessment: ${coverage.researcherAssessments.map(({ assessment, count }) => `${assessment} (${count})`).join(", ") || "None"}; unassessed: ${coverage.unassessedCount}`,
    `- Publication-time span: ${coverage.earliest && coverage.latest ? `${coverage.earliest} to ${coverage.latest}` : "Unavailable"}`,
    "",
    "> Coverage is descriptive. A source label, language, item, or domain is not necessarily an independent publisher or population sample.",
    "",
    "## Evidence qualification checklist",
    "",
    `- Status: ${readiness.readyForHumanReview ? "Checklist met; ready for human review only" : "Not ready for lead review"}`,
    ...readiness.checks.map((check) => `- [${check.passed ? "x" : " "}] ${check.label}: ${check.detail}`),
    "- This checklist does not confirm a lead, topical relevance, source independence beyond reviewed operator labels, or investment implications.",
    "",
    `## Selected evidence (${draft.evidence.length} items)`,
    "",
  ];

  if (!draft.evidence.length) lines.push("No evidence selected.");
  for (const item of draft.evidence) {
    const attribution = [
      item.context ? escapeMarkdownLabel(item.context) : "",
      item.attribution ? escapeMarkdownLabel(item.attribution) : "",
      item.attributionUrl ? `[attribution link](${safeMarkdownUrl(item.attributionUrl)})` : "",
      item.licenseName && item.licenseUrl ? `[${escapeMarkdownLabel(item.licenseName)}](${safeMarkdownUrl(item.licenseUrl)})` : "",
    ].filter(Boolean).join("; ");
    lines.push(
      `- [${escapeMarkdownLabel(item.title) || "Open source item"}](${safeMarkdownUrl(item.url)}) — ${cleanText(item.evidenceClass)}; ${escapeMarkdownLabel(item.source)}; ${escapeMarkdownLabel(item.language)}; ${escapeMarkdownLabel(item.timeLabel)}: ${escapeMarkdownLabel(item.timeValue)}${item.researcherAssessment ? `; researcher assessment: ${item.researcherAssessment}` : ""}${attribution ? `; ${attribution}` : ""}`,
    );
  }

  lines.push(
    "",
    "## Coverage note",
    "",
    "These are manually selected links from on-demand provider samples and recent licensed feeds. Source views can overlap; reviewed operator labels are a conservative source audit, not proof of topical independence or a representative population. A low or empty sample does not show that a topic is absent. Check originals, applicable licenses, dates, language, and competing explanations before relying on this brief.",
    "",
  );
  return lines.join("\n");
}

function cleanText(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function escapeMarkdownLabel(value: string) {
  return cleanText(value).replace(/[\\[\]`*_]/g, "\\$&");
}

function safeMarkdownUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString().replace(/[()\s]/g, encodeURIComponent) : "#invalid-link";
  } catch {
    return "#invalid-link";
  }
}
