export type ResearchEvidenceClass = "expert Q&A" | "social discussion" | "news coverage" | "editorial discussion";

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
};

export type ResearchBriefDraft = {
  topic: string;
  workingThesis: string;
  alternatives: string;
  disconfirmingEvidence: string;
  evidence: ResearchEvidence[];
  exportedAt: string;
};

export type EvidenceCoverage = {
  itemCount: number;
  sourceLabels: string[];
  languages: string[];
  evidenceClasses: { evidenceClass: ResearchEvidenceClass; count: number }[];
  earliest: string | null;
  latest: string | null;
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
  ];
  return {
    itemCount: evidence.length,
    sourceLabels: [...new Set(evidence.map(({ source }) => cleanText(source)).filter(Boolean))].sort(),
    languages: [...new Set(evidence.map(({ language }) => cleanText(language)).filter(Boolean))].sort(),
    evidenceClasses: evidenceClasses
      .map((evidenceClass) => ({
        evidenceClass,
        count: evidence.filter((item) => item.evidenceClass === evidenceClass).length,
      }))
      .filter(({ count }) => count > 0),
    earliest: timestamps.length ? new Date(timestamps[0]).toISOString() : null,
    latest: timestamps.length ? new Date(timestamps[timestamps.length - 1]).toISOString() : null,
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
    `- Languages: ${coverage.languages.map(escapeMarkdownLabel).join(", ") || "None"}`,
    `- Evidence classes: ${coverage.evidenceClasses.map(({ evidenceClass, count }) => `${escapeMarkdownLabel(evidenceClass)} (${count})`).join(", ") || "None"}`,
    `- Publication-time span: ${coverage.earliest && coverage.latest ? `${coverage.earliest} to ${coverage.latest}` : "Unavailable"}`,
    "",
    "> Coverage is descriptive. A source label, language, item, or domain is not necessarily an independent publisher or population sample.",
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
      `- [${escapeMarkdownLabel(item.title) || "Open source item"}](${safeMarkdownUrl(item.url)}) — ${cleanText(item.evidenceClass)}; ${escapeMarkdownLabel(item.source)}; ${escapeMarkdownLabel(item.language)}; ${escapeMarkdownLabel(item.timeLabel)}: ${escapeMarkdownLabel(item.timeValue)}${attribution ? `; ${attribution}` : ""}`,
    );
  }

  lines.push(
    "",
    "## Coverage note",
    "",
    "These are manually selected links from on-demand provider samples. Source views can overlap; source types are not necessarily independent operators. A low or empty sample does not show that a topic is absent. Check originals, applicable licenses, dates, language, and competing explanations before relying on this brief.",
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
