export const WIKINEWS_EDITIONS = [
  { language: "en", label: "English" },
  { language: "es", label: "Spanish" },
  { language: "de", label: "German" },
  { language: "fr", label: "French" },
  { language: "pt", label: "Portuguese" },
  { language: "ru", label: "Russian" },
  { language: "ja", label: "Japanese" },
  { language: "zh", label: "Chinese" },
  { language: "ar", label: "Arabic" },
] as const;

export type WikinewsArticle = {
  title: string;
  url: string;
  updatedAt: string;
  language: string;
  edition: string;
  license: string;
  licenseUrl: string;
};

type SearchResponse = {
  query?: {
    rightsinfo?: { text?: string; url?: string };
    search?: Array<{ title?: string; timestamp?: string }>;
  };
};

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Live, browser-only Wikinews search; results are not persisted or scored. */
export async function searchWikinews(
  input: string,
  language: string,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<WikinewsArticle[]> {
  const query = input.trim();
  const edition = WIKINEWS_EDITIONS.find((item) => item.language === language);
  if (query.length < 2 || query.length > 100 || !edition) {
    throw new Error("Enter a topic of 2–100 characters and choose a listed Wikinews edition.");
  }

  const params = new URLSearchParams({
    action: "query", list: "search", srnamespace: "0", srwhat: "text",
    srprop: "timestamp", srsort: "last_edit_desc", srlimit: "20", srsearch: query,
    meta: "siteinfo", siprop: "rightsinfo", format: "json", formatversion: "2", origin: "*",
  });
  const response = await fetcher(`https://${language}.wikinews.org/w/api.php?${params}`, {
    headers: {
      accept: "application/json",
      "Api-User-Agent": "SignalScout/0.1 (https://signal-scout-xi-ruby.vercel.app/)",
    },
  });
  if (!response.ok) {
    if (response.status === 429 || response.status === 503) {
      throw new Error("Wikinews is rate-limiting or temporarily unavailable. Try again later.");
    }
    throw new Error("The selected Wikinews edition is temporarily unavailable.");
  }

  const body = await response.json() as SearchResponse;
  const rights = body.query?.rightsinfo?.text?.trim();
  const licenseUrl = body.query?.rightsinfo?.url?.trim();
  if (!rights || !licenseUrl || !/^https:\/\/creativecommons\.org\/licenses\/by(?:-sa)?\/[\d.]+\//.test(licenseUrl)) {
    throw new Error("This edition does not expose a supported Creative Commons license; results were not shown.");
  }

  const cutoff = now - MAX_AGE_MS;
  return (body.query?.search ?? []).flatMap((item) => {
    const timestamp = item.timestamp ? Date.parse(item.timestamp) : NaN;
    if (!item.title || item.title.length > 300 ||
      /^(?:talk|user|category|wikinews|template|file):/i.test(item.title) ||
      !Number.isFinite(timestamp) || timestamp < cutoff || timestamp > now) return [];
    const path = item.title.replace(/ /g, "_");
    return [{
      title: item.title,
      url: `https://${language}.wikinews.org/wiki/${encodeURIComponent(path)}`,
      updatedAt: new Date(timestamp).toISOString(),
      language: edition.label,
      edition: `Wikinews (${edition.label})`,
      license: rights,
      licenseUrl,
    }];
  });
}
