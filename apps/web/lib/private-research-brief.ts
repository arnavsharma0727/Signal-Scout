import type { ResearchEvidence } from "./research-brief";

export type SavedEvidenceLink = {
  url: string;
  host: string;
  sourceClass: string;
  language: string;
  publishedAt: string | null;
  assessment: ResearchEvidence["researcherAssessment"];
  researcherNote: string | null;
  licenseUrl: string | null;
};

const CC_BY_SA = "https://creativecommons.org/licenses/by-sa/4.0/";
const PRIVATE_SOURCE_RULES: Array<{
  matches: (host: string) => boolean;
  sourceClass: string;
  licenseUrl: string | null;
}> = [
  { matches: host => host === "stackexchange.com" || host.endsWith(".stackexchange.com") || host === "stackoverflow.com" || host.endsWith(".stackoverflow.com") || ["serverfault.com", "superuser.com", "askubuntu.com", "mathoverflow.net"].includes(host), sourceClass: "expert Q&A", licenseUrl: CC_BY_SA },
  { matches: host => /^(?:[a-z]{2,3}|simple)\.wikipedia\.org$/.test(host), sourceClass: "editorial discussion", licenseUrl: CC_BY_SA },
  { matches: host => host === "globalvoices.org" || host.endsWith(".globalvoices.org"), sourceClass: "community reporting", licenseUrl: "https://creativecommons.org/licenses/by/3.0/" },
  { matches: host => host === "forum.typst.app", sourceClass: "community forum", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { matches: host => host === "theconversation.com", sourceClass: "expert analysis", licenseUrl: null },
  { matches: host => host === "ec.europa.eu", sourceClass: "official context", licenseUrl: "https://creativecommons.org/licenses/by/4.0/" },
  { matches: host => host === "mois.go.kr", sourceClass: "official context", licenseUrl: null },
];

export function privateCitationPolicy(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const rule = PRIVATE_SOURCE_RULES.find(item => item.matches(host));
    if (!rule) return null;
    // Keep only revision identity when Wikipedia uses query parameters; strip
    // tracking and arbitrary query data from every stored citation.
    if (/\.wikipedia\.org$/.test(host)) {
      const title = url.searchParams.get("title");
      const oldid = url.searchParams.get("oldid");
      url.search = "";
      if (title && oldid && /^\d+$/.test(oldid)) {
        url.searchParams.set("title", title.slice(0, 500));
        url.searchParams.set("oldid", oldid);
      }
    } else {
      url.search = "";
    }
    return { url: url.toString(), host, sourceClass: rule.sourceClass, licenseUrl: rule.licenseUrl };
  } catch {
    return null;
  }
}

/** Persist references only from sources with a reviewed reuse basis. No title,
 * excerpt, author handle, query, or post body is copied into a saved brief. */
export function preparePrivateEvidenceLinks(value: unknown): SavedEvidenceLink[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: SavedEvidenceLink[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    if (typeof row.url !== "string") continue;
    const policy = privateCitationPolicy(row.url);
    if (!policy || seen.has(policy.url) || result.length >= 40) continue;
    seen.add(policy.url);
    const publishedAt = typeof row.publishedAt === "string" && Number.isFinite(Date.parse(row.publishedAt))
      ? new Date(row.publishedAt).toISOString()
      : null;
    const assessment = ["supports", "contradicts", "context", "not relevant"].includes(String(row.assessment))
      ? row.assessment as ResearchEvidence["researcherAssessment"]
      : undefined;
    const researcherNote = typeof row.researcherNote === "string" && row.researcherNote.trim().length <= 1000
      ? row.researcherNote.trim() || null
      : null;
    const language = typeof row.language === "string" && /^[\p{L}\p{M}\p{N} ._-]{1,32}$/u.test(row.language)
      ? row.language
      : "not provided";
    result.push({ ...policy, language, publishedAt, assessment, researcherNote });
  }
  return result;
}

export function countExcludedPrivateEvidence(evidence: ResearchEvidence[]) {
  const eligible = preparePrivateEvidenceLinks(evidence.map(item => ({
    url: item.url,
    language: item.language,
    publishedAt: item.timeValue,
    assessment: item.researcherAssessment,
    researcherNote: item.researcherNote,
  })));
  return Math.max(0, evidence.length - eligible.length);
}
