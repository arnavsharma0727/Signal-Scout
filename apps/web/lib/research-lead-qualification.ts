type EvidenceSource = {
  source_type: string | null;
  source_domain: string | null;
  raw_metadata_json: unknown;
};

export type ResearchLeadEvidenceLink = {
  research_lead_id: string;
  document_id: string | null;
  source_documents?: EvidenceSource[] | EvidenceSource | null;
};

export type ResearchLeadQualification = {
  independent_source_count: number | null;
  verified_evidence_json: unknown;
  alternative_explanations_json: unknown;
};

/** Only reviewed connector→operator mappings count; domains/editions alone do not prove independence. */
export function knownSourceOperator(source: EvidenceSource): string | null {
  const domain = (source.source_domain ?? "").toLocaleLowerCase().replace(/^www\./, "");
  const metadata = asRecord(source.raw_metadata_json);

  if (source.source_type === "stack-exchange") return "stack-exchange";
  if (source.source_type === "licensed-forum" && domain === "forum.typst.app" && metadata.publisher === "Typst Forum")
    return "typst-forum";
  if (source.source_type === "licensed-forum" && domain === "discussion.fedoraproject.org" &&
      metadata.publisher === "Fedora Discussion" &&
      metadata.licenseUrl === "https://creativecommons.org/licenses/by-sa/4.0/")
    return "fedora-discussion";
  if (source.source_type === "licensed-analysis" && domain === "theconversation.com" && metadata.publisher === "The Conversation")
    return "the-conversation";
  if (source.source_type === "licensed-reporting" && isSubdomainOf(domain, "globalvoices.org") && metadata.publisher === "Global Voices")
    return "global-voices";
  if (source.source_type === "official-policy" && domain === "ec.europa.eu" && metadata.publisher === "European Commission")
    return "european-commission";
  if (source.source_type === "official-policy" &&
    domain === "mois.go.kr" &&
    metadata.publisher === "Ministry of the Interior and Safety, Republic of Korea")
    return "korea-mois";
  if (source.source_type === "wikimedia-talk" && isWikipediaDomain(domain))
    return "wikimedia";
  // Unknown publishers, unresolved discovery-index URLs, and rights-uncleared
  // sources cannot satisfy the independence gate.
  return null;
}

export function sourceOperatorsByLead(links: ResearchLeadEvidenceLink[]) {
  const operators = new Map<string, Set<string>>();
  for (const link of links) {
    if (!link.document_id) continue;
    const related = Array.isArray(link.source_documents)
      ? link.source_documents
      : link.source_documents
        ? [link.source_documents]
        : [];
    for (const source of related) {
      const operator = knownSourceOperator(source);
      if (!operator) continue;
      const leadOperators = operators.get(link.research_lead_id) ?? new Set<string>();
      leadOperators.add(operator);
      operators.set(link.research_lead_id, leadOperators);
    }
  }
  return operators;
}

/** Database counts are necessary but not sufficient; linked rows must prove two reviewed operators. */
export function passesIndependentEvidenceGate(
  lead: ResearchLeadQualification,
  operators: Set<string> | undefined,
) {
  return Number.isInteger(lead.independent_source_count) &&
    (lead.independent_source_count ?? 0) >= 2 &&
    Boolean(operators && operators.size >= 2) &&
    hasEvidence(lead.verified_evidence_json) &&
    hasEvidence(lead.alternative_explanations_json);
}

function isSubdomainOf(domain: string, root: string) {
  return domain === root || domain.endsWith(`.${root}`);
}

function isWikipediaDomain(domain: string) {
  return /^(?:[a-z]{2,3}|simple)\.wikipedia\.org$/.test(domain);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function hasEvidence(value: unknown): boolean {
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === "object") return Object.keys(value).length > 0;
  return typeof value === "string" && value.trim().length > 0;
}
