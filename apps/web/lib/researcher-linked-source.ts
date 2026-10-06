import type { LeadSourceDocument } from "./research-lead-submission";

export type ResearcherLinkedCitationInput = {
  id: string;
  title: string;
  url: string;
  timeValue: string;
  language: string;
  attribution: string;
  assessment: "supports" | "contradicts" | "context";
  sourceObservation: string;
  researcherVerifiedOriginal: true;
};

const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MASTODON_HOSTS = new Set(["mastodon.social", "mastodon.online", "mstdn.jp", "mastodon.world"]);
const LEMMY_HOSTS = new Set(["lemmy.world", "discuss.tchncs.de", "feddit.org", "feddit.uk"]);

/**
 * Turn an explicitly published, researcher-reviewed public social citation into
 * a link-only DB row. Post bodies/previews never cross this boundary.
 */
export function prepareResearcherLinkedSource(
  citation: ResearcherLinkedCitationInput,
  id: string,
  now = Date.now(),
): LeadSourceDocument | null {
  const provider = citation.id.split(":", 1)[0];
  const url = safeCanonicalUrl(citation.url);
  const published = Date.parse(citation.timeValue);
  const attribution = citation.attribution.trim().replace(/\s+/g, " ");
  const suppliedTitle = citation.title.trim().replace(/\s+/g, " ");
  const publicByline = attribution.replace(/^(?:Lemmy )?Author:\s*/i, "");
  const title = provider === "lemmy"
    ? `Public Lemmy post by ${publicByline}`
    : `Public post by ${publicByline}`;
  const observation = citation.sourceObservation.trim().replace(/\s+/g, " ");

  if (!url || !isProviderPermalink(provider, url) || !isUuid(id) ||
      !Number.isFinite(published) || published > now || now - published > MAX_AGE_MS ||
      title.length < 3 || title.length > 300 || suppliedTitle.length > 500 || attribution.length < 2 || attribution.length > 250 ||
      citation.language.trim().length > 60 || observation.length < 20 || observation.length > 1000 ||
      citation.researcherVerifiedOriginal !== true ||
      !["supports", "contradicts", "context"].includes(citation.assessment)) return null;

  const sourceName = provider === "bluesky" ? "Bluesky public post"
    : provider === "mastodon" ? `Mastodon · ${url.hostname}`
      : provider === "lemmy" ? `Lemmy · ${url.hostname}` : null;
  if (!sourceName) return null;

  return {
    id,
    market_code: "INTL",
    source_type: "researcher-linked-source",
    source_name: sourceName,
    source_domain: url.hostname,
    language_code: citation.language.trim().slice(0, 60) || null,
    title_original: title,
    source_url: url.toString(),
    published_at: new Date(published).toISOString(),
    raw_metadata_json: {
      citationProvider: provider,
      attribution,
      researcherLinkedOnly: true,
      postBodyDiscarded: true,
      transientPreviewDiscarded: true,
      rightsBasis: "public permalink and researcher-authored citation only",
    },
  };
}

/** Client-side publish affordance helper; the server repeats all checks before storage. */
export function isPublishableResearcherLinkedCitation(item: { id: string; url: string; timeValue: string }): boolean {
  const provider = item.id.split(":", 1)[0];
  const url = safeCanonicalUrl(item.url);
  const published = Date.parse(item.timeValue);
  return Boolean(url && isProviderPermalink(provider, url) && Number.isFinite(published) &&
    published <= Date.now() && Date.now() - published <= MAX_AGE_MS);
}

function isProviderPermalink(provider: string, url: URL) {
  if (provider === "bluesky")
    return url.hostname === "bsky.app" && /^\/profile\/[^/]+\/post\/[^/]+\/?$/.test(url.pathname);
  if (provider === "mastodon")
    return MASTODON_HOSTS.has(url.hostname) && /^\/(?:@[^/]+\/\d+|web\/statuses\/\d+)\/?$/.test(url.pathname);
  if (provider === "lemmy")
    return LEMMY_HOSTS.has(url.hostname) && /^\/post\/\d+\/?$/.test(url.pathname);
  return false;
}

function safeCanonicalUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return null;
    return url;
  } catch {
    return null;
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
