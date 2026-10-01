export type GdeltPublicArticle = {
  title: string;
  url: string;
  seenAt: string;
  domain: string;
  language: string;
  sourceCountry: string;
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
  const response = await fetcher(API + "?" + params, {
    headers: { accept: "application/json" },
  });
  if (response.status === 429) {
    throw new Error("GDELT is rate-limiting requests. Wait at least five seconds before trying again.");
  }
  if (!response.ok) throw new Error("The global news index is temporarily unavailable.");

  const body = (await response.json()) as GdeltResponse;
  return (Array.isArray(body.articles) ? body.articles : []).flatMap((article) => {
    if (
      typeof article.title !== "string" || !article.title.trim() ||
      typeof article.url !== "string" || typeof article.seendate !== "string"
    ) return [];
    const seenAt = parseGdeltDate(article.seendate);
    const url = safeHttpsUrl(article.url);
    const published = Date.parse(seenAt);
    if (!url || !Number.isFinite(published) || published > now || published < now - MAX_AGE_MS) return [];
    return [{
      title: article.title.trim(),
      url,
      seenAt,
      domain: typeof article.domain === "string" ? article.domain : new URL(url).hostname,
      language: typeof article.language === "string" ? article.language : "not reported",
      sourceCountry: typeof article.sourcecountry === "string" ? article.sourcecountry : "not reported",
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
