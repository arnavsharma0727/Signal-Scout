import { reviewedNewsOperatorForUrl } from "./news-source-operators";

export type GdeltPublicArticle = {
  title: string;
  url: string;
  seenAt: string;
  domain: string;
  language: string;
  sourceCountry: string;
  sourceOperatorKey?: string;
  sourceOperatorLabel?: string;
  sourceOperatorReferenceUrl?: string;
};

type GdeltResponse = {
  articles?: Array<{
    title?: unknown;
    url?: unknown;
    seendate?: unknown;
    domain?: unknown;
    language?: unknown;
    sourcecountry?: unknown;
  }>;
};
type RawGdeltArticle = NonNullable<GdeltResponse["articles"]>[number];

const API = "https://api.gdeltproject.org/api/v2/doc/doc";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export const GDELT_OUTLET_COUNTRIES = [
  { value: "", label: "All monitored countries" },
  { value: "unitedstates", label: "United States" },
  { value: "southkorea", label: "South Korea" },
  { value: "japan", label: "Japan" },
  { value: "unitedkingdom", label: "United Kingdom" },
  { value: "germany", label: "Germany" },
  { value: "france", label: "France" },
  { value: "india", label: "India" },
  { value: "brazil", label: "Brazil" },
] as const;

export const GDELT_OUTLET_LANGUAGES = [
  { value: "", label: "All indexed languages" },
  { value: "english", label: "English" },
  { value: "korean", label: "Korean" },
  { value: "japanese", label: "Japanese" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "german", label: "German" },
  { value: "portuguese", label: "Portuguese" },
] as const;

export type GdeltOutletCountry = (typeof GDELT_OUTLET_COUNTRIES)[number]["value"];
export type GdeltOutletLanguage = (typeof GDELT_OUTLET_LANGUAGES)[number]["value"];

/** Visitor-triggered news discovery; results stay in the browser and are never stored. */
export async function searchGdeltNews(
  input: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
  outletCountry: GdeltOutletCountry = "",
  outletLanguage: GdeltOutletLanguage = "",
): Promise<GdeltPublicArticle[]> {
  const query = input.trim();
  if (query.length < 3 || query.length > 100) {
    throw new Error("Enter a search phrase between 3 and 100 characters.");
  }
  if (!GDELT_OUTLET_COUNTRIES.some(({ value }) => value === outletCountry) ||
      !GDELT_OUTLET_LANGUAGES.some(({ value }) => value === outletLanguage)) {
    throw new Error("Choose a listed publisher-country and language filter.");
  }

  const params = new URLSearchParams({
    query: [
      query,
      outletCountry && `sourcecountry:${outletCountry}`,
      outletLanguage && `sourcelang:${outletLanguage}`,
    ].filter(Boolean).join(" "),
    mode: "artlist",
    format: "json",
    maxrecords: "25",
    sort: "DateDesc",
    timespan: "7d",
  });
  const response = typeof window === "undefined"
    ? await fetcher(API + "?" + params, { headers: { accept: "application/json" } })
    : await fetcher("/api/research/gdelt", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ query, outletCountry, outletLanguage }),
    });
  if (response.status === 429) {
    throw new Error("GDELT is currently rate-limiting public searches. No retry was sent; try again later or use the recent publisher feeds.");
  }
  if (!response.ok) throw new Error("The global news index is temporarily unavailable.");

  const body = (await response.json()) as { articles?: unknown[] };
  return normalizeGdeltArticles(Array.isArray(body.articles) ? body.articles : [], now);
}

function normalizeGdeltArticles(values: unknown[], now: number): GdeltPublicArticle[] {
  return values.flatMap((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    const row = value as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const rawUrl = typeof row.url === "string" ? row.url : "";
    const seenAt = typeof row.seenAt === "string"
      ? row.seenAt
      : typeof row.seendate === "string" ? parseGdeltDate(row.seendate) : "";
    const url = safeHttpsUrl(rawUrl);
    const published = Date.parse(seenAt);
    if (!title || !url || !Number.isFinite(published) || published > now || published < now - MAX_AGE_MS) return [];
    const hostname = new URL(url).hostname.toLocaleLowerCase().replace(/^www\./, "");
    const operator = reviewedNewsOperatorForUrl(url);
    return [{
      title,
      url,
      seenAt,
      // Trust the article URL's hostname, not the search index's domain field.
      domain: hostname,
      language: typeof row.language === "string" ? row.language : "not reported",
      sourceCountry: typeof row.sourceCountry === "string"
        ? row.sourceCountry
        : typeof row.sourcecountry === "string" ? row.sourcecountry : "not reported",
      ...(operator ? {
        sourceOperatorKey: operator.key,
        sourceOperatorLabel: operator.label,
        sourceOperatorReferenceUrl: operator.referenceUrl,
      } : {}),
    }];
  });
}

function parseGdeltDate(value: string) {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return "";
  return match[1] + "-" + match[2] + "-" + match[3] + "T" + match[4] + ":" + match[5] + ":" + match[6] + "Z";
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}
